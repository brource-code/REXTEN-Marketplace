<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Support\PasswordResetMailLocale;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Письма владельцу бизнеса по событиям подписки:
 *  - первая оплата
 *  - продление (рекуррентное списание)
 *  - смена плана с прорацией (мини-инвойс)
 *  - отмена подписки
 *  - запланированный даунгрейд
 *
 * Использует общий шаблон mail.rexten.subscription-notification.
 */
class SubscriptionMailer
{
    public const REASON_FIRST = 'subscription_create';

    public const REASON_RENEWED = 'subscription_cycle';

    public const REASON_PLAN_CHANGED = 'subscription_update';

    public static function notifyPaymentSucceeded(Subscription $sub, $stripeInvoice): void
    {
        // Один invoice → одно письмо: иначе при гонке webhooks (invoice раньше checkout
        // или наоборот) пользователь получит дубликаты.
        $invoiceId = (string) ($stripeInvoice->id ?? '');
        if ($invoiceId === '') {
            return;
        }
        if (! Cache::add('subscription_mailer:invoice:'.$invoiceId, 1, now()->addDays(14))) {
            Log::info('SubscriptionMailer: skip duplicate invoice email', ['invoice_id' => $invoiceId]);

            return;
        }

        $company = Company::find($sub->company_id);
        $owner = self::resolveOwner($company);
        if (! $owner) {
            Cache::forget('subscription_mailer:invoice:'.$invoiceId);

            return;
        }

        $reason = (string) ($stripeInvoice->billing_reason ?? '');
        $locale = self::ownerLocale($owner);
        $plan = SubscriptionPlan::findBySlug($sub->plan);
        $planName = $plan?->name ?? $sub->plan;

        $amount = self::formatAmount(
            (int) ($stripeInvoice->amount_paid ?? 0),
            (string) ($stripeInvoice->currency ?? $sub->currency ?? 'usd')
        );
        $invoiceNumber = (string) ($stripeInvoice->number ?? $stripeInvoice->id ?? '');
        $paidAt = self::formatDate(
            $stripeInvoice->status_transitions->paid_at
                ?? $stripeInvoice->effective_at
                ?? $stripeInvoice->created
                ?? null,
            $locale
        );
        $nextRenewal = self::formatDate(
            $sub->current_period_end?->getTimestamp(),
            $locale,
            true
        );
        $billingPeriodLabel = $sub->interval === 'year'
            ? __('mail.subscription.fields.billing_period_yearly', [], $locale)
            : __('mail.subscription.fields.billing_period_monthly', [], $locale);

        if ($reason === self::REASON_PLAN_CHANGED) {
            $previousPlanName = SubscriptionPlan::findBySlug($sub->previous_plan ?? '')?->name
                ?? ($sub->previous_plan ?: '—');

            $fields = [
                ['label' => __('mail.subscription.fields.previous_plan', [], $locale), 'value' => $previousPlanName],
                ['label' => __('mail.subscription.fields.new_plan', [], $locale), 'value' => $planName],
                ['label' => __('mail.subscription.fields.billing_period', [], $locale), 'value' => $billingPeriodLabel],
                ['label' => __('mail.subscription.fields.invoice_number', [], $locale), 'value' => $invoiceNumber],
                ['label' => __('mail.subscription.fields.paid_at', [], $locale), 'value' => $paidAt],
                ['label' => __('mail.subscription.fields.next_renewal', [], $locale), 'value' => $nextRenewal],
            ];

            $lineRows = self::buildInvoiceLineRows($stripeInvoice, $locale);
            $fields = array_merge($fields, $lineRows);

            $subjectTemplate = __('mail.subscription.plan_changed.subject', ['plan' => $planName], $locale);
            $intro = __('mail.subscription.plan_changed.intro', ['app' => self::appName(), 'plan' => $planName], $locale);

            self::send($owner, $locale, $subjectTemplate, $intro, $fields, [
                'label' => __('mail.subscription.fields.total_charged', [], $locale),
                'value' => $amount,
            ], $invoiceId);

            return;
        }

        $isFirst = $reason === self::REASON_FIRST;
        $subjectTemplate = __(
            $isFirst ? 'mail.subscription.payment_first.subject' : 'mail.subscription.payment_renewed.subject',
            ['plan' => $planName],
            $locale
        );
        $intro = __(
            $isFirst ? 'mail.subscription.payment_first.intro' : 'mail.subscription.payment_renewed.intro',
            ['app' => self::appName(), 'plan' => $planName],
            $locale
        );

        $fields = [
            ['label' => __('mail.subscription.fields.plan', [], $locale), 'value' => $planName],
            ['label' => __('mail.subscription.fields.billing_period', [], $locale), 'value' => $billingPeriodLabel],
            ['label' => __('mail.subscription.fields.invoice_number', [], $locale), 'value' => $invoiceNumber],
            ['label' => __('mail.subscription.fields.paid_at', [], $locale), 'value' => $paidAt],
            ['label' => __('mail.subscription.fields.next_renewal', [], $locale), 'value' => $nextRenewal],
        ];

        self::send($owner, $locale, $subjectTemplate, $intro, $fields, [
            'label' => __('mail.subscription.fields.amount_paid', [], $locale),
            'value' => $amount,
        ], $invoiceId);
    }

    public static function notifyCanceled(Subscription $sub): void
    {
        $company = Company::find($sub->company_id);
        $owner = self::resolveOwner($company);
        if (!$owner) {
            return;
        }

        $locale = self::ownerLocale($owner);
        $plan = SubscriptionPlan::findBySlug($sub->plan);
        $planName = $plan?->name ?? $sub->plan;
        $until = self::formatDate(
            $sub->current_period_end?->getTimestamp(),
            $locale,
            true
        );

        $subject = __('mail.subscription.canceled.subject', [], $locale);
        $intro = __('mail.subscription.canceled.intro', [
            'app' => self::appName(),
            'plan' => $planName,
            'until' => $until,
        ], $locale);

        $fields = [
            ['label' => __('mail.subscription.fields.plan', [], $locale), 'value' => $planName],
            ['label' => __('mail.subscription.fields.access_until', [], $locale), 'value' => $until],
        ];

        self::send($owner, $locale, $subject, $intro, $fields, null, null);
    }

    public static function notifyDowngradeScheduled(Subscription $sub, string $newPlanSlug): void
    {
        $company = Company::find($sub->company_id);
        $owner = self::resolveOwner($company);
        if (!$owner) {
            return;
        }

        $locale = self::ownerLocale($owner);
        $currentPlan = SubscriptionPlan::findBySlug($sub->plan);
        $newPlan = SubscriptionPlan::findBySlug($newPlanSlug);
        $currentName = $currentPlan?->name ?? $sub->plan;
        $newName = $newPlan?->name ?? $newPlanSlug;
        $until = self::formatDate(
            $sub->current_period_end?->getTimestamp(),
            $locale,
            true
        );

        $subject = __('mail.subscription.downgrade_scheduled.subject', ['plan' => $newName], $locale);
        $intro = __('mail.subscription.downgrade_scheduled.intro', [
            'app' => self::appName(),
            'from' => $currentName,
            'to' => $newName,
            'until' => $until,
        ], $locale);

        $fields = [
            ['label' => __('mail.subscription.fields.plan', [], $locale), 'value' => $currentName],
            ['label' => __('mail.subscription.fields.new_plan', [], $locale), 'value' => $newName],
            ['label' => __('mail.subscription.fields.effective_date', [], $locale), 'value' => $until],
        ];

        self::send($owner, $locale, $subject, $intro, $fields, null, null);
    }

    private static function send(
        User $owner,
        string $locale,
        string $subject,
        string $intro,
        array $fields,
        ?array $total,
        ?string $releaseCacheInvoiceIdOnMailFailure = null
    ): void {
        $base = rtrim((string) config('app.frontend_url'), '/');
        $actionPath = '/business/subscription';
        $actionUrl = $base === '' ? $actionPath : $base.$actionPath;

        $appName = self::appName();
        $preheader = __('mail.subscription.preheader', ['title' => $subject, 'app' => $appName], $locale);
        $noteText = __('mail.subscription.note', ['app' => $appName], $locale);
        $footerText = __('mail.subscription.footer', ['app' => $appName], $locale);
        $actionLabel = __('mail.subscription.open_subscription', [], $locale);

        try {
            Mail::send(
                ['html' => 'mail.rexten.subscription-notification', 'text' => 'mail.rexten.subscription-notification-text'],
                [
                    'appName' => $appName,
                    'locale' => $locale,
                    'emailTitle' => $subject,
                    'preheader' => $preheader,
                    'intro' => $intro,
                    'fields' => $fields,
                    'total' => $total,
                    'actionUrl' => $actionUrl,
                    'actionLabel' => $actionLabel,
                    'noteText' => $noteText,
                    'footerText' => $footerText,
                ],
                function ($message) use ($owner, $subject) {
                    $message->to($owner->email)->subject($subject);
                }
            );
        } catch (\Throwable $e) {
            Log::error('SubscriptionMailer: failed to send email', [
                'owner_id' => $owner->id,
                'subject' => $subject,
                'error' => $e->getMessage(),
            ]);
            if ($releaseCacheInvoiceIdOnMailFailure) {
                Cache::forget('subscription_mailer:invoice:'.$releaseCacheInvoiceIdOnMailFailure);
            }
        }
    }

    private static function buildInvoiceLineRows($stripeInvoice, string $locale): array
    {
        $rows = [];
        $lines = $stripeInvoice->lines->data ?? [];
        $currency = (string) ($stripeInvoice->currency ?? 'usd');

        foreach ($lines as $line) {
            $desc = trim((string) ($line->description ?? ''));
            if ($desc === '') {
                continue;
            }
            $rows[] = [
                'label' => $desc,
                'value' => self::formatAmount((int) ($line->amount ?? 0), $currency),
            ];
        }

        return $rows;
    }

    private static function resolveOwner(?Company $company): ?User
    {
        if (!$company) {
            return null;
        }
        $owner = User::find($company->owner_id);
        if (!$owner || !$owner->email) {
            return null;
        }

        return $owner;
    }

    private static function ownerLocale(User $owner): string
    {
        return PasswordResetMailLocale::toMailLang($owner->locale ?? 'en') ?? 'en';
    }

    private static function appName(): string
    {
        return (string) config('app.name');
    }

    private static function formatAmount(int $cents, string $currency): string
    {
        $amount = $cents / 100;
        $currency = strtoupper($currency);

        $symbols = [
            'USD' => '$',
            'EUR' => '€',
            'GBP' => '£',
            'RUB' => '₽',
            'UAH' => '₴',
        ];
        $symbol = $symbols[$currency] ?? '';

        $formatted = number_format($amount, 2, '.', ',');

        if ($symbol !== '') {
            return $cents < 0
                ? '-'.$symbol.number_format(abs($amount), 2, '.', ',')
                : $symbol.$formatted;
        }

        return $formatted.' '.$currency;
    }

    private static function formatDate($timestamp, string $locale, bool $dateOnly = false): string
    {
        if (!$timestamp) {
            return '—';
        }
        try {
            $carbon = Carbon::createFromTimestamp((int) $timestamp);
        } catch (\Throwable $e) {
            return '—';
        }

        return $dateOnly
            ? $carbon->isoFormat('D MMM YYYY')
            : $carbon->isoFormat('D MMM YYYY, HH:mm');
    }
}

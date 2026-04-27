<?php

namespace App\Services;

use App\Models\Advertisement;
use App\Models\Company;
use App\Models\User;
use App\Support\PasswordResetMailLocale;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Письмо-«чек» после оплаты рекламного размещения (тот же шаблон, что у подписки).
 */
class AdvertisementPurchaseMailer
{
    private const CACHE_PREFIX = 'advertisement_purchase_mailer:session:';

    public static function notifyPaymentCompleted(Advertisement $advertisement, object $session, string $packageId): void
    {
        $sessionId = (string) ($session->id ?? '');
        if ($sessionId === '') {
            return;
        }

        if (! Cache::add(self::CACHE_PREFIX.$sessionId, 1, now()->addDays(30))) {
            Log::info('AdvertisementPurchaseMailer: duplicate session skipped', ['session_id' => $sessionId]);

            return;
        }

        $company = Company::find($advertisement->company_id);
        $owner = $company ? User::find($company->owner_id) : null;
        $sessionEmail = '';
        if (isset($session->customer_details) && is_object($session->customer_details)) {
            $sessionEmail = trim((string) ($session->customer_details->email ?? ''));
        }
        if ($sessionEmail === '' && isset($session->customer_email)) {
            $sessionEmail = trim((string) $session->customer_email);
        }
        $recipient = self::resolveRecipientEmail($company, $owner, $sessionEmail !== '' ? $sessionEmail : null);
        if (! $recipient) {
            Log::warning('AdvertisementPurchaseMailer: no recipient email', [
                'advertisement_id' => $advertisement->id,
                'company_id' => $advertisement->company_id,
            ]);
            Cache::forget(self::CACHE_PREFIX.$sessionId);

            return;
        }

        $locale = PasswordResetMailLocale::toMailLang($owner?->locale ?? 'en') ?? 'en';
        $appName = (string) config('app.name');
        $packageKey = in_array($packageId, ['basic', 'standard', 'premium'], true) ? $packageId : 'basic';
        $packageLabel = __('mail.advertisement_purchase.packages.'.$packageKey, [], $locale);

        $listingTitle = is_string($advertisement->title) && trim($advertisement->title) !== ''
            ? $advertisement->title
            : ('#'.$advertisement->id);

        $start = $advertisement->start_date
            ? $advertisement->start_date->isoFormat('D MMM YYYY')
            : '—';
        $end = $advertisement->end_date
            ? $advertisement->end_date->isoFormat('D MMM YYYY')
            : '—';
        $period = $start.' — '.$end;

        $cents = (int) ($session->amount_total ?? 0);
        $currency = strtolower((string) ($session->currency ?? 'usd'));
        $amount = self::formatAmount($cents, $currency);
        $paidAt = now()->locale($locale)->isoFormat('D MMM YYYY, HH:mm');

        $subject = __('mail.advertisement_purchase.subject', ['app' => $appName], $locale);
        $intro = __('mail.advertisement_purchase.intro', ['app' => $appName], $locale);
        $preheader = __('mail.advertisement_purchase.preheader', ['title' => $subject, 'app' => $appName], $locale);
        $noteText = __('mail.advertisement_purchase.note', ['app' => $appName], $locale);
        $footerText = __('mail.advertisement_purchase.footer', ['app' => $appName], $locale);
        $actionLabel = __('mail.advertisement_purchase.open_list', [], $locale);
        $base = rtrim((string) config('app.frontend_url'), '/');
        $actionPath = '/business/advertisements';
        $actionUrl = $base === '' ? $actionPath : $base.$actionPath;

        $fields = [
            ['label' => __('mail.advertisement_purchase.fields.listing', [], $locale), 'value' => $listingTitle],
            ['label' => __('mail.advertisement_purchase.fields.package', [], $locale), 'value' => $packageLabel],
            ['label' => __('mail.advertisement_purchase.fields.period', [], $locale), 'value' => $period],
            ['label' => __('mail.advertisement_purchase.fields.receipt', [], $locale), 'value' => $sessionId],
            ['label' => __('mail.advertisement_purchase.fields.paid_at', [], $locale), 'value' => $paidAt],
        ];

        $total = [
            'label' => __('mail.advertisement_purchase.fields.amount', [], $locale),
            'value' => $amount,
        ];

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
                function ($message) use ($recipient, $subject) {
                    $message->to($recipient)->subject($subject);
                }
            );
            Log::info('AdvertisementPurchaseMailer: email sent', ['to' => $recipient, 'session_id' => $sessionId]);
        } catch (\Throwable $e) {
            Log::error('AdvertisementPurchaseMailer: send failed', [
                'session_id' => $sessionId,
                'error' => $e->getMessage(),
            ]);
            Cache::forget(self::CACHE_PREFIX.$sessionId);
        }
    }

    private static function resolveRecipientEmail(?Company $company, ?User $owner, ?string $checkoutEmail = null): ?string
    {
        foreach ([$company?->email, $owner?->email, $checkoutEmail] as $candidate) {
            $value = is_string($candidate) ? trim($candidate) : '';
            if ($value !== '' && filter_var($value, FILTER_VALIDATE_EMAIL)) {
                return $value;
            }
        }

        return null;
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

        return $symbol !== '' ? $symbol.$formatted : $formatted.' '.$currency;
    }
}

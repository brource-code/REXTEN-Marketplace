<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Stripe\Customer as StripeCustomer;
use Stripe\Price as StripePrice;
use Stripe\Product as StripeProduct;
use Stripe\Stripe;
use Stripe\Subscription as StripeSubscription;

/**
 * Управление recurring Stripe Subscriptions.
 *
 * Stripe — источник истины по жизненному циклу подписки: продление, оплата, cancel_at_period_end.
 * Локальная запись Subscription зеркалирует Stripe-данные через webhook'и
 * (customer.subscription.updated/deleted, invoice.payment_succeeded/failed).
 */
class StripeSubscriptionService
{
    public static function init(): void
    {
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    /**
     * Найти или создать Stripe Customer для владельца бизнеса.
     */
    public static function ensureCustomer(User $user, ?Company $company = null): string
    {
        self::init();

        if ($user->stripe_customer_id) {
            return $user->stripe_customer_id;
        }

        $user->loadMissing('profile');
        $profile = $user->profile;
        $first = $profile?->first_name ?? '';
        $last = $profile?->last_name ?? '';
        $name = trim($first.' '.$last);
        if ($name === '') {
            $name = $company?->name ?? $user->email;
        }

        $customer = StripeCustomer::create([
            'email' => $user->email,
            'name' => $name,
            'metadata' => [
                'app_user_id' => (string) $user->id,
                'app_company_id' => $company ? (string) $company->id : '',
            ],
        ]);

        $user->forceFill(['stripe_customer_id' => $customer->id])->save();

        return $customer->id;
    }

    /**
     * Найти или lazy-создать Stripe Product+Price для плана и интервала.
     * Возвращает stripe_price_id, готовый к использованию в Subscription/Checkout.
     */
    public static function ensurePrice(SubscriptionPlan $plan, string $interval): string
    {
        self::init();

        if ($plan->is_free) {
            throw new \InvalidArgumentException('Free plan has no Stripe price');
        }

        $interval = $interval === 'year' ? 'year' : 'month';
        $field = $interval === 'year' ? 'stripe_price_id_yearly' : 'stripe_price_id_monthly';

        $existing = $plan->{$field};
        if ($existing) {
            return $existing;
        }

        if (!$plan->stripe_product_id) {
            $product = StripeProduct::create([
                'name' => "REXTEN {$plan->name} Plan",
                'metadata' => [
                    'plan_slug' => $plan->slug,
                ],
            ]);
            $plan->forceFill(['stripe_product_id' => $product->id])->save();
        }

        $unitAmount = $interval === 'year'
            ? (int) $plan->price_yearly_cents
            : (int) $plan->price_monthly_cents;

        if ($unitAmount <= 0) {
            throw new \RuntimeException("Plan {$plan->slug} has no price for interval {$interval}");
        }

        $price = StripePrice::create([
            'product' => $plan->stripe_product_id,
            'unit_amount' => $unitAmount,
            'currency' => strtolower((string) ($plan->currency ?: 'usd')),
            'recurring' => [
                'interval' => $interval,
            ],
            'metadata' => [
                'plan_slug' => $plan->slug,
                'interval' => $interval,
            ],
        ]);

        $plan->forceFill([$field => $price->id])->save();

        return $price->id;
    }

    /**
     * Запросить Stripe о cancel_at_period_end (true — отмена в конце периода, false — снять отмену).
     * Возвращает обновлённый объект Stripe Subscription.
     */
    public static function setCancelAtPeriodEnd(string $stripeSubscriptionId, bool $cancel): StripeSubscription
    {
        self::init();
        return StripeSubscription::update($stripeSubscriptionId, [
            'cancel_at_period_end' => $cancel,
        ]);
    }

    /**
     * Полная отмена немедленно (без ожидания периода). Используем редко — только если требуется срочно.
     */
    public static function cancelImmediately(string $stripeSubscriptionId): StripeSubscription
    {
        self::init();
        $sub = StripeSubscription::retrieve($stripeSubscriptionId);
        return $sub->cancel();
    }

    /**
     * Сменить price подписки (upgrade/downgrade в любой момент периода).
     *
     * Для апгрейда передавайте $prorationBehavior='always_invoice' и
     * $paymentBehavior='error_if_incomplete' — это заставит Stripe немедленно
     * выпустить invoice с прорацией и попытаться его оплатить. Если оплата
     * не пройдёт — Stripe выбросит CardException и subscription **не**
     * обновится; локально мы тоже ничего не меняем.
     *
     * Для запланированного даунгрейда (cron в конце периода) используйте
     * $prorationBehavior='none', $paymentBehavior='allow_incomplete' — там
     * сразу списывать ничего не нужно.
     *
     * @param  string  $prorationBehavior  'always_invoice' | 'create_prorations' | 'none'
     * @param  string  $paymentBehavior    'error_if_incomplete' | 'pending_if_incomplete' | 'allow_incomplete'
     */
    public static function changePrice(
        string $stripeSubscriptionId,
        string $newPriceId,
        string $prorationBehavior = 'always_invoice',
        string $paymentBehavior = 'error_if_incomplete'
    ): StripeSubscription {
        self::init();
        $sub = StripeSubscription::retrieve($stripeSubscriptionId);
        $itemId = $sub->items->data[0]->id ?? null;
        if (!$itemId) {
            throw new \RuntimeException('Stripe subscription has no items');
        }

        return StripeSubscription::update($stripeSubscriptionId, [
            'items' => [[
                'id' => $itemId,
                'price' => $newPriceId,
            ]],
            'proration_behavior' => $prorationBehavior,
            'payment_behavior' => $paymentBehavior,
        ]);
    }

    /**
     * Синхронизировать локальную Subscription из Stripe-объекта.
     * Используется в webhook'ах customer.subscription.* и при ручной сверке.
     */
    public static function syncFromStripe(Subscription $local, $stripeSub): void
    {
        $statusMap = [
            'active' => Subscription::STATUS_ACTIVE,
            'trialing' => Subscription::STATUS_TRIALING,
            'past_due' => Subscription::STATUS_PAST_DUE,
            'unpaid' => Subscription::STATUS_PAST_DUE,
            'canceled' => Subscription::STATUS_CANCELED,
            'incomplete' => Subscription::STATUS_PAST_DUE,
            'incomplete_expired' => Subscription::STATUS_CANCELED,
        ];

        $localStatus = $statusMap[$stripeSub->status] ?? Subscription::STATUS_ACTIVE;

        // С Stripe API 2025-09+ current_period_start/end переехали с самого Subscription
        // на каждый item в items.data[N]. Старое поле остаётся null.
        $periodStartTs = $stripeSub->current_period_start
            ?? ($stripeSub->items->data[0]->current_period_start ?? null);
        $periodEndTs = $stripeSub->current_period_end
            ?? ($stripeSub->items->data[0]->current_period_end ?? null);

        $periodStart = $periodStartTs
            ? \Carbon\Carbon::createFromTimestamp($periodStartTs)
            : null;
        $periodEnd = $periodEndTs
            ? \Carbon\Carbon::createFromTimestamp($periodEndTs)
            : null;

        $cancelAtPeriodEnd = (bool) ($stripeSub->cancel_at_period_end ?? false);
        $canceledAtTs = $stripeSub->canceled_at ?? null;
        // Если cancel_at_period_end=true — для UI ставим canceled_at=сейчас (момент запроса отмены).
        $canceledAt = $canceledAtTs
            ? \Carbon\Carbon::createFromTimestamp($canceledAtTs)
            : ($cancelAtPeriodEnd ? ($local->canceled_at ?? now()) : null);

        $local->forceFill([
            'status' => $localStatus,
            'current_period_start' => $periodStart ?? $local->current_period_start,
            'current_period_end' => $periodEnd ?? $local->current_period_end,
            'cancel_at_period_end' => $cancelAtPeriodEnd,
            'canceled_at' => $canceledAt,
        ])->save();

        Log::info('Local subscription synced from Stripe', [
            'local_id' => $local->id,
            'stripe_subscription_id' => $stripeSub->id,
            'status' => $localStatus,
            'cancel_at_period_end' => $cancelAtPeriodEnd,
        ]);
    }
}

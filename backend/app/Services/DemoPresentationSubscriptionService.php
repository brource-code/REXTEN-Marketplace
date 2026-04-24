<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\TeamMember;
use Illuminate\Support\Facades\DB;

/**
 * Для публичных демо-аккаунтов: Free даёт max_team_members=1, а сиды создают
 * нескольких выездных специалистов — второй оказывается неактивен или его
 * нельзя стабильно назначать в бронях. Выставляем внутреннюю «презентационную»
 * подписку Starter (без Stripe) и реактивируем сидированных по email @demo.rexten.internal.
 */
final class DemoPresentationSubscriptionService
{
    public static function ensureStarterForDemoCompany(int $companyId): void
    {
        $plan = SubscriptionPlan::findBySlug('starter');
        if ($plan === null) {
            return;
        }

        DB::transaction(function () use ($companyId, $plan) {
            Subscription::query()
                ->where('company_id', $companyId)
                ->where('status', Subscription::STATUS_ACTIVE)
                ->update([
                    'status' => Subscription::STATUS_CANCELED,
                    'canceled_at' => now(),
                    'cancel_at_period_end' => false,
                ]);

            Subscription::query()->create([
                'company_id' => $companyId,
                'plan' => $plan->slug,
                'status' => Subscription::STATUS_ACTIVE,
                'price_cents' => 0,
                'currency' => strtolower((string) ($plan->currency ?: 'usd')),
                'interval' => 'month',
                'current_period_start' => now(),
                'current_period_end' => now()->addYear(),
            ]);
        });

        TeamMember::query()
            ->where('company_id', $companyId)
            ->where('email', 'like', '%@demo.rexten.internal')
            ->update([
                'is_active' => true,
                'status' => 'active',
            ]);
    }
}

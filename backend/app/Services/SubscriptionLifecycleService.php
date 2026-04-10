<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubscriptionLifecycleService
{
    /**
     * Закрыть истёкшие подписки компании: запланированный даунгрейд или отмена → free.
     */
    public static function finalizeExpiredForCompany(int $companyId): void
    {
        $subs = Subscription::where('company_id', $companyId)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->whereNotNull('current_period_end')
            ->where('current_period_end', '<=', now())
            ->where(function ($q) {
                $q->whereNotNull('canceled_at')
                    ->orWhereNotNull('scheduled_plan');
            })
            ->get();

        foreach ($subs as $sub) {
            if ($sub->scheduled_plan && !$sub->canceled_at) {
                self::applyScheduledDowngrade($sub);
            } elseif ($sub->canceled_at) {
                self::applyCancelToFree($sub);
            }
        }
    }

    /**
     * Обработать все компании (cron).
     *
     * @return int количество компаний, для которых вызвана финализация
     */
    public static function finalizeExpiredForAll(): int
    {
        $ids = Subscription::query()
            ->where('status', Subscription::STATUS_ACTIVE)
            ->whereNotNull('current_period_end')
            ->where('current_period_end', '<=', now())
            ->where(function ($q) {
                $q->whereNotNull('canceled_at')
                    ->orWhereNotNull('scheduled_plan');
            })
            ->distinct()
            ->pluck('company_id');

        foreach ($ids as $companyId) {
            self::finalizeExpiredForCompany((int) $companyId);
        }

        return $ids->count();
    }

    private static function applyScheduledDowngrade(Subscription $sub): void
    {
        $newSlug = $sub->scheduled_plan;
        $planModel = SubscriptionPlan::findBySlug($newSlug);
        if (!$planModel || !$planModel->is_active) {
            Log::warning('Scheduled downgrade: invalid plan', [
                'subscription_id' => $sub->id,
                'scheduled_plan' => $newSlug,
            ]);
            return;
        }

        DB::transaction(function () use ($sub, $planModel) {
            $companyId = (int) $sub->company_id;
            $oldPlanSlug = $sub->plan;

            $sub->update(['status' => Subscription::STATUS_CANCELED]);

            $priceCents = $sub->interval === 'year'
                ? $planModel->price_yearly_cents
                : $planModel->price_monthly_cents;

            $periodEnd = $planModel->is_free
                ? null
                : ($sub->interval === 'year' ? now()->addYear() : now()->addMonth());

            Subscription::create([
                'company_id' => $companyId,
                'plan' => $planModel->slug,
                'status' => Subscription::STATUS_ACTIVE,
                'price_cents' => $priceCents,
                'currency' => $planModel->currency,
                'interval' => $sub->interval ?? 'month',
                'current_period_start' => now(),
                'current_period_end' => $periodEnd,
                'grace_period_ends_at' => now()->addDays(max(1, (int) config('subscription.grace_period_days', 7))),
                'previous_plan' => $oldPlanSlug,
                'scheduled_plan' => null,
            ]);

            Log::info('Scheduled downgrade applied', [
                'company_id' => $companyId,
                'from_plan' => $oldPlanSlug,
                'to_plan' => $planModel->slug,
            ]);
        });
    }

    private static function applyCancelToFree(Subscription $sub): void
    {
        DB::transaction(function () use ($sub) {
            $companyId = (int) $sub->company_id;
            $oldPlan = $sub->plan;

            $sub->update(['status' => Subscription::STATUS_CANCELED]);

            $default = SubscriptionPlan::getDefault();
            if (!$default) {
                Log::error('No default plan for cancel-to-free', ['company_id' => $companyId]);
                return;
            }

            Subscription::create([
                'company_id' => $companyId,
                'plan' => $default->slug,
                'status' => Subscription::STATUS_ACTIVE,
                'price_cents' => $default->price_monthly_cents,
                'currency' => $default->currency,
                'interval' => 'month',
                'current_period_start' => now(),
                'current_period_end' => $default->is_free ? null : now()->addMonth(),
                'grace_period_ends_at' => now()->addDays(max(1, (int) config('subscription.grace_period_days', 7))),
                'previous_plan' => $oldPlan,
                'scheduled_plan' => null,
            ]);

            Log::info('Subscription moved to free after cancel', [
                'company_id' => $companyId,
                'previous_plan' => $oldPlan,
            ]);
        });
    }
}

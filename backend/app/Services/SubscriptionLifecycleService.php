<?php

namespace App\Services;

use App\Models\Advertisement;
use App\Models\Company;
use App\Models\CompanyUser;
use App\Models\Service;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\TeamMember;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubscriptionLifecycleService
{
    /**
     * Закрыть истёкшие подписки компании: запланированный даунгрейд или отмена → free.
     * Также обрабатываются истёкшие триалы (trial_ends_at <= now без оформленной Stripe-подписки).
     */
    public static function finalizeExpiredForCompany(int $companyId): void
    {
        // 1) Истёкшие триалы без оформленного Stripe (компания так и не оплатила) → free.
        $expiredTrials = Subscription::where('company_id', $companyId)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->whereNull('stripe_subscription_id')
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<=', now())
            ->get();

        foreach ($expiredTrials as $trialSub) {
            self::applyCancelToFree($trialSub);
        }

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
            // Recurring-подписки с активным Stripe ID (включая cancel_at_period_end и
            // scheduled_plan через Stripe Subscription Schedule): Stripe сам пришлёт
            // customer.subscription.updated/deleted в конце периода, наш cron не вмешивается.
            if ($sub->stripe_subscription_id && (
                ! $sub->scheduled_plan
                || $sub->stripe_subscription_schedule_id
            )) {
                continue;
            }

            if ($sub->scheduled_plan && ! $sub->canceled_at) {
                if ($sub->stripe_subscription_id) {
                    // Fallback для подписок, у которых scheduled_plan есть, но schedule_id нет
                    // (созданы до перехода на Subscription Schedules) — добиваем старым путём.
                    self::applyScheduledDowngradeViaStripe($sub);
                } else {
                    self::applyScheduledDowngrade($sub);
                }
            } elseif ($sub->canceled_at && ! $sub->stripe_subscription_id) {
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
        // Берём только подписки, которые требуют действия от cron'а:
        //   - legacy (без stripe_subscription_id) с canceled_at или scheduled_plan,
        //   - recurring со scheduled_plan, но без активного Stripe Subscription Schedule
        //     (fallback для устаревших записей).
        // Recurring без scheduled_plan (включая cancel_at_period_end) и recurring со
        // scheduled_plan + Stripe Subscription Schedule обрабатывает сам Stripe через
        // webhook customer.subscription.deleted/updated.
        $ids = Subscription::query()
            ->where('status', Subscription::STATUS_ACTIVE)
            ->where(function ($main) {
                $main->where(function ($q) {
                    // Триал истёк, оплаченной Stripe-подписки нет → переводим на free.
                    $q->whereNotNull('trial_ends_at')
                        ->where('trial_ends_at', '<=', now())
                        ->whereNull('stripe_subscription_id');
                })->orWhere(function ($q) {
                    $q->whereNotNull('current_period_end')
                        ->where('current_period_end', '<=', now())
                        ->where(function ($qq) {
                            $qq->where(function ($qqq) {
                                $qqq->whereNotNull('scheduled_plan')
                                    ->whereNull('stripe_subscription_schedule_id');
                            })->orWhere(function ($qqq) {
                                $qqq->whereNotNull('canceled_at')
                                    ->whereNull('stripe_subscription_id');
                            });
                        });
                });
            })
            ->distinct()
            ->pluck('company_id');

        $appTz = (string) config('app.timezone');
        foreach ($ids as $companyId) {
            date_default_timezone_set(Company::timezoneById((int) $companyId));
            self::finalizeExpiredForCompany((int) $companyId);
        }
        date_default_timezone_set($appTz);

        return $ids->count();
    }

    /**
     * Запланированный downgrade для recurring Stripe-подписки.
     * В конце периода меняем price в Stripe (без прорации = без возврата за остаток),
     * локально обновляем plan/price/period через syncFromStripe из ответа.
     * grace_period_ends_at не ставим — клиент сам выбирал план, лишнее деактивируется по cron'у.
     */
    private static function applyScheduledDowngradeViaStripe(Subscription $sub): void
    {
        $newSlug = $sub->scheduled_plan;
        $planModel = SubscriptionPlan::findBySlug($newSlug);
        if (!$planModel || !$planModel->is_active) {
            Log::warning('Scheduled downgrade (Stripe): invalid plan', [
                'subscription_id' => $sub->id,
                'scheduled_plan' => $newSlug,
            ]);
            return;
        }

        if ($planModel->is_free) {
            // Free план без recurring price — отменяем Stripe-подписку, дальше webhook subscription.deleted
            // вызовет handleSubscriptionDeleted → applyCancelToFree.
            try {
                StripeSubscriptionService::cancelImmediately($sub->stripe_subscription_id);
            } catch (\Exception $e) {
                Log::error('Failed to cancel Stripe subscription on scheduled downgrade to free', [
                    'subscription_id' => $sub->id,
                    'error' => $e->getMessage(),
                ]);
            }
            return;
        }

        try {
            $newPriceId = StripeSubscriptionService::ensurePrice($planModel, $sub->interval ?? 'month');
            $stripeSub = StripeSubscriptionService::changePrice(
                $sub->stripe_subscription_id,
                $newPriceId,
                'none',
                'allow_incomplete'
            );

            $unitAmount = $stripeSub->items->data[0]->price->unit_amount ?? 0;
            $currency = strtolower($stripeSub->items->data[0]->price->currency ?? $sub->currency);

            $sub->forceFill([
                'plan' => $planModel->slug,
                'previous_plan' => $sub->plan,
                'scheduled_plan' => null,
                'stripe_price_id' => $newPriceId,
                'price_cents' => (int) $unitAmount,
                'currency' => $currency,
                'grace_period_ends_at' => now()->addDays(max(1, (int) config('subscription.grace_period_days', 7))),
            ])->save();
            StripeSubscriptionService::syncFromStripe($sub, $stripeSub);

            Log::info('Scheduled downgrade applied via Stripe', [
                'company_id' => $sub->company_id,
                'to_plan' => $planModel->slug,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to apply scheduled downgrade via Stripe', [
                'subscription_id' => $sub->id,
                'error' => $e->getMessage(),
            ]);
        }
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

    /**
     * Если у компании истёк grace-период и активные ресурсы превышают лимит,
     * автоматически деактивируем «лишние» (newest-first), чтобы привести к плану.
     *
     * @return array<string, int> map ресурс → сколько штук было деактивировано
     */
    public static function enforceLimitsAfterGraceForCompany(int $companyId): array
    {
        $sub = SubscriptionLimitService::getActiveSubscription($companyId);
        if (!$sub) {
            return [];
        }
        $graceEnds = $sub->grace_period_ends_at;
        // Триггерим только когда grace был задан и уже истёк.
        if (!$graceEnds || $graceEnds->isFuture()) {
            return [];
        }

        $details = SubscriptionLimitService::getOverLimitDetails($companyId);
        if (empty($details['is_over_limit'])) {
            // Лимит соблюдён — отметим grace как обработанный, чтобы не дёргать впустую.
            $sub->forceFill(['grace_period_ends_at' => null])->save();
            return [];
        }

        $deactivated = [];

        DB::transaction(function () use ($companyId, $details, &$deactivated) {
            foreach ($details['resources'] as $resource => $info) {
                $overBy = (int) ($info['over_by'] ?? 0);
                if ($overBy <= 0) {
                    continue;
                }
                $deactivated[$resource] = self::deactivateExcess($companyId, $resource, $overBy);
            }
        });

        // Помечаем grace как обработанный, чтобы крон не повторял enforcement.
        $sub->forceFill(['grace_period_ends_at' => null])->save();

        Log::info('Subscription enforce after grace', [
            'company_id' => $companyId,
            'deactivated' => $deactivated,
        ]);

        return $deactivated;
    }

    /**
     * Прогон по всем компаниям с истёкшим grace-периодом.
     *
     * @return int количество компаний, для которых были применены деактивации
     */
    public static function enforceLimitsAfterGraceForAll(): int
    {
        $ids = Subscription::query()
            ->where('status', Subscription::STATUS_ACTIVE)
            ->whereNotNull('grace_period_ends_at')
            ->where('grace_period_ends_at', '<=', now())
            ->distinct()
            ->pluck('company_id');

        $appTz = (string) config('app.timezone');
        $touched = 0;
        foreach ($ids as $companyId) {
            date_default_timezone_set(Company::timezoneById((int) $companyId));
            $result = self::enforceLimitsAfterGraceForCompany((int) $companyId);
            if (!empty($result)) {
                $touched++;
            }
        }
        date_default_timezone_set($appTz);

        return $touched;
    }

    /**
     * Деактивирует $count «лишних» сущностей данного ресурса (newest-first).
     */
    private static function deactivateExcess(int $companyId, string $resource, int $count): int
    {
        if ($count <= 0) {
            return 0;
        }

        switch ($resource) {
            case 'team_members':
                // Сначала приглашённые сотрудники (CompanyUser, кроме owner), потом специалисты — newest first.
                $staff = CompanyUser::where('company_id', $companyId)
                    ->where('is_active', true)
                    ->whereHas('company', function ($q) {
                        $q->whereColumn('owner_id', '!=', 'company_users.user_id');
                    })
                    ->orderByDesc('id')
                    ->limit($count)
                    ->pluck('id')
                    ->all();
                $deactivatedStaff = 0;
                if (!empty($staff)) {
                    $deactivatedStaff = CompanyUser::whereIn('id', $staff)
                        ->update(['is_active' => false]);
                }
                $remain = $count - $deactivatedStaff;
                $deactivatedSpecialists = 0;
                if ($remain > 0) {
                    $specialists = TeamMember::where('company_id', $companyId)
                        ->where('is_active', true)
                        ->orderByDesc('sort_order')
                        ->orderByDesc('id')
                        ->limit($remain)
                        ->pluck('id')
                        ->all();
                    if (!empty($specialists)) {
                        $deactivatedSpecialists = TeamMember::whereIn('id', $specialists)
                            ->update(['is_active' => false, 'status' => 'inactive']);
                    }
                }
                return (int) ($deactivatedStaff + $deactivatedSpecialists);

            case 'services':
                $ids = Service::where('company_id', $companyId)
                    ->where('is_active', true)
                    ->orderByDesc('id')
                    ->limit($count)
                    ->pluck('id')
                    ->all();
                if (empty($ids)) {
                    return 0;
                }
                return (int) Service::whereIn('id', $ids)->update(['is_active' => false]);

            case 'advertisements':
                $ids = Advertisement::where('company_id', $companyId)
                    ->where('is_active', true)
                    ->orderByDesc('id')
                    ->limit($count)
                    ->pluck('id')
                    ->all();
                if (empty($ids)) {
                    return 0;
                }
                return (int) Advertisement::whereIn('id', $ids)->update(['is_active' => false]);
        }

        return 0;
    }

    /**
     * Публичная обёртка для перевода на free (используется webhook'ом customer.subscription.deleted).
     */
    public static function transitionToFree(Subscription $sub): void
    {
        self::applyCancelToFree($sub);
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

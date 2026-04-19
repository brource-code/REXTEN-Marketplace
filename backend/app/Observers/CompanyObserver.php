<?php

namespace App\Observers;

use App\Models\Company;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use Illuminate\Support\Facades\Log;

class CompanyObserver
{
    public function created(Company $company): void
    {
        $this->createDefaultSubscription($company);
    }

    private function createDefaultSubscription(Company $company): void
    {
        $existingSub = Subscription::where('company_id', $company->id)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->exists();

        if ($existingSub) {
            return;
        }

        // Новой компании при возможности выдаём бесплатный триал на платном плане
        // (например Professional 14 дней). Если триальный план не настроен — fallback на free.
        $trialPlan = SubscriptionPlan::getTrialDefault();

        if ($trialPlan) {
            try {
                $trialEnds = now()->addDays((int) $trialPlan->trial_days);
                Subscription::create([
                    'company_id' => $company->id,
                    'plan' => $trialPlan->slug,
                    'status' => Subscription::STATUS_ACTIVE,
                    'price_cents' => $trialPlan->price_monthly_cents,
                    'currency' => $trialPlan->currency,
                    'interval' => 'month',
                    'current_period_start' => now(),
                    // Подписка живёт до конца триала; cron в LifecycleService переведёт на free,
                    // если за это время компания не оформила платную подписку через Stripe.
                    'current_period_end' => $trialEnds,
                    'trial_ends_at' => $trialEnds,
                ]);

                Log::info('Trial subscription created for company', [
                    'company_id' => $company->id,
                    'plan' => $trialPlan->slug,
                    'trial_days' => $trialPlan->trial_days,
                    'trial_ends_at' => $trialEnds->toISOString(),
                ]);
                return;
            } catch (\Exception $e) {
                Log::error('Failed to create trial subscription, falling back to default', [
                    'company_id' => $company->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $defaultPlan = SubscriptionPlan::getDefault();

        if (!$defaultPlan) {
            Log::warning('No default subscription plan found', ['company_id' => $company->id]);
            return;
        }

        try {
            Subscription::create([
                'company_id' => $company->id,
                'plan' => $defaultPlan->slug,
                'status' => Subscription::STATUS_ACTIVE,
                'price_cents' => $defaultPlan->price_monthly_cents,
                'currency' => $defaultPlan->currency,
                'interval' => 'month',
                'current_period_start' => now(),
                'current_period_end' => $defaultPlan->is_free ? null : now()->addMonth(),
            ]);

            Log::info('Default subscription created for company', [
                'company_id' => $company->id,
                'plan' => $defaultPlan->slug,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create default subscription', [
                'company_id' => $company->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}

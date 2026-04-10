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

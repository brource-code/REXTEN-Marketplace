<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\CompanyUser;
use App\Models\Service;
use App\Models\TeamMember;
use App\Models\Advertisement;
use App\Services\PlatformSettingsService;
use App\Services\SubscriptionLifecycleService;
use App\Services\SubscriptionLimitService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Stripe;
use Stripe\Checkout\Session;

class SubscriptionController extends Controller
{
    public function __construct()
    {
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    /**
     * Список доступных планов (из БД)
     */
    public function plans()
    {
        $plans = SubscriptionPlan::where('is_active', true)
            ->where('is_free', false)
            ->orderBy('sort_order')
            ->get()
            ->map(fn($plan) => [
                'id' => $plan->slug,
                'name' => $plan->name,
                'description' => $plan->description,
                'price_monthly' => $plan->getPriceMonthly(),
                'price_yearly' => $plan->getPriceYearly(),
                'features' => $plan->features,
                'badge_text' => $plan->badge_text,
                'color' => $plan->color,
                'sort_order' => $plan->sort_order,
                'is_free' => $plan->is_free,
            ]);

        return response()->json(['plans' => $plans]);
    }

    /**
     * Использование лимитов и фич по текущему плану
     */
    public function usage(Request $request)
    {
        $companyId = $this->resolveCompanyId($request);
        if (!$companyId) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        SubscriptionLifecycleService::finalizeExpiredForCompany((int) $companyId);

        return response()->json(SubscriptionLimitService::getUsage($companyId));
    }

    /**
     * Текущая подписка компании
     */
    public function current(Request $request)
    {
        $companyId = $this->resolveCompanyId($request);
        if (!$companyId) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        SubscriptionLifecycleService::finalizeExpiredForCompany((int) $companyId);

        $subscription = Subscription::where('company_id', $companyId)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->latest()
            ->first();

        if (!$subscription) {
            return response()->json([
                'subscription' => null,
                'plan' => null,
            ]);
        }

        $planModel = SubscriptionPlan::findBySlug($subscription->plan);

        return response()->json([
            'subscription' => [
                'id' => $subscription->id,
                'plan' => $subscription->plan,
                'status' => $subscription->status,
                'price' => $subscription->price_cents / 100,
                'currency' => $subscription->currency,
                'interval' => $subscription->interval,
                'current_period_start' => $subscription->current_period_start?->toISOString(),
                'current_period_end' => $subscription->current_period_end?->toISOString(),
                'canceled_at' => $subscription->canceled_at?->toISOString(),
                'cancellation_scheduled' => $subscription->canceled_at !== null,
                'scheduled_plan' => $subscription->scheduled_plan,
                'grace_period_ends_at' => $subscription->grace_period_ends_at?->toISOString(),
                'previous_plan' => $subscription->previous_plan,
                'is_active' => $subscription->isActive(),
                'is_free' => $planModel?->is_free ?? false,
            ],
            'plan' => $planModel ? [
                'name' => $planModel->name,
                'features' => $planModel->features,
                'color' => $planModel->color,
            ] : null,
        ]);
    }

    /**
     * Создать Stripe Checkout Session для подписки
     */
    public function createCheckoutSession(Request $request)
    {
        if (!PlatformSettingsService::isStripePaymentsEnabled()) {
            return response()->json([
                'error' => 'stripe_disabled',
                'message' => 'Stripe payments are disabled.',
            ], 403);
        }

        $validated = $request->validate([
            'plan' => 'required|string|exists:subscription_plans,slug',
            'interval' => 'required|in:month,year',
        ]);

        $user = auth('api')->user();
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        $planModel = SubscriptionPlan::findBySlug($validated['plan']);
        
        if (!$planModel || !$planModel->is_active) {
            return response()->json(['error' => 'Invalid or inactive plan'], 422);
        }

        if ($planModel->is_free) {
            return response()->json(['error' => 'Cannot purchase free plan'], 422);
        }

        return $this->createCheckoutSessionInternal(
            $request,
            $validated['plan'],
            $validated['interval'],
            $user,
            (int) $companyId,
            false
        );
    }

    /**
     * Запланировать отмену: доступ сохраняется до current_period_end, затем перевод на бесплатный план.
     */
    public function cancel(Request $request)
    {
        $companyId = $this->resolveCompanyId($request);
        if (!$companyId) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        $subscription = Subscription::where('company_id', $companyId)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->first();

        if (!$subscription) {
            return response()->json(['error' => 'No active subscription'], 404);
        }

        $planModel = SubscriptionPlan::findBySlug($subscription->plan);
        if ($planModel?->is_free) {
            return response()->json([
                'error' => 'cannot_cancel_free',
                'message' => 'Free plan cannot be canceled.',
            ], 422);
        }

        if ($subscription->canceled_at) {
            return response()->json([
                'error' => 'already_scheduled',
                'message' => 'Cancellation is already scheduled.',
            ], 422);
        }

        $subscription->update([
            'canceled_at' => now(),
            'scheduled_plan' => null,
        ]);

        Log::info('Subscription canceled (access until period end)', [
            'subscription_id' => $subscription->id,
            'company_id' => $companyId,
            'current_period_end' => $subscription->current_period_end?->toISOString(),
        ]);

        return response()->json([
            'message' => 'Subscription canceled. Access remains until the end of the billing period.',
            'canceled_at' => $subscription->fresh()->canceled_at?->toISOString(),
        ]);
    }

    /**
     * Отменить отмену: снять canceled_at, пока период не закончился (клиент передумал).
     */
    public function resume(Request $request)
    {
        $companyId = $this->resolveCompanyId($request);
        if (!$companyId) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        SubscriptionLifecycleService::finalizeExpiredForCompany((int) $companyId);

        $subscription = Subscription::where('company_id', $companyId)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->first();

        if (!$subscription) {
            return response()->json(['error' => 'No active subscription'], 404);
        }

        $planModel = SubscriptionPlan::findBySlug($subscription->plan);
        if ($planModel?->is_free) {
            return response()->json([
                'error' => 'cannot_resume_free',
                'message' => 'Free plan cannot be resumed.',
            ], 422);
        }

        if (!$subscription->canceled_at) {
            return response()->json([
                'error' => 'not_canceled',
                'message' => 'Subscription is not canceled.',
            ], 422);
        }

        if ($subscription->current_period_end && $subscription->current_period_end->isPast()) {
            return response()->json([
                'error' => 'period_ended',
                'message' => 'Billing period has already ended.',
            ], 422);
        }

        $subscription->update(['canceled_at' => null]);

        Log::info('Subscription cancellation withdrawn (resumed)', [
            'subscription_id' => $subscription->id,
            'company_id' => $companyId,
        ]);

        return response()->json([
            'message' => 'Subscription resumed.',
            'canceled_at' => null,
        ]);
    }

    /**
     * Смена плана: апгрейд → Stripe Checkout; даунгрейд → scheduled_plan на конец периода.
     */
    public function changePlan(Request $request)
    {
        if (!PlatformSettingsService::isStripePaymentsEnabled()) {
            return response()->json([
                'error' => 'stripe_disabled',
                'message' => 'Stripe payments are disabled.',
            ], 403);
        }

        $validated = $request->validate([
            'plan' => 'required|string|exists:subscription_plans,slug',
            'interval' => 'required|in:month,year',
        ]);

        $user = auth('api')->user();
        $companyId = $this->resolveCompanyId($request);

        if (!$companyId) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        SubscriptionLifecycleService::finalizeExpiredForCompany((int) $companyId);

        $targetPlan = SubscriptionPlan::findBySlug($validated['plan']);
        if (!$targetPlan || !$targetPlan->is_active) {
            return response()->json(['error' => 'Invalid or inactive plan'], 422);
        }

        if ($targetPlan->is_free) {
            return response()->json([
                'error' => 'use_cancel_for_free',
                'message' => 'To switch to the free plan, cancel your paid subscription.',
            ], 422);
        }

        $subscription = Subscription::where('company_id', $companyId)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->latest()
            ->first();

        if (!$subscription) {
            return response()->json(['error' => 'No active subscription'], 404);
        }

        $currentPlan = SubscriptionPlan::findBySlug($subscription->plan);
        if (!$currentPlan) {
            return response()->json(['error' => 'Current plan not found'], 422);
        }

        if ($currentPlan->slug === $targetPlan->slug) {
            return response()->json([
                'error' => 'already_on_plan',
                'message' => 'You are already on this plan.',
            ], 422);
        }

        if ($targetPlan->sort_order < $currentPlan->sort_order) {
            if ($subscription->canceled_at) {
                return response()->json([
                    'error' => 'cancellation_pending',
                    'message' => 'Cancel or resume your subscription before scheduling a downgrade.',
                ], 422);
            }

            $subscription->update([
                'scheduled_plan' => $targetPlan->slug,
            ]);

            Log::info('Downgrade scheduled', [
                'company_id' => $companyId,
                'current' => $currentPlan->slug,
                'scheduled_plan' => $targetPlan->slug,
                'period_ends' => $subscription->current_period_end?->toISOString(),
            ]);

            return response()->json([
                'action' => 'downgrade_scheduled',
                'scheduled_plan' => $targetPlan->slug,
                'current_period_end' => $subscription->current_period_end?->toISOString(),
                'message' => 'Downgrade scheduled for the end of your billing period.',
            ]);
        }

        // Upgrade: оплата через Stripe; после webhook старые активные подписки закрываются.
        return $this->createCheckoutSessionInternal($request, $validated['plan'], $validated['interval'], $user, (int) $companyId, true);
    }

    /**
     * Отменить запланированный даунгрейд (снять scheduled_plan).
     */
    public function cancelScheduledChange(Request $request)
    {
        $companyId = $this->resolveCompanyId($request);
        if (!$companyId) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        SubscriptionLifecycleService::finalizeExpiredForCompany((int) $companyId);

        $subscription = Subscription::where('company_id', $companyId)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->first();

        if (!$subscription) {
            return response()->json(['error' => 'No active subscription'], 404);
        }

        if (!$subscription->scheduled_plan) {
            return response()->json([
                'error' => 'no_scheduled_change',
                'message' => 'No scheduled plan change.',
            ], 422);
        }

        $subscription->update(['scheduled_plan' => null]);

        return response()->json([
            'message' => 'Scheduled downgrade canceled.',
            'scheduled_plan' => null,
        ]);
    }

    public function overLimit(Request $request)
    {
        $companyId = $this->resolveCompanyId($request);
        if (!$companyId) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        SubscriptionLifecycleService::finalizeExpiredForCompany((int) $companyId);

        $details = SubscriptionLimitService::getOverLimitDetails((int) $companyId);

        return response()->json($details);
    }

    public function resolveLimits(Request $request)
    {
        $companyId = $this->resolveCompanyId($request);
        if (!$companyId) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        $validated = $request->validate([
            'deactivate_team_member_ids' => 'sometimes|array',
            'deactivate_team_member_ids.*' => 'integer|exists:team_members,id',
            'deactivate_company_user_ids' => 'sometimes|array',
            'deactivate_company_user_ids.*' => 'integer|exists:company_users,id',
            'deactivate_service_ids' => 'sometimes|array',
            'deactivate_service_ids.*' => 'integer|exists:services,id',
            'deactivate_advertisement_ids' => 'sometimes|array',
            'deactivate_advertisement_ids.*' => 'integer|exists:advertisements,id',
        ]);

        $company = Company::find($companyId);
        if (!$company) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        DB::transaction(function () use ($validated, $companyId, $company) {
            if (!empty($validated['deactivate_team_member_ids'])) {
                TeamMember::where('company_id', $companyId)
                    ->whereIn('id', $validated['deactivate_team_member_ids'])
                    ->update(['is_active' => false]);
            }

            if (!empty($validated['deactivate_company_user_ids'])) {
                $ownerId = (int) $company->owner_id;
                CompanyUser::where('company_id', $companyId)
                    ->whereIn('id', $validated['deactivate_company_user_ids'])
                    ->where('user_id', '!=', $ownerId)
                    ->update(['is_active' => false]);
            }

            if (!empty($validated['deactivate_service_ids'])) {
                Service::where('company_id', $companyId)
                    ->whereIn('id', $validated['deactivate_service_ids'])
                    ->update(['is_active' => false]);
            }

            if (!empty($validated['deactivate_advertisement_ids'])) {
                Advertisement::where('company_id', $companyId)
                    ->whereIn('id', $validated['deactivate_advertisement_ids'])
                    ->update(['is_active' => false]);
            }
        });

        $sub = SubscriptionLimitService::getActiveSubscription((int) $companyId);
        if ($sub && $sub->grace_period_ends_at && $sub->grace_period_ends_at->isFuture() && !SubscriptionLimitService::isOverLimit((int) $companyId)) {
            $sub->update(['grace_period_ends_at' => null]);
        }

        return response()->json([
            'message' => 'Limits updated.',
            'usage' => SubscriptionLimitService::getUsage((int) $companyId),
            'over_limit' => SubscriptionLimitService::getOverLimitDetails((int) $companyId),
        ]);
    }

    /**
     * Внутренний checkout: при upgrade не блокируем по already_subscribed.
     */
    private function createCheckoutSessionInternal(
        Request $request,
        string $planSlug,
        string $interval,
        $user,
        int $companyId,
        bool $isUpgrade
    ) {
        $planModel = SubscriptionPlan::findBySlug($planSlug);

        if (!$planModel || !$planModel->is_active) {
            return response()->json(['error' => 'Invalid or inactive plan'], 422);
        }

        if ($planModel->is_free) {
            return response()->json(['error' => 'Cannot purchase free plan'], 422);
        }

        if (!$isUpgrade) {
            $existing = Subscription::where('company_id', $companyId)
                ->where('status', Subscription::STATUS_ACTIVE)
                ->whereHas('subscriptionPlan', fn ($q) => $q->where('is_free', false))
                ->first();

            if ($existing) {
                return response()->json([
                    'error' => 'already_subscribed',
                    'message' => 'You already have an active paid subscription. Cancel it first to change plans.',
                ], 409);
            }
        } else {
            Subscription::where('company_id', $companyId)
                ->where('status', Subscription::STATUS_ACTIVE)
                ->update(['scheduled_plan' => null]);
        }

        $priceCents = $interval === 'year'
            ? $planModel->price_yearly_cents
            : $planModel->price_monthly_cents;

        $frontendUrl = $this->getFrontendUrl($request);

        try {
            $session = Session::create([
                'payment_method_types' => ['card'],
                'line_items' => [[
                    'price_data' => [
                        'currency' => $planModel->currency,
                        'product_data' => [
                            'name' => "Rexten {$planModel->name} Plan",
                            'description' => ucfirst($interval).'ly subscription',
                        ],
                        'unit_amount' => $priceCents,
                    ],
                    'quantity' => 1,
                ]],
                'mode' => 'payment',
                'success_url' => $frontendUrl.'/business/subscription?payment=success&session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => $frontendUrl.'/business/subscription?payment=cancelled',
                'metadata' => [
                    'type' => 'subscription',
                    'plan' => $planSlug,
                    'interval' => $interval,
                    'price_cents' => $priceCents,
                    'user_id' => $user->id,
                    'company_id' => $companyId,
                    'is_upgrade' => $isUpgrade ? '1' : '0',
                ],
            ]);

            Log::info('Subscription checkout session created', [
                'session_id' => $session->id,
                'plan' => $planSlug,
                'company_id' => $companyId,
                'is_upgrade' => $isUpgrade,
            ]);

            return response()->json([
                'checkout_url' => $session->url,
                'session_id' => $session->id,
                'action' => 'checkout',
            ]);
        } catch (\Exception $e) {
            Log::error('Subscription checkout failed', [
                'error' => $e->getMessage(),
                'company_id' => $companyId,
            ]);

            return response()->json([
                'error' => 'checkout_failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    private function resolveCompanyId(Request $request): ?int
    {
        $companyId = $request->input('current_company_id');
        if (!$companyId) {
            $user = auth('api')->user();
            if ($user && $user->isBusinessOwner()) {
                $company = $user->ownedCompanies()->first();
                $companyId = $company?->id;
            }
        }
        return $companyId ? (int) $companyId : null;
    }

    private function getFrontendUrl(Request $request): string
    {
        return rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3003')), '/');
    }
}

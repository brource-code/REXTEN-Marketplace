<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubscriptionPlansController extends Controller
{
    public function index()
    {
        $plans = SubscriptionPlan::orderBy('sort_order')->get()->map(function ($plan) {
            return [
                'id' => $plan->id,
                'slug' => $plan->slug,
                'name' => $plan->name,
                'description' => $plan->description,
                'price_monthly' => $plan->getPriceMonthly(),
                'price_yearly' => $plan->getPriceYearly(),
                'price_monthly_cents' => $plan->price_monthly_cents,
                'price_yearly_cents' => $plan->price_yearly_cents,
                'currency' => $plan->currency,
                'features' => $plan->features,
                'is_active' => $plan->is_active,
                'is_default' => $plan->is_default,
                'is_free' => $plan->is_free,
                'sort_order' => $plan->sort_order,
                'badge_text' => $plan->badge_text,
                'color' => $plan->color,
                'subscribers_count' => Subscription::where('plan', $plan->slug)
                    ->where('status', Subscription::STATUS_ACTIVE)
                    ->count(),
            ];
        });

        return response()->json([
            'plans' => $plans,
        ]);
    }

    public function show($id)
    {
        $plan = SubscriptionPlan::findOrFail($id);

        return response()->json([
            'plan' => [
                'id' => $plan->id,
                'slug' => $plan->slug,
                'name' => $plan->name,
                'description' => $plan->description,
                'price_monthly' => $plan->getPriceMonthly(),
                'price_yearly' => $plan->getPriceYearly(),
                'price_monthly_cents' => $plan->price_monthly_cents,
                'price_yearly_cents' => $plan->price_yearly_cents,
                'currency' => $plan->currency,
                'features' => $plan->features,
                'is_active' => $plan->is_active,
                'is_default' => $plan->is_default,
                'is_free' => $plan->is_free,
                'sort_order' => $plan->sort_order,
                'badge_text' => $plan->badge_text,
                'color' => $plan->color,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'slug' => 'required|string|max:50|unique:subscription_plans,slug',
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'price_monthly_cents' => 'required|integer|min:0',
            'price_yearly_cents' => 'required|integer|min:0',
            'currency' => 'string|max:10',
            'features' => 'required|array',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'is_free' => 'boolean',
            'sort_order' => 'integer',
            'badge_text' => 'nullable|string|max:50',
            'color' => 'string|max:20',
        ]);

        if ($validated['is_default'] ?? false) {
            SubscriptionPlan::where('is_default', true)->update(['is_default' => false]);
        }

        $plan = SubscriptionPlan::create($validated);

        return response()->json([
            'success' => true,
            'plan' => $plan,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $plan = SubscriptionPlan::findOrFail($id);

        $validated = $request->validate([
            'slug' => 'string|max:50|unique:subscription_plans,slug,' . $id,
            'name' => 'string|max:100',
            'description' => 'nullable|string',
            'price_monthly_cents' => 'integer|min:0',
            'price_yearly_cents' => 'integer|min:0',
            'currency' => 'string|max:10',
            'features' => 'array',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'is_free' => 'boolean',
            'sort_order' => 'integer',
            'badge_text' => 'nullable|string|max:50',
            'color' => 'string|max:20',
        ]);

        if (($validated['is_default'] ?? false) && !$plan->is_default) {
            SubscriptionPlan::where('is_default', true)->update(['is_default' => false]);
        }

        $plan->update($validated);

        return response()->json([
            'success' => true,
            'plan' => $plan->fresh(),
        ]);
    }

    public function destroy($id)
    {
        $plan = SubscriptionPlan::findOrFail($id);

        $activeSubscriptions = Subscription::where('plan', $plan->slug)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->count();

        if ($activeSubscriptions > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete plan with {$activeSubscriptions} active subscriptions",
            ], 409);
        }

        if ($plan->is_default) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete the default plan',
            ], 409);
        }

        $plan->delete();

        return response()->json([
            'success' => true,
        ]);
    }

    public function setDefault($id)
    {
        $plan = SubscriptionPlan::findOrFail($id);

        if (!$plan->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot set inactive plan as default',
            ], 400);
        }

        DB::transaction(function () use ($plan) {
            SubscriptionPlan::where('is_default', true)->update(['is_default' => false]);
            $plan->update(['is_default' => true]);
        });

        return response()->json([
            'success' => true,
            'plan' => $plan->fresh(),
        ]);
    }

    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'order' => 'required|array',
            'order.*' => 'integer|exists:subscription_plans,id',
        ]);

        foreach ($validated['order'] as $index => $planId) {
            SubscriptionPlan::where('id', $planId)->update(['sort_order' => $index]);
        }

        return response()->json([
            'success' => true,
        ]);
    }

    public function stats()
    {
        $plans = SubscriptionPlan::orderBy('sort_order')->get();
        
        $stats = [
            'total_plans' => $plans->count(),
            'active_plans' => $plans->where('is_active', true)->count(),
            'total_subscribers' => Subscription::where('status', Subscription::STATUS_ACTIVE)->count(),
            'mrr' => 0,
            'by_plan' => [],
        ];

        foreach ($plans as $plan) {
            $activeCount = Subscription::where('plan', $plan->slug)
                ->where('status', Subscription::STATUS_ACTIVE)
                ->count();

            $monthlyRevenue = Subscription::where('plan', $plan->slug)
                ->where('status', Subscription::STATUS_ACTIVE)
                ->where('interval', 'month')
                ->sum('price_cents');

            $yearlyRevenue = Subscription::where('plan', $plan->slug)
                ->where('status', Subscription::STATUS_ACTIVE)
                ->where('interval', 'year')
                ->sum('price_cents');

            $planMrr = ($monthlyRevenue + ($yearlyRevenue / 12)) / 100;

            $stats['mrr'] += $planMrr;
            $stats['by_plan'][] = [
                'slug' => $plan->slug,
                'name' => $plan->name,
                'color' => $plan->color,
                'subscribers' => $activeCount,
                'mrr' => round($planMrr, 2),
            ];
        }

        $stats['mrr'] = round($stats['mrr'], 2);

        return response()->json($stats);
    }
}

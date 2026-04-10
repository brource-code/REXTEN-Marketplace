<?php

namespace App\Http\Middleware;

use App\Services\SubscriptionLimitService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscriptionFeature
{
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $companyId = $request->input('current_company_id');
        if (!$companyId) {
            $user = auth('api')->user();
            if ($user && $user->isBusinessOwner()) {
                $company = $user->ownedCompanies()->first();
                $companyId = $company?->id;
            }
        }

        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        if (!SubscriptionLimitService::hasAccess((int) $companyId, $feature)) {
            return response()->json([
                'error' => 'subscription_feature_required',
                'feature' => $feature,
                'message' => 'This feature is not included in your subscription plan.',
            ], 403);
        }

        return $next($request);
    }
}

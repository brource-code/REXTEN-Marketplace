<?php

namespace App\Http\Controllers\Api\Zapier;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\SubscriptionLimitService;
use Illuminate\Http\Request;

class MeController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user('sanctum');
        $companyId = (int) $request->get('current_company_id');
        $company = Company::query()->whereKey($companyId)->firstOrFail();
        $usage = SubscriptionLimitService::getUsage($companyId);
        $plan = SubscriptionLimitService::getPlanForCompany($companyId);

        $profile = $user->profile;
        $name = $profile
            ? trim(($profile->first_name ?? '').' '.($profile->last_name ?? ''))
            : null;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'name' => $name !== '' && $name !== null ? $name : null,
                'role' => $user->role,
            ],
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'timezone' => $company->resolveTimezone(),
                'status' => $company->status,
            ],
            'plan' => [
                'slug' => $plan?->slug,
                'name' => $plan?->name,
            ],
            'features' => [
                'api_access' => (bool) ($usage['api_access']['allowed'] ?? false),
                'routes' => (bool) ($usage['routes']['allowed'] ?? false),
                'analytics' => (bool) ($usage['analytics']['allowed'] ?? false),
            ],
            'usage' => $usage,
        ]);
    }
}

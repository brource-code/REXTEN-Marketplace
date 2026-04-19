<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\SubscriptionLimitService;
use Illuminate\Http\Request;

class MeController extends Controller
{
    public function show(Request $request)
    {
        $companyId = (int) $request->get('current_company_id');
        $company = Company::findOrFail($companyId);
        $usage = SubscriptionLimitService::getUsage($companyId);

        return response()->json([
            'data' => [
                'company' => [
                    'id' => $company->id,
                    'name' => $company->name,
                    'slug' => $company->slug,
                    'timezone' => $company->resolveTimezone(),
                ],
                'subscription' => [
                    'plan' => $usage['plan'] ?? null,
                    'usage' => $usage,
                ],
            ],
        ]);
    }
}

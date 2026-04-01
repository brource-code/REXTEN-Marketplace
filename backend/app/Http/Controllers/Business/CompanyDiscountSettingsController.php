<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CompanyDiscountSettingsController extends Controller
{
    public function show(Request $request)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $company = Company::findOrFail($companyId);

        return response()->json([
            'success' => true,
            'data' => [
                'loyalty_booking_count_rule' => $company->loyalty_booking_count_rule ?? 'completed',
            ],
        ]);
    }

    public function update(Request $request)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $data = $request->validate([
            'loyalty_booking_count_rule' => ['required', Rule::in(['completed', 'all_non_cancelled'])],
        ]);

        $company = Company::findOrFail($companyId);
        $company->loyalty_booking_count_rule = $data['loyalty_booking_count_rule'];
        $company->save();

        return response()->json([
            'success' => true,
            'data' => [
                'loyalty_booking_count_rule' => $company->loyalty_booking_count_rule,
            ],
        ]);
    }
}

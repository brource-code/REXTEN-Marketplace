<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\PromoCode;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PromoCodeController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $promos = PromoCode::where('company_id', $companyId)
            ->orderByDesc('id')
            ->get();

        return response()->json(['success' => true, 'data' => $promos]);
    }

    public function store(Request $request)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $data = $request->validate([
            'code' => 'required|string|max:64',
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
            'discount_type' => ['required', Rule::in(['percentage', 'fixed'])],
            'discount_value' => 'required|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'usage_per_user' => 'nullable|integer|min:1',
            'valid_from' => 'nullable|date',
            'valid_until' => 'nullable|date',
            'is_active' => 'boolean',
        ]);

        $data['code'] = strtoupper(trim($data['code']));

        $exists = PromoCode::where('company_id', $companyId)->where('code', $data['code'])->exists();
        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Промокод с таким кодом уже существует',
            ], 422);
        }

        $promo = PromoCode::create(array_merge($data, [
            'company_id' => $companyId,
            'is_active' => $data['is_active'] ?? true,
            'used_count' => 0,
        ]));

        return response()->json(['success' => true, 'data' => $promo], 201);
    }

    public function update(Request $request, int $id)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $promo = PromoCode::where('company_id', $companyId)->findOrFail($id);

        $data = $request->validate([
            'code' => 'sometimes|string|max:64',
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
            'discount_type' => ['sometimes', Rule::in(['percentage', 'fixed'])],
            'discount_value' => 'sometimes|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'usage_per_user' => 'nullable|integer|min:1',
            'valid_from' => 'nullable|date',
            'valid_until' => 'nullable|date',
            'is_active' => 'boolean',
        ]);

        if (isset($data['code'])) {
            $data['code'] = strtoupper(trim($data['code']));
            $exists = PromoCode::where('company_id', $companyId)
                ->where('code', $data['code'])
                ->where('id', '!=', $promo->id)
                ->exists();
            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Промокод с таким кодом уже существует',
                ], 422);
            }
        }

        $promo->update($data);

        return response()->json(['success' => true, 'data' => $promo->fresh()]);
    }

    public function destroy(Request $request, int $id)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $promo = PromoCode::where('company_id', $companyId)->findOrFail($id);
        $promo->delete();

        return response()->json(['success' => true, 'message' => 'Deleted']);
    }
}

<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\DiscountTier;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DiscountTierController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $tiers = DiscountTier::where('company_id', $companyId)
            ->orderBy('sort_order')
            ->orderBy('min_bookings')
            ->get();

        return response()->json(['success' => true, 'data' => $tiers]);
    }

    public function store(Request $request)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'min_bookings' => 'required|integer|min:0',
            'max_bookings' => 'nullable|integer|min:0',
            'discount_type' => ['required', Rule::in(['percentage', 'fixed'])],
            'discount_value' => 'required|numeric|min:0',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        if (isset($data['max_bookings']) && $data['max_bookings'] < $data['min_bookings']) {
            return response()->json([
                'success' => false,
                'message' => 'max_bookings must be >= min_bookings',
            ], 422);
        }

        // 0 вместо пустого «без потолка» — сохраняем как NULL, иначе resolveTierForCount не сопоставит уровень при count > 0
        if (isset($data['max_bookings']) && (int) $data['max_bookings'] === 0 && $data['min_bookings'] > 0) {
            $data['max_bookings'] = null;
        }

        $tier = DiscountTier::create(array_merge($data, [
            'company_id' => $companyId,
            'is_active' => $data['is_active'] ?? true,
            'sort_order' => $data['sort_order'] ?? 0,
        ]));

        return response()->json(['success' => true, 'data' => $tier], 201);
    }

    public function update(Request $request, int $id)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $tier = DiscountTier::where('company_id', $companyId)->findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'min_bookings' => 'sometimes|integer|min:0',
            'max_bookings' => 'nullable|integer|min:0',
            'discount_type' => ['sometimes', Rule::in(['percentage', 'fixed'])],
            'discount_value' => 'sometimes|numeric|min:0',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $min = $data['min_bookings'] ?? $tier->min_bookings;
        $max = array_key_exists('max_bookings', $data) ? $data['max_bookings'] : $tier->max_bookings;
        if ($max !== null && $max < $min) {
            return response()->json([
                'success' => false,
                'message' => 'max_bookings must be >= min_bookings',
            ], 422);
        }

        if (array_key_exists('max_bookings', $data) && $data['max_bookings'] !== null && (int) $data['max_bookings'] === 0 && (int) $min > 0) {
            $data['max_bookings'] = null;
        }

        $tier->update($data);

        return response()->json(['success' => true, 'data' => $tier->fresh()]);
    }

    public function destroy(Request $request, int $id)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $tier = DiscountTier::where('company_id', $companyId)->findOrFail($id);
        $tier->delete();

        return response()->json(['success' => true, 'message' => 'Deleted']);
    }
}

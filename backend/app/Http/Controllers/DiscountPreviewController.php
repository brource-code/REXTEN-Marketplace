<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Services\DiscountCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Tymon\JWTAuth\Facades\JWTAuth;

class DiscountPreviewController extends Controller
{
    public function __construct(
        protected DiscountCalculationService $discountCalculationService
    ) {
    }

    /**
     * Публичный превью скидок для формы бронирования (сервер пересчитывает при создании брони).
     */
    public function preview(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'company_id' => 'required|exists:companies,id',
            'subtotal' => 'required|numeric|min:0',
            'promo_code' => 'nullable|string|max:64',
            'client_phone' => 'nullable|string|max:32',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $company = Company::findOrFail($request->company_id);

        $userId = null;
        try {
            if ($request->bearerToken()) {
                $u = JWTAuth::parseToken()->authenticate();
                if ($u) {
                    $userId = $u->id;
                }
            }
        } catch (\Throwable $e) {
            $userId = null;
        }

        $preview = $this->discountCalculationService->preview(
            $company,
            (float) $request->subtotal,
            $request->promo_code ? trim($request->promo_code) : null,
            $userId,
            $request->client_phone
        );

        return response()->json(['success' => true, 'data' => $preview]);
    }
}

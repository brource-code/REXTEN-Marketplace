<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Company;
use App\Models\DiscountTier;
use App\Services\DiscountCalculationService;
use Illuminate\Http\Request;

class ClientDiscountsController extends Controller
{
    public function __construct(
        protected DiscountCalculationService $discountCalculationService
    ) {
    }

    /**
     * Прогресс лояльности по компаниям, с которыми у клиента были бронирования.
     */
    public function loyaltyProgress(Request $request)
    {
        $user = auth('api')->user();

        $companyIds = Booking::query()
            ->where('user_id', $user->id)
            ->distinct()
            ->pluck('company_id');

        $items = [];

        foreach ($companyIds as $companyId) {
            $company = Company::find($companyId);
            if (!$company) {
                continue;
            }

            // Не показываем лояльность, пока у бизнеса нет хотя бы одного активного уровня
            $hasLoyaltyTiers = DiscountTier::query()
                ->where('company_id', $companyId)
                ->active()
                ->exists();
            if (!$hasLoyaltyTiers) {
                continue;
            }

            $rule = $company->loyalty_booking_count_rule ?? 'completed';
            $count = $this->discountCalculationService->countLoyaltyBookings($user->id, (int) $companyId, $rule, null);
            $currentTier = $this->discountCalculationService->resolveTierForCount((int) $companyId, $count);

            $nextTier = DiscountTier::query()
                ->where('company_id', $companyId)
                ->active()
                ->where('min_bookings', '>', $count)
                ->orderBy('min_bookings')
                ->first();

            $items[] = [
                'company_id' => $company->id,
                'company_name' => $company->name,
                'company_slug' => $company->slug,
                'loyalty_bookings_count' => $count,
                'loyalty_rule' => $rule,
                'current_tier' => $currentTier ? [
                    'id' => $currentTier->id,
                    'name' => $currentTier->name,
                    'min_bookings' => $currentTier->min_bookings,
                    'max_bookings' => $currentTier->max_bookings,
                    'discount_type' => $currentTier->discount_type,
                    'discount_value' => (float) $currentTier->discount_value,
                ] : null,
                'next_tier' => $nextTier ? [
                    'id' => $nextTier->id,
                    'name' => $nextTier->name,
                    'min_bookings' => $nextTier->min_bookings,
                    'discount_type' => $nextTier->discount_type,
                    'discount_value' => (float) $nextTier->discount_value,
                ] : null,
            ];
        }

        return response()->json($items);
    }
}

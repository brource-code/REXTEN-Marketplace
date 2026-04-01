<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Company;
use App\Models\DiscountTier;
use App\Models\PromoCode;
use App\Models\PromoCodeUsage;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DiscountCalculationService
{
    /**
     * Подсчёт бронирований для лояльности (без текущего оформляемого — он ещё не в БД или исключаем по id).
     */
    public function countLoyaltyBookings(int $userId, int $companyId, string $rule, ?int $excludeBookingId = null): int
    {
        $q = Booking::query()
            ->where('user_id', $userId)
            ->where('company_id', $companyId);

        if ($excludeBookingId) {
            $q->where('id', '!=', $excludeBookingId);
        }

        if ($rule === 'all_non_cancelled') {
            $q->where('status', '!=', 'cancelled');
        } else {
            $q->where('status', 'completed');
        }

        return $q->count();
    }

    /**
     * Подходит ли уровень под число бронирований: [min_bookings, max_bookings] включительно,
     * max_bookings = NULL — без верхней границы; max_bookings = 0 при min>0 — ошибочно как «без потолка».
     */
    public function tierMatchesBookingCount(DiscountTier $tier, int $count): bool
    {
        $min = (int) $tier->min_bookings;
        if ($count < $min) {
            return false;
        }

        $max = $tier->max_bookings;
        if ($max === null) {
            return true;
        }

        $maxInt = (int) $max;

        if ($maxInt === 0 && $min > 0) {
            return true;
        }

        return $count <= $maxInt;
    }

    public function resolveTierForCount(int $companyId, int $completedCount): ?DiscountTier
    {
        $tiers = DiscountTier::query()
            ->where('company_id', $companyId)
            ->active()
            ->orderByDesc('min_bookings')
            ->orderByDesc('sort_order')
            ->get();

        foreach ($tiers as $tier) {
            if ($this->tierMatchesBookingCount($tier, $completedCount)) {
                return $tier;
            }
        }

        return null;
    }

    public function calculateAmountFromType(string $discountType, float $discountValue, float $subtotal, ?float $maxCap = null): float
    {
        if ($subtotal <= 0) {
            return 0.0;
        }

        if ($discountType === 'percentage') {
            $raw = round($subtotal * ((float) $discountValue / 100), 2);
            if ($maxCap !== null) {
                $raw = min($raw, (float) $maxCap);
            }

            return min($raw, $subtotal);
        }

        return min((float) $discountValue, $subtotal);
    }

    /**
     * @return array{amount: float, tier: ?DiscountTier}
     */
    public function evaluateLoyaltyTier(Company $company, ?int $userId, float $subtotal, ?int $excludeBookingId = null): array
    {
        if (!$userId || $subtotal <= 0) {
            return ['amount' => 0.0, 'tier' => null];
        }

        $rule = $company->loyalty_booking_count_rule ?? 'completed';
        $count = $this->countLoyaltyBookings($userId, $company->id, $rule, $excludeBookingId);
        $tier = $this->resolveTierForCount($company->id, $count);

        if (!$tier) {
            return ['amount' => 0.0, 'tier' => null];
        }

        $amount = $this->calculateAmountFromType($tier->discount_type, (float) $tier->discount_value, $subtotal, null);

        return ['amount' => $amount, 'tier' => $tier];
    }

    /**
     * @return array{amount: float, promo: ?PromoCode}
     */
    public function evaluatePromoCode(
        Company $company,
        PromoCode $promo,
        float $subtotal,
        ?int $userId,
        ?string $clientPhone
    ): array {
        if ($subtotal <= 0) {
            return ['amount' => 0.0, 'promo' => null];
        }

        if ($promo->company_id !== $company->id) {
            return ['amount' => 0.0, 'promo' => null];
        }

        if (!$promo->is_active) {
            throw ValidationException::withMessages(['promo_code' => ['Промокод неактивен']]);
        }

        $now = Carbon::now();
        if ($promo->valid_from && $now->lt($promo->valid_from)) {
            throw ValidationException::withMessages(['promo_code' => ['Промокод ещё не действует']]);
        }
        if ($promo->valid_until && $now->gt($promo->valid_until)) {
            throw ValidationException::withMessages(['promo_code' => ['Срок действия промокода истёк']]);
        }

        if ($promo->usage_limit !== null && $promo->used_count >= $promo->usage_limit) {
            throw ValidationException::withMessages(['promo_code' => ['Лимит использований промокода исчерпан']]);
        }

        $minOrder = $promo->min_order_amount !== null ? (float) $promo->min_order_amount : 0.0;
        if ($subtotal < $minOrder) {
            throw ValidationException::withMessages([
                'promo_code' => ['Минимальная сумма заказа для промокода не достигнута'],
            ]);
        }

        $perUser = $promo->usage_per_user;
        if ($perUser !== null && $perUser > 0) {
            $usageQuery = PromoCodeUsage::query()->where('promo_code_id', $promo->id);
            if ($userId) {
                $usageQuery->where('user_id', $userId);
            } elseif ($clientPhone) {
                $normalized = $this->normalizePhone($clientPhone);
                $usageQuery->where('client_phone', $normalized);
            } else {
                throw ValidationException::withMessages([
                    'promo_code' => ['Войдите в аккаунт или укажите телефон для применения промокода'],
                ]);
            }

            if ($usageQuery->count() >= $perUser) {
                throw ValidationException::withMessages(['promo_code' => ['Промокод уже использован']]);
            }
        }

        $maxCap = $promo->max_discount_amount !== null ? (float) $promo->max_discount_amount : null;
        $amount = $this->calculateAmountFromType(
            $promo->discount_type,
            (float) $promo->discount_value,
            $subtotal,
            $maxCap
        );

        return ['amount' => $amount, 'promo' => $promo];
    }

    public function findPromoByCode(int $companyId, string $code): ?PromoCode
    {
        $normalized = strtoupper(trim($code));

        return PromoCode::query()
            ->where('company_id', $companyId)
            ->where('code', $normalized)
            ->first();
    }

    /**
     * Применить скидку к бронированию (после синка доп. услуг). Сохраняет booking.
     *
     * @throws ValidationException
     */
    public function applyToBooking(Booking $booking, ?string $promoCode, ?int $userId): void
    {
        $booking->loadMissing('additionalServices');
        $company = Company::find($booking->company_id);
        if (!$company) {
            return;
        }

        $subtotal = (float) $booking->calculateTotalWithAdditionalServices();

        if ($subtotal <= 0) {
            $booking->discount_amount = 0;
            $booking->discount_source = null;
            $booking->discount_tier_id = null;
            $booking->promo_code_id = null;
            $booking->total_price = 0;
            $booking->save();

            return;
        }

        $tierResult = $this->evaluateLoyaltyTier($company, $userId, $subtotal, null);
        $promoResult = ['amount' => 0.0, 'promo' => null];

        if ($promoCode) {
            $promo = $this->findPromoByCode($company->id, $promoCode);
            if (!$promo) {
                throw ValidationException::withMessages(['promo_code' => ['Промокод не найден']]);
            }
            $promoResult = $this->evaluatePromoCode(
                $company,
                $promo,
                $subtotal,
                $userId,
                $booking->client_phone
            );
        }

        $usePromo = $promoResult['amount'] > $tierResult['amount'];
        $discountAmount = $usePromo ? $promoResult['amount'] : $tierResult['amount'];

        $booking->discount_amount = round($discountAmount, 2);
        $booking->discount_tier_id = null;
        $booking->promo_code_id = null;
        $booking->discount_source = null;

        if ($discountAmount <= 0) {
            $booking->total_price = round($subtotal, 2);
            $booking->save();

            return;
        }

        if ($usePromo && $promoResult['promo']) {
            $booking->discount_source = 'promo_code';
            $booking->promo_code_id = $promoResult['promo']->id;
        } elseif ($tierResult['tier']) {
            $booking->discount_source = 'loyalty_tier';
            $booking->discount_tier_id = $tierResult['tier']->id;
        }

        $final = max(0, round($subtotal - $discountAmount, 2));
        $booking->total_price = $final;
        $booking->save();

        if ($usePromo && $promoResult['promo']) {
            $this->registerPromoUsage($promoResult['promo'], $booking, $discountAmount, $userId);
        }
    }

    public function registerPromoUsage(PromoCode $promo, Booking $booking, float $discountAmount, ?int $userId): void
    {
        DB::transaction(function () use ($promo, $booking, $discountAmount, $userId) {
            $locked = PromoCode::where('id', $promo->id)->lockForUpdate()->first();
            if (!$locked) {
                return;
            }

            if ($locked->usage_limit !== null && $locked->used_count >= $locked->usage_limit) {
                throw ValidationException::withMessages(['promo_code' => ['Лимит использований промокода исчерпан']]);
            }

            $perUser = $locked->usage_per_user;
            if ($perUser !== null && $perUser > 0) {
                $usageQuery = PromoCodeUsage::query()->where('promo_code_id', $locked->id);
                if ($userId) {
                    $usageQuery->where('user_id', $userId);
                } else {
                    $usageQuery->where('client_phone', $this->normalizePhone((string) $booking->client_phone));
                }
                if ($usageQuery->count() >= $perUser) {
                    throw ValidationException::withMessages(['promo_code' => ['Промокод уже использован']]);
                }
            }

            PromoCodeUsage::create([
                'promo_code_id' => $locked->id,
                'booking_id' => $booking->id,
                'user_id' => $userId,
                'client_phone' => $userId ? null : $this->normalizePhone((string) $booking->client_phone),
                'discount_amount' => round($discountAmount, 2),
            ]);

            $locked->increment('used_count');
        });
    }

    public function normalizePhone(string $phone): string
    {
        return preg_replace('/\D+/', '', $phone) ?? $phone;
    }

    /**
     * Превью для UI (без сохранения).
     *
     * @return array<string, mixed>
     */
    public function preview(
        Company $company,
        float $subtotal,
        ?string $promoCode,
        ?int $userId,
        ?string $clientPhone
    ): array {
        $tierResult = $this->evaluateLoyaltyTier($company, $userId, $subtotal, null);
        $promoResult = ['amount' => 0.0, 'promo' => null, 'error' => null, 'messages' => null];

        if ($promoCode) {
            try {
                $promo = $this->findPromoByCode($company->id, $promoCode);
                if (!$promo) {
                    $promoResult['error'] = 'not_found';
                } else {
                    $eval = $this->evaluatePromoCode($company, $promo, $subtotal, $userId, $clientPhone);
                    $promoResult['amount'] = $eval['amount'];
                    $promoResult['promo'] = $eval['promo'];
                }
            } catch (ValidationException $e) {
                $promoResult['error'] = 'validation';
                $promoResult['messages'] = $e->errors();
            }
        }

        $usePromo = ($promoResult['amount'] ?? 0) > ($tierResult['amount'] ?? 0);
        $discountAmount = $usePromo ? ($promoResult['amount'] ?? 0) : ($tierResult['amount'] ?? 0);
        $source = null;
        if ($discountAmount > 0) {
            $source = $usePromo ? 'promo_code' : 'loyalty_tier';
        }

        $rule = $company->loyalty_booking_count_rule ?? 'completed';
        $loyaltyCount = $userId
            ? $this->countLoyaltyBookings($userId, $company->id, $rule, null)
            : null;

        return [
            'subtotal' => round($subtotal, 2),
            'loyalty_bookings_count' => $loyaltyCount,
            'loyalty_tier' => $tierResult['tier'] ? [
                'id' => $tierResult['tier']->id,
                'name' => $tierResult['tier']->name,
                'discount_amount' => round($tierResult['amount'], 2),
            ] : null,
            'promo' => isset($promoResult['promo']) && $promoResult['promo'] ? [
                'id' => $promoResult['promo']->id,
                'code' => $promoResult['promo']->code,
                'name' => $promoResult['promo']->name,
                'discount_amount' => round($promoResult['amount'] ?? 0, 2),
            ] : null,
            'promo_error' => $promoResult['error'] ?? null,
            'promo_messages' => $promoResult['messages'] ?? null,
            'applied_source' => $source,
            'discount_amount' => round($discountAmount, 2),
            'final_total' => round(max(0, $subtotal - $discountAmount), 2),
        ];
    }
}

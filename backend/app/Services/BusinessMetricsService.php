<?php

namespace App\Services;

use App\Models\Booking;
use Illuminate\Support\Facades\DB;

/**
 * Единая логика метрик бизнеса (дашборд, отчёты, графики).
 */
class BusinessMetricsService
{
    /**
     * Выручка: сумма по завершённым бронированиям.
     */
    public static function totalRecognizedRevenue(int $companyId): float
    {
        $sum = Booking::where('company_id', $companyId)
            ->where('status', 'completed')
            ->sum(DB::raw('COALESCE(total_price, price)'));

        return $sum ? (float) $sum : 0.0;
    }

    /**
     * Уникальные зарегистрированные клиенты (user_id) по бронированиям. COUNT(DISTINCT) для PostgreSQL.
     */
    public static function countDistinctRegisteredClients(int $companyId, ?string $fromDate = null, ?string $toDate = null): int
    {
        $q = DB::table('bookings')
            ->where('company_id', $companyId)
            ->whereNull('deleted_at')
            ->whereNotNull('user_id');

        if ($fromDate !== null && $toDate !== null) {
            $q->whereDate('booking_date', '>=', $fromDate)
                ->whereDate('booking_date', '<=', $toDate);
        }

        return (int) $q->selectRaw('COUNT(DISTINCT user_id) AS cnt')->value('cnt');
    }
}

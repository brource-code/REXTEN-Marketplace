<?php

namespace App\Services;

use App\Models\Booking;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Единая логика метрик бизнеса (дашборд, отчёты, графики).
 * Выручка — только по бронированиям: завершённые, сумма COALESCE(total_price, price).
 */
class BusinessMetricsService
{
    /**
     * Общая выручка компании (все время, без фильтров).
     */
    public static function totalRecognizedRevenue(int $companyId): float
    {
        return self::recognizedRevenue($companyId, null, null, null, null, null);
    }

    /**
     * Выручка по завершённым бронированиям с фильтрами отчёта.
     *
     * @param  string|array|null  $status  Как в ReportsController::getBaseQuery
     */
    public static function recognizedRevenue(
        int $companyId,
        ?string $dateFrom,
        ?string $dateTo,
        $specialistId = null,
        $serviceId = null,
        $status = null
    ): float {
        $bookingBase = Booking::query();
        self::applyReportFiltersToBookings($bookingBase, $companyId, $dateFrom, $dateTo, $specialistId, $serviceId, $status);

        $sum = (clone $bookingBase)
            ->where('bookings.status', 'completed')
            ->sum(DB::raw('COALESCE(bookings.total_price, bookings.price)'));

        return round((float) ($sum ?: 0), 2);
    }

    public static function applyReportFiltersToBookings(
        Builder $query,
        int $companyId,
        ?string $dateFrom,
        ?string $dateTo,
        $specialistId = null,
        $serviceId = null,
        $status = null
    ): Builder {
        $query->where('bookings.company_id', $companyId);

        if ($dateFrom) {
            $query->whereDate('bookings.booking_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('bookings.booking_date', '<=', $dateTo);
        }
        if ($specialistId) {
            $query->where('bookings.specialist_id', $specialistId);
        }
        if ($serviceId) {
            $query->where('bookings.service_id', $serviceId);
        }
        if ($status !== null && $status !== '') {
            if (is_array($status)) {
                $query->whereIn('bookings.status', $status);
            } else {
                $query->where('bookings.status', $status);
            }
        }

        return $query;
    }

    /**
     * Уникальные зарегистрированные клиенты (user_id) по бронированиям. COUNT(DISTINCT) для PostgreSQL.
     */
    public static function countDistinctRegisteredClients(int $companyId, ?string $fromDate = null, ?string $toDate = null): int
    {
        $q = DB::table('bookings')
            ->where('company_id', $companyId)
            ->where('status', '!=', 'cancelled')
            ->whereNull('deleted_at')
            ->whereNotNull('user_id');

        if ($fromDate !== null && $toDate !== null) {
            $q->whereDate('booking_date', '>=', $fromDate)
                ->whereDate('booking_date', '<=', $toDate);
        }

        return (int) $q->selectRaw('COUNT(DISTINCT user_id) AS cnt')->value('cnt');
    }
}

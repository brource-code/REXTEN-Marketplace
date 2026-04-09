<?php

namespace App\Support;

use App\Models\Booking;
use App\Models\Route;
use App\Models\TeamMember;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Cache;

/**
 * Помечает дневной маршрут специалиста устаревшим и сбрасывает кэш списка (Route Intelligence).
 */
final class RouteStaleHelper
{
    public static function markStaleForBooking(Booking $booking): void
    {
        if ($booking->booking_date === null) {
            return;
        }

        $date = self::resolveRouteDateString($booking);
        $companyId = (int) $booking->company_id;

        if ($booking->specialist_id !== null) {
            Route::query()
                ->where('company_id', $companyId)
                ->where('specialist_id', $booking->specialist_id)
                ->whereDate('route_date', $date)
                ->update(['status' => Route::STATUS_STALE]);

            self::forgetRouteListCache($companyId, (int) $booking->specialist_id, $date);

            return;
        }

        Route::query()
            ->where('company_id', $companyId)
            ->whereDate('route_date', $date)
            ->update(['status' => Route::STATUS_STALE]);

        $specialistIds = TeamMember::query()
            ->where('company_id', $companyId)
            ->pluck('id');
        foreach ($specialistIds as $sid) {
            self::forgetRouteListCache($companyId, (int) $sid, $date);
        }
    }

    public static function forgetRouteListCache(int $companyId, int $specialistId, string $date): void
    {
        Cache::forget(sprintf('route_orchestrator:list:%d:%d:%s', $companyId, $specialistId, $date));
    }

    private static function resolveRouteDateString(Booking $booking): string
    {
        $bd = $booking->booking_date;
        if ($bd instanceof CarbonInterface) {
            return $bd->format('Y-m-d');
        }

        return substr((string) $bd, 0, 10);
    }
}

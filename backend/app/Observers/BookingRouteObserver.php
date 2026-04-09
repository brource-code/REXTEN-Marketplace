<?php

namespace App\Observers;

use App\Models\Booking;
use App\Models\TeamMember;
use App\Services\Routing\GeocodingService;
use App\Support\RouteStaleHelper;
use Carbon\CarbonInterface;

class BookingRouteObserver
{
    public function __construct(
        protected GeocodingService $geocodingService,
    ) {
    }

    public function created(Booking $booking): void
    {
        $this->geocodingService->geocodeBooking($booking);
        $this->markRoutesStaleForBooking($booking);
    }

    public function updated(Booking $booking): void
    {
        if ($this->isOnlyGeocodeColumnsDirty($booking)) {
            // Только геокод — маршрут по дате всё равно нужно пересчитать в UI; сбрасываем кэш списка маршрута.
            $this->forgetRouteListCacheForBooking($booking);

            return;
        }

        if ($this->shouldRefreshGeocode($booking)) {
            $this->geocodingService->geocodeBooking($booking->fresh() ?? $booking);
        }

        if ($this->shouldMarkRouteStale($booking)) {
            $this->markRoutesStaleForBooking($booking);
        }
    }

    public function deleted(Booking $booking): void
    {
        $this->markRoutesStaleForBooking($booking);
    }

    protected function isOnlyGeocodeColumnsDirty(Booking $booking): bool
    {
        if (! $booking->wasChanged()) {
            return true;
        }

        $geoKeys = ['cached_lat', 'cached_lng', 'geocoded_at', 'updated_at'];
        foreach ($booking->getChanges() as $key => $_) {
            if (! in_array($key, $geoKeys, true)) {
                return false;
            }
        }

        return true;
    }

    protected function shouldRefreshGeocode(Booking $booking): bool
    {
        return $booking->wasChanged([
            'booking_date',
            'booking_time',
            'specialist_id',
            'user_id',
            'execution_type',
        ]);
    }

    protected function shouldMarkRouteStale(Booking $booking): bool
    {
        return $booking->wasChanged([
            'booking_date',
            'booking_time',
            'priority',
            'specialist_id',
            'status',
            'user_id',
        ]);
    }

    protected function markRoutesStaleForBooking(Booking $booking): void
    {
        RouteStaleHelper::markStaleForBooking($booking);
    }

    protected function forgetRouteListCacheForBooking(Booking $booking): void
    {
        if ($booking->booking_date === null || $booking->company_id === null) {
            return;
        }
        $date = $booking->booking_date instanceof CarbonInterface
            ? $booking->booking_date->format('Y-m-d')
            : substr((string) $booking->booking_date, 0, 10);
        $companyId = (int) $booking->company_id;

        if ($booking->specialist_id !== null) {
            RouteStaleHelper::forgetRouteListCache($companyId, (int) $booking->specialist_id, $date);

            return;
        }

        foreach (TeamMember::query()->where('company_id', $companyId)->pluck('id') as $sid) {
            RouteStaleHelper::forgetRouteListCache($companyId, (int) $sid, $date);
        }
    }
}

<?php

namespace App\Observers;

use App\Models\Booking;
use App\Models\BookingLocation;
use App\Services\Routing\GeocodingService;
use App\Support\RouteStaleHelper;

/**
 * Адрес визита живёт в booking_locations и может появиться после создания брони —
 * иначе BookingRouteObserver::created геокодит «вхолостую» до появления строки адреса.
 */
class BookingLocationRouteObserver
{
    public function __construct(
        protected GeocodingService $geocodingService,
    ) {
    }

    public function saved(BookingLocation $location): void
    {
        $booking = $location->booking;
        if ($booking === null) {
            return;
        }

        $this->geocodingService->geocodeBooking(
            $booking->fresh(['location', 'user.profile'])
        );
        RouteStaleHelper::markStaleForBooking($booking->fresh() ?? $booking);
    }

    public function deleted(BookingLocation $location): void
    {
        $booking = Booking::query()->find($location->booking_id);
        if ($booking === null) {
            return;
        }

        $booking->cached_lat = null;
        $booking->cached_lng = null;
        $booking->geocoded_at = null;
        $booking->saveQuietly();

        RouteStaleHelper::markStaleForBooking($booking);
    }
}

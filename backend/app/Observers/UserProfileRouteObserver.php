<?php

namespace App\Observers;

use App\Models\Booking;
use App\Models\UserProfile;
use App\Services\Routing\GeocodingService;
use App\Support\RouteStaleHelper;

/**
 * При смене адреса в профиле клиента пересчитываем геокод броней и помечаем маршруты stale.
 */
class UserProfileRouteObserver
{
    public function __construct(
        protected GeocodingService $geocodingService,
    ) {
    }

    public function updated(UserProfile $profile): void
    {
        if (! $profile->wasChanged(['address', 'city', 'state', 'zip_code'])) {
            return;
        }

        $bookings = Booking::query()
            ->where('user_id', $profile->user_id)
            ->whereNotNull('booking_date')
            ->get();

        foreach ($bookings as $booking) {
            $this->geocodingService->geocodeBooking($booking->fresh());
            RouteStaleHelper::markStaleForBooking($booking->fresh());
        }
    }
}

<?php

namespace App\Observers;

use App\Models\Booking;
use App\Models\BookingActivity;
use Illuminate\Support\Facades\Auth;

/**
 * Логирует жизненный цикл бронирования в booking_activities.
 * Записи читаются вкладкой Activity в BookingDrawer.
 */
class BookingActivityObserver
{
    public function created(Booking $booking): void
    {
        $this->log($booking, BookingActivity::TYPE_CREATED, [
            'status' => $booking->status,
            'booking_date' => optional($booking->booking_date)->toIso8601String(),
            'booking_time' => $booking->booking_time,
            'specialist_id' => $booking->specialist_id,
            'price' => $booking->price,
            'total_price' => $booking->total_price,
            'event_type' => $booking->event_type,
        ]);
    }

    public function updated(Booking $booking): void
    {
        // status_changed
        if ($booking->wasChanged('status')) {
            $this->log($booking, BookingActivity::TYPE_STATUS_CHANGED, [
                'from' => $booking->getOriginal('status'),
                'to' => $booking->status,
            ]);
        }

        // rescheduled (любое изменение даты/времени/длительности/специалиста)
        $rescheduleFields = ['booking_date', 'booking_time', 'duration_minutes', 'specialist_id'];
        $reschedulePayload = [];
        foreach ($rescheduleFields as $field) {
            if ($booking->wasChanged($field)) {
                $reschedulePayload['from'][$field] = $booking->getOriginal($field) instanceof \DateTimeInterface
                    ? $booking->getOriginal($field)->toIso8601String()
                    : $booking->getOriginal($field);
                $reschedulePayload['to'][$field] = $booking->{$field} instanceof \DateTimeInterface
                    ? $booking->{$field}->toIso8601String()
                    : $booking->{$field};
            }
        }
        if (!empty($reschedulePayload)) {
            $this->log($booking, BookingActivity::TYPE_RESCHEDULED, $reschedulePayload);
        }

        // price_changed
        if ($booking->wasChanged('price') || $booking->wasChanged('total_price')) {
            $this->log($booking, BookingActivity::TYPE_PRICE_CHANGED, [
                'from' => [
                    'price' => $booking->getOriginal('price'),
                    'total_price' => $booking->getOriginal('total_price'),
                ],
                'to' => [
                    'price' => $booking->price,
                    'total_price' => $booking->total_price,
                ],
            ]);
        }

        // payment_status: authorized / paid / refunded / cancelled
        if ($booking->wasChanged('payment_status')) {
            $type = match ($booking->payment_status) {
                'authorized' => BookingActivity::TYPE_PAYMENT_AUTHORIZED,
                'paid' => BookingActivity::TYPE_PAYMENT_CAPTURED,
                'refunded' => BookingActivity::TYPE_PAYMENT_REFUNDED,
                default => null,
            };
            if ($type !== null) {
                $this->log($booking, $type, [
                    'from' => $booking->getOriginal('payment_status'),
                    'to' => $booking->payment_status,
                    'total_price' => $booking->total_price,
                ]);
            }
        }
    }

    public function deleted(Booking $booking): void
    {
        $this->log($booking, BookingActivity::TYPE_DELETED, [
            'status' => $booking->status,
        ]);
    }

    private function log(Booking $booking, string $type, array $payload = []): void
    {
        BookingActivity::create([
            'booking_id' => $booking->id,
            'actor_id' => Auth::id(),
            'type' => $type,
            'payload' => $payload,
        ]);
    }
}

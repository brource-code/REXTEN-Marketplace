<?php

namespace App\Observers;

use App\Models\Booking;
use App\Models\BusinessEvent;
use App\Enums\BusinessEventType;

class BookingEventObserver
{
    /**
     * Handle the Booking "created" event.
     * Создаёт событие "Крупный заказ" если сумма > $500
     */
    public function created(Booking $booking)
    {
        // Проверяем, что это крупный заказ (> $500)
        if ($booking->total_price && $booking->total_price > 500) {
            BusinessEvent::create([
                'type' => BusinessEventType::LARGE_ORDER->value,
                'title' => 'Крупный заказ получен',
                'description' => "Получен заказ на сумму \${$booking->total_price}",
                'company_id' => $booking->company_id,
                'user_id' => $booking->user_id,
                'amount' => $booking->total_price,
                'metadata' => [
                    'booking_id' => $booking->id,
                    'booking_date' => $booking->booking_date->toISOString(),
                    'service_title' => $booking->title,
                ],
            ]);
        }
    }

    /**
     * Handle the Booking "updated" event.
     * Создаёт событие "Платёж получен" когда статус меняется на completed
     */
    public function updated(Booking $booking)
    {
        // Проверяем, что статус изменился на completed
        if ($booking->isDirty('status') && $booking->status === 'completed') {
            BusinessEvent::create([
                'type' => BusinessEventType::PAYMENT_RECEIVED->value,
                'title' => 'Платёж получен',
                'description' => "Получен платёж на сумму \${$booking->total_price}",
                'company_id' => $booking->company_id,
                'user_id' => $booking->user_id,
                'amount' => $booking->total_price,
                'metadata' => [
                    'booking_id' => $booking->id,
                    'booking_date' => $booking->booking_date->toISOString(),
                ],
            ]);
        }
    }
}

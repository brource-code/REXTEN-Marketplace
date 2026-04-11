<?php

namespace App\Observers;

use App\Models\Booking;
use App\Models\BusinessEvent;
use App\Enums\BusinessEventType;
use Illuminate\Support\Facades\Cache;

class BookingEventObserver
{
    public function created(Booking $booking)
    {
        $this->flushDashboardCache($booking);

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
        $this->flushDashboardCache($booking);

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

    private function flushDashboardCache(Booking $booking): void
    {
        $id = $booking->company_id;
        Cache::forget("dashboard.stats.{$id}");
        foreach (['revenue', 'bookings', 'clients'] as $cat) {
            foreach (['thisWeek', 'thisMonth', 'thisYear'] as $per) {
                Cache::forget("dashboard.chart.{$id}.{$cat}.{$per}");
            }
        }
    }
}

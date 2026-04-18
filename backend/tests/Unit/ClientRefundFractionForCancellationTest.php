<?php

namespace Tests\Unit;

use App\Models\Booking;
use App\Models\Company;
use App\Services\BookingService;
use Carbon\Carbon;
use Tests\TestCase;

class ClientRefundFractionForCancellationTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_policy_disabled_always_full_refund(): void
    {
        $booking = $this->makeBooking(12, 50, '2026-06-15', '12:00:00');
        Carbon::setTestNow(Carbon::parse('2026-06-15 11:00:00', 'America/Los_Angeles'));

        $service = new BookingService;

        $this->assertSame(1.0, $service->clientRefundFractionForCancellation($booking, false));
    }

    public function test_exactly_free_hours_before_start_full_refund(): void
    {
        $booking = $this->makeBooking(12, 50, '2026-06-15', '12:00:00');
        Carbon::setTestNow(Carbon::parse('2026-06-15 00:00:00', 'America/Los_Angeles'));

        $service = new BookingService;

        $this->assertSame(1.0, $service->clientRefundFractionForCancellation($booking, true));
    }

    public function test_inside_window_late_fee_applied(): void
    {
        $booking = $this->makeBooking(12, 50, '2026-06-15', '12:00:00');
        Carbon::setTestNow(Carbon::parse('2026-06-15 00:01:00', 'America/Los_Angeles'));

        $service = new BookingService;

        $this->assertSame(0.5, $service->clientRefundFractionForCancellation($booking, true));
    }

    public function test_zero_percent_late_fee_full_to_client(): void
    {
        $booking = $this->makeBooking(12, 0, '2026-06-15', '12:00:00');
        Carbon::setTestNow(Carbon::parse('2026-06-15 11:00:00', 'America/Los_Angeles'));

        $service = new BookingService;

        $this->assertSame(1.0, $service->clientRefundFractionForCancellation($booking, true));
    }

    public function test_hundred_percent_late_fee_zero_to_client(): void
    {
        $booking = $this->makeBooking(12, 100, '2026-06-15', '12:00:00');
        Carbon::setTestNow(Carbon::parse('2026-06-15 11:00:00', 'America/Los_Angeles'));

        $service = new BookingService;

        $this->assertSame(0.0, $service->clientRefundFractionForCancellation($booking, true));
    }

    private function makeBooking(int $freeHours, int $lateFeePercent, string $date, string $time): Booking
    {
        $company = new Company([
            'timezone' => 'America/Los_Angeles',
            'cancellation_free_hours' => $freeHours,
            'cancellation_late_fee_percent' => $lateFeePercent,
        ]);

        $booking = new Booking([
            'booking_date' => $date,
            'booking_time' => $time,
            'duration_minutes' => 60,
        ]);
        $booking->setRelation('company', $company);

        return $booking;
    }
}

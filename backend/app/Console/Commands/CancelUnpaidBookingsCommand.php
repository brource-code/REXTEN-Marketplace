<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Payment;
use App\Services\BookingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Stripe\PaymentIntent;
use Stripe\Refund;
use Stripe\Stripe;

class CancelUnpaidBookingsCommand extends Command
{
    protected $signature = 'booking:cancel-unpaid';

    protected $description = 'Cancel bookings with payment_status=pending_payment older than 30 minutes';

    public function handle(): int
    {
        Stripe::setApiKey(config('services.stripe.secret'));

        $cutoff = now()->subMinutes(30);

        $expired = Booking::where('payment_status', 'pending_payment')
            ->where('created_at', '<', $cutoff)
            ->get();

        if ($expired->isEmpty()) {
            $this->info('No unpaid bookings to cancel.');
            return 0;
        }

        $this->info("Found {$expired->count()} unpaid booking(s) to cancel.");

        $cancelled = 0;
        $errors = 0;

        foreach ($expired as $booking) {
            try {
                if ($booking->stripe_payment_intent_id) {
                    $refundedFull = false;
                    try {
                        $pi = PaymentIntent::retrieve($booking->stripe_payment_intent_id);
                        if (in_array($pi->status, ['requires_payment_method', 'requires_confirmation', 'requires_action', 'requires_capture', 'processing'])) {
                            try {
                                PaymentIntent::cancel($booking->stripe_payment_intent_id);
                            } catch (\Exception $cancelEx) {
                                Log::warning('PI cancel failed (may need manual review)', [
                                    'booking_id' => $booking->id,
                                    'pi_status' => $pi->status,
                                    'error' => $cancelEx->getMessage(),
                                ]);
                            }
                        } elseif ($pi->status === 'succeeded') {
                            Refund::create([
                                'payment_intent' => $booking->stripe_payment_intent_id,
                                'refund_application_fee' => true,
                                'reverse_transfer' => true,
                            ]);
                            $refundedFull = true;
                        }
                    } catch (\Exception $e) {
                        Log::warning('Could not cancel/refund PI for expired booking', [
                            'booking_id' => $booking->id,
                            'pi_id' => $booking->stripe_payment_intent_id,
                            'error' => $e->getMessage(),
                        ]);
                    }

                    if ($refundedFull) {
                        $pay = Payment::where('booking_id', $booking->id)->first();
                        if ($pay) {
                            $pay->update([
                                'status' => Payment::STATUS_REFUNDED,
                                'refunded_amount' => $pay->amount,
                                'refund_reason' => 'Booking expired before service (cron)',
                            ]);
                        }
                    } else {
                        Payment::where('booking_id', $booking->id)
                            ->where('capture_status', Payment::CAPTURE_PENDING)
                            ->update([
                                'status' => Payment::STATUS_EXPIRED,
                                'capture_status' => Payment::CAPTURE_EXPIRED,
                            ]);
                    }
                }

                $booking->update([
                    'status' => 'cancelled',
                    'payment_status' => 'expired',
                    'cancelled_at' => now(),
                    'cancellation_reason' => 'Payment not received within 30 minutes',
                ]);

                if ($booking->user_id) {
                    $booking->refresh();
                    app(BookingService::class)->notifyClientAboutUnpaidBookingExpired($booking);
                }

                Log::info('Cancelled unpaid booking', [
                    'booking_id' => $booking->id,
                    'created_at' => $booking->created_at,
                ]);

                $this->line("Cancelled: Booking #{$booking->id}");
                $cancelled++;
            } catch (\Exception $e) {
                Log::error('Error cancelling unpaid booking', [
                    'booking_id' => $booking->id,
                    'error' => $e->getMessage(),
                ]);
                $this->error("Error: Booking #{$booking->id} - {$e->getMessage()}");
                $errors++;
            }
        }

        $this->info("Done. Cancelled: {$cancelled}, Errors: {$errors}");

        return 0;
    }
}

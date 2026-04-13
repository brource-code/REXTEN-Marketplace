<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Stripe\PaymentIntent;
use Stripe\Stripe;

class ExpireStripeHoldsCommand extends Command
{
    protected $signature = 'stripe:expire-holds';

    protected $description = 'Expire uncaptured payment holds that have exceeded the hold period';

    public function handle()
    {
        Stripe::setApiKey(config('services.stripe.secret'));

        $holdExpirationHours = config('services.stripe.hold_expiration_hours', 168);
        $cutoffTime = now()->subHours($holdExpirationHours);

        $pendingPayments = Payment::where('capture_status', Payment::CAPTURE_PENDING)
            ->where('created_at', '<', $cutoffTime)
            ->get();

        $this->info("Found {$pendingPayments->count()} pending payments to check.");

        $expired = 0;
        $synced = 0;
        $errors = 0;

        foreach ($pendingPayments as $payment) {
            try {
                $pi = PaymentIntent::retrieve($payment->stripe_payment_intent_id);

                if ($pi->status === 'requires_capture') {
                    PaymentIntent::cancel($payment->stripe_payment_intent_id);

                    $payment->update([
                        'status' => Payment::STATUS_EXPIRED,
                        'capture_status' => Payment::CAPTURE_EXPIRED,
                    ]);

                    if ($payment->booking_id) {
                        Booking::where('id', $payment->booking_id)
                            ->update(['payment_status' => 'expired']);
                    }

                    Log::info('Expired uncaptured payment hold', [
                        'payment_id' => $payment->id,
                        'booking_id' => $payment->booking_id,
                        'pi_id' => $payment->stripe_payment_intent_id,
                    ]);

                    $this->line("Expired: Payment #{$payment->id} (PI: {$payment->stripe_payment_intent_id})");
                    $expired++;
                } elseif ($pi->status === 'canceled') {
                    $payment->update([
                        'status' => Payment::STATUS_EXPIRED,
                        'capture_status' => Payment::CAPTURE_EXPIRED,
                    ]);

                    if ($payment->booking_id) {
                        Booking::where('id', $payment->booking_id)
                            ->update(['payment_status' => 'expired']);
                    }

                    Log::info('Synced already-canceled payment', [
                        'payment_id' => $payment->id,
                        'pi_id' => $payment->stripe_payment_intent_id,
                    ]);

                    $this->line("Synced (already canceled): Payment #{$payment->id}");
                    $synced++;
                } elseif ($pi->status === 'succeeded') {
                    $payment->update([
                        'status' => Payment::STATUS_SUCCEEDED,
                        'capture_status' => Payment::CAPTURE_CAPTURED,
                        'captured_at' => now(),
                    ]);

                    if ($payment->booking_id) {
                        Booking::where('id', $payment->booking_id)
                            ->update(['payment_status' => 'paid']);
                    }

                    Log::info('Synced already-captured payment', [
                        'payment_id' => $payment->id,
                        'pi_id' => $payment->stripe_payment_intent_id,
                    ]);

                    $this->line("Synced (already captured): Payment #{$payment->id}");
                    $synced++;
                } else {
                    Log::warning('Unexpected PaymentIntent status during expire check', [
                        'payment_id' => $payment->id,
                        'pi_id' => $payment->stripe_payment_intent_id,
                        'status' => $pi->status,
                    ]);

                    $this->warn("Skipped: Payment #{$payment->id} has unexpected status: {$pi->status}");
                }
            } catch (\Exception $e) {
                Log::error('Error processing payment in expire-holds', [
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);

                $this->error("Error: Payment #{$payment->id} - {$e->getMessage()}");
                $errors++;
            }
        }

        $this->info("Done. Expired: {$expired}, Synced: {$synced}, Errors: {$errors}");

        return 0;
    }
}

<?php

namespace App\Console\Commands;

use App\Models\StripeWebhookEvent;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Stripe\Event;
use Stripe\Stripe;

class ReprocessStripeEventCommand extends Command
{
    protected $signature = 'stripe:reprocess-event {event_id : The Stripe event ID (evt_xxx) or local DB ID}';

    protected $description = 'Reprocess a failed or skipped Stripe webhook event from stored payload';

    public function handle()
    {
        Stripe::setApiKey(config('services.stripe.secret'));

        $eventId = $this->argument('event_id');

        $webhookEvent = StripeWebhookEvent::where('stripe_event_id', $eventId)
            ->orWhere('id', $eventId)
            ->first();

        if (!$webhookEvent) {
            $this->error("Webhook event not found: {$eventId}");
            $this->info("Attempting to fetch from Stripe API...");

            try {
                $stripeEvent = Event::retrieve($eventId);
                $this->info("Found event in Stripe: {$stripeEvent->type}");
                $this->info("To reprocess, the event must first be stored in the database.");
                $this->info("You can trigger a new webhook from Stripe Dashboard or wait for automatic retry.");
                return 1;
            } catch (\Exception $e) {
                $this->error("Could not fetch event from Stripe: {$e->getMessage()}");
                return 1;
            }
        }

        $this->info("Found webhook event:");
        $this->line("  ID: {$webhookEvent->id}");
        $this->line("  Stripe Event ID: {$webhookEvent->stripe_event_id}");
        $this->line("  Type: {$webhookEvent->type}");
        $this->line("  Status: {$webhookEvent->status}");
        $this->line("  Processed at: {$webhookEvent->processed_at}");

        if ($webhookEvent->error_message) {
            $this->line("  Error: {$webhookEvent->error_message}");
        }

        if (!$webhookEvent->payload) {
            $this->error("No payload stored for this event. Cannot reprocess.");
            $this->info("Try fetching fresh from Stripe and re-sending the webhook.");
            return 1;
        }

        if (!$this->confirm("Do you want to reprocess this event?")) {
            $this->info("Cancelled.");
            return 0;
        }

        try {
            $stripeEvent = Event::constructFrom($webhookEvent->payload);

            $this->info("Reprocessing event: {$stripeEvent->type}");

            $webhookEvent->update([
                'status' => StripeWebhookEvent::STATUS_PROCESSED,
                'error_message' => null,
                'processed_at' => now(),
            ]);

            Log::info('Stripe event reprocessed via command', [
                'event_id' => $webhookEvent->stripe_event_id,
                'type' => $webhookEvent->type,
            ]);

            $this->info("Event marked as processed. The actual processing logic should be called from the webhook handler.");
            $this->info("For full reprocessing, consider calling the webhook endpoint directly with the stored payload.");

            return 0;
        } catch (\Exception $e) {
            Log::error('Failed to reprocess Stripe event', [
                'event_id' => $webhookEvent->stripe_event_id,
                'error' => $e->getMessage(),
            ]);

            $this->error("Reprocessing failed: {$e->getMessage()}");
            return 1;
        }
    }
}

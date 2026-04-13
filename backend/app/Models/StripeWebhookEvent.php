<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StripeWebhookEvent extends Model
{
    use HasFactory;

    public const STATUS_PROCESSED = 'processed';
    public const STATUS_FAILED = 'failed';
    public const STATUS_SKIPPED = 'skipped';

    protected $fillable = [
        'stripe_event_id',
        'type',
        'stripe_account_id',
        'payload',
        'status',
        'error_message',
        'processed_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'processed_at' => 'datetime',
    ];

    /**
     * Check if event was already processed.
     */
    public static function wasProcessed(string $stripeEventId): bool
    {
        return self::where('stripe_event_id', $stripeEventId)
            ->where('status', self::STATUS_PROCESSED)
            ->exists();
    }

    /**
     * Record a processed event.
     */
    public static function recordProcessed(string $stripeEventId, string $type, ?string $stripeAccountId = null, ?array $payload = null): self
    {
        return self::create([
            'stripe_event_id' => $stripeEventId,
            'type' => $type,
            'stripe_account_id' => $stripeAccountId,
            'payload' => $payload,
            'status' => self::STATUS_PROCESSED,
            'processed_at' => now(),
        ]);
    }

    /**
     * Record a failed event.
     */
    public static function recordFailed(string $stripeEventId, string $type, string $errorMessage, ?string $stripeAccountId = null, ?array $payload = null): self
    {
        return self::create([
            'stripe_event_id' => $stripeEventId,
            'type' => $type,
            'stripe_account_id' => $stripeAccountId,
            'payload' => $payload,
            'status' => self::STATUS_FAILED,
            'error_message' => $errorMessage,
            'processed_at' => now(),
        ]);
    }

    /**
     * Record a skipped event (duplicate).
     */
    public static function recordSkipped(string $stripeEventId, string $type, ?string $stripeAccountId = null): self
    {
        return self::create([
            'stripe_event_id' => $stripeEventId,
            'type' => $type,
            'stripe_account_id' => $stripeAccountId,
            'status' => self::STATUS_SKIPPED,
            'processed_at' => now(),
        ]);
    }
}

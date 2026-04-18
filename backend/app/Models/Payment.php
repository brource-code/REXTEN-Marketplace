<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_PENDING = 'pending';
    public const STATUS_AUTHORIZED = 'authorized';
    public const STATUS_SUCCEEDED = 'succeeded';
    public const STATUS_FAILED = 'failed';
    public const STATUS_REFUNDED = 'refunded';
    public const STATUS_PARTIALLY_REFUNDED = 'partially_refunded';
    public const STATUS_TRANSFER_FAILED = 'transfer_failed';
    public const STATUS_DISPUTED = 'disputed';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_REQUIRES_CAPTURE = 'requires_capture';

    public const CAPTURE_PENDING = 'pending';
    public const CAPTURE_CAPTURED = 'captured';
    public const CAPTURE_EXPIRED = 'expired';
    public const CAPTURE_CANCELLED = 'cancelled';

    public const INITIATED_BY_BUSINESS = 'business';
    public const INITIATED_BY_PLATFORM = 'platform';
    public const INITIATED_BY_SYSTEM = 'system';
    public const INITIATED_BY_CLIENT = 'client';

    protected $fillable = [
        'booking_id',
        'company_id',
        'user_id',
        'stripe_payment_intent_id',
        'stripe_charge_id',
        'stripe_transfer_id',
        'amount',
        'application_fee',
        'currency',
        'status',
        'capture_status',
        'refunded_amount',
        'refund_reason',
        'refund_initiated_by',
        'disputed_at',
        'captured_at',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'integer',
        'application_fee' => 'integer',
        'refunded_amount' => 'integer',
        'disputed_at' => 'datetime',
        'captured_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Add entry to audit trail in metadata.
     */
    public function addAuditTrail(string $action, ?int $actorId, ?string $actorRole, array $details = []): void
    {
        $metadata = $this->metadata ?? [];
        $auditTrail = $metadata['audit_trail'] ?? [];

        $auditTrail[] = [
            'action' => $action,
            'actor_id' => $actorId,
            'actor_role' => $actorRole,
            'timestamp' => now()->toIso8601String(),
            'details' => $details,
        ];

        $metadata['audit_trail'] = $auditTrail;
        $this->metadata = $metadata;
    }

    /**
     * Check if payment can be captured.
     */
    public function canBeCaptured(): bool
    {
        return $this->capture_status === self::CAPTURE_PENDING
            && in_array($this->status, [self::STATUS_PENDING, self::STATUS_AUTHORIZED], true);
    }

    /**
     * Check if payment can be refunded (captured payments).
     */
    public function canBeRefunded(): bool
    {
        return in_array($this->status, [self::STATUS_SUCCEEDED, self::STATUS_PARTIALLY_REFUNDED], true);
    }

    /**
     * Check if payment hold can be cancelled (authorized but not captured).
     */
    public function canBeCancelled(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_REQUIRES_CAPTURE, self::STATUS_AUTHORIZED], true)
            && $this->capture_status === self::CAPTURE_PENDING;
    }

    /**
     * Check if payment can be refunded OR cancelled.
     */
    public function canBeRefundedOrCancelled(): bool
    {
        return $this->canBeRefunded() || $this->canBeCancelled();
    }

    /**
     * Get remaining refundable amount in cents.
     */
    public function getRefundableAmount(): int
    {
        return $this->amount - $this->refunded_amount;
    }
}

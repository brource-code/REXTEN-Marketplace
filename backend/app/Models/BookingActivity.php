<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BookingActivity extends Model
{
    use HasFactory;

    public const TYPE_CREATED = 'created';
    public const TYPE_DELETED = 'deleted';
    public const TYPE_STATUS_CHANGED = 'status_changed';
    public const TYPE_RESCHEDULED = 'rescheduled';
    public const TYPE_PRICE_CHANGED = 'price_changed';
    public const TYPE_PAYMENT_AUTHORIZED = 'payment_authorized';
    public const TYPE_PAYMENT_CAPTURED = 'payment_captured';
    public const TYPE_PAYMENT_REFUNDED = 'payment_refunded';
    public const TYPE_COMMENT = 'comment';

    protected $fillable = [
        'booking_id',
        'actor_id',
        'type',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}

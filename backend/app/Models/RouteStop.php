<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RouteStop extends Model
{
    use HasFactory;

    public const TYPE_START = 'start';

    public const TYPE_BOOKING = 'booking';

    public const TYPE_END = 'end';

    protected $fillable = [
        'route_id',
        'booking_id',
        'sequence_order',
        'stop_type',
        'latitude',
        'longitude',
        'eta',
        'arrived_at',
        'wait_before_seconds',
        'distance_from_prev_meters',
        'duration_from_prev_seconds',
        'status',
    ];

    protected $casts = [
        'eta' => 'datetime',
        'arrived_at' => 'datetime',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class, 'route_id');
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'company_id',
        'service_id',
        'booking_id',
        'order_id',
        'advertisement_id',
        'rating',
        'comment',
        'response',
        'response_at',
        'is_visible',
    ];

    protected $casts = [
        'response_at' => 'datetime',
        'is_visible' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class)->nullable();
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function advertisement()
    {
        return $this->belongsTo(Advertisement::class);
    }
}


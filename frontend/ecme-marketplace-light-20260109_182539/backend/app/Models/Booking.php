<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Booking extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'company_id',
        'user_id',
        'service_id',
        'advertisement_id',
        'specialist_id',
        'booking_date',
        'booking_time',
        'duration_minutes',
        'price',
        'total_price',
        'status',
        'notes',
        'client_notes',
        'client_name',
        'client_phone',
        'client_email',
        'review_token',
        'review_token_expires_at',
        'cancelled_at',
        'cancellation_reason',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'booking_date' => 'datetime',
        'price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'review_token_expires_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    /**
     * Get the company for the booking.
     */
    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the user who made the booking.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the service for the booking.
     */
    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * Get the advertisement for the booking.
     */
    public function advertisement()
    {
        return $this->belongsTo(Advertisement::class);
    }

    /**
     * Get the specialist for the booking.
     */
    public function specialist()
    {
        return $this->belongsTo(User::class, 'specialist_id');
    }

    /**
     * Get the order for the booking.
     */
    public function order()
    {
        return $this->hasOne(Order::class);
    }

    /**
     * Get the reviews for the booking.
     */
    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Связь с дополнительными услугами через pivot таблицу
     */
    public function additionalServices()
    {
        return $this->belongsToMany(AdditionalService::class, 'booking_additional_services')
            ->withPivot('quantity', 'price')
            ->withTimestamps();
    }

    /**
     * Вычислить общую стоимость с дополнительными услугами
     */
    public function calculateTotalWithAdditionalServices(): float
    {
        $basePrice = $this->price ?? 0;
        $additionalTotal = $this->additionalServices->sum(function ($service) {
            return $service->pivot->price * $service->pivot->quantity;
        });

        return $basePrice + $additionalTotal;
    }

    /**
     * Генерировать токен для отзыва (для незарегистрированных клиентов)
     */
    public function generateReviewToken(): string
    {
        $this->review_token = bin2hex(random_bytes(32)); // 64 символа
        $this->review_token_expires_at = now()->addDays(30); // Токен действителен 30 дней
        $this->save();
        return $this->review_token;
    }
}


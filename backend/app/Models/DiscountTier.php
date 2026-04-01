<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiscountTier extends Model
{
    protected $fillable = [
        'company_id',
        'name',
        'min_bookings',
        'max_bookings',
        'discount_type',
        'discount_value',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'min_bookings' => 'integer',
        'max_bookings' => 'integer',
        'discount_value' => 'decimal:2',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'discount_tier_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

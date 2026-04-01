<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalarySetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'specialist_id',
        'company_id',
        'payment_type',
        'percent_rate',
        'fixed_amount',
        'hourly_rate',
        'is_active',
        'effective_from',
        'effective_to',
    ];

    protected $casts = [
        'percent_rate' => 'decimal:2',
        'fixed_amount' => 'decimal:2',
        'hourly_rate' => 'decimal:2',
        'is_active' => 'boolean',
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    /**
     * Get the specialist that owns the salary setting.
     */
    public function specialist(): BelongsTo
    {
        return $this->belongsTo(TeamMember::class, 'specialist_id');
    }

    /**
     * Get the company that owns the salary setting.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Scope a query to only include active settings.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to get settings effective for a specific date.
     */
    public function scopeForPeriod($query, $date)
    {
        return $query->where('effective_from', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('effective_to')
                  ->orWhere('effective_to', '>=', $date);
            });
    }

    /**
     * Check if setting is effective for a specific date.
     */
    public function isEffectiveForDate($date): bool
    {
        if (!$this->is_active) {
            return false;
        }

        if ($this->effective_from > $date) {
            return false;
        }

        if ($this->effective_to && $this->effective_to < $date) {
            return false;
        }

        return true;
    }
}

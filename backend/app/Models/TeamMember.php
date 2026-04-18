<?php

namespace App\Models;

use App\Services\Routing\Dto\GeoPoint;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeamMember extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'is_active',
        'name',
        'email',
        'phone',
        'role',
        'status',
        'img',
        'sort_order',
        'home_address',
        'home_latitude',
        'home_longitude',
        'default_start_time',
        'default_end_time',
        'max_jobs_per_day',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'max_jobs_per_day' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Источник истины активности сотрудника — колонка is_active.
     * Колонка status дублирует её строкой 'active'/'inactive' для UI/списков.
     * Мутаторы держат оба поля согласованными при любых create/update.
     */
    public function setStatusAttribute($value): void
    {
        $normalized = is_string($value) ? strtolower(trim($value)) : $value;
        $this->attributes['status'] = $normalized;

        if ($normalized === 'active') {
            $this->attributes['is_active'] = true;
        } elseif ($normalized === 'inactive') {
            $this->attributes['is_active'] = false;
        }
    }

    public function setIsActiveAttribute($value): void
    {
        $bool = (bool) $value;
        $this->attributes['is_active'] = $bool;
        $this->attributes['status'] = $bool ? 'active' : 'inactive';
    }

    /**
     * Get the company that owns the team member.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the salary settings for the specialist.
     */
    public function salarySettings()
    {
        return $this->hasMany(SalarySetting::class, 'specialist_id');
    }

    /**
     * Get the salary calculations for the specialist.
     */
    public function salaryCalculations()
    {
        return $this->hasMany(SalaryCalculation::class, 'specialist_id');
    }

    /**
     * Get the bookings for the team member.
     */
    public function bookings()
    {
        return $this->hasMany(Booking::class, 'specialist_id');
    }

    public function routes(): HasMany
    {
        return $this->hasMany(Route::class, 'specialist_id');
    }

    public function getStartLocation(): ?GeoPoint
    {
        if ($this->home_latitude === null || $this->home_longitude === null) {
            return null;
        }

        return new GeoPoint((float) $this->home_latitude, (float) $this->home_longitude);
    }

    public function getEndLocation(): ?GeoPoint
    {
        return $this->getStartLocation();
    }
}


<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeamMember extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'name',
        'email',
        'phone',
        'role',
        'status',
        'img',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

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
}


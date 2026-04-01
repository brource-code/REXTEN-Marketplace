<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalaryCalculation extends Model
{
    use HasFactory;

    protected $fillable = [
        'specialist_id',
        'company_id',
        'period_start',
        'period_end',
        'total_bookings',
        'total_hours',
        'base_amount',
        'percent_amount',
        'total_salary',
        'calculation_details',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'total_bookings' => 'integer',
        'total_hours' => 'decimal:2',
        'base_amount' => 'decimal:2',
        'percent_amount' => 'decimal:2',
        'total_salary' => 'decimal:2',
        'calculation_details' => 'array',
    ];

    /**
     * Get the specialist that owns the salary calculation.
     */
    public function specialist(): BelongsTo
    {
        return $this->belongsTo(TeamMember::class, 'specialist_id');
    }

    /**
     * Get the company that owns the salary calculation.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}

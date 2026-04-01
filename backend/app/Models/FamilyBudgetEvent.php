<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FamilyBudgetEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'amount',
        'type',
        'date',
        'recurrence',
        'is_flexible',
        'category',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date' => 'date:Y-m-d',
        'is_flexible' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForPeriod($query, $period)
    {
        $startDate = $period . '-01';
        $endDate = date('Y-m-t', strtotime($startDate));
        return $query->whereBetween('date', [$startDate, $endDate]);
    }
}

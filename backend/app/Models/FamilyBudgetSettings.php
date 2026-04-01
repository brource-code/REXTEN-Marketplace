<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FamilyBudgetSettings extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'period',
        'start_day',
        'start_balance',
        'safe_min_balance',
    ];

    protected $casts = [
        'start_day' => 'integer',
        'start_balance' => 'decimal:2',
        'safe_min_balance' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

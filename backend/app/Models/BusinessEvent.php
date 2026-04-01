<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BusinessEvent extends Model
{
    const UPDATED_AT = null; // Только created_at, без updated_at

    protected $fillable = [
        'type',
        'title',
        'description',
        'company_id',
        'user_id',
        'amount',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'amount' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    /**
     * Get the company that owns the event.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the user that triggered the event.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

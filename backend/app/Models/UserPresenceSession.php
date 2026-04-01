<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPresenceSession extends Model
{
    protected $fillable = [
        'user_id',
        'client_session_id',
        'last_seen_at',
        'user_agent',
        'ip_address',
    ];

    protected $casts = [
        'last_seen_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

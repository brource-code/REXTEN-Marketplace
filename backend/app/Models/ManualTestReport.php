<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManualTestReport extends Model
{
    protected $fillable = [
        'user_id',
        'scope',
        'item_key',
        'comment',
        'screenshot_path',
        'screenshot_paths',
    ];

    protected $casts = [
        'screenshot_paths' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

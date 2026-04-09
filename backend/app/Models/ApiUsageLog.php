<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiUsageLog extends Model
{
    public $timestamps = false;

    protected $table = 'api_usage_logs';

    protected $fillable = [
        'company_id',
        'provider',
        'endpoint',
        'cost_estimate',
        'request_count',
        'created_at',
    ];

    protected $casts = [
        'cost_estimate' => 'decimal:6',
        'request_count' => 'integer',
        'created_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}

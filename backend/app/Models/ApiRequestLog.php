<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiRequestLog extends Model
{
    protected $table = 'api_request_logs';

    protected $fillable = [
        'personal_access_token_id',
        'company_id',
        'method',
        'path',
        'status',
        'duration_ms',
        'ip',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}

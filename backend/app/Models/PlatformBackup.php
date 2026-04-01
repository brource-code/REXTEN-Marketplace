<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformBackup extends Model
{
    protected $table = 'platform_backups';

    protected $fillable = [
        'filename',
        'disk_path',
        'size_bytes',
        'status',
        'trigger',
        'local_ok',
        's3_ok',
        's3_key',
        'error_message',
        'meta',
    ];

    protected $casts = [
        'local_ok' => 'boolean',
        's3_ok' => 'boolean',
        'meta' => 'array',
    ];
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EnterpriseLead extends Model
{
    use HasFactory;

    protected $table = 'enterprise_leads';

    protected $fillable = [
        'name',
        'email',
        'phone',
        'company',
        'team_size',
        'message',
        'locale',
        'source',
        'ip',
        'user_agent',
        'status',
        'processed_at',
    ];

    protected $casts = [
        'processed_at' => 'datetime',
    ];
}

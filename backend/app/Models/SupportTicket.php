<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupportTicket extends Model
{
    protected $fillable = [
        'company_id',
        'user_id',
        'subject',
        'category',
        'area_section',
        'page_path',
        'body',
        'client_meta',
        'status',
        'admin_internal_note',
        'admin_public_reply',
        'resolved_at',
    ];

    protected $casts = [
        'client_meta' => 'array',
        'resolved_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(SupportTicketAttachment::class);
    }
}

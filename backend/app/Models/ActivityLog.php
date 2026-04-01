<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    use HasFactory;

    // Сегменты активности
    const SEGMENT_ADMIN = 'admin';
    const SEGMENT_BUSINESS = 'business';
    const SEGMENT_CLIENT = 'client';
    const SEGMENT_SYSTEM = 'system';

    // Категории действий
    const CATEGORY_AUTH = 'auth';
    const CATEGORY_COMPANY = 'company';
    const CATEGORY_BOOKING = 'booking';
    const CATEGORY_USER = 'user';
    const CATEGORY_ADVERTISEMENT = 'advertisement';
    const CATEGORY_REVIEW = 'review';
    const CATEGORY_PAYMENT = 'payment';
    const CATEGORY_SETTINGS = 'settings';
    const CATEGORY_SERVICE = 'service';

    // Типы действий
    const ACTION_CREATE = 'create';
    const ACTION_UPDATE = 'update';
    const ACTION_DELETE = 'delete';
    const ACTION_VIEW = 'view';
    const ACTION_LOGIN = 'login';
    const ACTION_LOGOUT = 'logout';
    const ACTION_REGISTER = 'register';
    const ACTION_APPROVE = 'approve';
    const ACTION_REJECT = 'reject';
    const ACTION_BLOCK = 'block';
    const ACTION_UNBLOCK = 'unblock';
    const ACTION_CANCEL = 'cancel';
    const ACTION_COMPLETE = 'complete';
    const ACTION_CONFIRM = 'confirm';

    protected $fillable = [
        'user_id',
        'company_id',
        'action',
        'segment',
        'category',
        'entity_type',
        'entity_id',
        'entity_name',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
        'description',
        'metadata',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Пользователь, который выполнил действие
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Компания, к которой относится действие
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Получить сущность, к которой относится лог
     */
    public function entity()
    {
        return $this->morphTo('entity', 'entity_type', 'entity_id');
    }

    /**
     * Scope для фильтрации по сегменту
     */
    public function scopeSegment($query, string $segment)
    {
        return $query->where('segment', $segment);
    }

    /**
     * Scope для фильтрации по категории
     */
    public function scopeCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope для фильтрации по компании
     */
    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    /**
     * Scope для фильтрации по пользователю
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }
}

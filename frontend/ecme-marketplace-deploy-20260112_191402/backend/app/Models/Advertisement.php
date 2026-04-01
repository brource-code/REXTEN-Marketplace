<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Advertisement extends Model
{
    use HasFactory;

    // Рекламные объявления (ротация, статистика) - НЕ ТРОГАТЬ
    public const TYPE_AD = 'ad';
    public const TYPE_ADVERTISEMENT = 'advertisement'; // Старое значение для совместимости
    
    // Marketplace объявления (обычные, с услугами) - работаем с ними
    public const TYPE_MARKETPLACE = 'marketplace';
    public const TYPE_REGULAR = 'regular'; // Старое значение для совместимости

    protected $fillable = [
        'company_id',
        'type',
        'title',
        'description',
        'image',
        'link',
        'placement',
        'city',
        'state',
        'start_date',
        'end_date',
        'impressions',
        'clicks',
        'is_active',
        'status',
        'priority',
        'services',
        'team',
        'portfolio',
        'schedule',
        'slot_step_minutes',
        'price_from',
        'price_to',
        'currency',
        'category_slug',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'is_active' => 'boolean',
        'services' => 'array',
        'team' => 'array',
        'portfolio' => 'array',
        'schedule' => 'array',
        'price_from' => 'decimal:2',
        'price_to' => 'decimal:2',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function displays()
    {
        return $this->hasMany(AdvertisementDisplay::class);
    }

    /**
     * Проверка: является ли рекламным объявлением
     */
    public function isAdType(): bool
    {
        return in_array($this->type, [self::TYPE_AD, self::TYPE_ADVERTISEMENT]);
    }
    
    /**
     * Проверка: является ли marketplace объявлением
     */
    public function isMarketplaceType(): bool
    {
        return in_array($this->type, [self::TYPE_MARKETPLACE, self::TYPE_REGULAR]) || $this->type === null;
    }
    
    /**
     * Связь с услугами (только для marketplace объявлений)
     */
    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }
}


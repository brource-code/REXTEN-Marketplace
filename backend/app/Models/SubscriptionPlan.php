<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionPlan extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'description',
        'price_monthly_cents',
        'price_yearly_cents',
        'currency',
        'features',
        'is_active',
        'is_default',
        'is_free',
        'sort_order',
        'badge_text',
        'color',
    ];

    protected $casts = [
        'features' => 'array',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'is_free' => 'boolean',
        'price_monthly_cents' => 'integer',
        'price_yearly_cents' => 'integer',
        'sort_order' => 'integer',
    ];

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class, 'plan', 'slug');
    }

    public static function getDefault(): ?self
    {
        return static::where('is_default', true)->where('is_active', true)->first();
    }

    public static function getActive()
    {
        return static::where('is_active', true)->orderBy('sort_order')->get();
    }

    public static function findBySlug(string $slug): ?self
    {
        return static::where('slug', $slug)->first();
    }

    public function getPriceMonthly(): float
    {
        return $this->price_monthly_cents / 100;
    }

    public function getPriceYearly(): float
    {
        return $this->price_yearly_cents / 100;
    }

    public function getFeature(string $key, $default = null)
    {
        return $this->features[$key] ?? $default;
    }

    public function hasFeature(string $key): bool
    {
        $value = $this->getFeature($key);
        if (is_bool($value)) {
            return $value;
        }
        return $value !== null && $value !== 0;
    }
}

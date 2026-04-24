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
        'trial_days',
        'is_trial_default',
        'sort_order',
        'badge_text',
        'color',
        'stripe_product_id',
        'stripe_price_id_monthly',
        'stripe_price_id_yearly',
    ];

    protected $casts = [
        'features' => 'array',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'is_free' => 'boolean',
        'is_trial_default' => 'boolean',
        'price_monthly_cents' => 'integer',
        'price_yearly_cents' => 'integer',
        'sort_order' => 'integer',
        'trial_days' => 'integer',
    ];

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class, 'plan', 'slug');
    }

    public static function getDefault(): ?self
    {
        return static::where('is_default', true)->where('is_active', true)->first();
    }

    /**
     * Платный план, который выдаётся новым компаниям как триал.
     * Если их несколько (что не должно случаться — контролируем в админке),
     * берём первый по sort_order.
     */
    public static function getTrialDefault(): ?self
    {
        return static::where('is_trial_default', true)
            ->where('is_active', true)
            ->where('is_free', false)
            ->where('trial_days', '>', 0)
            ->orderBy('sort_order')
            ->first();
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
        if ($value === null) {
            $inferred = $this->inferBooleanFeatureWhenKeyMissing($key);
            if ($inferred !== null) {
                $value = $inferred;
            }
        }
        if (is_bool($value)) {
            return $value;
        }

        return $value !== null && $value !== 0;
    }

    /**
     * Если в JSON плана пропал ключ (например после сбойной миграции), не считаем фичу выключенной/включённой наугад
     * для «неизвестных» slug; для стандартных — как в create_subscription_plans + add_routes.
     */
    private function inferBooleanFeatureWhenKeyMissing(string $key): ?bool
    {
        if (! in_array($key, ['routes', 'analytics', 'api_access', 'priority_support'], true)) {
            return null;
        }

        $map = [
            'free' => [
                'routes' => false,
                'analytics' => false,
                'api_access' => false,
                'priority_support' => false,
            ],
            'starter' => [
                'routes' => false,
                'analytics' => false,
                'api_access' => false,
                'priority_support' => false,
            ],
            'professional' => [
                'routes' => true,
                'analytics' => true,
                'api_access' => false,
                'priority_support' => false,
            ],
            'enterprise' => [
                'routes' => true,
                'analytics' => true,
                'api_access' => true,
                'priority_support' => true,
            ],
        ];

        $slug = (string) $this->slug;

        return $map[$slug][$key] ?? null;
    }
}

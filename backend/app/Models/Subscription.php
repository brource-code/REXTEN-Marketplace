<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'plan',
        'scheduled_plan',
        'status',
        'stripe_session_id',
        'stripe_subscription_id',
        'price_cents',
        'currency',
        'interval',
        'current_period_start',
        'current_period_end',
        'canceled_at',
        'grace_period_ends_at',
        'previous_plan',
    ];

    protected $casts = [
        'current_period_start' => 'datetime',
        'current_period_end' => 'datetime',
        'canceled_at' => 'datetime',
        'grace_period_ends_at' => 'datetime',
    ];

    public const STATUS_ACTIVE = 'active';
    public const STATUS_CANCELED = 'canceled';
    public const STATUS_PAST_DUE = 'past_due';
    public const STATUS_TRIALING = 'trialing';

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function subscriptionPlan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan', 'slug');
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE
            && ($this->current_period_end === null || $this->current_period_end->isFuture());
    }

    public function getFeature(string $key, $default = null)
    {
        return $this->subscriptionPlan?->getFeature($key, $default) ?? $default;
    }

    public function hasFeature(string $key): bool
    {
        return $this->subscriptionPlan?->hasFeature($key) ?? false;
    }

    public static function createForCompany(int $companyId, string $planSlug = null): self
    {
        $plan = $planSlug 
            ? SubscriptionPlan::findBySlug($planSlug) 
            : SubscriptionPlan::getDefault();

        if (!$plan) {
            throw new \RuntimeException('No subscription plan found');
        }

        return self::create([
            'company_id' => $companyId,
            'plan' => $plan->slug,
            'status' => self::STATUS_ACTIVE,
            'price_cents' => $plan->price_monthly_cents,
            'currency' => $plan->currency,
            'interval' => 'month',
            'current_period_start' => now(),
            'current_period_end' => $plan->is_free ? null : now()->addMonth(),
        ]);
    }
}

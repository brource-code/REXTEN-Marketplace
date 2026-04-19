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
        'stripe_subscription_schedule_id',
        'stripe_customer_id',
        'stripe_price_id',
        'price_cents',
        'currency',
        'interval',
        'current_period_start',
        'current_period_end',
        'canceled_at',
        'cancel_at_period_end',
        'grace_period_ends_at',
        'trial_ends_at',
        'previous_plan',
    ];

    protected $casts = [
        'current_period_start' => 'datetime',
        'current_period_end' => 'datetime',
        'canceled_at' => 'datetime',
        'cancel_at_period_end' => 'boolean',
        'grace_period_ends_at' => 'datetime',
        'trial_ends_at' => 'datetime',
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

    /**
     * Активная подписка в режиме триала: trial_ends_at в будущем.
     * Реальный платёж пока не списывался — это бесплатный пробный период
     * на платном плане, выданный новой компании.
     */
    public function isTrialing(): bool
    {
        return $this->trial_ends_at !== null && $this->trial_ends_at->isFuture();
    }

    public function trialDaysLeft(): ?int
    {
        if (!$this->isTrialing()) {
            return null;
        }
        return max(0, (int) now()->diffInDays($this->trial_ends_at, false) + 1);
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

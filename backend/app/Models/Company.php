<?php

namespace App\Models;

use DateTimeZone;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'owner_id',
        'name',
        'slug',
        'description',
        'category',
        'logo',
        'cover_image',
        'address',
        'city',
        'state',
        'timezone',
        'zip_code',
        'phone',
        'email',
        'telegram',
        'whatsapp',
        'website',
        'latitude',
        'longitude',
        'status',
        'subscription_plan',
        'is_visible_on_marketplace',
        'onboarding_completed',
        'onboarding_completed_at',
        'onboarding_version',
        // Marketplace settings
        'show_in_search',
        'show_in_featured',
        'allow_booking',
        'show_reviews',
        'show_portfolio',
        'seo_title',
        'seo_description',
        'meta_keywords',
        'schedule',
        'loyalty_booking_count_rule',
        'notification_email_enabled',
        'notification_sms_enabled',
        'notification_new_bookings',
        'notification_cancellations',
        'notification_payments',
        'notification_reviews',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'is_visible_on_marketplace' => 'boolean',
        'onboarding_completed' => 'boolean',
        'onboarding_completed_at' => 'datetime',
        // Marketplace settings
        'show_in_search' => 'boolean',
        'show_in_featured' => 'boolean',
        'allow_booking' => 'boolean',
        'show_reviews' => 'boolean',
        'show_portfolio' => 'boolean',
        'schedule' => 'array',
        'notification_email_enabled' => 'boolean',
        'notification_sms_enabled' => 'boolean',
        'notification_new_bookings' => 'boolean',
        'notification_cancellations' => 'boolean',
        'notification_payments' => 'boolean',
        'notification_reviews' => 'boolean',
    ];

    /**
     * Get the owner of the company.
     */
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Get the users associated with the company (staff with roles).
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'company_users')
            ->withPivot('role_id', 'is_active')
            ->withTimestamps();
    }

    /**
     * Get staff memberships with roles.
     */
    public function staffUsers()
    {
        return $this->hasMany(CompanyUser::class)->where('is_active', true);
    }

    /**
     * Get custom roles for this company.
     */
    public function customRoles()
    {
        return $this->hasMany(CompanyRole::class)->where('is_system', false);
    }

    /**
     * Get all roles available for this company (system + custom).
     */
    public function roles()
    {
        return CompanyRole::forCompany($this->id);
    }

    /**
     * Get the services for the company.
     */
    public function services()
    {
        return $this->hasMany(Service::class);
    }

    /**
     * Get the bookings for the company.
     */
    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Get the orders for the company.
     */
    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Get the reviews for the company.
     */
    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Get the advertisements for the company.
     */
    public function advertisements()
    {
        return $this->hasMany(Advertisement::class);
    }

    /**
     * Get the team members for the company.
     */
    public function teamMembers()
    {
        return $this->hasMany(TeamMember::class);
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription()
    {
        return $this->hasOne(Subscription::class)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->latest();
    }

    public function discountTiers()
    {
        return $this->hasMany(DiscountTier::class);
    }

    public function promoCodes()
    {
        return $this->hasMany(PromoCode::class);
    }

    /**
     * Get the average rating.
     */
    public function getAverageRatingAttribute(): float
    {
        return $this->reviews()->avg('rating') ?? 0;
    }

    /**
     * IANA-таймзона компании для расписания и отображения (рынок США — дефолт как в миграции).
     */
    public function resolveTimezone(): string
    {
        $tz = trim((string) ($this->timezone ?? ''));
        if ($tz !== '' && self::isValidIanaTimezone($tz)) {
            return $tz;
        }

        return 'America/Los_Angeles';
    }

    /**
     * Таймзона компании по id без загрузки модели (для сервисов и бронирований).
     */
    public static function timezoneById(int $id): string
    {
        $row = self::query()->whereKey($id)->first(['timezone']);
        if ($row === null) {
            return 'America/Los_Angeles';
        }

        return $row->resolveTimezone();
    }

    public static function isValidIanaTimezone(string $tz): bool
    {
        try {
            new DateTimeZone($tz);

            return true;
        } catch (\Exception) {
            return false;
        }
    }
}


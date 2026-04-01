<?php

namespace App\Models;

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
        'zip_code',
        'phone',
        'email',
        'website',
        'latitude',
        'longitude',
        'status',
        'subscription_plan',
        'is_visible_on_marketplace',
        'onboarding_completed',
        'onboarding_completed_at',
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
    ];

    /**
     * Get the owner of the company.
     */
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Get the users associated with the company.
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'company_users')
            ->withPivot('role', 'is_active')
            ->withTimestamps();
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

    /**
     * Get the average rating.
     */
    public function getAverageRatingAttribute(): float
    {
        return $this->reviews()->avg('rating') ?? 0;
    }
}


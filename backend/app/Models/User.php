<?php

namespace App\Models;

use Illuminate\Auth\MustVerifyEmail;
use Illuminate\Auth\Passwords\CanResetPassword;
use Illuminate\Contracts\Auth\CanResetPassword as CanResetPasswordContract;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailContract;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject, CanResetPasswordContract, MustVerifyEmailContract
{
    use CanResetPassword;
    use MustVerifyEmail;
    use HasApiTokens;
    use HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'email',
        'stripe_customer_id',
        'password',
        'role',
        'locale',
        'is_active',
        'is_blocked',
        'client_status',
        'google_id',
        'provider',
        'last_login_at',
        'email_verified_at',
        'telegram_chat_id',
        'telegram_username',
        'telegram_linked_at',
        'telegram_link_token',
        'telegram_link_token_expires_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
        'is_blocked' => 'boolean',
        'telegram_linked_at' => 'datetime',
        'telegram_link_token_expires_at' => 'datetime',
    ];

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     *
     * @return mixed
     */
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Return a key value array, containing any custom claims to be added to the JWT.
     *
     * @return array
     */
    public function getJWTCustomClaims()
    {
        return [
            'role' => $this->role,
        ];
    }

    /**
     * Get the user's profile.
     */
    public function profile()
    {
        return $this->hasOne(UserProfile::class);
    }

    /**
     * Get the companies owned by the user.
     */
    public function ownedCompanies()
    {
        return $this->hasMany(Company::class, 'owner_id');
    }

    /**
     * Get the companies the user is associated with.
     */
    public function companies()
    {
        return $this->belongsToMany(Company::class, 'company_users')
            ->withPivot('role_id', 'is_active')
            ->withTimestamps();
    }

    /**
     * Get company memberships with role.
     */
    public function companyUsers()
    {
        return $this->hasMany(CompanyUser::class);
    }

    /**
     * Get role in a specific company.
     */
    public function getCompanyRole(int $companyId): ?CompanyRole
    {
        $companyUser = $this->companyUsers()
            ->where('company_id', $companyId)
            ->where('is_active', true)
            ->with('role')
            ->first();

        return $companyUser?->role;
    }

    /**
     * Check if user has permission in company.
     */
    public function hasPermissionInCompany(int $companyId, string $permissionSlug): bool
    {
        if ($this->ownedCompanies()->where('id', $companyId)->exists()) {
            return true;
        }

        $role = $this->getCompanyRole($companyId);
        return $role?->hasPermission($permissionSlug) ?? false;
    }

    /**
     * Check if user has access to company (owner or staff).
     */
    public function hasAccessToCompany(int $companyId): bool
    {
        return $this->ownedCompanies()->where('id', $companyId)->exists()
            || $this->companyUsers()->where('company_id', $companyId)->where('is_active', true)->exists();
    }

    /**
     * Get all permissions for user in a specific company.
     */
    public function getPermissionsInCompany(int $companyId): array
    {
        if ($this->ownedCompanies()->where('id', $companyId)->exists()) {
            return Permission::pluck('slug')->toArray();
        }

        $role = $this->getCompanyRole($companyId);
        return $role?->permissions->pluck('slug')->toArray() ?? [];
    }

    /**
     * Check if user is owner of a specific company.
     */
    public function isOwnerOfCompany(int $companyId): bool
    {
        return $this->ownedCompanies()->where('id', $companyId)->exists();
    }

    /**
     * Get the user's bookings.
     */
    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Get the user's orders.
     */
    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Get the user's reviews.
     */
    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Get the user's favorites.
     */
    public function favorites()
    {
        return $this->hasMany(Favorite::class);
    }

    /**
     * Get the user's notifications.
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Check if user is a client.
     */
    /**
     * Get the user's family budget settings.
     */
    public function familyBudgetSettings()
    {
        return $this->hasOne(FamilyBudgetSettings::class);
    }

    /**
     * Get the user's family budget events.
     */
    public function familyBudgetEvents()
    {
        return $this->hasMany(FamilyBudgetEvent::class);
    }

    public function isClient(): bool
    {
        return $this->role === 'CLIENT';
    }

    /**
     * Check if user is a business owner.
     */
    public function isBusinessOwner(): bool
    {
        return $this->role === 'BUSINESS_OWNER';
    }

    /**
     * Check if user is a superadmin.
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'SUPERADMIN';
    }
}


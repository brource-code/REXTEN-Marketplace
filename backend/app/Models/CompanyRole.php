<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompanyRole extends Model
{
    use HasFactory;

    protected $fillable = ['company_id', 'name', 'slug', 'is_system'];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'company_role_permissions');
    }

    public function companyUsers()
    {
        return $this->hasMany(CompanyUser::class, 'role_id');
    }

    public function hasPermission(string $slug): bool
    {
        return $this->permissions()->where('slug', $slug)->exists();
    }

    public function scopeSystem($query)
    {
        return $query->where('is_system', true)->whereNull('company_id');
    }

    public function scopeForCompany($query, ?int $companyId)
    {
        return $query->where(function ($q) use ($companyId) {
            $q->whereNull('company_id')
                ->orWhere('company_id', $companyId);
        });
    }
}

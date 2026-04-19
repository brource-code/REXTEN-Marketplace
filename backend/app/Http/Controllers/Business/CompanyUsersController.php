<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\CompanyRole;
use App\Models\CompanyUser;
use App\Models\User;
use App\Services\SubscriptionLimitService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CompanyUsersController extends Controller
{
    /**
     * List companies user has access to (owned + staff).
     */
    public function companies(Request $request)
    {
        $user = Auth::user();
        $owned = $user->ownedCompanies()->select('id', 'name', 'slug')->get()->map(fn ($c) => ['id' => $c->id, 'name' => $c->name, 'slug' => $c->slug, 'is_owner' => true]);
        $staff = $user->companyUsers()->where('is_active', true)->with('company:id,name,slug')->get()
            ->pluck('company')->filter()->unique('id')->map(fn ($c) => ['id' => $c->id, 'name' => $c->name, 'slug' => $c->slug, 'is_owner' => false]);
        $companies = $owned->concat($staff)->values();
        return response()->json(['success' => true, 'companies' => $companies]);
    }

    /**
     * List company users (owner + staff).
     */
    public function index(Request $request)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $user = Auth::user();
        if (!$user->hasPermissionInCompany($companyId, 'manage_users') && !$user->ownedCompanies()->where('id', $companyId)->exists()) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $company = Company::findOrFail($companyId);
        $owner = $company->owner;
        $staff = $company->staffUsers()->with(['user.profile', 'role'])->get();

        $members = collect();

        if ($owner) {
            $members->push([
                'id' => 'owner-' . $owner->id,
                'user_id' => $owner->id,
                'email' => $owner->email,
                'name' => $owner->profile?->first_name . ' ' . $owner->profile?->last_name ?: $owner->email,
                'role' => ['id' => null, 'name' => 'Владелец', 'slug' => 'owner', 'is_system' => true],
                'is_owner' => true,
                'is_active' => true,
            ]);
        }

        foreach ($staff as $cu) {
            $u = $cu->user;
            if (!$u || $u->id === $owner?->id) continue;
            $members->push([
                'id' => $cu->id,
                'user_id' => $u->id,
                'email' => $u->email,
                'name' => $u->profile ? trim($u->profile->first_name . ' ' . $u->profile->last_name) : $u->email,
                'role' => $cu->role ? [
                    'id' => $cu->role->id,
                    'name' => $cu->role->name,
                    'slug' => $cu->role->slug,
                    'is_system' => $cu->role->is_system,
                ] : null,
                'is_owner' => false,
                'is_active' => $cu->is_active,
            ]);
        }

        return response()->json([
            'success' => true,
            'members' => $members->values(),
        ]);
    }

    /**
     * Invite user by email.
     */
    public function invite(Request $request)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $user = Auth::user();
        if (!$user->hasPermissionInCompany($companyId, 'manage_users')) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'email' => 'required|email',
            'role_id' => 'required|exists:company_roles,id',
            'first_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:100',
        ]);

        if (!SubscriptionLimitService::canCreate((int) $companyId, 'team_members')) {
            return response()->json(
                SubscriptionLimitService::limitExceededPayload((int) $companyId, 'team_members'),
                403
            );
        }

        $company = Company::findOrFail($companyId);
        $role = CompanyRole::findOrFail($validated['role_id']);

        if ($role->company_id && $role->company_id != $companyId) {
            return response()->json(['success' => false, 'message' => 'Invalid role'], 422);
        }
        if ($role->company_id === null && !in_array($role->slug, ['owner', 'manager'])) {
            return response()->json(['success' => false, 'message' => 'Invalid role'], 422);
        }

        // Нельзя назначить роль owner через приглашение
        if ($role->slug === 'owner') {
            return response()->json(['success' => false, 'message' => 'Cannot assign owner role'], 422);
        }

        $existingUser = User::where('email', $validated['email'])->first();

        // Нельзя пригласить самого себя
        if ($existingUser && $existingUser->id === $user->id) {
            return response()->json(['success' => false, 'message' => 'Cannot invite yourself'], 422);
        }

        if ($existingUser) {
            // Нельзя пригласить владельца этой компании
            if ($company->owner_id === $existingUser->id) {
                return response()->json(['success' => false, 'message' => 'User is already the owner of this company'], 422);
            }
            
            // Нельзя пригласить владельца другой компании
            $ownsOtherCompany = Company::where('owner_id', $existingUser->id)->exists();
            if ($ownsOtherCompany) {
                return response()->json(['success' => false, 'message' => 'User is already an owner of another company'], 422);
            }
            
            // Нельзя пригласить того, кто уже в этой компании
            $existing = CompanyUser::where('company_id', $companyId)->where('user_id', $existingUser->id)->first();
            if ($existing) {
                return response()->json(['success' => false, 'message' => 'User already in this company'], 422);
            }

            CompanyUser::create([
                'company_id' => $companyId,
                'user_id' => $existingUser->id,
                'role_id' => $role->id,
                'is_active' => true,
            ]);

            $existingUser->update(['role' => 'BUSINESS_OWNER']);

            return response()->json([
                'success' => true,
                'message' => 'User added to company',
                'member' => [
                    'id' => CompanyUser::where('company_id', $companyId)->where('user_id', $existingUser->id)->value('id'),
                    'user_id' => $existingUser->id,
                    'email' => $existingUser->email,
                    'name' => $existingUser->profile ? trim($existingUser->profile->first_name . ' ' . $existingUser->profile->last_name) : $existingUser->email,
                    'role' => ['id' => $role->id, 'name' => $role->name, 'slug' => $role->slug, 'is_system' => $role->is_system],
                    'is_owner' => false,
                    'is_active' => true,
                ],
            ], 201);
        }

        $password = Str::random(12);
        $newUser = User::create([
            'email' => $validated['email'],
            'password' => Hash::make($password),
            'role' => 'BUSINESS_OWNER',
        ]);

        // Создаём профиль с именем если передано
        if (!empty($validated['first_name']) || !empty($validated['last_name'])) {
            $newUser->profile()->create([
                'first_name' => $validated['first_name'] ?? null,
                'last_name' => $validated['last_name'] ?? null,
            ]);
        }

        CompanyUser::create([
            'company_id' => $companyId,
            'user_id' => $newUser->id,
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Invitation sent. User created with temporary password.',
            'member' => [
                'id' => CompanyUser::where('company_id', $companyId)->where('user_id', $newUser->id)->value('id'),
                'user_id' => $newUser->id,
                'email' => $newUser->email,
                'name' => $newUser->email,
                'role' => ['id' => $role->id, 'name' => $role->name, 'slug' => $role->slug, 'is_system' => $role->is_system],
                'is_owner' => false,
                'is_active' => true,
            ],
            'temporary_password' => $password,
        ], 201);
    }

    /**
     * Update user role.
     */
    public function updateRole(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $user = Auth::user();
        if (!$user->isOwnerOfCompany((int) $companyId)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'role_id' => 'required|exists:company_roles,id',
        ]);

        $companyUser = CompanyUser::where('id', $id)
            ->where('company_id', $companyId)
            ->firstOrFail();

        $company = Company::findOrFail($companyId);
        if ($company->owner_id === $companyUser->user_id) {
            return response()->json(['success' => false, 'message' => 'Cannot change owner role'], 422);
        }

        $role = CompanyRole::findOrFail($validated['role_id']);
        if ($role->company_id && $role->company_id != $companyId) {
            return response()->json(['success' => false, 'message' => 'Invalid role'], 422);
        }

        $companyUser->update(['role_id' => $role->id]);

        return response()->json([
            'success' => true,
            'member' => [
                'id' => $companyUser->id,
                'user_id' => $companyUser->user_id,
                'role' => ['id' => $role->id, 'name' => $role->name, 'slug' => $role->slug, 'is_system' => $role->is_system],
            ],
        ]);
    }

    /**
     * Remove user from company.
     */
    public function destroy(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }

        $user = Auth::user();
        if (!$user->hasPermissionInCompany($companyId, 'manage_users')) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $companyUser = CompanyUser::where('id', $id)
            ->where('company_id', $companyId)
            ->firstOrFail();

        $company = Company::findOrFail($companyId);
        if ($company->owner_id === $companyUser->user_id) {
            return response()->json(['success' => false, 'message' => 'Cannot remove owner'], 422);
        }

        $companyUser->delete();

        return response()->json(['success' => true, 'message' => 'User removed from company']);
    }
}

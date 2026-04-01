<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\CompanyRole;
use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CompanyRolesController extends Controller
{
    public function index(Request $request)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }
        $user = Auth::user();
        if (!$user->hasPermissionInCompany($companyId, 'manage_roles') && !$user->ownedCompanies()->where('id', $companyId)->exists()) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $roles = CompanyRole::forCompany($companyId)->with('permissions')->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'slug' => $r->slug,
                'is_system' => $r->is_system,
                'permissions' => $r->permissions->pluck('slug')->toArray(),
            ]);
        return response()->json(['success' => true, 'roles' => $roles]);
    }

    public function permissions(Request $request)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }
        $user = Auth::user();
        if (!$user->hasPermissionInCompany($companyId, 'manage_roles') && !$user->ownedCompanies()->where('id', $companyId)->exists()) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $permissions = Permission::orderBy('group')->orderBy('name')->get()
            ->groupBy('group')
            ->map(fn ($items) => $items->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'slug' => $p->slug]));
        return response()->json(['success' => true, 'permissions' => $permissions]);
    }

    public function store(Request $request)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }
        $user = Auth::user();
        if (!$user->hasPermissionInCompany($companyId, 'manage_roles')) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'slug' => 'required|string|max:50|regex:/^[a-z0-9_]+$/',
            'permission_ids' => 'array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);
        if (in_array($validated['slug'], ['owner', 'manager'])) {
            return response()->json(['success' => false, 'message' => 'Cannot create system role'], 422);
        }
        if (CompanyRole::where('company_id', $companyId)->where('slug', $validated['slug'])->exists()) {
            return response()->json(['success' => false, 'message' => 'Role slug exists'], 422);
        }
        $role = CompanyRole::create([
            'company_id' => $companyId,
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'is_system' => false,
        ]);
        $role->permissions()->sync($validated['permission_ids'] ?? []);
        $role->load('permissions');
        return response()->json([
            'success' => true,
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'slug' => $role->slug,
                'is_system' => false,
                'permissions' => $role->permissions->pluck('slug')->toArray(),
            ],
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }
        $user = Auth::user();
        if (!$user->hasPermissionInCompany($companyId, 'manage_roles')) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $role = CompanyRole::where('id', $id)->where('company_id', $companyId)->firstOrFail();
        if ($role->is_system) {
            return response()->json(['success' => false, 'message' => 'Cannot edit system role'], 422);
        }
        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'permission_ids' => 'array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);
        if (isset($validated['name'])) {
            $role->update(['name' => $validated['name']]);
        }
        if (array_key_exists('permission_ids', $validated)) {
            $role->permissions()->sync($validated['permission_ids']);
        }
        $role->load('permissions');
        return response()->json([
            'success' => true,
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'slug' => $role->slug,
                'is_system' => false,
                'permissions' => $role->permissions->pluck('slug')->toArray(),
            ],
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        if (!$companyId) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }
        $user = Auth::user();
        if (!$user->hasPermissionInCompany($companyId, 'manage_roles')) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $role = CompanyRole::where('id', $id)->where('company_id', $companyId)->firstOrFail();
        if ($role->is_system) {
            return response()->json(['success' => false, 'message' => 'Cannot delete system role'], 422);
        }
        if ($role->companyUsers()->count() > 0) {
            return response()->json(['success' => false, 'message' => 'Reassign users first'], 422);
        }
        $role->permissions()->detach();
        $role->delete();
        return response()->json(['success' => true, 'message' => 'Role deleted']);
    }
}

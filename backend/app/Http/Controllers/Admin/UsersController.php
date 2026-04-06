<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserProfile;
use App\Helpers\DatabaseHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;

class UsersController extends Controller
{
    /**
     * Get all users.
     */
    public function index(Request $request)
    {
        $query = User::with('profile');

        // Filter by role (пустая строка в query не должна давать where role = '')
        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        // Filter by status
        if ($request->filled('status')) {
            if ($request->status === 'active') {
                $query->where('is_active', true)->where('is_blocked', false);
            } elseif ($request->status === 'blocked') {
                $query->where('is_blocked', true);
            }
        }

        // Search
        if ($request->filled('search')) {
            $search = (string) $request->get('search');
            $query->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'email', "%{$search}%");
                $q->orWhereHas('profile', function ($profileQuery) use ($search) {
                    DatabaseHelper::whereLike($profileQuery, 'first_name', "%{$search}%");
                    DatabaseHelper::whereLike($profileQuery, 'last_name', "%{$search}%", 'or');
                });
            });
        }

        // Get total count before pagination
        $total = $query->count();

        // Pagination
        $page = $request->get('page', 1);
        $pageSize = $request->get('pageSize', 10);
        $skip = ($page - 1) * $pageSize;

        $users = $query->orderBy('created_at', 'desc')
            ->skip($skip)
            ->take($pageSize)
            ->get();

        $data = $users->map(fn ($user) => $this->formatUserForList($user));

        return response()->json([
            'data' => $data,
            'total' => $total,
        ]);
    }

    /**
     * Create user.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|in:CLIENT,BUSINESS_OWNER,SUPERADMIN',
            'firstName' => 'nullable|string|max:255',
            'lastName' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка валидации',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::create([
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'is_active' => $request->input('isActive', true),
            'email_verified_at' => now(),
        ]);

        if ($request->has('firstName') || $request->has('lastName')) {
            UserProfile::create([
                'user_id' => $user->id,
                'first_name' => $request->input('firstName', ''),
                'last_name' => $request->input('lastName', ''),
            ]);
        }

        $user->load('profile');

        return response()->json([
            'success' => true,
            'data' => $this->formatUserForList($user->fresh(['profile'])),
        ], 201);
    }

    /**
     * Update user.
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'role' => 'sometimes|in:CLIENT,BUSINESS_OWNER,SUPERADMIN',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Ошибка валидации',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user->update($request->only(['role', 'is_active']));

        return response()->json($user);
    }

    /**
     * Block user.
     */
    public function block($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_blocked' => true]);

        return response()->json([
            'message' => 'User blocked',
        ]);
    }

    /**
     * Unblock user.
     */
    public function unblock($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_blocked' => false]);

        return response()->json([
            'message' => 'User unblocked',
        ]);
    }

    /**
     * Delete user.
     */
    public function destroy($id)
    {
        $user = User::findOrFail($id);

        // Нельзя удалить самого себя
        if ($user->id === auth('api')->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Нельзя удалить самого себя',
            ], 422);
        }

        // Удаляем профиль пользователя, если он существует
        if ($user->profile) {
            $user->profile->delete();
        }

        // Удаляем пользователя
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Пользователь удален',
        ]);
    }

    /**
     * Поля списка / карточки пользователя для фронта (в т.ч. путь аватара для normalizeImageUrl).
     */
    private function formatUserForList(User $user): array
    {
        $user->loadMissing('profile');

        $avatarUrl = null;
        if ($user->profile && $user->profile->avatar) {
            $avatarPath = Storage::disk('public')->url($user->profile->avatar);
            if (str_starts_with($avatarPath, 'http://') || str_starts_with($avatarPath, 'https://')) {
                $parsedUrl = parse_url($avatarPath);
                $avatarUrl = $parsedUrl['path'] ?? $avatarPath;
            } else {
                $avatarUrl = $avatarPath;
            }
        }

        return [
            'id' => $user->id,
            'name' => $user->profile ? trim($user->profile->first_name . ' ' . ($user->profile->last_name ?? '')) : 'N/A',
            'firstName' => $user->profile->first_name ?? '',
            'lastName' => $user->profile->last_name ?? '',
            'email' => $user->email,
            'role' => $user->role,
            'isActive' => $user->is_active,
            'isBlocked' => $user->is_blocked,
            'createdAt' => $user->created_at->toISOString(),
            'img' => $avatarUrl,
        ];
    }
}


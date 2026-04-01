<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\UserProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    /**
     * Get client profile.
     */
    public function show()
    {
        $user = auth('api')->user()->load('profile');

        // Формируем полный URL для аватара, если он есть
        // Возвращаем относительный путь для аватара (фронтенд сам добавит правильный базовый URL)
        $avatarUrl = null;
        if ($user->profile && $user->profile->avatar) {
            $avatarPath = Storage::disk('public')->url($user->profile->avatar);
            // Если это уже полный URL, извлекаем только путь
            if (str_starts_with($avatarPath, 'http://') || str_starts_with($avatarPath, 'https://')) {
                $parsedUrl = parse_url($avatarPath);
                $avatarUrl = $parsedUrl['path'] ?? $avatarPath;
            } else {
                // Это уже относительный путь
                $avatarUrl = $avatarPath;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'firstName' => $user->profile->first_name ?? null,
                'lastName' => $user->profile->last_name ?? null,
                'phone' => $user->profile->phone ?? null,
                'avatar' => $avatarUrl,
                'address' => $user->profile->address ?? null,
                'city' => $user->profile->city ?? null,
                'state' => $user->profile->state ?? null,
                'zipCode' => $user->profile->zip_code ?? null,
            ],
        ]);
    }

    /**
     * Update client profile.
     */
    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'firstName' => 'sometimes|string|max:255',
            'lastName' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'zipCode' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = auth('api')->user();
        $profile = $user->profile;

        if (!$profile) {
            $profile = UserProfile::create([
                'user_id' => $user->id,
                'first_name' => $request->firstName ?? '',
                'last_name' => $request->lastName ?? '',
            ]);
        }

        $profile->update([
            'first_name' => $request->firstName ?? $profile->first_name,
            'last_name' => $request->lastName ?? $profile->last_name,
            'phone' => $request->phone ?? $profile->phone,
            'address' => $request->address ?? $profile->address,
            'city' => $request->city ?? $profile->city,
            'state' => $request->state ?? $profile->state,
            'zip_code' => $request->zipCode ?? $profile->zip_code,
        ]);

        // Возвращаем относительный путь для аватара (фронтенд сам добавит правильный базовый URL)
        $avatarUrl = null;
        if ($profile->avatar) {
            $avatarPath = Storage::disk('public')->url($profile->avatar);
            // Если это уже полный URL, извлекаем только путь
            if (str_starts_with($avatarPath, 'http://') || str_starts_with($avatarPath, 'https://')) {
                $parsedUrl = parse_url($avatarPath);
                $avatarUrl = $parsedUrl['path'] ?? $avatarPath;
            } else {
                // Это уже относительный путь
                $avatarUrl = $avatarPath;
            }
        }

        // Формируем имя пользователя из firstName и lastName
        $firstName = trim($profile->first_name ?? '');
        $lastName = trim($profile->last_name ?? '');
        $fullName = null;
        if ($firstName || $lastName) {
            $fullName = trim($firstName . ' ' . $lastName);
        }

        return response()->json([
            'id' => $user->id,
            'email' => $user->email,
            'name' => $fullName,
            'firstName' => $profile->first_name,
            'lastName' => $profile->last_name,
            'phone' => $profile->phone,
            'avatar' => $avatarUrl,
            'address' => $profile->address,
            'city' => $profile->city,
            'state' => $profile->state,
            'zipCode' => $profile->zip_code,
        ]);
    }

    /**
     * Change password.
     */
    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'currentPassword' => 'required|string',
            'newPassword' => 'required|string|min:8',
            'confirmNewPassword' => 'required|string|same:newPassword',
        ], [
            'currentPassword.required' => 'Текущий пароль обязателен',
            'newPassword.required' => 'Новый пароль обязателен',
            'newPassword.min' => 'Новый пароль должен быть не менее 8 символов',
            'confirmNewPassword.required' => 'Подтверждение пароля обязательно',
            'confirmNewPassword.same' => 'Пароли не совпадают',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = auth('api')->user();

        // Проверяем текущий пароль
        if (!Hash::check($request->currentPassword, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Текущий пароль неверен',
            ], 422);
        }

        // Обновляем пароль
        $user->update([
            'password' => Hash::make($request->newPassword),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Пароль успешно изменен',
        ]);
    }

    /**
     * Upload avatar.
     */
    public function uploadAvatar(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = auth('api')->user();
        $profile = $user->profile;

        if (!$profile) {
            $profile = UserProfile::create([
                'user_id' => $user->id,
                'first_name' => '',
                'last_name' => '',
            ]);
        }

        // Delete old avatar if exists
        if ($profile->avatar) {
            Storage::disk('public')->delete($profile->avatar);
        }

        // Store new avatar
        $path = $request->file('avatar')->store('avatars', 'public');
        $profile->update(['avatar' => $path]);

        // Возвращаем относительный путь для аватара (фронтенд сам добавит правильный базовый URL)
        $avatarPath = Storage::disk('public')->url($path);
        // Если это уже полный URL, извлекаем только путь
        if (str_starts_with($avatarPath, 'http://') || str_starts_with($avatarPath, 'https://')) {
            $parsedUrl = parse_url($avatarPath);
            $avatarUrl = $parsedUrl['path'] ?? $avatarPath;
        } else {
            // Это уже относительный путь
            $avatarUrl = $avatarPath;
        }

        return response()->json([
            'avatar' => $avatarUrl,
        ]);
    }

    /**
     * Delete avatar.
     */
    public function deleteAvatar(Request $request)
    {
        $user = auth('api')->user();
        $profile = $user->profile;

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile not found',
            ], 404);
        }

        // Delete avatar file if exists
        if ($profile->avatar) {
            Storage::disk('public')->delete($profile->avatar);
        }

        // Update profile
        $profile->update(['avatar' => null]);

        return response()->json([
            'success' => true,
            'message' => 'Avatar deleted successfully',
            'avatar' => null,
        ]);
    }
}


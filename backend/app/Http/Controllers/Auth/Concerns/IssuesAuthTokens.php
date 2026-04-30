<?php

namespace App\Http\Controllers\Auth\Concerns;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Tymon\JWTAuth\Facades\JWTAuth;

trait IssuesAuthTokens
{
    private function publicAvatarPathFromProfile(?UserProfile $profile): ?string
    {
        if (! $profile || ! $profile->avatar) {
            return null;
        }

        $avatarPath = Storage::disk('public')->url($profile->avatar);
        if (str_starts_with($avatarPath, 'http://') || str_starts_with($avatarPath, 'https://')) {
            $parsedUrl = parse_url($avatarPath);

            return $parsedUrl['path'] ?? $avatarPath;
        }

        return $avatarPath;
    }

    /**
     * JSON + refresh cookie как при успешном login.
     */
    protected function tokenJsonResponse(User $user, ?string $existingAccessToken = null): JsonResponse
    {
        $accessToken = $existingAccessToken ?? JWTAuth::fromUser($user);

        $refreshToken = JWTAuth::customClaims([
            'type' => 'refresh',
            'exp' => now()->addMinutes(config('jwt.refresh_ttl'))->timestamp,
        ])->fromUser($user);

        $userData = $user->load('profile');
        $avatarPublic = $this->publicAvatarPathFromProfile($userData->profile);

        $response = response()->json([
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'user' => [
                'id' => $userData->id,
                'email' => $userData->email,
                'role' => $userData->role,
                'locale' => $userData->locale,
                'email_verified_at' => $userData->email_verified_at?->toIso8601String(),
                'name' => $userData->profile ? ($userData->profile->first_name.' '.$userData->profile->last_name) : null,
                'firstName' => $userData->profile->first_name ?? null,
                'lastName' => $userData->profile->last_name ?? null,
                'phone' => $userData->profile->phone ?? null,
                'avatar' => $avatarPublic,
                'image' => $avatarPublic,
            ],
        ]);

        return $response->cookie(
            'refresh_token',
            $refreshToken,
            config('jwt.refresh_ttl'),
            '/',
            config('cookie.domain'),
            config('cookie.secure'),
            true,
            false,
            config('cookie.same_site')
        );
    }
}

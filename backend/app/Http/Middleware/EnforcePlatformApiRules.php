<?php

namespace App\Http\Middleware;

use App\Services\PlatformSettingsService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;
use Tymon\JWTAuth\Facades\JWTAuth;

/**
 * Режим обслуживания (API) и динамический rate limit по настройкам платформы.
 */
class EnforcePlatformApiRules
{
    public function handle(Request $request, Closure $next): Response
    {
        $path = $request->path();

        if (! $this->passesMaintenance($request, $path)) {
            return response()->json([
                'success' => false,
                'code' => 'maintenance_mode',
                'message' => 'Платформа на обслуживании. Доступна только панель суперадминистратора.',
            ], 503);
        }

        if ($this->shouldApplyRateLimit($path)) {
            $max = PlatformSettingsService::getApiRateLimitPerMinute();
            $key = 'platform_api_minute:'.$request->ip();
            if (RateLimiter::tooManyAttempts($key, $max)) {
                $retry = RateLimiter::availableIn($key);

                return response()->json([
                    'success' => false,
                    'code' => 'too_many_requests',
                    'message' => 'Слишком много запросов. Попробуйте позже.',
                    'retry_after' => $retry,
                ], 429);
            }
            RateLimiter::hit($key, 60);
        }

        return $next($request);
    }

    private function passesMaintenance(Request $request, string $path): bool
    {
        if (! PlatformSettingsService::isMaintenanceMode()) {
            return true;
        }

        if ($this->isMaintenanceExemptPath($path)) {
            return true;
        }

        try {
            $user = JWTAuth::parseToken()->authenticate();
            if ($user && $user->isSuperAdmin()) {
                return true;
            }
        } catch (\Throwable $e) {
            // нет токена или просрочен — блокируем не‑суперадмина
        }

        return false;
    }

    private function isMaintenanceExemptPath(string $path): bool
    {
        $prefixes = [
            'api/admin',
            'api/settings/public',
            'api/stripe/webhook',
            'api/auth/login',
            'api/auth/refresh',
            'api/auth/google/redirect',
            'api/auth/google/callback',
        ];

        foreach ($prefixes as $prefix) {
            if ($path === $prefix || str_starts_with($path, $prefix.'/')) {
                return true;
            }
        }

        return false;
    }

    private function shouldApplyRateLimit(string $path): bool
    {
        if (str_starts_with($path, 'api/admin')) {
            return false;
        }
        if ($path === 'api/stripe/webhook' || str_starts_with($path, 'api/stripe/webhook')) {
            return false;
        }

        return true;
    }
}

<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\PlatformSettingsService;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;

class JwtAuthenticate
{
    /**
     * Разрешённые запросы без подтверждённого email (онбординг).
     */
    private function pathAllowsUnverifiedEmailAccess(Request $request, User $user): bool
    {
        $path = $request->path();
        $method = $request->method();

        if ($path === 'api/auth/me' || $path === 'api/auth/logout') {
            return true;
        }

        if ($path === 'api/business/settings/profile' && in_array($method, ['GET', 'PUT'], true)) {
            return true;
        }

        // ЛК клиента (/api/client/*): без этого JWT отдаёт 403 на избранное/брони и т.д.,
        // пока auth/me уже доступен — пользователь видит «полупрофиль» и ошибки на вкладках.
        if ($user->role === 'CLIENT' && str_starts_with($path, 'api/client/')) {
            return true;
        }

        return false;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Пользователь не найден',
                ], 401);
            }

            if (! $user->isSuperAdmin()
                && PlatformSettingsService::isEmailVerificationRequired()
                && ! $user->email_verified_at
                && ! $this->pathAllowsUnverifiedEmailAccess($request, $user)) {
                return response()->json([
                    'success' => false,
                    'code' => 'email_not_verified',
                    'message' => 'Подтвердите email, чтобы пользоваться сервисом.',
                ], 403);
            }

            // Устанавливаем пользователя в request для совместимости с auth('api')->user()
            $request->setUserResolver(function ($guard = null) use ($user) {
                if ($guard === null || $guard === 'api') {
                    return $user;
                }
                return null;
            });

            return $next($request);
        } catch (JWTException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Токен недействителен',
            ], 401);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка аутентификации',
            ], 401);
        }
    }
}


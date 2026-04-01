<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\PlatformSettingsService;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;

class JwtAuthenticate
{
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
                && ! $user->email_verified_at) {
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


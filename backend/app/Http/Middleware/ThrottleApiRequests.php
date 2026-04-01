<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;

class ThrottleApiRequests extends ThrottleRequests
{
    /**
     * Resolve the number of attempts if the user is authenticated or not.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int|string  $maxAttempts
     * @return int
     */
    protected function resolveMaxAttempts($request, $maxAttempts)
    {
        $user = $this->getUser($request);
        
        if (str_contains($maxAttempts, '|')) {
            $maxAttempts = explode('|', $maxAttempts, 2)[$user ? 1 : 0];
        }

        if (! is_numeric($maxAttempts) && $user) {
            $maxAttempts = $user->{$maxAttempts};
        }

        return (int) $maxAttempts;
    }

    /**
     * Resolve request signature.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string
     */
    protected function resolveRequestSignature($request)
    {
        $user = $this->getUser($request);
        
        if ($user) {
            return $this->formatIdentifier($user->getAuthIdentifier());
        }

        if ($route = $request->route()) {
            return $this->formatIdentifier($route->getDomain().'|'.$request->ip());
        }

        return $this->formatIdentifier($request->ip());
    }

    /**
     * Get authenticated user via JWT.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \App\Models\User|null
     */
    protected function getUser($request)
    {
        // Сначала устанавливаем resolver, чтобы избежать вызова auth() без guard
        $request->setUserResolver(function ($guard = null) {
            try {
                // Если guard не указан или это 'api', пытаемся получить пользователя через JWT
                if ($guard === null || $guard === 'api') {
                    return JWTAuth::parseToken()->authenticate();
                }
                return null;
            } catch (\Exception $e) {
                return null;
            }
        });

        try {
            // Пытаемся получить пользователя через JWT
            return JWTAuth::parseToken()->authenticate();
        } catch (\Exception $e) {
            return null;
        }
    }
}


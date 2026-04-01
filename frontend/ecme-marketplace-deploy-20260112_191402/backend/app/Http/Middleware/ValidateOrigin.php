<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateOrigin
{
    /**
     * Проверка Origin/Referer для публичных POST запросов
     * Не блокирует запросы без заголовков (для mobile/server clients)
     * 
     * Философия:
     * - Не блокируем запросы без заголовков (mobile/server clients)
     * - Origin приоритетнее Referer
     * - Логируем аномалии
     * - Применяем только к публичным POST
     * 
     * Это режет 90% браузерного мусора, не ломая бизнес.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Только для mutating методов
        if (!in_array($request->method(), ['POST', 'PUT', 'DELETE', 'PATCH'])) {
            return $next($request);
        }

        // Фильтруем null значения (важно для прод-мелочей)
        $allowedOrigins = array_filter([
            config('app.frontend_url'),
            env('FRONTEND_URL'),
            'https://yourdomain.com',
            'https://www.yourdomain.com',
        ], function($value) {
            return !empty($value);
        });

        // Если нет разрешенных origins - пропускаем (для dev)
        if (empty($allowedOrigins)) {
            return $next($request);
        }

        $origin = $request->header('Origin');
        $referer = $request->header('Referer');

        // Origin приоритетнее Referer
        if ($origin) {
            if (!in_array($origin, $allowedOrigins, true)) {
                \Log::warning('Invalid origin', [
                    'origin' => $origin,
                    'ip' => $request->ip(),
                    'url' => $request->fullUrl(),
                    'method' => $request->method(),
                    'user_agent' => $request->userAgent(),
                ]);
                return response()->json(['error' => 'Invalid origin'], 403);
            }
        } 
        // Если нет Origin, но есть Referer
        elseif ($referer) {
            $host = parse_url($referer, PHP_URL_HOST);
            $scheme = parse_url($referer, PHP_URL_SCHEME) ?: 'https';
            
            if ($host) {
                $refererOrigin = "{$scheme}://{$host}";
                
                if (!in_array($refererOrigin, $allowedOrigins, true)) {
                    \Log::warning('Invalid referer', [
                        'referer' => $referer,
                        'referer_origin' => $refererOrigin,
                        'ip' => $request->ip(),
                        'url' => $request->fullUrl(),
                        'method' => $request->method(),
                        'user_agent' => $request->userAgent(),
                    ]);
                    return response()->json(['error' => 'Invalid referer'], 403);
                }
            }
        }
        // Если нет ни Origin, ни Referer - НЕ блокируем
        // (mobile app, server-to-server, curl, etc.)

        return $next($request);
    }
}


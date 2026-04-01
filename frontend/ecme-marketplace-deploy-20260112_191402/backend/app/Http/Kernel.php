<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

class Kernel extends HttpKernel
{
    protected $middleware = [
        \Illuminate\Http\Middleware\HandleCors::class,
        \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
        \Illuminate\Foundation\Http\Middleware\TrimStrings::class,
        \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
    ];

    protected $middlewareGroups = [
        'web' => [
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
        ],

        'api' => [
            // Throttle отключен временно из-за проблем с auth()
            // \App\Http\Middleware\ThrottleApiRequests::class.':api',
        ],
    ];

    protected $middlewareAliases = [
        'role' => \App\Http\Middleware\RoleMiddleware::class,
        'tenant' => \App\Http\Middleware\TenantMiddleware::class,
        'jwt.auth' => \App\Http\Middleware\JwtAuthenticate::class,
    ];
}


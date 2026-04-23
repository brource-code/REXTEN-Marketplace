<?php

/**
 * Публичный демо-вход: фронт /business/demo-login → POST /api/auth/demo-login без тела.
 * Пользователь: DEMO_PUBLIC_LOGIN_USER_ID, иначе первая запись с email DEMO_PUBLIC_LOGIN_USER_EMAIL (по умолчанию demo@rexten.pro).
 * Выключить: DEMO_PUBLIC_LOGIN_ENABLED=false
 */
return [
    'enabled' => filter_var(env('DEMO_PUBLIC_LOGIN_ENABLED', 'true'), FILTER_VALIDATE_BOOLEAN),
    'user_id' => env('DEMO_PUBLIC_LOGIN_USER_ID') !== null && env('DEMO_PUBLIC_LOGIN_USER_ID') !== ''
        ? (int) env('DEMO_PUBLIC_LOGIN_USER_ID')
        : null,
    'fallback_email' => (static function () {
        $raw = env('DEMO_PUBLIC_LOGIN_USER_EMAIL');
        if ($raw === null || $raw === '') {
            return 'demo@rexten.pro';
        }

        return strtolower(trim((string) $raw));
    })(),
];

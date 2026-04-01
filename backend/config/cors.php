<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:3003'),
        'https://rexten.local',
        'http://rexten.local',
        'http://localhost:3003',
        'http://127.0.0.1:3003',
        'https://rexten.live',
        'https://dev.rexten.live',
        'https://www.rexten.live',
    ],

    'allowed_origins_patterns' => [
        // Разрешаем локальные домены .local
        '/^https?:\/\/rexten\.local$/',
        '/^https?:\/\/.*\.local$/',
        // Разрешаем любой IP в локальной сети 192.168.x.x с любым портом
        '/^http:\/\/192\.168\.\d+\.\d+:\d+$/',
        // Разрешаем localhost с любым портом
        '/^http:\/\/localhost:\d+$/',
        // Разрешаем 127.0.0.1 с любым портом
        '/^http:\/\/127\.0\.0\.1:\d+$/',
        // Разрешаем 10.x.x.x (другая локальная сеть) с любым портом
        '/^http:\/\/10\.\d+\.\d+\.\d+:\d+$/',
        // Разрешаем 172.16-31.x.x (еще одна локальная сеть) с любым портом
        '/^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [
        'Authorization',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Origin',
    ],

    'max_age' => 86400, // 24 часа для preflight запросов

    'supports_credentials' => true,
];


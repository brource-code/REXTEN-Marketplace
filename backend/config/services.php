<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', 'http://localhost:8000/api/auth/google/callback'),
    ],

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
    ],

    'stripe' => [
        'secret' => env('STRIPE_SECRET_KEY'),
        'publishable' => env('STRIPE_PUBLISHABLE_KEY'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'application_fee_percent' => (int) env('STRIPE_APPLICATION_FEE_PERCENT', 10),
        'default_currency' => env('STRIPE_DEFAULT_CURRENCY', 'usd'),
        'hold_expiration_hours' => (int) env('STRIPE_HOLD_EXPIRATION_HOURS', 168),
    ],

    'telegram' => [
        'bot_token' => env('TELEGRAM_BOT_TOKEN'),
        'chat_id' => env('TELEGRAM_CHAT_ID'),
    ],

    /*
    | Отдельный Telegram-бот для уведомлений бизнес-кабинета (НЕ путать с Sentry-каналом выше).
    | bot_token / bot_username — выдаёт @BotFather для нового бота.
    | webhook_secret — произвольная строка, передаётся при setWebhook и приходит в заголовке
    |   X-Telegram-Bot-Api-Secret-Token при каждом обновлении.
    */
    'telegram_business' => [
        'bot_token' => env('TELEGRAM_BUSINESS_BOT_TOKEN'),
        'bot_username' => env('TELEGRAM_BUSINESS_BOT_USERNAME'),
        'webhook_secret' => env('TELEGRAM_BUSINESS_WEBHOOK_SECRET'),
    ],

    'here' => [
        'api_key' => env('HERE_API_KEY'),
        'router_url' => env('HERE_API_URL', 'https://router.hereapi.com'),
        'geocode_url' => env('HERE_GEOCODE_URL', 'https://geocode.search.hereapi.com'),
        /** HERE Geocode Search: ограничение области (по умолчанию США). */
        'geocode_in' => env('HERE_GEOCODE_IN', 'countryCode:USA'),
    ],

    /*
    | Публичный токен Mapbox (pk...) для карт в бизнес-админке.
    | В продакшене nginx отдаёт /api/* в Laravel — см. GET /api/business/mapbox-config.
    | Задайте MAPBOX_PUBLIC_TOKEN в backend/.env (тот же ключ, что и NEXT_PUBLIC_MAPBOX_TOKEN у фронта).
    */
    'mapbox' => [
        'public_token' => env('MAPBOX_PUBLIC_TOKEN') ?: env('NEXT_PUBLIC_MAPBOX_TOKEN'),
    ],

];





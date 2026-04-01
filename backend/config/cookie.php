<?php

use Illuminate\Support\Str;

return [
    'default' => env('COOKIE_DRIVER', 'encrypt'),
    'path' => '/',
    'domain' => env('COOKIE_DOMAIN'),
    'secure' => env('COOKIE_SECURE', false),
    'http_only' => true,
    'same_site' => 'lax',
];


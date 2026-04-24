<?php

return [

    'v1' => [
        'per_minute' => (int) env('API_V1_RATE_PER_MINUTE', 60),
        'per_day' => (int) env('API_V1_RATE_PER_DAY', 5000),
        'max_per_page' => (int) env('API_V1_MAX_PER_PAGE', 100),
        'default_per_page' => (int) env('API_V1_DEFAULT_PER_PAGE', 25),
    ],

    'zapier' => [
        'per_minute' => (int) env('API_ZAPIER_RATE_PER_MINUTE', 60),
        'per_day' => (int) env('API_ZAPIER_RATE_PER_DAY', 10000),
        'max_limit' => (int) env('API_ZAPIER_MAX_LIMIT', 100),
    ],

];

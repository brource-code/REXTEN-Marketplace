<?php

return [
    /*
    | Считаем пользователя «онлайн», если последний heartbeat был не позже N секунд.
    | Должно быть больше интервала опроса на клиенте (обычно 45–60 с).
    */
    'online_threshold_seconds' => (int) env('PRESENCE_ONLINE_THRESHOLD_SECONDS', 180),
];

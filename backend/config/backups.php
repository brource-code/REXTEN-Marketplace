<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Корень проекта на хосте (внутри backend-контейнера)
    |--------------------------------------------------------------------------
    | Должен совпадать с volume в docker-compose: ./:/var/www/rexten_project
    */
    'project_root' => env('BACKUP_PROJECT_ROOT', '/var/www/rexten_project'),

    /*
    | Сохранение docker-образов (docker save) — тяжёлый этап (гигабайты, десятки минут).
    | По умолчанию выключено: бэкап = БД + код + конфиги (обычно несколько минут).
    | Включить: BACKUP_DOCKER_ENABLED=true в .env (нужен /var/run/docker.sock + docker CLI)
    */
    'docker_enabled' => env('BACKUP_DOCKER_ENABLED', false),

    /*
    | Список образов для docker save (через запятую). Пусто = авто: docker ps по префиксу имени контейнера
    */
    'docker_images' => array_values(array_filter(array_map('trim', explode(',', (string) env(
        'BACKUP_DOCKER_IMAGES',
        ''
    ))))),

    /*
    | Префикс имён контейнеров для автоопределения образов (docker ps --filter name=...)
    */
    'docker_ps_name_filter' => env('BACKUP_DOCKER_PS_FILTER', 'rexten'),

    /*
    | Бэкапы хранятся только в S3 (локальный архив не сохраняется после загрузки).
    */
    's3_enabled' => env('BACKUP_S3_ENABLED', false),

    /*
    | Исключения при упаковке каталога проекта (tar -C project_root --exclude)
    | Цель: минуты на tar+S3, без гигабайтных артефактов и шаблонов REXTEN.
    */
    'project_exclude' => [
        'node_modules',
        '.next',
        'vendor',
        '.git',
        '.cursor',
        '*.log',
        /* Laravel / Next — восстанавливаются через composer/npm build */
        'backend/storage/app/backups',
        /* Временные файлы партнёрского экспорта (могут накапливаться, не в .git) */
        'backend/storage/app/partner-export-tmp',
        'backend/storage/logs',
        'backend/storage/framework/cache',
        'backend/storage/framework/sessions',
        'backend/storage/framework/views',
        'frontend/.next',
        /* Expo / мобильная сборка (как в scripts/make-partner-archive.sh) */
        'frontend/mobile/.expo',
        'frontend/mobile/dist',
        'frontend/mobile.zip',
        /* Тяжёлые артефакты в корне репозитория (~2 ГБ+) */
        'ecme-admin.zip',
        /* Снимки/деплой-пакеты REXTEN в frontend (сотни МБ; tar — регистрозависимый) */
        'frontend/rexten-*',
        'frontend/REXTEN-*',
        'rexten-backup-*.tar.gz',
    ],

    /*
    | S3: обязательны bucket и AWS-ключи (см. docs/BACKUP_S3.md)
    */
    's3_bucket' => env('BACKUP_S3_BUCKET'),
    's3_prefix' => env('BACKUP_S3_PREFIX', 'platform-backups'),

    /*
    | Хранить в S3 не более N последних успешных бэкапов (0 = не удалять старые автоматически)
    */
    's3_keep_backups' => (int) env('BACKUP_S3_KEEP', 30),

    /*
    | Автобэкап по расписанию (контейнер scheduler: php artisan schedule:work)
    */
    'schedule_enabled' => env('BACKUP_SCHEDULE_ENABLED', true),

    /*
    | Зависшие записи (queued не взяты воркером / processing зависли) — помечаются failed
    */
    'stale_queued_after_minutes' => (int) env('BACKUP_STALE_QUEUED_MINUTES', 30),
    'stale_processing_after_minutes' => (int) env('BACKUP_STALE_PROCESSING_MINUTES', 180),
];

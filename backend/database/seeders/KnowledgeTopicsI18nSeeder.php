<?php

namespace Database\Seeders;

use Database\Seeders\Concerns\KnowledgeTopicTranslations;
use Database\Seeders\Concerns\UpsertsLocalizedKnowledgeTopics;
use Illuminate\Database\Seeder;

/**
 * Обновляет только строки тем (5 локалей) по каноническим переводам — статьи не трогает.
 * После миграции с копированием EN на все локали или для синхронизации подписей в хабе.
 *
 * docker exec rexten_backend php artisan db:seed --class=KnowledgeTopicsI18nSeeder --force
 */
class KnowledgeTopicsI18nSeeder extends Seeder
{
    use UpsertsLocalizedKnowledgeTopics;

    public function run(): void
    {
        $this->upsertTopicForLocales(
            'dashboard',
            'business.dashboard',
            10,
            KnowledgeTopicTranslations::dashboard()
        );
        $this->upsertTopicForLocales(
            'schedule',
            'business.schedule',
            20,
            KnowledgeTopicTranslations::schedule()
        );
        $this->upsertTopicForLocales(
            'bookings',
            'business.bookings',
            30,
            KnowledgeTopicTranslations::bookings()
        );
        $this->upsertTopicForLocales(
            'reports',
            'business.reports',
            40,
            KnowledgeTopicTranslations::reports()
        );
    }
}

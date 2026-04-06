<?php

namespace Database\Seeders\Concerns;

use App\Models\KnowledgeTopic;

/**
 * Создаёт/обновляет по одной строке KnowledgeTopic на каждую локаль UI.
 *
 * @param  array<string, array{title: string, slug: string, description?: string|null}>  $perLocale
 * @return array<string, int> locale => topic id
 */
trait UpsertsLocalizedKnowledgeTopics
{
    protected function upsertTopicForLocales(
        string $topicKey,
        string $moduleKey,
        int $sortOrder,
        array $perLocale,
        bool $isPublished = true
    ): array {
        $ids = [];
        foreach ($perLocale as $locale => $meta) {
            $t = KnowledgeTopic::updateOrCreate(
                [
                    'topic_key' => $topicKey,
                    'locale' => $locale,
                ],
                [
                    'title' => $meta['title'],
                    'slug' => $meta['slug'],
                    'description' => $meta['description'] ?? null,
                    'module_key' => $moduleKey,
                    'sort_order' => $sortOrder,
                    'is_published' => $isPublished,
                ]
            );
            $ids[$locale] = $t->id;
        }

        return $ids;
    }
}

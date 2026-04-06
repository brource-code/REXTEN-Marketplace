<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KnowledgeTopic extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'description',
        'module_key',
        'locale',
        'topic_key',
        'sort_order',
        'is_published',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function articles(): HasMany
    {
        return $this->hasMany(KnowledgeArticle::class, 'knowledge_topic_id');
    }

    /** Та же логическая тема на другой локали UI (для статей и API). */
    public function siblingForLocale(string $locale): ?self
    {
        if (($this->locale ?? 'en') === $locale) {
            return $this;
        }
        if (! $this->topic_key) {
            return null;
        }

        return static::query()
            ->where('topic_key', $this->topic_key)
            ->where('locale', $locale)
            ->first();
    }

    /** Все строки одной темы (все локали). */
    public static function siblingsByKey(string $topicKey)
    {
        return static::query()->where('topic_key', $topicKey)->orderBy('locale');
    }
}

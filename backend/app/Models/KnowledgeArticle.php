<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KnowledgeArticle extends Model
{
    protected $fillable = [
        'knowledge_topic_id',
        'locale',
        'title',
        'slug',
        'excerpt',
        'body',
        'sort_order',
        'is_published',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function topic(): BelongsTo
    {
        return $this->belongsTo(KnowledgeTopic::class, 'knowledge_topic_id');
    }
}

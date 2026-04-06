<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Concerns\ResolvesKnowledgeLocale;
use App\Http\Controllers\Controller;
use App\Models\KnowledgeArticle;
use App\Models\KnowledgeTopic;
use Illuminate\Http\Request;

class KnowledgeBaseController extends Controller
{
    use ResolvesKnowledgeLocale;

    /**
     * Список опубликованных тем (для бизнес-админки).
     * Счётчик статей — только для текущей локали (язык UI).
     */
    public function topics(Request $request)
    {
        $locale = $this->resolveKnowledgeLocale($request);

        $query = KnowledgeTopic::query()
            ->where('is_published', true)
            ->where('locale', $locale)
            ->withCount(['articles' => function ($q) use ($locale) {
                $q->where('locale', $locale)->where('is_published', true);
            }]);

        if ($request->filled('search')) {
            $s = $request->get('search');
            $query->where(function ($q) use ($s) {
                $q->where('title', 'ilike', "%{$s}%")
                    ->orWhere('description', 'ilike', "%{$s}%");
            });
        }

        $topics = $query->orderBy('sort_order')->orderBy('title')->get();

        return response()->json([
            'data' => $topics,
        ]);
    }

    /**
     * Тема по slug + краткий список статей (без body).
     */
    public function topicBySlug(Request $request, string $slug)
    {
        $locale = $this->resolveKnowledgeLocale($request);

        $topic = KnowledgeTopic::where('slug', $slug)
            ->where('locale', $locale)
            ->where('is_published', true)
            ->firstOrFail();

        $articles = KnowledgeArticle::where('knowledge_topic_id', $topic->id)
            ->where('locale', $locale)
            ->where('is_published', true)
            ->orderBy('sort_order')
            ->orderBy('title')
            ->get(['id', 'knowledge_topic_id', 'locale', 'title', 'slug', 'excerpt', 'sort_order', 'created_at', 'updated_at']);

        return response()->json([
            'data' => [
                'topic' => $topic,
                'articles' => $articles,
            ],
        ]);
    }

    /**
     * Полная статья по id (опубликованная).
     */
    public function article(Request $request, int $id)
    {
        $locale = $this->resolveKnowledgeLocale($request);

        $article = KnowledgeArticle::with('topic')
            ->where('locale', $locale)
            ->where('is_published', true)
            ->findOrFail($id);

        if (!$article->topic || !$article->topic->is_published) {
            abort(404);
        }

        return response()->json([
            'data' => $article,
        ]);
    }

    /**
     * Статья по slug темы и slug статьи.
     */
    public function articleBySlugs(Request $request, string $topicSlug, string $articleSlug)
    {
        $locale = $this->resolveKnowledgeLocale($request);

        $topic = KnowledgeTopic::where('slug', $topicSlug)
            ->where('locale', $locale)
            ->where('is_published', true)
            ->firstOrFail();

        $article = KnowledgeArticle::where('knowledge_topic_id', $topic->id)
            ->where('locale', $locale)
            ->where('slug', $articleSlug)
            ->where('is_published', true)
            ->with('topic')
            ->firstOrFail();

        return response()->json([
            'data' => $article,
        ]);
    }

    /**
     * Поиск по заголовку и тексту статьи.
     */
    public function searchArticles(Request $request)
    {
        $locale = $this->resolveKnowledgeLocale($request);
        $q = trim((string) $request->get('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['data' => []]);
        }

        $articles = KnowledgeArticle::with('topic')
            ->where('locale', $locale)
            ->where('is_published', true)
            ->whereHas('topic', function ($t) use ($locale) {
                $t->where('is_published', true)->where('locale', $locale);
            })
            ->where(function ($query) use ($q) {
                $query->where('title', 'ilike', "%{$q}%")
                    ->orWhere('body', 'ilike', "%{$q}%");
            })
            ->orderBy('title')
            ->limit(40)
            ->get();

        return response()->json([
            'data' => $articles,
        ]);
    }

    /**
     * Недавно обновлённые статьи для блока «Популярное».
     */
    public function popularArticles(Request $request)
    {
        $locale = $this->resolveKnowledgeLocale($request);
        $limit = min(max((int) $request->get('limit', 8), 1), 20);

        $articles = KnowledgeArticle::with(['topic' => function ($q) {
            $q->select('id', 'slug', 'title', 'module_key');
        }])
            ->where('locale', $locale)
            ->where('is_published', true)
            ->whereHas('topic', function ($t) use ($locale) {
                $t->where('is_published', true)->where('locale', $locale);
            })
            ->orderByDesc('updated_at')
            ->limit($limit)
            ->get(['id', 'knowledge_topic_id', 'locale', 'title', 'slug', 'excerpt', 'updated_at']);

        return response()->json([
            'data' => $articles,
        ]);
    }
}

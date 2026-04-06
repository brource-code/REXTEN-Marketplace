<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ResolvesKnowledgeLocale;
use App\Http\Controllers\Controller;
use App\Models\KnowledgeArticle;
use App\Models\KnowledgeTopic;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class KnowledgeArticlesController extends Controller
{
    use ResolvesKnowledgeLocale;

    public function index(Request $request, int $topicId)
    {
        $topic = KnowledgeTopic::findOrFail($topicId);

        $locale = $request->query('locale');
        if (! is_string($locale) || ! in_array($locale, self::supportedKnowledgeLocales(), true)) {
            $locale = 'en';
        }

        $resolved = $topic->siblingForLocale($locale) ?? $topic;
        $query = KnowledgeArticle::where('knowledge_topic_id', $resolved->id)->where('locale', $locale);

        if ($request->has('is_published')) {
            $query->where('is_published', $request->boolean('is_published'));
        }

        $articles = $query->orderBy('sort_order')->orderBy('title')->get();

        return response()->json([
            'data' => $articles,
        ]);
    }

    public function show(int $id)
    {
        $article = KnowledgeArticle::with('topic')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $article,
        ]);
    }

    public function store(Request $request, int $topicId)
    {
        $topic = KnowledgeTopic::findOrFail($topicId);

        $validator = Validator::make($request->all(), [
            'locale' => 'required|string|in:en,ru,es-MX,hy-AM,uk-UA',
            'title' => 'required|string|max:500',
            'slug' => 'nullable|string|max:255',
            'excerpt' => 'nullable|string|max:2000',
            'body' => 'required|string',
            'sort_order' => 'nullable|integer|min:0',
            'is_published' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $locale = $request->get('locale');
        $resolvedTopic = $topic->siblingForLocale($locale);
        if (! $resolvedTopic) {
            return response()->json([
                'success' => false,
                'message' => 'No topic row for this language. Edit the topic and add all locale versions.',
                'errors' => ['locale' => ['Missing topic translation for this locale.']],
            ], 422);
        }

        $slug = $request->get('slug') ?: Str::slug($request->get('title'));
        $slug = $this->ensureUniqueArticleSlug($resolvedTopic->id, $locale, $slug);

        $article = KnowledgeArticle::create([
            'knowledge_topic_id' => $resolvedTopic->id,
            'locale' => $locale,
            'title' => $request->get('title'),
            'slug' => $slug,
            'excerpt' => $request->get('excerpt'),
            'body' => $request->get('body'),
            'sort_order' => (int) $request->get('sort_order', 0),
            'is_published' => $request->boolean('is_published', true),
        ]);

        return response()->json([
            'success' => true,
            'data' => $article->load('topic'),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $article = KnowledgeArticle::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:500',
            'slug' => 'sometimes|string|max:255',
            'excerpt' => 'nullable|string|max:2000',
            'body' => 'sometimes|string',
            'sort_order' => 'nullable|integer|min:0',
            'is_published' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $request->only(['title', 'excerpt', 'body', 'sort_order', 'is_published']);
        if ($request->has('slug')) {
            $data['slug'] = $this->ensureUniqueArticleSlug(
                $article->knowledge_topic_id,
                $article->locale,
                $request->get('slug'),
                $id
            );
        }

        $article->update($data);

        return response()->json([
            'success' => true,
            'data' => $article->fresh()->load('topic'),
        ]);
    }

    public function destroy(int $id)
    {
        $article = KnowledgeArticle::findOrFail($id);
        $article->delete();

        return response()->json([
            'success' => true,
        ]);
    }

    private function ensureUniqueArticleSlug(int $topicId, string $locale, string $slug, ?int $exceptArticleId = null): string
    {
        $base = $slug ?: 'article';
        $candidate = $base;
        $n = 2;
        while (
            KnowledgeArticle::where('knowledge_topic_id', $topicId)
                ->where('locale', $locale)
                ->where('slug', $candidate)
                ->when($exceptArticleId, fn ($q) => $q->where('id', '!=', $exceptArticleId))
                ->exists()
        ) {
            $candidate = $base.'-'.$n;
            $n++;
        }

        return $candidate;
    }
}

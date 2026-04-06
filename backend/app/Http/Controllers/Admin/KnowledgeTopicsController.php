<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ResolvesKnowledgeLocale;
use App\Http\Controllers\Controller;
use App\Models\KnowledgeArticle;
use App\Models\KnowledgeTopic;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class KnowledgeTopicsController extends Controller
{
    use ResolvesKnowledgeLocale;

    public function index(Request $request)
    {
        $query = KnowledgeTopic::query()->where('locale', 'en');

        if ($request->has('is_published')) {
            $query->where('is_published', $request->boolean('is_published'));
        }

        if ($request->filled('search')) {
            $s = $request->get('search');
            $query->where(function ($q) use ($s) {
                $q->where('title', 'ilike', "%{$s}%")
                    ->orWhere('slug', 'ilike', "%{$s}%");
            });
        }

        $topics = $query->orderBy('sort_order')->orderBy('title')->get();

        $topicKeys = $topics->pluck('topic_key')->filter()->unique()->values();
        $countsByKey = [];
        if ($topicKeys->isNotEmpty()) {
            $countsByKey = KnowledgeArticle::query()
                ->selectRaw('kt.topic_key, count(*) as c')
                ->from('knowledge_articles')
                ->join('knowledge_topics as kt', 'kt.id', '=', 'knowledge_articles.knowledge_topic_id')
                ->whereIn('kt.topic_key', $topicKeys)
                ->groupBy('kt.topic_key')
                ->pluck('c', 'topic_key');
        }

        foreach ($topics as $t) {
            $tk = $t->topic_key;
            $t->articles_count = (int) ($countsByKey[$tk] ?? 0);
        }

        return response()->json([
            'data' => $topics,
        ]);
    }

    public function show(int $id)
    {
        $topic = KnowledgeTopic::findOrFail($id);
        $key = $topic->topic_key;
        if (! $key) {
            return response()->json([
                'success' => true,
                'data' => [
                    'topic_key' => null,
                    'module_key' => $topic->module_key,
                    'sort_order' => $topic->sort_order,
                    'is_published' => $topic->is_published,
                    'translations' => [
                        ($topic->locale ?? 'en') => [
                            'id' => $topic->id,
                            'title' => $topic->title,
                            'slug' => $topic->slug,
                            'description' => $topic->description,
                        ],
                    ],
                ],
            ]);
        }

        $siblings = KnowledgeTopic::siblingsByKey($key)->get()->keyBy(fn ($r) => $r->locale ?? 'en');

        $translations = [];
        foreach (self::supportedKnowledgeLocales() as $loc) {
            $row = $siblings->get($loc);
            if ($row) {
                $translations[$loc] = [
                    'id' => $row->id,
                    'title' => $row->title,
                    'slug' => $row->slug,
                    'description' => $row->description,
                ];
            } else {
                $translations[$loc] = [
                    'id' => null,
                    'title' => '',
                    'slug' => '',
                    'description' => null,
                ];
            }
        }

        $first = KnowledgeTopic::where('topic_key', $key)->where('locale', 'en')->first()
            ?? $siblings->first();

        return response()->json([
            'success' => true,
            'data' => [
                'topic_key' => $key,
                'module_key' => $first->module_key,
                'sort_order' => $first->sort_order,
                'is_published' => $first->is_published,
                'translations' => $translations,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $locales = self::supportedKnowledgeLocales();

        $validator = Validator::make($request->all(), [
            'topic_key' => 'nullable|string|max:120',
            'module_key' => 'nullable|string|max:120',
            'sort_order' => 'nullable|integer|min:0',
            'is_published' => 'nullable|boolean',
            'translations' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $translations = $request->get('translations', []);
        foreach ($locales as $loc) {
            if (empty($translations[$loc]) || ! is_array($translations[$loc])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => ['translations' => ["Missing translations for locale: {$loc}"]],
                ], 422);
            }
            $v = Validator::make($translations[$loc], [
                'title' => 'required|string|max:255',
                'slug' => 'nullable|string|max:255',
                'description' => 'nullable|string',
            ]);
            if ($v->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $v->errors(),
                ], 422);
            }
        }

        $topicKey = $request->get('topic_key');
        if (! $topicKey) {
            $enSlug = $translations['en']['slug'] ?? null;
            $topicKey = Str::slug($enSlug ?: $translations['en']['title']);
        }
        if ($topicKey === '') {
            $topicKey = 'topic-'.Str::lower(Str::random(8));
        }

        if (KnowledgeTopic::where('topic_key', $topicKey)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => ['topic_key' => ['Topic key already exists.']],
            ], 422);
        }

        $moduleKey = $request->get('module_key');
        $sortOrder = (int) $request->get('sort_order', 0);
        $isPublished = $request->boolean('is_published', true);

        return DB::transaction(function () use ($locales, $translations, $topicKey, $moduleKey, $sortOrder, $isPublished) {
            $enRow = null;
            foreach ($locales as $loc) {
                $slug = $translations[$loc]['slug'] ?? null;
                $slug = $slug ? Str::slug($slug) : Str::slug($translations[$loc]['title']);
                $slug = $this->ensureUniqueTopicSlug($loc, $slug);

                $row = KnowledgeTopic::create([
                    'topic_key' => $topicKey,
                    'locale' => $loc,
                    'title' => $translations[$loc]['title'],
                    'slug' => $slug,
                    'description' => $translations[$loc]['description'] ?? null,
                    'module_key' => $moduleKey,
                    'sort_order' => $sortOrder,
                    'is_published' => $isPublished,
                ]);
                if ($loc === 'en') {
                    $enRow = $row;
                }
            }

            return response()->json([
                'success' => true,
                'data' => $enRow,
            ], 201);
        });
    }

    public function update(Request $request, int $id)
    {
        $topic = KnowledgeTopic::findOrFail($id);
        $key = $topic->topic_key;
        if (! $key) {
            return $this->legacyUpdate($request, $topic);
        }

        $locales = self::supportedKnowledgeLocales();

        $validator = Validator::make($request->all(), [
            'module_key' => 'nullable|string|max:120',
            'sort_order' => 'nullable|integer|min:0',
            'is_published' => 'nullable|boolean',
            'translations' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $translations = $request->get('translations', []);
        foreach ($locales as $loc) {
            if (empty($translations[$loc]) || ! is_array($translations[$loc])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => ['translations' => ["Missing translations for locale: {$loc}"]],
                ], 422);
            }
            $v = Validator::make($translations[$loc], [
                'title' => 'required|string|max:255',
                'slug' => 'nullable|string|max:255',
                'description' => 'nullable|string',
            ]);
            if ($v->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $v->errors(),
                ], 422);
            }
        }

        $moduleKey = $request->get('module_key');
        $sortOrder = (int) $request->get('sort_order', 0);
        $isPublished = $request->boolean('is_published', true);

        DB::transaction(function () use ($key, $locales, $translations, $moduleKey, $sortOrder, $isPublished) {
            foreach ($locales as $loc) {
                $existing = KnowledgeTopic::where('topic_key', $key)->where('locale', $loc)->first();
                $slug = $translations[$loc]['slug'] ?? null;
                $slug = $slug ? Str::slug($slug) : Str::slug($translations[$loc]['title']);
                $slug = $this->ensureUniqueTopicSlug($loc, $slug, $existing?->id);

                KnowledgeTopic::updateOrCreate(
                    [
                        'topic_key' => $key,
                        'locale' => $loc,
                    ],
                    [
                        'title' => $translations[$loc]['title'],
                        'slug' => $slug,
                        'description' => $translations[$loc]['description'] ?? null,
                        'module_key' => $moduleKey,
                        'sort_order' => $sortOrder,
                        'is_published' => $isPublished,
                    ]
                );
            }
        });

        $en = KnowledgeTopic::where('topic_key', $key)->where('locale', 'en')->first();

        return response()->json([
            'success' => true,
            'data' => $en,
        ]);
    }

    private function legacyUpdate(Request $request, KnowledgeTopic $topic)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'module_key' => 'nullable|string|max:120',
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

        $data = $request->only(['title', 'description', 'module_key', 'sort_order', 'is_published']);
        if ($request->has('slug')) {
            $loc = $topic->locale ?? 'en';
            $data['slug'] = $this->ensureUniqueTopicSlug($loc, $request->get('slug'), $topic->id);
        }

        $topic->update($data);

        return response()->json([
            'success' => true,
            'data' => $topic->fresh(),
        ]);
    }

    public function destroy(int $id)
    {
        $topic = KnowledgeTopic::findOrFail($id);
        if ($topic->topic_key) {
            KnowledgeTopic::where('topic_key', $topic->topic_key)->delete();
        } else {
            $topic->delete();
        }

        return response()->json([
            'success' => true,
        ]);
    }

    private function ensureUniqueTopicSlug(string $locale, string $slug, ?int $exceptId = null): string
    {
        $base = $slug ?: 'topic';
        $candidate = $base;
        $n = 2;
        while (
            KnowledgeTopic::where('locale', $locale)
                ->where('slug', $candidate)
                ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
                ->exists()
        ) {
            $candidate = $base.'-'.$n;
            $n++;
        }

        return $candidate;
    }
}

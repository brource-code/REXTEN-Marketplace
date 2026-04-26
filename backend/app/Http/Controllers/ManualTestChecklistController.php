<?php

namespace App\Http\Controllers;

use App\Models\ManualTestReport;
use App\Services\ManualTestWizardReportMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ManualTestChecklistController extends Controller
{
    public function show(): JsonResponse
    {
        $user = auth('api')->user();

        return response()->json([
            'data' => $user->manual_test_checklist,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $version = (int) $request->input('v', 1);

        if ($version === 3) {
            $validated = $request->validate([
                'v' => 'required|integer|in:3',
                'current_step' => 'required|string|regex:/^[a-z0-9_]{1,48}$/',
                'completed_steps' => 'nullable|array|max:40',
                'skipped_steps' => 'nullable|array|max:40',
                'answers' => 'nullable|array|max:40',
                'answers.*' => 'nullable|array|max:60',
                'answers.*.tasks' => 'nullable|array|max:50',
                'answers.*.tasks.*' => 'boolean',
                'answers.*.sentiment' => 'nullable|string|in:like,neutral,bad',
                'answers.*.scenario' => 'nullable|string|in:ok,problem',
                'answers.*.rating' => 'nullable|integer|min:1|max:5',
                'answers.*.would' => 'nullable|string|in:yes,no,unsure',
                'answers.*.comment' => 'nullable|string|max:2000',
                'final' => 'nullable|array|max:20',
                'final.rating' => 'nullable|integer|min:1|max:5',
                'final.would' => 'nullable|string|in:yes,no,unsure',
                'final.comment' => 'nullable|string|max:2000',
            ]);

            $completed = [];
            foreach ($request->input('completed_steps', []) as $key => $value) {
                if (is_string($key) && preg_match('/^[a-z0-9_]{1,48}$/', $key)) {
                    $completed[$key] = (bool) $value;
                }
            }

            $skipped = [];
            foreach ($request->input('skipped_steps', []) as $key => $value) {
                if (is_string($key) && preg_match('/^[a-z0-9_]{1,48}$/', $key)) {
                    $skipped[$key] = (bool) $value;
                }
            }

            $answers = [];
            foreach ($request->input('answers', []) as $stepId => $block) {
                if (! is_string($stepId) || ! preg_match('/^[a-z0-9_]{1,48}$/', $stepId) || ! is_array($block)) {
                    continue;
                }
                $tasks = [];
                if (isset($block['tasks']) && is_array($block['tasks'])) {
                    foreach ($block['tasks'] as $tid => $tv) {
                        if (is_string($tid) && preg_match('/^[a-z0-9_]{1,48}$/', $tid)) {
                            $tasks[$tid] = (bool) $tv;
                        }
                    }
                }
                $answers[$stepId] = [
                    'tasks' => $tasks,
                    'sentiment' => $block['sentiment'] ?? null,
                    'scenario' => $block['scenario'] ?? null,
                    'rating' => $block['rating'] ?? null,
                    'would' => $block['would'] ?? null,
                    'comment' => $block['comment'] ?? null,
                ];
            }

            $finalIn = $validated['final'] ?? [];
            $final = [
                'rating' => $finalIn['rating'] ?? null,
                'would' => $finalIn['would'] ?? null,
                'comment' => $finalIn['comment'] ?? null,
            ];

            $payload = [
                'v' => 3,
                'current_step' => $validated['current_step'],
                'completed_steps' => $completed,
                'skipped_steps' => $skipped,
                'answers' => $answers,
                'final' => $final,
            ];

            $user = auth('api')->user();
            $previousChecklist = $user->manual_test_checklist;
            $user->manual_test_checklist = $payload;
            $user->save();

            ManualTestWizardReportMailer::sendOnFinishTransition($user, $payload, $previousChecklist);

            return response()->json([
                'success' => true,
                'data' => $user->manual_test_checklist,
            ]);
        }

        if ($version === 2) {
            $validated = $request->validate([
                'v' => 'required|integer|in:2',
                'scope' => 'required|string|in:dashboard,schedule,both,bookings,analytics,clients',
                'look_s' => 'nullable|string|in:like,neutral,bad',
                'look_t' => 'nullable|string|max:2000',
                'clarity_s' => 'nullable|string|in:like,neutral,bad',
                'clarity_t' => 'nullable|string|max:2000',
                'step' => 'nullable|array|max:12',
                'step.*' => 'boolean',
                'scenario' => 'nullable|string|in:ok,problem',
                'scenario_t' => 'nullable|string|max:2000',
                'filter' => 'nullable|string|in:ok,skip,problem',
                'filter_t' => 'nullable|string|max:2000',
                'rating' => 'nullable|integer|min:1|max:5',
                'would' => 'nullable|string|in:yes,no,unsure',
                'why' => 'nullable|string|max:2000',
            ]);

            $payload = [
                'v' => 2,
                'scope' => $validated['scope'],
                'look_s' => $validated['look_s'] ?? null,
                'look_t' => $validated['look_t'] ?? null,
                'clarity_s' => $validated['clarity_s'] ?? null,
                'clarity_t' => $validated['clarity_t'] ?? null,
                'step' => $validated['step'] ?? [],
                'scenario' => $validated['scenario'] ?? null,
                'scenario_t' => $validated['scenario_t'] ?? null,
                'filter' => $validated['filter'] ?? null,
                'filter_t' => $validated['filter_t'] ?? null,
                'rating' => $validated['rating'] ?? null,
                'would' => $validated['would'] ?? null,
                'why' => $validated['why'] ?? null,
            ];

            $user = auth('api')->user();
            $user->manual_test_checklist = $payload;
            $user->save();

            return response()->json([
                'success' => true,
                'data' => $user->manual_test_checklist,
            ]);
        }

        $validated = $request->validate([
            'scope' => 'required|string|in:dashboard,schedule,both,bookings,analytics,clients',
            'items' => 'nullable|array|max:200',
            'items.*' => 'string|in:ok,problem',
        ]);

        $rawItems = $validated['items'] ?? [];
        $items = [];
        foreach ($rawItems as $key => $value) {
            if (!is_string($key) || !preg_match('/^[a-z0-9_]{1,48}$/', $key)) {
                continue;
            }
            $items[$key] = $value;
        }

        $payload = [
            'scope' => $validated['scope'],
            'items' => $items,
        ];

        $user = auth('api')->user();
        $user->manual_test_checklist = $payload;
        $user->save();

        return response()->json([
            'success' => true,
            'data' => $user->manual_test_checklist,
        ]);
    }

    public function listReports(): JsonResponse
    {
        $user = auth('api')->user();

        $reports = ManualTestReport::query()
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->get()
            ->map(fn (ManualTestReport $r) => $this->transform($r));

        return response()->json([
            'data' => $reports,
        ]);
    }

    public function storeReport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'scope' => 'nullable|string|max:24',
            'item_key' => 'nullable|string|max:48|regex:/^[a-z0-9_]+$/',
            'comment' => 'nullable|string|max:2000',
            'screenshots' => 'nullable|array|max:10',
            'screenshots.*' => 'file|image|max:5120',
            'screenshot' => 'nullable|file|image|max:5120',
        ]);

        $user = auth('api')->user();
        $baseDir = "manual-test-screenshots/{$user->id}";

        $paths = [];
        $multi = $request->file('screenshots', []);
        if (! is_array($multi)) {
            $multi = $multi ? [$multi] : [];
        }
        foreach ($multi as $f) {
            if ($f && $f->isValid()) {
                $paths[] = $f->store($baseDir, 'public');
            }
        }
        if ($request->hasFile('screenshot')) {
            $paths[] = $request->file('screenshot')->store($baseDir, 'public');
        }
        $paths = array_values(array_unique(array_filter($paths)));

        if (empty(trim((string) ($validated['comment'] ?? ''))) && $paths === []) {
            return response()->json([
                'success' => false,
                'message' => 'Добавьте комментарий или прикрепите хотя бы одно фото.',
            ], 422);
        }

        $report = ManualTestReport::create([
            'user_id' => $user->id,
            'scope' => $validated['scope'] ?? null,
            'item_key' => $validated['item_key'] ?? null,
            'comment' => $validated['comment'] ?? null,
            'screenshot_path' => $paths[0] ?? null,
            'screenshot_paths' => $paths,
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->transform($report->fresh()),
        ], 201);
    }

    public function destroyReport(int $id): JsonResponse
    {
        $user = auth('api')->user();

        $report = ManualTestReport::query()
            ->where('user_id', $user->id)
            ->findOrFail($id);

        $allPaths = array_filter(array_merge(
            (array) ($report->screenshot_paths ?? []),
            $report->screenshot_path ? [$report->screenshot_path] : []
        ));
        $allPaths = array_values(array_unique($allPaths));
        foreach ($allPaths as $p) {
            Storage::disk('public')->delete($p);
        }
        $report->delete();

        return response()->json(['success' => true]);
    }

    private function transform(ManualTestReport $report): array
    {
        $paths = $report->screenshot_paths;
        if (! is_array($paths) || $paths === []) {
            $paths = $report->screenshot_path ? [$report->screenshot_path] : [];
        }
        $urls = array_map(
            fn (string $p) => Storage::disk('public')->url($p),
            array_values(array_filter($paths))
        );

        return [
            'id' => $report->id,
            'scope' => $report->scope,
            'item_key' => $report->item_key,
            'comment' => $report->comment,
            'screenshot_urls' => $urls,
            'screenshot_url' => $urls[0] ?? null,
            'created_at' => $report->created_at?->toIso8601String(),
        ];
    }
}

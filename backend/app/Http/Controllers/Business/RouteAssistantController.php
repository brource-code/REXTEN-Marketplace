<?php

namespace App\Http\Controllers\Business;

use App\Exceptions\AiQuotaExceededException;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Company;
use App\Models\TeamMember;
use App\Models\User;
use App\Services\AI\AiQuotaService;
use App\Services\AI\OpenAIClient;
use App\Services\AI\RouteAssistantInclusion;
use App\Services\AI\RouteAssistantPrompt;
use App\Services\AI\RouteAssistantResponseFilter;
use App\Services\AI\RouteAssistantTools;
use App\Services\Routing\RouteOrchestrator;
use App\Services\SubscriptionLimitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Ramsey\Uuid\Uuid;
use function json_encode;

class RouteAssistantController extends Controller
{
    public function __construct(
        protected OpenAIClient $openai,
        protected RouteAssistantTools $routeTools,
        protected AiQuotaService $quota,
        protected RouteOrchestrator $orchestrator,
        protected RouteAssistantResponseFilter $responseFilter,
    ) {
    }

    public function assist(Request $request, int $specialist, string $date): JsonResponse
    {
        if (! (bool) config('services.openai.route_assist_enabled', true)) {
            return response()->json([
                'success' => false,
                'error' => 'disabled',
                'message' => 'AI route assist is disabled.',
            ], 503);
        }

        $companyId = (int) $request->get('current_company_id', 0);
        if ($companyId < 1) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }
        if (! $this->canViewRoutes($request->user(), $companyId)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $plan = SubscriptionLimitService::getPlanForCompany($companyId);
        if ((int) $plan?->getFeature('ai_max_requests_per_month', 0) < 1) {
            return response()->json([
                'success' => false,
                'error' => 'ai_not_available',
                'message' => 'AI Dispatcher is not included in this plan.',
            ], 403);
        }

        try {
            $this->quota->assertCanUseAi($companyId);
        } catch (AiQuotaExceededException $e) {
            return response()->json([
                'success' => false,
                'error' => 'ai_quota_exceeded',
                'message' => 'AI limit reached for this month.',
                'usage' => $e->usage,
                'period_end' => $e->periodEndIso,
            ], 429);
        }

        $data = $request->validate([
            'messages' => 'required|array|max:40',
            'messages.*.role' => 'required|in:system,user,assistant',
            'messages.*.content' => 'required|string|max:20000',
            'locale' => 'nullable|string|max:20',
            'intent' => 'nullable|in:audit,free',
        ]);

        if (! TeamMember::query()->where('company_id', $companyId)->whereKey($specialist)->exists()) {
            return response()->json(['success' => false, 'message' => 'Specialist not found'], 404);
        }

        $locale = (string) ($data['locale'] ?? 'en');
        $model = (string) config('services.openai.model', 'gpt-4o-mini');
        logger()->info('AI model used: '.$model);

        $intent = $data['intent'] ?? null;
        $company = Company::query()->find($companyId);
        $bizTz = $company !== null ? $company->resolveTimezone() : 'America/Los_Angeles';
        $dev = [
            'locale_hint' => $locale,
            'business_timezone' => $bizTz,
            'specialist_id' => $specialist,
            'date' => $date,
            'now_iso' => now()->toIso8601String(),
            'intent' => $intent ?? 'unspecified',
        ];

        $baseMessages = [
            ['role' => 'system', 'content' => RouteAssistantPrompt::system()],
            ['role' => 'system', 'content' => 'Developer: '.json_encode($dev, JSON_UNESCAPED_UNICODE)],
        ];
        if ($intent === 'audit') {
            $baseMessages[] = [
                'role' => 'system',
                'content' => 'User mode: day audit. Scan lateness, idle, and unassigned; only propose tool-backed, high-impact actions. Empty actions are OK if nothing would meaningfully help.',
            ];
        } elseif ($intent === 'free') {
            $baseMessages[] = [
                'role' => 'system',
                'content' => 'User mode: free question. Answer using tools. Same JSON schema: omit weak recommendations; empty lists are valid.',
            ];
        }
        foreach ($data['messages'] as $m) {
            $baseMessages[] = [
                'role' => $m['role'],
                'content' => $m['content'],
            ];
        }

        $tools = $this->routeTools->openaiToolDefinitions();
        $promptT = 0;
        $compT = 0;
        $messages = $baseMessages;

        try {
            $tok1 = $this->openai->runToolLoop($model, $messages, $tools, function (string $name, string $arguments, string $id) use ($companyId, $specialist, $date, $locale) {
                return $this->routeTools->execute($companyId, $specialist, $date, $name, $arguments, $locale);
            });
            $promptT += $tok1[0];
            $compT += $tok1[1];
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'AI call failed: '.$e->getMessage(),
            ], 500);
        }

        $messages[] = [
            'role' => 'user',
            'content' => 'Output the final JSON for the business user, following the required schema, in the language of locale_hint. Be concise. Use only numbers and facts from the tool results in this turn.',
        ];

        try {
            [$json, $p2, $c2] = $this->openai->runJsonSchemaCompletion(
                $model,
                $messages,
                RouteAssistantPrompt::responseJsonSchema()
            );
            $promptT += $p2;
            $compT += $c2;
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'AI final parse failed: '.$e->getMessage(),
            ], 500);
        }

        $this->quota->recordAiUsage($companyId, $promptT, $compT);
        $decoded = json_decode($json, true);
        if (! is_array($decoded)) {
            $decoded = ['raw' => $json];
        } elseif (! isset($decoded['raw'])) {
            $fullRoute = $this->orchestrator->getRoute($specialist, $date, $companyId);
            $decoded = $this->responseFilter->filter(
                $decoded,
                $companyId,
                $specialist,
                $date,
                $fullRoute
            );
        }

        return response()->json([
            'success' => true,
            'data' => $decoded,
            'usage' => [
                'prompt_tokens' => $promptT,
                'completion_tokens' => $compT,
            ],
        ]);
    }

    public function apply(Request $request, int $specialist, string $date): JsonResponse
    {
        if (! (bool) config('services.openai.route_assist_enabled', true)) {
            return response()->json([
                'success' => false,
                'error' => 'disabled',
                'message' => 'AI route assist is disabled.',
            ], 503);
        }

        $companyId = (int) $request->get('current_company_id', 0);
        if ($companyId < 1) {
            return response()->json(['success' => false, 'message' => 'Company not found'], 404);
        }
        if (! $this->canManageRoutes($request->user(), $companyId)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        if (! TeamMember::query()->where('company_id', $companyId)->whereKey($specialist)->exists()) {
            return response()->json(['success' => false, 'message' => 'Specialist not found'], 404);
        }

        $payload = $request->validate([
            'actions' => 'required|array|min:1|max:5',
            'actions.*.kind' => 'required|in:set_included,optimize,toggle_return_leg',
            'actions.*.params' => 'required|array',
            'expected_version' => 'nullable|integer|min:0',
            'confirm_remove_bookings' => 'nullable|boolean',
        ]);

        $fullRoute = $this->orchestrator->getRoute($specialist, $date, $companyId);
        if ($fullRoute === null) {
            return response()->json(['success' => false, 'message' => 'Route not found'], 404);
        }

        $expectedVersion = $payload['expected_version'] ?? null;
        if ($expectedVersion !== null) {
            $currentVersion = (int) ($fullRoute->cache_version ?? 0);
            if ($currentVersion !== (int) $expectedVersion) {
                return response()->json([
                    'success' => false,
                    'error' => 'route_outdated',
                    'message' => 'Route data has changed since AI suggestion. Please refresh and try again.',
                    'current_version' => $currentVersion,
                    'expected_version' => (int) $expectedVersion,
                ], 409);
            }
        }

        $userId = (int) $request->user()->id;
        $actions = $payload['actions'];
        $confirmRemove = (bool) ($payload['confirm_remove_bookings'] ?? false);
        $dayIds = RouteAssistantInclusion::dayBookingIdList(
            $this->orchestrator,
            (int) $specialist,
            (string) $date,
            $companyId
        );

        try {
            foreach ($actions as $a) {
                $kind = $a['kind'];
                $p = $a['params'] ?? [];
                if ($kind === 'set_included') {
                    $ids = $p['included_booking_ids'] ?? null;
                    if ($ids !== null && ! is_array($ids)) {
                        throw ValidationException::withMessages(['actions' => 'invalid included_booking_ids']);
                    }
                    $currentIds = RouteAssistantInclusion::effectiveIncludedIds($fullRoute, $dayIds);
                    $nextIds = RouteAssistantInclusion::includedIdsForActionParams($ids, $dayIds);
                    $removedIds = RouteAssistantInclusion::removedBookingIds($currentIds, $nextIds);
                    if ($removedIds !== [] && ! $confirmRemove) {
                        return response()->json([
                            'success' => false,
                            'error' => 'remove_requires_confirm',
                            'message' => 'Removing one or more visits from the route needs confirmation.',
                            'remove_booking_ids' => $removedIds,
                        ], 409);
                    }
                    if ($ids !== null && $ids !== []) {
                        $intIds = array_map('intval', $ids);
                        $validIds = Booking::query()
                            ->forRoutePlannerDay($companyId, (int) $specialist, $date)
                            ->where('status', '!=', 'declined')
                            ->whereNotNull('booking_time')
                            ->whereIn('id', $intIds)
                            ->pluck('id')
                            ->map(static fn ($id) => (int) $id)
                            ->all();
                        $missingIds = array_diff($intIds, $validIds);
                        if ($missingIds !== []) {
                            return response()->json([
                                'success' => false,
                                'error' => 'bookings_invalid',
                                'message' => 'Some bookings no longer exist or were cancelled.',
                                'invalid_booking_ids' => array_values($missingIds),
                            ], 409);
                        }
                    }
                    $this->orchestrator->setIncludedBookingIdsAndResync(
                        $specialist,
                        $date,
                        $companyId,
                        $ids === null ? null : array_map('intval', $ids)
                    );
                    $refreshed = $this->orchestrator->getRoute($specialist, $date, $companyId);
                    if ($refreshed !== null) {
                        $fullRoute = $refreshed;
                    }
                } elseif ($kind === 'toggle_return_leg') {
                    if (! array_key_exists('include_return_leg', $p)) {
                        throw ValidationException::withMessages(['actions' => 'include_return_leg required']);
                    }
                    $this->orchestrator->setIncludeReturnLegAndResync(
                        $specialist,
                        $date,
                        $companyId,
                        (bool) $p['include_return_leg'],
                    );
                    $refR = $this->orchestrator->getRoute($specialist, $date, $companyId);
                    if ($refR !== null) {
                        $fullRoute = $refR;
                    }
                } elseif ($kind === 'optimize') {
                    $includeReturn = array_key_exists('include_return_leg', $p)
                        ? (bool) $p['include_return_leg']
                        : (bool) ($fullRoute->include_return_leg ?? true);
                    $this->orchestrator->optimizeAndSave($specialist, $date, $companyId, $includeReturn);
                    $refR = $this->orchestrator->getRoute($specialist, $date, $companyId);
                    if ($refR !== null) {
                        $fullRoute = $refR;
                    }
                }
            }
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        $fullRoute = $this->orchestrator->getRoute($specialist, $date, $companyId);
        if ($fullRoute === null) {
            return response()->json(['success' => false, 'message' => 'Route not found'], 404);
        }

        DB::table('ai_route_actions')->insert([
            'id' => (string) Uuid::uuid4(),
            'company_id' => $companyId,
            'user_id' => $userId,
            'route_id' => $fullRoute->id,
            'actions' => json_encode($actions, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
            'created_at' => now(),
        ]);

        $dayBookings = $this->orchestrator->allBookingsForDate($specialist, $date, $companyId);
        $member = TeamMember::query()
            ->where('company_id', $companyId)
            ->whereKey($specialist)
            ->firstOrFail();
        $formatted = app(RouteController::class)->buildRouteApiData($fullRoute, $dayBookings, $member);

        return response()->json([
            'success' => true,
            'data' => $formatted,
        ]);
    }

    private function canViewRoutes(?User $user, int $companyId): bool
    {
        if ($user === null) {
            return false;
        }
        if ($user->hasPermissionInCompany($companyId, 'view_routes')) {
            return true;
        }
        if ($user->hasPermissionInCompany($companyId, 'view_schedule')) {
            return true;
        }
        if ($user->hasPermissionInCompany($companyId, 'manage_routes')) {
            return true;
        }
        if ($user->hasPermissionInCompany($companyId, 'manage_schedule')) {
            return true;
        }

        return false;
    }

    private function canManageRoutes(?User $user, int $companyId): bool
    {
        if ($user === null) {
            return false;
        }

        return $user->hasPermissionInCompany($companyId, 'manage_routes')
            || $user->hasPermissionInCompany($companyId, 'manage_schedule');
    }
}

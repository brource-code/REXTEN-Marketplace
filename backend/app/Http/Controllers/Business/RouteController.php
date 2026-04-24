<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\TeamMember;
use App\Models\User;
use App\Services\Routing\RouteOrchestrator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class RouteController extends Controller
{
    /**
     * Сохранённые маршруты специалиста по дням (для переключения даты в UI).
     */
    public function savedList(Request $request, int $specialist): JsonResponse
    {
        $companyId = $this->requireCompanyId($request);
        if ($companyId === null) {
            return $this->companyMissing();
        }

        $deny = $this->denyUnlessCanViewRoutes($request, $companyId);
        if ($deny !== null) {
            return $deny;
        }

        if (! TeamMember::query()->where('company_id', $companyId)->whereKey($specialist)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Specialist not found',
            ], 404);
        }

        $limit = min(90, max(1, (int) $request->query('limit', 60)));

        $rows = Route::query()
            ->where('company_id', $companyId)
            ->where('specialist_id', $specialist)
            ->withCount(['stops as booking_stops_count' => function ($q) {
                $q->where('stop_type', RouteStop::TYPE_BOOKING);
            }])
            ->orderByDesc('route_date')
            ->limit($limit)
            ->get([
                'id',
                'route_date',
                'status',
                'optimized_at',
                'total_distance_meters',
                'total_duration_seconds',
                'include_return_leg',
            ]);

        return response()->json([
            'success' => true,
            'data' => $rows->map(function (Route $r) {
                return [
                    'id' => $r->id,
                    'route_date' => $r->route_date->format('Y-m-d'),
                    'status' => $r->status,
                    'optimized_at' => $r->optimized_at?->toIso8601String(),
                    'total_distance_meters' => $r->total_distance_meters,
                    'total_duration_seconds' => $r->total_duration_seconds,
                    'include_return_leg' => (bool) ($r->include_return_leg ?? true),
                    'booking_stops_count' => (int) ($r->booking_stops_count ?? 0),
                ];
            })->values()->all(),
        ]);
    }

    public function show(Request $request, int $specialist, string $date): JsonResponse
    {
        $companyId = $this->requireCompanyId($request);
        if ($companyId === null) {
            return $this->companyMissing();
        }

        $deny = $this->denyUnlessCanViewRoutes($request, $companyId);
        if ($deny !== null) {
            return $deny;
        }

        $orchestrator = app(RouteOrchestrator::class);
        $route = $orchestrator->getRoute($specialist, $date, $companyId);

        if ($route === null) {
            return response()->json([
                'success' => false,
                'message' => 'Specialist not found',
            ], 404);
        }

        $member = TeamMember::query()
            ->where('company_id', $companyId)
            ->whereKey($specialist)
            ->firstOrFail();

        $dayBookings = $orchestrator->allBookingsForDate($specialist, $date, $companyId);

        return response()->json([
            'success' => true,
            'data' => $this->formatRoute($route, $dayBookings, $member),
        ]);
    }

    /**
     * Тот же payload, что в show (для AI apply и др.).
     */
    public function buildRouteApiData(Route $route, ?Collection $dayBookings = null, ?TeamMember $specialist = null): array
    {
        return $this->formatRoute($route, $dayBookings, $specialist);
    }

    public function updateIncluded(Request $request, int $specialist, string $date): JsonResponse
    {
        $companyId = $this->requireCompanyId($request);
        if ($companyId === null) {
            return $this->companyMissing();
        }

        $deny = $this->denyUnlessCanManageRoutes($request, $companyId);
        if ($deny !== null) {
            return $deny;
        }

        $request->validate([
            'booking_ids' => 'nullable|array',
            'booking_ids.*' => 'integer',
        ]);

        $ids = $request->input('booking_ids', null);
        if ($ids !== null && ! is_array($ids)) {
            return response()->json([
                'success' => false,
                'message' => 'booking_ids must be an array or null',
            ], 422);
        }

        $allowedIds = Booking::query()
            ->forRoutePlannerDay($companyId, (int) $specialist, $date)
            ->where('status', '!=', 'declined')
            ->whereNotNull('booking_time')
            ->pluck('id')
            ->map(static fn ($id) => (int) $id)
            ->all();

        $allowedSet = array_fill_keys($allowedIds, true);

        if ($ids !== null) {
            foreach ($ids as $id) {
                if (! isset($allowedSet[(int) $id])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid booking id for this specialist and date',
                    ], 422);
                }
            }
        }

        if (! TeamMember::query()->where('company_id', $companyId)->whereKey($specialist)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Specialist not found',
            ], 404);
        }

        $orchestrator = app(RouteOrchestrator::class);
        $route = $orchestrator->setIncludedBookingIdsAndResync($specialist, $date, $companyId, $ids);

        $member = TeamMember::query()
            ->where('company_id', $companyId)
            ->whereKey($specialist)
            ->firstOrFail();

        $dayBookings = $orchestrator->allBookingsForDate($specialist, $date, $companyId);

        return response()->json([
            'success' => true,
            'data' => $this->formatRoute($route, $dayBookings, $member),
        ]);
    }

    public function updateIncludeReturnLeg(Request $request, int $specialist, string $date): JsonResponse
    {
        $companyId = $this->requireCompanyId($request);
        if ($companyId === null) {
            return $this->companyMissing();
        }

        $deny = $this->denyUnlessCanManageRoutes($request, $companyId);
        if ($deny !== null) {
            return $deny;
        }

        if (! TeamMember::query()->where('company_id', $companyId)->whereKey($specialist)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Specialist not found',
            ], 404);
        }

        $includeReturnLeg = $request->boolean('include_return_leg', true);

        $orchestrator = app(RouteOrchestrator::class);
        $route = $orchestrator->setIncludeReturnLegAndResync($specialist, $date, $companyId, $includeReturnLeg);

        $member = TeamMember::query()
            ->where('company_id', $companyId)
            ->whereKey($specialist)
            ->firstOrFail();

        $dayBookings = $orchestrator->allBookingsForDate($specialist, $date, $companyId);

        return response()->json([
            'success' => true,
            'data' => $this->formatRoute($route, $dayBookings, $member),
        ]);
    }

    public function optimizePreview(Request $request, int $specialist, string $date): JsonResponse
    {
        $companyId = $this->requireCompanyId($request);
        if ($companyId === null) {
            return $this->companyMissing();
        }

        $deny = $this->denyUnlessCanManageRoutes($request, $companyId);
        if ($deny !== null) {
            return $deny;
        }

        try {
            $includeReturnLeg = $request->boolean('include_return_leg', true);
            $preview = app(RouteOrchestrator::class)->optimizePreview($specialist, $date, $companyId, $includeReturnLeg);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => 'Specialist not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'current' => $preview->currentRoute,
                'proposed' => $preview->proposedRoute,
                'comparison' => $preview->comparison,
                'confidence' => $preview->confidence,
                'reorder_details' => $preview->reorderDetails,
                'warnings' => $preview->warnings,
                'suppressed_worse_proposal' => $preview->suppressedWorseProposal,
            ],
        ]);
    }

    public function optimizeApply(Request $request, int $specialist, string $date): JsonResponse
    {
        $companyId = $this->requireCompanyId($request);
        if ($companyId === null) {
            return $this->companyMissing();
        }

        $deny = $this->denyUnlessCanManageRoutes($request, $companyId);
        if ($deny !== null) {
            return $deny;
        }

        try {
            $includeReturnLeg = $request->boolean('include_return_leg', true);
            $route = app(RouteOrchestrator::class)->optimizeAndSave($specialist, $date, $companyId, $includeReturnLeg);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => 'Specialist not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatRoute($route),
        ]);
    }

    public function recalculate(Request $request, string $routeId): JsonResponse
    {
        $companyId = $this->requireCompanyId($request);
        if ($companyId === null) {
            return $this->companyMissing();
        }

        $deny = $this->denyUnlessCanManageRoutes($request, $companyId);
        if ($deny !== null) {
            return $deny;
        }

        $route = Route::query()
            ->where('company_id', $companyId)
            ->whereKey($routeId)
            ->first();

        if ($route === null) {
            return response()->json([
                'success' => false,
                'message' => 'Route not found',
            ], 404);
        }

        $route = app(RouteOrchestrator::class)->recalculateRoute($route);

        return response()->json([
            'success' => true,
            'data' => $this->formatRoute($route),
        ]);
    }

    protected function requireCompanyId(Request $request): ?int
    {
        $id = $request->get('current_company_id');

        return $id !== null ? (int) $id : null;
    }

    protected function userCanViewRoutes(?User $user, int $companyId): bool
    {
        if ($user === null) {
            return false;
        }

        return $user->hasPermissionInCompany($companyId, 'view_routes')
            || $user->hasPermissionInCompany($companyId, 'view_schedule');
    }

    protected function userCanManageRoutes(?User $user, int $companyId): bool
    {
        if ($user === null) {
            return false;
        }

        return $user->hasPermissionInCompany($companyId, 'manage_routes')
            || $user->hasPermissionInCompany($companyId, 'manage_schedule');
    }

    protected function denyUnlessCanViewRoutes(Request $request, int $companyId): ?JsonResponse
    {
        if (! $this->userCanViewRoutes($request->user(), $companyId)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden',
            ], 403);
        }

        return null;
    }

    protected function denyUnlessCanManageRoutes(Request $request, int $companyId): ?JsonResponse
    {
        if (! $this->userCanManageRoutes($request->user(), $companyId)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden',
            ], 403);
        }

        return null;
    }

    protected function companyMissing(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Company not found',
        ], 404);
    }

    protected function formatRoute(Route $route, ?Collection $dayBookings = null, ?TeamMember $specialist = null): array
    {
        $route->loadMissing(['stops.booking.location', 'stops.booking.user.profile', 'specialist']);

        if ($specialist === null) {
            $specialist = $route->specialist;
        }

        if ($dayBookings === null) {
            $dayBookings = app(RouteOrchestrator::class)->allBookingsForDate(
                (int) $route->specialist_id,
                $route->route_date->format('Y-m-d'),
                (int) $route->company_id
            );
        }

        $company = Company::query()->find((int) $route->company_id);
        $displayTz = $company !== null ? $company->resolveTimezone() : 'America/Los_Angeles';

        $specialistPayload = [
            'id' => $specialist?->id ?? (int) $route->specialist_id,
            'name' => (string) ($specialist?->name ?? ''),
            'home_address' => $specialist?->home_address,
            'home_latitude' => $specialist !== null && $specialist->home_latitude !== null
                ? (float) $specialist->home_latitude
                : null,
            'home_longitude' => $specialist !== null && $specialist->home_longitude !== null
                ? (float) $specialist->home_longitude
                : null,
        ];

        $dayBookingsPayload = $dayBookings->map(function (Booking $booking) use ($displayTz) {
            try {
                $tw = $booking->getTimeWindow($displayTz);
            } catch (\DomainException) {
                return [
                    'id' => $booking->id,
                    'specialist_id' => $booking->specialist_id !== null ? (int) $booking->specialist_id : null,
                    'client_name' => $booking->businessClientDisplayName(),
                    'title' => $booking->businessServiceDisplayName(),
                    'address' => $booking->visitAddressLineForDisplay(),
                    'execution_type' => $booking->execution_type ?? 'onsite',
                    'offsite_address_missing' => $booking->isOffsiteVisitAddressMissing(),
                    'time_window_start' => null,
                    'time_window_end' => null,
                    'time_window_unavailable' => true,
                    'priority' => (int) ($booking->priority ?? 5),
                    'duration_minutes' => (int) ($booking->duration_minutes ?? 60),
                    'has_coordinates' => $booking->getGeoPoint() !== null,
                ];
            }

            return [
                'id' => $booking->id,
                'specialist_id' => $booking->specialist_id !== null ? (int) $booking->specialist_id : null,
                'client_name' => $booking->businessClientDisplayName(),
                'title' => $booking->businessServiceDisplayName(),
                'address' => $booking->visitAddressLineForDisplay(),
                'execution_type' => $booking->execution_type ?? 'onsite',
                'offsite_address_missing' => $booking->isOffsiteVisitAddressMissing(),
                'time_window_start' => $tw['start']->toIso8601String(),
                'time_window_end' => $tw['end']->toIso8601String(),
                'priority' => (int) ($booking->priority ?? 5),
                'duration_minutes' => (int) ($booking->duration_minutes ?? 60),
                'has_coordinates' => $booking->getGeoPoint() !== null,
            ];
        })->values()->all();

        $feas = app(RouteOrchestrator::class)->buildFeasibilityForRouteResponse(
            $route,
            $specialist,
            $displayTz
        );
        $stopExtras = $feas['stop_extras'];

        $lateMinutesTotal = 0;
        $idleMinutesTotal = 0;
        foreach ($route->stops as $stop) {
            if ($stop->stop_type !== RouteStop::TYPE_BOOKING) {
                continue;
            }
            $extra = $stopExtras[(int) $stop->id] ?? null;
            $lateSec = (int) ($extra['late_seconds'] ?? 0);
            $lateMinutesTotal += (int) round($lateSec / 60);
            $wait = (int) ($stop->wait_before_seconds ?? 0);
            if ($wait > 0) {
                $idleMinutesTotal += (int) max(1, (int) round($wait / 60));
            }
        }

        return [
            'id' => $route->id,
            'specialist_id' => $route->specialist_id,
            'route_date' => $route->route_date->format('Y-m-d'),
            'status' => $route->status,
            'display_timezone' => $displayTz,
            'cache_version' => (int) ($route->cache_version ?? 0),
            'total_distance_meters' => $route->total_distance_meters,
            'total_duration_seconds' => $route->total_duration_seconds,
            'path_lng_lat' => $route->path_lng_lat,
            'included_booking_ids' => $route->included_booking_ids,
            'include_return_leg' => (bool) ($route->include_return_leg ?? true),
            'specialist' => $specialistPayload,
            'day_bookings' => $dayBookingsPayload,
            'day_start_iso' => $feas['day_start_iso'],
            'feasibility_issues' => $feas['feasibility_issues'],
            'late_minutes_total' => $lateMinutesTotal,
            'idle_minutes_total' => $idleMinutesTotal,
            'stops' => $route->stops->map(function ($stop) use ($stopExtras) {
                $booking = $stop->booking;
                $tw = null;
                if ($booking !== null) {
                    try {
                        $tw = $booking->getTimeWindow();
                    } catch (\DomainException) {
                        $tw = null;
                    }
                }
                $extra = $stopExtras[(int) $stop->id] ?? [
                    'late_seconds' => 0,
                    'is_infeasible' => false,
                    'infeasible_reason' => null,
                    'shift_start_iso' => null,
                    'window_start_iso' => null,
                    'late_minutes' => 0,
                ];

                return [
                    'id' => $stop->id,
                    'booking_id' => $stop->booking_id,
                    'sequence_order' => $stop->sequence_order,
                    'stop_type' => $stop->stop_type,
                    'latitude' => (float) $stop->latitude,
                    'longitude' => (float) $stop->longitude,
                    'eta' => $stop->eta?->toIso8601String(),
                    'arrived_at' => $stop->arrived_at?->toIso8601String(),
                    'wait_before_seconds' => (int) ($stop->wait_before_seconds ?? 0),
                    'distance_from_prev_meters' => $stop->distance_from_prev_meters,
                    'duration_from_prev_seconds' => $stop->duration_from_prev_seconds,
                    'status' => $stop->status,
                    'late_seconds' => (int) ($extra['late_seconds'] ?? 0),
                    'is_infeasible' => (bool) ($extra['is_infeasible'] ?? false),
                    'infeasible_reason' => $extra['infeasible_reason'] ?? null,
                    'shift_start_iso' => $extra['shift_start_iso'] ?? null,
                    'window_start_iso' => $extra['window_start_iso'] ?? null,
                    'late_minutes' => (int) ($extra['late_minutes'] ?? 0),
                    'booking' => $booking === null ? null : [
                        'id' => $booking->id,
                        'client_name' => $booking->businessClientDisplayName(),
                        'title' => $booking->businessServiceDisplayName(),
                        'address' => $booking->visitAddressLineForDisplay(),
                        'execution_type' => $booking->execution_type ?? 'onsite',
                        'offsite_address_missing' => $booking->isOffsiteVisitAddressMissing(),
                        'time_window_start' => $tw ? $tw['start']->toIso8601String() : null,
                        'time_window_end' => $tw ? $tw['end']->toIso8601String() : null,
                        'priority' => (int) ($booking->priority ?? 5),
                        'duration_minutes' => (int) ($booking->duration_minutes ?? 60),
                        'total_price' => (float) ($booking->total_price ?? $booking->price ?? 0),
                        'currency' => 'USD',
                    ],
                ];
            })->values()->all(),
        ];
    }
}

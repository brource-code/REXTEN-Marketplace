<?php

namespace App\Services\Routing;

use App\Jobs\OptimizeRouteJob;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\TeamMember;
use App\Services\Routing\Dto\GeoPoint;
use App\Services\Routing\Dto\PreviewResult;
use App\Services\Routing\Dto\RouteResult;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class RouteOrchestrator
{
    private const CACHE_TTL_SECONDS = 600;

    private const DEBOUNCE_SECONDS = 5;

    private const ASYNC_BOOKING_THRESHOLD = 8;

    public function __construct(
        protected RouteCalculator $routeCalculator,
        protected RouteOptimizer $routeOptimizer,
        protected GeocodingService $geocodingService,
    ) {
    }

    public function getRoute(int $specialistId, string $date, int $companyId): ?Route
    {
        $specialist = TeamMember::query()
            ->where('company_id', $companyId)
            ->whereKey($specialistId)
            ->first();

        if ($specialist === null) {
            return null;
        }

        $route = Route::query()->firstOrCreate(
            [
                'specialist_id' => $specialistId,
                'route_date' => $date,
            ],
            [
                'company_id' => $companyId,
                'status' => Route::STATUS_DRAFT,
            ]
        );

        $allBookings = $this->bookingsForDate($specialistId, $date, $companyId);
        $this->ensureBookingsGeocoded($allBookings);

        $bookings = $this->bookingsForRoute($route, $specialistId, $date, $companyId);

        if ($this->shouldSyncRouteStops($route, $bookings)) {
            $this->syncStopsFromBookings($route, $specialist, $companyId, $date, $bookings);
        }

        return $route->fresh(['stops.booking.location', 'stops.booking.user.profile']);
    }

    public function optimizePreview(int $specialistId, string $date, int $companyId, bool $includeReturnLeg = true): PreviewResult
    {
        $specialist = TeamMember::query()
            ->where('company_id', $companyId)
            ->whereKey($specialistId)
            ->first();

        if ($specialist === null) {
            throw (new ModelNotFoundException)->setModel(TeamMember::class, [$specialistId]);
        }

        $company = Company::query()->findOrFail($companyId);

        $route = Route::query()->firstOrCreate(
            [
                'specialist_id' => $specialistId,
                'route_date' => $date,
            ],
            [
                'company_id' => $companyId,
                'status' => Route::STATUS_DRAFT,
            ]
        );

        $allBookings = $this->bookingsForDate($specialistId, $date, $companyId);
        $this->ensureBookingsGeocoded($allBookings);

        $bookings = $this->bookingsForRoute($route, $specialistId, $date, $companyId);

        [$start, $end] = $this->resolveStartEndPoints($specialist, $company);
        $tz = $this->companyTimezone($company);
        $startTime = $this->parseRouteStartTime($date, $specialist, $tz);

        $warnings = [];

        if ($start === null || $end === null) {
            $warnings[] = [
                'type' => 'no_start',
                'message' => 'Set specialist home coordinates or company map location.',
            ];

            return $this->emptyPreview($warnings);
        }

        $currentOrder = $bookings->sortBy(static fn (Booking $b) => $b->getTimeWindow($tz)['start']->timestamp)->values();

        $opt = $this->routeOptimizer->optimize($bookings->all(), $start, $end, $startTime, $specialist, $includeReturnLeg);

        $byId = $bookings->keyBy('id');
        $proposedBookings = collect($opt->order)
            ->map(static fn (int $id) => $byId->get($id))
            ->filter()
            ->values();

        // Те же метрики, что и у маршрута после «Пересчитать»: HERE driving (а не гаверсина из preview).
        $currentIds = $currentOrder->pluck('id')->implode(',');
        $proposedIds = $proposedBookings->pluck('id')->implode(',');
        $jobsReordered = $currentIds !== $proposedIds;

        if (! $jobsReordered) {
            [$distCurrent, $durCurrent] = $this->hereMetricsForBookingOrder($currentOrder, $start, $end, $companyId, $includeReturnLeg);
            $distProposed = $distCurrent;
            $durProposed = $durCurrent;
        } else {
            [$distCurrent, $durCurrent] = $this->hereMetricsForBookingOrder($currentOrder, $start, $end, $companyId, $includeReturnLeg);
            [$distProposed, $durProposed] = $this->hereMetricsForBookingOrder($proposedBookings, $start, $end, $companyId, $includeReturnLeg);
        }

        $deltaMeters = (int) round($distCurrent - $distProposed);
        $outcome = 'unchanged_order';
        if ($jobsReordered) {
            if ($deltaMeters > 0) {
                $outcome = 'improved';
            } elseif ($deltaMeters < 0) {
                $outcome = 'worse';
            } else {
                $outcome = 'tie';
            }
        }

        $suppressedWorseProposal = false;
        if ($jobsReordered && ($deltaMeters < 0 || ($deltaMeters === 0 && $durProposed > $durCurrent))) {
            $suppressedWorseProposal = true;
            $proposedBookings = $currentOrder;
            $distProposed = $distCurrent;
            $durProposed = $durCurrent;
            $jobsReordered = false;
            $deltaMeters = 0;
            $outcome = 'unchanged_order';
        }

        $comparison = [
            'distance_change_meters' => $deltaMeters,
            'duration_change_seconds' => $durCurrent - $durProposed,
            'distance_change_percent' => $distCurrent > 0 ? round(($distCurrent - $distProposed) / $distCurrent * 100, 2) : 0.0,
            'jobs_reordered' => $jobsReordered,
            'locked_jobs' => $opt->lockedCount,
            'outcome' => $outcome,
        ];

        $mergeWarnings = array_merge($warnings, $opt->warnings);
        if ($suppressedWorseProposal) {
            $mergeWarnings[] = [
                'type' => 'proposal_worse_than_current',
                'message' => 'Suggested order would increase driving time or distance; keeping your current order.',
            ];
        }

        return new PreviewResult(
            currentRoute: $this->serializeJobsSummary($currentOrder, $tz, $distCurrent, $durCurrent),
            proposedRoute: $this->serializeJobsSummary($proposedBookings, $tz, $distProposed, $durProposed),
            comparison: $comparison,
            confidence: $this->previewConfidence($mergeWarnings, $bookings->count()),
            reorderDetails: [
                'changed' => $jobsReordered,
                'moved_count' => $this->countMovedIds($currentOrder, $proposedBookings),
            ],
            warnings: $mergeWarnings,
            suppressedWorseProposal: $suppressedWorseProposal,
        );
    }

    /**
     * Оптимизация и сохранение. При большом числе визитов — в очередь.
     */
    public function optimizeAndSave(int $specialistId, string $date, int $companyId, bool $includeReturnLeg = true): Route
    {
        $specialist = TeamMember::query()
            ->where('company_id', $companyId)
            ->whereKey($specialistId)
            ->firstOrFail();

        $route = Route::query()->firstOrCreate(
            [
                'specialist_id' => $specialistId,
                'route_date' => $date,
            ],
            [
                'company_id' => $companyId,
                'status' => Route::STATUS_DRAFT,
            ]
        );

        $route->include_return_leg = $includeReturnLeg;
        $route->save();

        if ($this->shouldDebounceOptimization($route)) {
            return $route->fresh(['stops.booking.location']);
        }

        $allBookings = $this->bookingsForDate($specialistId, $date, $companyId);
        $this->ensureBookingsGeocoded($allBookings);

        $bookings = $this->bookingsForRoute($route, $specialistId, $date, $companyId);

        if ($bookings->count() > self::ASYNC_BOOKING_THRESHOLD) {
            $route->status = Route::STATUS_OPTIMIZING;
            $route->save();
            $this->forgetListCache($companyId, $specialistId, $date);
            OptimizeRouteJob::dispatch((string) $route->getKey());

            return $route->fresh(['stops.booking.location']);
        }

        return $this->optimizeAndPersist($route, $specialist, $bookings, $includeReturnLeg);
    }

    public function optimizeAndPersistFromJob(string $routeId): void
    {
        $route = Route::query()->find($routeId);
        if ($route === null) {
            return;
        }

        $specialist = TeamMember::query()
            ->where('company_id', $route->company_id)
            ->whereKey($route->specialist_id)
            ->first();

        if ($specialist === null) {
            $route->status = Route::STATUS_STALE;
            $route->save();

            return;
        }

        $date = $route->route_date->format('Y-m-d');
        $allBookings = $this->bookingsForDate($route->specialist_id, $date, $route->company_id);
        $this->ensureBookingsGeocoded($allBookings);

        $bookings = $this->bookingsForRoute($route, $route->specialist_id, $date, $route->company_id);

        $includeReturnLeg = (bool) ($route->include_return_leg ?? true);
        $this->optimizeAndPersist($route, $specialist, $bookings, $includeReturnLeg);
    }

    public function recalculateRoute(Route $route): Route
    {
        $route->load([
            'stops' => static fn ($q) => $q->orderBy('sequence_order'),
            'stops.booking',
        ]);

        $stops = $route->stops->sortBy('sequence_order')->values();
        if ($stops->count() < 2) {
            return $route;
        }

        $waypoints = $stops->map(static function (RouteStop $stop) {
            return new GeoPoint((float) $stop->latitude, (float) $stop->longitude);
        })->all();

        $companyId = (int) $route->company_id;

        /** @var RouteResult $full */
        $full = $this->routeCalculator->calculate($waypoints, $companyId);

        $route->total_distance_meters = $full->distanceMeters;
        $route->total_duration_seconds = $full->durationSeconds;
        $route->path_lng_lat = $full->pathLngLat;
        $route->save();

        $expectedLegs = count($waypoints) - 1;
        $legs = $full->legs;
        if (! is_array($legs) || count($legs) !== $expectedLegs) {
            $legs = [];
            for ($j = 0; $j < $expectedLegs; $j++) {
                $legs[] = $this->legMetricsBetween($waypoints[$j], $waypoints[$j + 1], $companyId);
            }
        }

        $company = Company::query()->find($route->company_id);
        $tz = $this->companyTimezone($company);
        $specialist = TeamMember::query()->find($route->specialist_id);
        $dateStr = $route->route_date->format('Y-m-d');
        $dayStart = $specialist !== null
            ? $this->parseRouteStartTime($dateStr, $specialist, $tz)
            : Carbon::createFromFormat('Y-m-d H:i:s', $dateStr.' 08:00:00', $tz);

        $bookingsOrdered = $stops->filter(static fn (RouteStop $s) => $s->stop_type === RouteStop::TYPE_BOOKING && $s->booking !== null)
            ->map(static fn (RouteStop $s) => $s->booking)
            ->values();

        $includeReturnLeg = (bool) ($route->include_return_leg ?? true);
        $timed = $this->computeEtasWithBookingWindows($dayStart, $waypoints, $legs, $bookingsOrdered, $tz, $includeReturnLeg);

        foreach ($stops as $i => $stop) {
            $ti = $timed[$i] ?? null;
            if ($ti !== null) {
                $stop->eta = $ti['eta'];
                $stop->arrived_at = $ti['arrived_at'];
                $stop->wait_before_seconds = $ti['wait_before_seconds'];
            }
            if ($i > 0) {
                $leg = $legs[$i - 1];
                $stop->distance_from_prev_meters = (int) $leg['distanceMeters'];
                $stop->duration_from_prev_seconds = (int) $leg['durationSeconds'];
            }
            $stop->save();
        }

        $this->forgetListCache((int) $route->company_id, (int) $route->specialist_id, $route->route_date->format('Y-m-d'));

        return $route->fresh(['stops.booking.location']);
    }

    /**
     * @return array{distanceMeters: int, durationSeconds: int}
     */
    protected function legMetricsBetween(GeoPoint $a, GeoPoint $b, int $companyId): array
    {
        $pair = $this->routeCalculator->calculate([$a, $b], $companyId);
        if (is_array($pair->legs) && isset($pair->legs[0])) {
            return [
                'distanceMeters' => (int) $pair->legs[0]['distanceMeters'],
                'durationSeconds' => (int) $pair->legs[0]['durationSeconds'],
            ];
        }

        return [
            'distanceMeters' => $pair->distanceMeters,
            'durationSeconds' => $pair->durationSeconds,
        ];
    }

    /**
     * ETA по остановкам с учётом окон бронирований: выезд не раньше, чем нужно к первому окну;
     * у визита eta = начало услуги (max(прибытие, начало окна)); при раннем прибытии — ожидание.
     *
     * @param  array<int, GeoPoint>  $waypoints
     * @param  array<int, array{distanceMeters: int, durationSeconds: int}>  $legs
     * @param  Collection<int, Booking>  $orderedBookingsWithGeo  тот же порядок, что точки 1..n-2 (или 1..n-1 без return leg)
     * @return array<int, array{eta: Carbon, arrived_at: ?Carbon, wait_before_seconds: int}>
     */
    protected function computeEtasWithBookingWindows(
        Carbon $dayStartCandidate,
        array $waypoints,
        array $legs,
        Collection $orderedBookingsWithGeo,
        string $tz,
        bool $includeReturnLeg = true
    ): array {
        $n = count($waypoints);
        if ($n < 2) {
            return [];
        }

        $k = $orderedBookingsWithGeo->count();
        if ($k === 0) {
            $legOnly = $legs[0] ?? ['distanceMeters' => 0, 'durationSeconds' => 0];

            return [
                0 => [
                    'eta' => $dayStartCandidate->copy(),
                    'arrived_at' => null,
                    'wait_before_seconds' => 0,
                ],
                1 => [
                    'eta' => $dayStartCandidate->copy()->addSeconds((int) $legOnly['durationSeconds']),
                    'arrived_at' => null,
                    'wait_before_seconds' => 0,
                ],
            ];
        }

        $expectedN = $includeReturnLeg ? $k + 2 : $k + 1;
        if ($n !== $expectedN) {
            return [];
        }

        $firstBooking = $orderedBookingsWithGeo->first();
        $firstLeg = $legs[0] ?? ['distanceMeters' => 0, 'durationSeconds' => 0];
        $firstWindowStart = $firstBooking->getTimeWindow($tz)['start'];
        $idealDeparture = $firstWindowStart->copy()->subSeconds((int) $firstLeg['durationSeconds']);
        $departure = $idealDeparture->gt($dayStartCandidate)
            ? $idealDeparture->copy()
            : $dayStartCandidate->copy();

        $out = [];
        $out[0] = [
            'eta' => $departure->copy(),
            'arrived_at' => null,
            'wait_before_seconds' => 0,
        ];

        $clock = $departure->copy();

        for ($i = 1; $i <= $k; $i++) {
            $leg = $legs[$i - 1] ?? ['distanceMeters' => 0, 'durationSeconds' => 0];
            $booking = $orderedBookingsWithGeo->get($i - 1);
            $arrival = $clock->copy()->addSeconds((int) $leg['durationSeconds']);
            $windowStart = $booking->getTimeWindow($tz)['start'];
            $waitBefore = 0;
            if ($arrival->lt($windowStart)) {
                $waitBefore = (int) $arrival->diffInSeconds($windowStart);
            }
            $serviceStart = $arrival->copy();
            if ($serviceStart->lt($windowStart)) {
                $serviceStart = $windowStart->copy();
            }
            $out[$i] = [
                'eta' => $serviceStart->copy(),
                'arrived_at' => $arrival->copy(),
                'wait_before_seconds' => $waitBefore,
            ];
            $clock = $serviceStart->copy()->addMinutes((int) ($booking->duration_minutes ?? 60));
        }

        if ($includeReturnLeg) {
            $lastLeg = $legs[$n - 2] ?? ['distanceMeters' => 0, 'durationSeconds' => 0];
            $arrivalHome = $clock->copy()->addSeconds((int) $lastLeg['durationSeconds']);
            $out[$n - 1] = [
                'eta' => $arrivalHome->copy(),
                'arrived_at' => null,
                'wait_before_seconds' => 0,
            ];
        }

        return $out;
    }

    protected function optimizeAndPersist(Route $route, TeamMember $specialist, Collection $bookings, bool $includeReturnLeg = true): Route
    {
        $this->ensureBookingsGeocoded($bookings);

        $company = Company::query()->findOrFail($route->company_id);
        $companyId = (int) $route->company_id;
        $date = $route->route_date->format('Y-m-d');

        [$start, $end] = $this->resolveStartEndPoints($specialist, $company);
        $tz = $this->companyTimezone($company);
        $startTime = $this->parseRouteStartTime($date, $specialist, $tz);

        if ($start === null || $end === null) {
            $route->status = Route::STATUS_STALE;
            $route->save();
            $this->forgetListCache($companyId, (int) $route->specialist_id, $date);

            return $route->fresh(['stops.booking.location']);
        }

        $route->status = Route::STATUS_OPTIMIZING;
        $route->save();

        try {
            $opt = $this->routeOptimizer->optimize($bookings->all(), $start, $end, $startTime, $specialist, $includeReturnLeg);
            $byId = $bookings->keyBy('id');
            $ordered = collect($opt->order)
                ->map(static fn (int $id) => $byId->get($id))
                ->filter()
                ->values();

            $orderedWithGeo = $ordered->filter(static fn (Booking $b) => $b->getGeoPoint() !== null)->values();

            $waypoints = [$start];
            foreach ($orderedWithGeo as $b) {
                $waypoints[] = $b->getGeoPoint();
            }
            if ($includeReturnLeg) {
                $waypoints[] = $end;
            }

            $routeResult = $this->routeCalculator->calculate($waypoints, $companyId);

            $expectedLegs = count($waypoints) - 1;
            $legs = $routeResult->legs;
            if (! is_array($legs) || count($legs) !== $expectedLegs) {
                $legs = [];
                for ($j = 0; $j < $expectedLegs; $j++) {
                    $legs[] = $this->legMetricsBetween($waypoints[$j], $waypoints[$j + 1], $companyId);
                }
            }

            $timed = $this->computeEtasWithBookingWindows($startTime, $waypoints, $legs, $orderedWithGeo, $tz, $includeReturnLeg);

            DB::transaction(function () use ($route, $start, $end, $orderedWithGeo, $routeResult, $legs, $timed, $companyId, $waypoints, $includeReturnLeg): void {
                $route->stops()->delete();

                $sequence = 0;
                $n = count($waypoints);
                $t0 = $timed[0]['eta'] ?? null;
                $this->insertStop(
                    $route,
                    $sequence++,
                    RouteStop::TYPE_START,
                    $start,
                    null,
                    null,
                    null,
                    $t0,
                    null,
                    0
                );

                $legIndex = 0;
                $wpIdx = 1;
                foreach ($orderedWithGeo as $b) {
                    $p = $b->getGeoPoint();
                    $leg = $legs[$legIndex++] ?? $this->legMetricsBetween($waypoints[$wpIdx - 1], $waypoints[$wpIdx], $companyId);
                    $tm = $timed[$wpIdx] ?? null;
                    $this->insertStop(
                        $route,
                        $sequence++,
                        RouteStop::TYPE_BOOKING,
                        $p,
                        (int) $b->id,
                        (int) $leg['distanceMeters'],
                        (int) $leg['durationSeconds'],
                        $tm['eta'] ?? null,
                        $tm['arrived_at'] ?? null,
                        (int) ($tm['wait_before_seconds'] ?? 0)
                    );
                    $wpIdx++;
                }

                if ($includeReturnLeg) {
                    $legEnd = $legs[$legIndex] ?? $this->legMetricsBetween($waypoints[$n - 2], $waypoints[$n - 1], $companyId);
                    $tmEnd = $timed[$n - 1] ?? null;
                    $this->insertStop(
                        $route,
                        $sequence++,
                        RouteStop::TYPE_END,
                        $end,
                        null,
                        (int) $legEnd['distanceMeters'],
                        (int) $legEnd['durationSeconds'],
                        $tmEnd['eta'] ?? null,
                        null,
                        0
                    );
                }

                $route->start_latitude = $start->latitude;
                $route->start_longitude = $start->longitude;
                $route->total_distance_meters = $routeResult->distanceMeters;
                $route->total_duration_seconds = $routeResult->durationSeconds;
                $route->path_lng_lat = $routeResult->pathLngLat;
                $route->status = Route::STATUS_READY;
                $route->optimized_at = now();
                $route->cache_version = (int) $route->cache_version + 1;
                $route->save();
            });
        } catch (\Throwable) {
            $route->status = Route::STATUS_STALE;
            $route->save();
        }

        $this->forgetListCache($companyId, (int) $route->specialist_id, $date);

        return $route->fresh(['stops.booking.location']);
    }

    protected function syncStopsFromBookings(Route $route, TeamMember $specialist, int $companyId, string $date, ?Collection $preloadedBookings = null, bool $includeReturnLeg = true): void
    {
        $company = Company::query()->findOrFail($companyId);
        [$start, $end] = $this->resolveStartEndPoints($specialist, $company);

        if ($start === null || $end === null) {
            return;
        }

        $tz = $this->companyTimezone($company);

        $bookings = ($preloadedBookings ?? $this->bookingsForDate($specialist->id, $date, $companyId))
            ->sortBy(static function (Booking $b) use ($tz) {
                return $b->getTimeWindow($tz)['start']->timestamp;
            })->values();

        $this->ensureBookingsGeocoded($bookings);

        $startTime = $this->parseRouteStartTime($date, $specialist, $tz);

        DB::transaction(function () use ($route, $start, $end, $bookings, $startTime, $companyId, $tz, $includeReturnLeg): void {
            $route->stops()->delete();

            $withGeo = $bookings->filter(static fn (Booking $b) => $b->getGeoPoint() !== null)->values();

            $waypoints = [$start];
            foreach ($withGeo as $b) {
                $waypoints[] = $b->getGeoPoint();
            }
            if ($includeReturnLeg) {
                $waypoints[] = $end;
            }

            $fullLine = $this->routeCalculator->calculate($waypoints, $companyId);
            $expectedLegs = count($waypoints) - 1;
            $legs = $fullLine->legs;
            if (! is_array($legs) || count($legs) !== $expectedLegs) {
                $legs = [];
                for ($j = 0; $j < $expectedLegs; $j++) {
                    $legs[] = $this->legMetricsBetween($waypoints[$j], $waypoints[$j + 1], $companyId);
                }
            }

            $timed = $this->computeEtasWithBookingWindows($startTime, $waypoints, $legs, $withGeo, $tz, $includeReturnLeg);

            $seq = 0;
            $n = count($waypoints);
            $t0 = $timed[0]['eta'] ?? null;
            $this->insertStop($route, $seq++, RouteStop::TYPE_START, $start, null, null, null, $t0, null, 0);

            $legIndex = 0;
            $wpIdx = 1;
            foreach ($withGeo as $b) {
                $p = $b->getGeoPoint();
                $leg = $legs[$legIndex++] ?? $this->legMetricsBetween($waypoints[$wpIdx - 1], $waypoints[$wpIdx], $companyId);
                $tm = $timed[$wpIdx] ?? null;
                $this->insertStop(
                    $route,
                    $seq++,
                    RouteStop::TYPE_BOOKING,
                    $p,
                    (int) $b->id,
                    (int) $leg['distanceMeters'],
                    (int) $leg['durationSeconds'],
                    $tm['eta'] ?? null,
                    $tm['arrived_at'] ?? null,
                    (int) ($tm['wait_before_seconds'] ?? 0)
                );
                $wpIdx++;
            }

            if ($includeReturnLeg) {
                $legEnd = $legs[$legIndex] ?? $this->legMetricsBetween($waypoints[$n - 2], $waypoints[$n - 1], $companyId);
                $tmEnd = $timed[$n - 1] ?? null;
                $this->insertStop(
                    $route,
                    $seq++,
                    RouteStop::TYPE_END,
                    $end,
                    null,
                    (int) $legEnd['distanceMeters'],
                    (int) $legEnd['durationSeconds'],
                    $tmEnd['eta'] ?? null,
                    null,
                    0
                );
            }

            $route->total_distance_meters = $fullLine->distanceMeters;
            $route->total_duration_seconds = $fullLine->durationSeconds;
            $route->path_lng_lat = $fullLine->pathLngLat;
            $route->start_latitude = $start->latitude;
            $route->start_longitude = $start->longitude;
            $route->save();
        });
    }

    protected function insertStop(
        Route $route,
        int $sequence,
        string $type,
        GeoPoint $point,
        ?int $bookingId,
        ?int $distPrev,
        ?int $durPrev,
        ?Carbon $eta,
        ?Carbon $arrivedAt = null,
        int $waitBeforeSeconds = 0,
    ): void {
        RouteStop::query()->create([
            'route_id' => $route->id,
            'booking_id' => $bookingId,
            'sequence_order' => $sequence,
            'stop_type' => $type,
            'latitude' => $point->latitude,
            'longitude' => $point->longitude,
            'eta' => $eta,
            'arrived_at' => $arrivedAt,
            'wait_before_seconds' => $waitBeforeSeconds,
            'distance_from_prev_meters' => $distPrev,
            'duration_from_prev_seconds' => $durPrev,
            'status' => 'pending',
        ]);
    }

    protected function bookingsForDate(int $specialistId, string $date, int $companyId): Collection
    {
        return Booking::query()
            ->forRoutePlannerDay($companyId, $specialistId, $date)
            ->with(['location', 'company', 'user.profile', 'service', 'advertisement'])
            ->orderBy('booking_date')
            ->orderBy('booking_time')
            ->get();
    }

    /**
     * Все бронирования на день (для UI списка).
     *
     * @return Collection<int, Booking>
     */
    public function allBookingsForDate(int $specialistId, string $date, int $companyId): Collection
    {
        return $this->bookingsForDate($specialistId, $date, $companyId);
    }

    /**
     * Бронирования, включённые в маршрут: при null в included_booking_ids — все на день.
     *
     * @return Collection<int, Booking>
     */
    protected function bookingsForRoute(Route $route, int $specialistId, string $date, int $companyId): Collection
    {
        $all = $this->bookingsForDate($specialistId, $date, $companyId);
        $raw = $route->included_booking_ids;
        if ($raw === null) {
            return $all;
        }

        $allowed = [];
        foreach ((array) $raw as $id) {
            $allowed[(int) $id] = true;
        }

        return $all->filter(static fn (Booking $b) => isset($allowed[(int) $b->id]))->values();
    }

    /**
     * Обновить набор включённых бронирований и пересобрать остановки (без полной оптимизации HERE).
     */
    public function setIncludedBookingIdsAndResync(
        int $specialistId,
        string $date,
        int $companyId,
        ?array $bookingIds
    ): Route {
        $specialist = TeamMember::query()
            ->where('company_id', $companyId)
            ->whereKey($specialistId)
            ->firstOrFail();

        $route = Route::query()->firstOrCreate(
            [
                'specialist_id' => $specialistId,
                'route_date' => $date,
            ],
            [
                'company_id' => $companyId,
                'status' => Route::STATUS_DRAFT,
            ]
        );

        if ($bookingIds === null) {
            $route->included_booking_ids = null;
        } else {
            $route->included_booking_ids = array_values(array_map('intval', $bookingIds));
        }

        $route->status = Route::STATUS_STALE;
        $route->save();

        $this->forgetListCache($companyId, $specialistId, $date);

        $allBookings = $this->bookingsForDate($specialistId, $date, $companyId);
        $this->ensureBookingsGeocoded($allBookings);

        $route = $route->fresh();
        $bookings = $this->bookingsForRoute($route, $specialistId, $date, $companyId);
        $this->syncStopsFromBookings($route, $specialist, $companyId, $date, $bookings);

        return $route->fresh(['stops.booking.location', 'stops.booking.user.profile']);
    }

    /**
     * Обновить флаг include_return_leg и пересобрать остановки.
     */
    public function setIncludeReturnLegAndResync(
        int $specialistId,
        string $date,
        int $companyId,
        bool $includeReturnLeg
    ): Route {
        $specialist = TeamMember::query()
            ->where('company_id', $companyId)
            ->whereKey($specialistId)
            ->firstOrFail();

        $route = Route::query()->firstOrCreate(
            [
                'specialist_id' => $specialistId,
                'route_date' => $date,
            ],
            [
                'company_id' => $companyId,
                'status' => Route::STATUS_DRAFT,
            ]
        );

        $route->include_return_leg = $includeReturnLeg;
        $route->status = Route::STATUS_STALE;
        $route->save();

        $this->forgetListCache($companyId, $specialistId, $date);

        $allBookings = $this->bookingsForDate($specialistId, $date, $companyId);
        $this->ensureBookingsGeocoded($allBookings);

        $route = $route->fresh();
        $bookings = $this->bookingsForRoute($route, $specialistId, $date, $companyId);
        $this->syncStopsFromBookings($route, $specialist, $companyId, $date, $bookings, $includeReturnLeg);

        return $route->fresh(['stops.booking.location', 'stops.booking.user.profile']);
    }

    /**
     * Заполняет cached_lat/lng по {@see Booking::addressLineForGeocodingUs()} (профиль клиента, затем адрес брони).
     */
    protected function ensureBookingsGeocoded(Collection $bookings): void
    {
        foreach ($bookings as $booking) {
            if ($booking->getGeoPoint() !== null) {
                continue;
            }
            $this->geocodingService->geocodeBooking($booking);
            $booking->refresh();
        }
    }

    /**
     * Нужно пересобрать остановки: пустой маршрут или число визитов с координатами не совпадает с уже сохранёнными booking-стопами
     * (например, геокод появился после первого sync только с start/end).
     */
    protected function shouldSyncRouteStops(Route $route, Collection $bookings): bool
    {
        if ($route->stops()->count() === 0) {
            return true;
        }

        $expected = $bookings->filter(static function (Booking $b) {
            return $b->getGeoPoint() !== null;
        })->count();

        $actual = (int) $route->stops()->where('stop_type', RouteStop::TYPE_BOOKING)->count();

        return $expected !== $actual;
    }

    protected function resolveStartEndPoints(TeamMember $specialist, Company $company): array
    {
        $start = $specialist->getStartLocation();
        $end = $specialist->getEndLocation();

        if ($start === null && $company->latitude !== null && $company->longitude !== null) {
            $start = new GeoPoint((float) $company->latitude, (float) $company->longitude);
        }

        if ($end === null) {
            $end = $start;
        }

        return [$start, $end];
    }

    protected function parseRouteStartTime(string $date, TeamMember $specialist, string $tz): Carbon
    {
        $t = $specialist->default_start_time ?? '08:00:00';
        if ($t instanceof Carbon) {
            $timeStr = $t->format('H:i:s');
        } else {
            $timeStr = trim((string) $t);
            if (strlen($timeStr) === 5) {
                $timeStr .= ':00';
            }
        }

        if ($timeStr === '') {
            $timeStr = '08:00:00';
        }

        try {
            return Carbon::createFromFormat('Y-m-d H:i:s', $date.' '.$timeStr, $tz);
        } catch (\Throwable) {
            return Carbon::createFromFormat('Y-m-d H:i:s', $date.' 08:00:00', $tz);
        }
    }

    protected function companyTimezone(?Company $company): string
    {
        if ($company !== null) {
            return $company->resolveTimezone();
        }

        return 'America/Los_Angeles';
    }

    protected function shouldDebounceOptimization(Route $route): bool
    {
        if ($route->status === Route::STATUS_OPTIMIZING) {
            return true;
        }

        if ($route->optimized_at !== null && $route->optimized_at->gt(now()->subSeconds(self::DEBOUNCE_SECONDS))) {
            return true;
        }

        return false;
    }

    protected function listCacheKey(int $companyId, int $specialistId, string $date): string
    {
        return sprintf('route_orchestrator:list:%d:%d:%s', $companyId, $specialistId, $date);
    }

    protected function forgetListCache(int $companyId, int $specialistId, string $date): void
    {
        Cache::forget($this->listCacheKey($companyId, $specialistId, $date));
    }

    /**
     * Длина и время в пути по цепочке визитов — через HERE Router (как {@see recalculateRoute}), чтобы совпадало с карточкой маршрута.
     *
     * @return array{0: float, 1: int} метры, секунды
     */
    protected function hereMetricsForBookingOrder(Collection $orderedBookings, GeoPoint $start, GeoPoint $end, int $companyId, bool $includeReturnLeg = true): array
    {
        $waypoints = [$start];
        foreach ($orderedBookings as $b) {
            $p = $b->getGeoPoint();
            if ($p !== null) {
                $waypoints[] = $p;
            }
        }
        if ($includeReturnLeg) {
            $waypoints[] = $end;
        }

        if (count($waypoints) < 2) {
            return [0.0, 0];
        }

        $result = $this->routeCalculator->calculate($waypoints, $companyId);

        return [(float) $result->distanceMeters, (int) $result->durationSeconds];
    }

    /**
     * @param  array<int, Booking>  $bookings
     */
    protected function chainDistanceMeters(array $bookings, GeoPoint $start, GeoPoint $end): float
    {
        $d = 0.0;
        $prev = $start;

        foreach ($bookings as $b) {
            $p = $b->getGeoPoint();
            if ($p === null) {
                continue;
            }
            $d += $this->haversineMeters($prev->latitude, $prev->longitude, $p->latitude, $p->longitude);
            $prev = $p;
        }

        $d += $this->haversineMeters($prev->latitude, $prev->longitude, $end->latitude, $end->longitude);

        return $d;
    }

    /**
     * @param  array<int, Booking>  $bookings
     */
    protected function chainDurationSecondsApprox(array $bookings, GeoPoint $start, GeoPoint $end): int
    {
        $total = 0;
        $prev = $start;

        foreach ($bookings as $b) {
            $p = $b->getGeoPoint();
            if ($p === null) {
                continue;
            }
            $total += $this->legTravelSeconds($prev, $p);
            $prev = $p;
        }

        $total += $this->legTravelSeconds($prev, $end);

        return $total;
    }

    protected function legTravelSeconds(GeoPoint $from, GeoPoint $to): int
    {
        $meters = $this->haversineMeters($from->latitude, $from->longitude, $to->latitude, $to->longitude);
        $km = $meters / 1000.0;
        $kph = match (true) {
            $km < 3.0 => 20.0,
            $km < 10.0 => 30.0,
            $km < 20.0 => 40.0,
            default => 50.0,
        };
        $mps = $kph / 3.6;

        return (int) max(1, round($meters / max(0.001, $mps)));
    }

    protected function haversineMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthM = 6371000.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return 2 * $earthM * asin(min(1.0, sqrt($a)));
    }

    protected function serializeJobsSummary(Collection $bookings, string $tz, float $distMeters, int $durSec): array
    {
        return [
            'jobs' => $bookings->map(function (Booking $b) use ($tz) {
                $tw = $b->getTimeWindow($tz);

                return [
                    'id' => $b->id,
                    'client_name' => $b->businessClientDisplayName(),
                    'address' => $b->visitAddressLineForDisplay(),
                    'time_window_start' => $tw['start']->toIso8601String(),
                    'time_window_end' => $tw['end']->toIso8601String(),
                    'priority' => (int) ($b->priority ?? 5),
                    'duration_minutes' => (int) ($b->duration_minutes ?? 60),
                ];
            })->values()->all(),
            'total_distance_km' => round($distMeters / 1000, 2),
            'total_duration_min' => (int) max(0, round($durSec / 60)),
        ];
    }

    protected function previewConfidence(array $warnings, int $bookingCount): string
    {
        if ($bookingCount === 0) {
            return 'low';
        }
        if ($warnings === []) {
            return 'high';
        }
        if (count($warnings) < 3) {
            return 'medium';
        }

        return 'low';
    }

    protected function countMovedIds(Collection $current, Collection $proposed): int
    {
        $a = $current->pluck('id')->all();
        $b = $proposed->pluck('id')->all();
        if (count($a) !== count($b)) {
            return max(count($a), count($b));
        }

        $moved = 0;
        for ($i = 0; $i < count($a); $i++) {
            if (($a[$i] ?? null) !== ($b[$i] ?? null)) {
                $moved++;
            }
        }

        return $moved;
    }

    protected function emptyPreview(array $warnings): PreviewResult
    {
        $empty = ['jobs' => [], 'total_distance_km' => 0.0, 'total_duration_min' => 0];

        return new PreviewResult(
            currentRoute: $empty,
            proposedRoute: $empty,
            comparison: [
                'distance_change_meters' => 0,
                'duration_change_seconds' => 0,
                'distance_change_percent' => 0.0,
                'jobs_reordered' => false,
                'locked_jobs' => 0,
                'outcome' => 'insufficient_data',
            ],
            confidence: 'low',
            reorderDetails: [
                'changed' => false,
                'moved_count' => 0,
            ],
            warnings: $warnings,
        );
    }
}

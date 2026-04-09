<?php

namespace App\Services\Routing;

use App\Models\Booking;
use App\Models\TeamMember;
use App\Services\Routing\Dto\GeoPoint;
use App\Services\Routing\Dto\OptimizationResult;
use Illuminate\Support\Carbon;

class RouteOptimizer
{
    private const LATE_CAP = 5000.0;

    private const WAIT_CAP = 2000.0;

    /**
     * Максимальный разрыв между записями (в секундах), при котором они могут меняться местами.
     * Если между окнами записей > 2 часов — не переставлять.
     */
    private const MAX_TIME_GAP_FOR_SWAP_SECONDS = 2 * 3600;

    /**
     * Максимальное допустимое время ожидания (в секундах) после swap.
     * Если swap создаёт idle > 3 часов — отклонить.
     */
    private const MAX_IDLE_AFTER_SWAP_SECONDS = 3 * 3600;

    /**
     * @param  array<int, Booking>  $bookings
     */
    public function optimize(
        array $bookings,
        GeoPoint $start,
        GeoPoint $end,
        Carbon $startTime,
        ?TeamMember $specialist,
        bool $includeReturnLeg = true
    ): OptimizationResult {
        unset($specialist);

        $warnings = [];
        $tz = null;
        $usable = [];

        foreach ($bookings as $b) {
            if (! $b instanceof Booking) {
                continue;
            }
            if ($b->status === 'cancelled') {
                continue;
            }

            if ($tz === null) {
                $tz = $b->resolveBusinessTimezone();
            }
            $point = $b->getGeoPoint();
            if ($point === null) {
                $warnings[] = [
                    'type' => 'no_coordinates',
                    'message' => 'Address not geocoded',
                    'job_id' => $b->id,
                ];

                continue;
            }

            $usable[] = [
                'b' => $b,
                'p' => $point,
                'tw' => $b->getTimeWindow($tz ?? 'America/Los_Angeles'),
            ];
        }

        $tz ??= 'America/Los_Angeles';

        if ($usable === []) {
            return new OptimizationResult([], 0, $warnings, 0);
        }

        $locked = [];
        $movable = [];

        foreach ($usable as $item) {
            if ($this->isLockedStatus($item['b']->status)) {
                $locked[] = $item;
            } else {
                $movable[] = $item;
            }
        }

        usort($locked, fn ($a, $b) => $a['tw']['start']->timestamp <=> $b['tw']['start']->timestamp);

        $movableOrdered = $this->nearestNeighborMovable($movable, $start, $startTime);
        $merged = $this->mergeByTimeWindow($locked, $movableOrdered);

        $distanceBefore = $this->totalRouteDistance($merged, $start, $end, $includeReturnLeg);
        $after2opt = $this->twoOptPass($merged, $start, $end, $startTime, $tz, 2, $includeReturnLeg);
        $distanceAfter = $this->totalRouteDistance($after2opt, $start, $end, $includeReturnLeg);

        $finalOrder = array_map(static fn (array $item): int => (int) $item['b']->id, $after2opt);
        $savings = (int) max(0, round($distanceBefore - $distanceAfter));
        $lockedCount = count($locked);

        return new OptimizationResult($finalOrder, $savings, $warnings, $lockedCount);
    }

    private function isLockedStatus(?string $status): bool
    {
        return in_array($status, ['completed', 'in_progress'], true);
    }

    /**
     * @param  array<int, array{b: Booking, p: GeoPoint, tw: array{start: Carbon, end: Carbon}}>  $movable
     * @return array<int, array{b: Booking, p: GeoPoint, tw: array{start: Carbon, end: Carbon}}>
     */
    private function nearestNeighborMovable(array $movable, GeoPoint $start, Carbon $startTime): array
    {
        if ($movable === []) {
            return [];
        }

        usort($movable, fn ($a, $b) => $a['tw']['start']->timestamp <=> $b['tw']['start']->timestamp);

        $clusters = $this->clusterByTimeGap($movable);

        $out = [];
        $current = $start;
        $currentTime = $startTime->copy();

        foreach ($clusters as $cluster) {
            $remaining = $cluster;

            while ($remaining !== []) {
                $bestIdx = null;
                $bestCost = PHP_FLOAT_MAX;

                foreach ($remaining as $idx => $item) {
                    $cost = $this->edgeCost($current, $currentTime, $item);
                    if ($cost < $bestCost) {
                        $bestCost = $cost;
                        $bestIdx = $idx;
                    }
                }

                if ($bestIdx === null) {
                    break;
                }

                $picked = $remaining[$bestIdx];
                array_splice($remaining, $bestIdx, 1);

                $travelSec = $this->travelSeconds($current, $picked['p']);
                $currentTime->addSeconds($travelSec);

                if ($currentTime->lt($picked['tw']['start'])) {
                    $currentTime = $picked['tw']['start']->copy();
                }

                $currentTime->addMinutes((int) ($picked['b']->duration_minutes ?? 60));
                $current = $picked['p'];
                $out[] = $picked;
            }
        }

        return $out;
    }

    /**
     * Разбивает записи на кластеры по временным разрывам.
     * Если между окнами двух соседних записей > MAX_TIME_GAP — новый кластер.
     *
     * @param  array<int, array{b: Booking, p: GeoPoint, tw: array{start: Carbon, end: Carbon}}>  $sorted  отсортировано по tw.start
     * @return array<int, array<int, array{b: Booking, p: GeoPoint, tw: array{start: Carbon, end: Carbon}}>>
     */
    private function clusterByTimeGap(array $sorted): array
    {
        if ($sorted === []) {
            return [];
        }

        $clusters = [];
        $currentCluster = [$sorted[0]];

        for ($i = 1; $i < count($sorted); $i++) {
            $prevEnd = $currentCluster[count($currentCluster) - 1]['tw']['start']
                ->copy()
                ->addMinutes((int) ($currentCluster[count($currentCluster) - 1]['b']->duration_minutes ?? 60));
            $nextStart = $sorted[$i]['tw']['start'];

            $gap = $nextStart->getTimestamp() - $prevEnd->getTimestamp();

            if ($gap > self::MAX_TIME_GAP_FOR_SWAP_SECONDS) {
                $clusters[] = $currentCluster;
                $currentCluster = [$sorted[$i]];
            } else {
                $currentCluster[] = $sorted[$i];
            }
        }

        if ($currentCluster !== []) {
            $clusters[] = $currentCluster;
        }

        return $clusters;
    }

    /**
     * @param  array{b: Booking, p: GeoPoint, tw: array{start: Carbon, end: Carbon}}  $item
     */
    private function edgeCost(GeoPoint $from, Carbon $currentTime, array $item): float
    {
        $to = $item['p'];
        $d = $this->haversineMeters($from->latitude, $from->longitude, $to->latitude, $to->longitude);
        $travelSec = $this->travelSeconds($from, $to);
        $eta = $currentTime->copy()->addSeconds($travelSec);

        $twStart = $item['tw']['start'];
        $twEnd = $item['tw']['end'];

        $latePenalty = 0.0;
        if ($eta->gt($twEnd)) {
            $latePenalty = min(self::LATE_CAP, (float) max(0, $eta->getTimestamp() - $twEnd->getTimestamp()));
        }

        $waitPenalty = 0.0;
        if ($eta->lt($twStart)) {
            $waitPenalty = min(self::WAIT_CAP, (float) max(0, $twStart->getTimestamp() - $eta->getTimestamp()));
        }

        $priority = (int) ($item['b']->priority ?? 5);
        $priorityTerm = -($priority / 10.0) * $d * 0.3;

        return $d + $latePenalty + $waitPenalty + $priorityTerm;
    }

    /**
     * @param  array<int, array{b: Booking, p: GeoPoint, tw: array{start: Carbon, end: Carbon}}>  $locked
     * @param  array<int, array{b: Booking, p: GeoPoint, tw: array{start: Carbon, end: Carbon}}>  $movable
     * @return array<int, array{b: Booking, p: GeoPoint, tw: array{start: Carbon, end: Carbon}}>
     */
    private function mergeByTimeWindow(array $locked, array $movable): array
    {
        $i = 0;
        $j = 0;
        $out = [];

        while ($i < count($locked) && $j < count($movable)) {
            if ($locked[$i]['tw']['start']->lte($movable[$j]['tw']['start'])) {
                $out[] = $locked[$i];
                $i++;
            } else {
                $out[] = $movable[$j];
                $j++;
            }
        }

        while ($i < count($locked)) {
            $out[] = $locked[$i];
            $i++;
        }

        while ($j < count($movable)) {
            $out[] = $movable[$j];
            $j++;
        }

        return $out;
    }

    /**
     * @param  array<int, array{b: Booking, p: GeoPoint, tw: array{start: Carbon, end: Carbon}}>  $route
     * @return array<int, array{b: Booking, p: GeoPoint, tw: array{start: Carbon, end: Carbon}}>
     */
    private function twoOptPass(array $route, GeoPoint $start, GeoPoint $end, Carbon $startTime, string $tz, int $maxIter, bool $includeReturnLeg = true): array
    {
        $lockedIds = [];
        foreach ($route as $item) {
            if ($this->isLockedStatus($item['b']->status)) {
                $lockedIds[$item['b']->id] = true;
            }
        }

        $route = array_values($route);
        $n = count($route);

        for ($iter = 0; $iter < $maxIter; $iter++) {
            $improved = false;

            for ($i = 0; $i < $n; $i++) {
                for ($j = $i + 1; $j < $n; $j++) {
                    if (isset($lockedIds[$route[$i]['b']->id]) || isset($lockedIds[$route[$j]['b']->id])) {
                        continue;
                    }

                    $twI = $route[$i]['tw']['start'];
                    $twJ = $route[$j]['tw']['start'];
                    $timeGap = abs($twI->getTimestamp() - $twJ->getTimestamp());
                    if ($timeGap > self::MAX_TIME_GAP_FOR_SWAP_SECONDS) {
                        continue;
                    }

                    $trial = $route;
                    $tmp = $trial[$i];
                    $trial[$i] = $trial[$j];
                    $trial[$j] = $tmp;

                    $maxIdle = $this->computeMaxIdleTime($trial, $start, $startTime);
                    if ($maxIdle > self::MAX_IDLE_AFTER_SWAP_SECONDS) {
                        continue;
                    }

                    if ($this->totalRouteDistance($trial, $start, $end, $includeReturnLeg) < $this->totalRouteDistance($route, $start, $end, $includeReturnLeg)) {
                        $route = $trial;
                        $improved = true;
                    }
                }
            }

            if (! $improved) {
                break;
            }
        }

        return $route;
    }

    /**
     * Вычисляет максимальное время ожидания (idle) в маршруте.
     *
     * @param  array<int, array{b: Booking, p: GeoPoint, tw: array{start: Carbon, end: Carbon}}>  $route
     */
    private function computeMaxIdleTime(array $route, GeoPoint $start, Carbon $startTime): int
    {
        if ($route === []) {
            return 0;
        }

        $maxIdle = 0;
        $current = $start;
        $clock = $startTime->copy();

        foreach ($route as $item) {
            $travelSec = $this->travelSeconds($current, $item['p']);
            $arrival = $clock->copy()->addSeconds($travelSec);
            $windowStart = $item['tw']['start'];

            if ($arrival->lt($windowStart)) {
                $idle = (int) $arrival->diffInSeconds($windowStart);
                if ($idle > $maxIdle) {
                    $maxIdle = $idle;
                }
                $clock = $windowStart->copy();
            } else {
                $clock = $arrival->copy();
            }

            $clock->addMinutes((int) ($item['b']->duration_minutes ?? 60));
            $current = $item['p'];
        }

        return $maxIdle;
    }

    /**
     * @param  array<int, array{b: Booking, p: GeoPoint, tw: array{start: Carbon, end: Carbon}}>  $route
     */
    private function totalRouteDistance(array $route, GeoPoint $start, GeoPoint $end, bool $includeReturnLeg = true): float
    {
        $d = 0.0;
        $prev = $start;

        foreach ($route as $item) {
            $d += $this->haversineMeters(
                $prev->latitude,
                $prev->longitude,
                $item['p']->latitude,
                $item['p']->longitude
            );
            $prev = $item['p'];
        }

        if ($includeReturnLeg) {
            $d += $this->haversineMeters(
                $prev->latitude,
                $prev->longitude,
                $end->latitude,
                $end->longitude
            );
        }

        return $d;
    }

    private function travelSeconds(GeoPoint $from, GeoPoint $to): int
    {
        $meters = $this->haversineMeters(
            $from->latitude,
            $from->longitude,
            $to->latitude,
            $to->longitude
        );
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

    private function haversineMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthM = 6371000.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return 2 * $earthM * asin(min(1.0, sqrt($a)));
    }
}

<?php

namespace App\Services\AI;

use App\Models\Company;
use App\Models\RouteStop;
use App\Models\TeamMember;
use App\Services\Routing\RouteOrchestrator;
use App\Support\UsTimeWindowFormat;
use Illuminate\Support\Carbon;

class RouteAssistantContext
{
    public function __construct(
        protected RouteOrchestrator $orchestrator,
    ) {
    }

    /**
     * Компактный срез дня для LLM.
     *
     * @return array<string, mixed>
     */
    public function buildSnapshot(int $companyId, int $specialistId, string $date, string $localeHint): array
    {
        $member = TeamMember::query()
            ->where('company_id', $companyId)
            ->whereKey($specialistId)
            ->firstOrFail();
        $company = Company::query()->findOrFail($companyId);
        $tz = $company->resolveTimezone();
        $route = $this->orchestrator->getRoute($specialistId, $date, $companyId);
        if ($route === null) {
            throw new \InvalidArgumentException('Route not found');
        }

        $route = $route->load(['stops.booking', 'stops.booking.user.profile', 'stops.booking.service']);
        $or = $this->orchestrator;
        $feas = $or->buildFeasibilityForRouteResponse($route, $member, $tz);
        $issues = [];
        foreach (array_slice($feas['feasibility_issues'], 0, 5) as $i) {
            $issues[] = $i;
        }
        $unassigned = $or->assistantListUnassignedForDay($specialistId, $date, $companyId);
        $dayStart = $feas['day_start_iso'] ?? null;

        $miles = $route->total_distance_meters
            ? round($route->total_distance_meters / 1609.34, 1)
            : 0.0;
        $driveMin = $route->total_duration_seconds
            ? (int) max(0, round($route->total_duration_seconds / 60))
            : 0;
        $lateMinTotal = 0;
        $idleMinTotal = 0;
        $stopsOut = [];
        $n = 0;
        foreach ($route->stops->sortBy('sequence_order') as $stop) {
            if ($stop->stop_type !== RouteStop::TYPE_BOOKING || $stop->booking === null) {
                continue;
            }
            $n++;
            $bk = $stop->booking;
            $extra = $feas['stop_extras'][(int) $stop->id] ?? null;
            $lateSec = (int) ($extra['late_seconds'] ?? 0);
            $lateMinTotal += (int) round($lateSec / 60);
            if (($stop->wait_before_seconds ?? 0) > 0) {
                $idleMinTotal += (int) max(1, (int) round($stop->wait_before_seconds / 60));
            }
            $line = '—';
            $eta = '—';
            try {
                $w = $bk->getTimeWindow($tz);
                $line = UsTimeWindowFormat::window($w['start'], $w['end']);
            } catch (\DomainException) {
                $line = '—';
            }
            if ($stop->eta) {
                $eta = UsTimeWindowFormat::clock($stop->eta->timezone($tz));
            }
            $stopsOut[] = [
                'n' => $n,
                'booking_id' => (int) $bk->id,
                'client' => $bk->businessClientDisplayName(),
                'service' => $bk->businessServiceDisplayName(),
                'window' => $line,
                'eta' => $eta,
                'late_min' => (int) max(0, (int) round($lateSec / 60)),
                'duration_min' => (int) ($bk->duration_minutes ?? 60),
                'priority' => (int) ($bk->priority ?? 5),
                'revenue_usd' => (float) ($bk->total_price ?? $bk->price ?? 0),
                'lat' => (float) $stop->latitude,
                'lng' => (float) $stop->longitude,
                'locked' => in_array($bk->status, ['in_progress', 'completed'], true),
            ];
        }

        $otherSpecialists = $this->buildOtherSpecialistsForAssistant(
            $companyId,
            $specialistId,
            $date,
            $tz,
            $member,
            $stopsOut,
        );

        return [
            'locale_hint' => $localeHint,
            'company' => [
                'timezone' => $tz,
                'currency' => (string) ($company->default_currency ?? 'USD'),
            ],
            'specialist' => [
                'id' => (int) $member->id,
                'name' => (string) $member->name,
                'shift' => [
                    'start' => UsTimeWindowFormat::wallTimeFromDb((string) ($member->default_start_time ?? '08:00:00'), $tz, $date),
                    'end' => UsTimeWindowFormat::wallTimeFromDb((string) ($member->default_end_time ?? '18:00:00'), $tz, $date),
                ],
                'home' => $member->home_latitude !== null && $member->home_longitude !== null
                    ? [
                        'lat' => (float) $member->home_latitude,
                        'lng' => (float) $member->home_longitude,
                    ]
                    : null,
            ],
            'route' => [
                'status' => $route->status,
                'miles' => $miles,
                'drive_min' => $driveMin,
                'late_min_total' => $lateMinTotal,
                'idle_min_total' => $idleMinTotal,
                'include_return_leg' => (bool) ($route->include_return_leg ?? true),
                'included_booking_ids' => $route->included_booking_ids,
            ],
            'stops' => $stopsOut,
            'issues' => $issues,
            'unassigned_today' => $unassigned,
            'other_specialists' => $otherSpecialists,
            'day_start_iso' => $dayStart,
            'now_iso' => Carbon::now($tz)->toIso8601String(),
        ];
    }

    /**
     * Coworkers on the same day for reassignment hints (recommendations only).
     *
     * @param  list<array<string, mixed>>  $currentStopsOut
     * @return list<array<string, mixed>>
     */
    private function buildOtherSpecialistsForAssistant(
        int $companyId,
        int $excludeSpecialistId,
        string $date,
        string $tz,
        TeamMember $currentMember,
        array $currentStopsOut,
    ): array {
        $nearbyMeters = 40000.0;

        $candidates = TeamMember::query()
            ->where('company_id', $companyId)
            ->where('is_active', true)
            ->whereKeyNot($excludeSpecialistId)
            ->orderBy('name')
            ->limit(12)
            ->get();

        $out = [];
        foreach ($candidates as $tm) {
            $sid = (int) $tm->id;
            $route = $this->orchestrator->getRoute($sid, $date, $companyId);
            if ($route === null) {
                continue;
            }
            $route = $route->load(['stops.booking']);
            $feas = $this->orchestrator->buildFeasibilityForRouteResponse($route, $tm, $tz);

            $lateMinTotal = 0;
            $idleMinTotal = 0;
            $jobsToday = 0;
            $lastWindowEnd = null;

            foreach ($route->stops->sortBy('sequence_order') as $stop) {
                if ($stop->stop_type !== RouteStop::TYPE_BOOKING || $stop->booking === null) {
                    continue;
                }
                $jobsToday++;
                $extra = $feas['stop_extras'][(int) $stop->id] ?? null;
                $lateSec = (int) ($extra['late_seconds'] ?? 0);
                $lateMinTotal += (int) max(0, (int) round($lateSec / 60));
                if (($stop->wait_before_seconds ?? 0) > 0) {
                    $idleMinTotal += (int) max(1, (int) round($stop->wait_before_seconds / 60));
                }
                try {
                    $w = $stop->booking->getTimeWindow($tz);
                    $lastWindowEnd = $w['end'];
                } catch (\DomainException) {
                    // keep previous lastWindowEnd
                }
            }

            $shiftStart = UsTimeWindowFormat::wallTimeFromDb((string) ($tm->default_start_time ?? '08:00:00'), $tz, $date);
            $shiftEnd = UsTimeWindowFormat::wallTimeFromDb((string) ($tm->default_end_time ?? '18:00:00'), $tz, $date);

            if ($lastWindowEnd !== null) {
                $freeAfter = UsTimeWindowFormat::clock($lastWindowEnd->timezone($tz));
            } else {
                $freeAfter = $shiftStart;
            }

            $nearby = false;
            $oLat = $tm->home_latitude;
            $oLng = $tm->home_longitude;
            if ($oLat !== null && $oLng !== null) {
                $oLatF = (float) $oLat;
                $oLngF = (float) $oLng;
                if ($currentMember->home_latitude !== null && $currentMember->home_longitude !== null) {
                    $d = $this->haversineMeters(
                        $oLatF,
                        $oLngF,
                        (float) $currentMember->home_latitude,
                        (float) $currentMember->home_longitude,
                    );
                    if ($d < $nearbyMeters) {
                        $nearby = true;
                    }
                }
                if (! $nearby) {
                    foreach ($currentStopsOut as $row) {
                        $lat = (float) ($row['lat'] ?? 0.0);
                        $lng = (float) ($row['lng'] ?? 0.0);
                        if ($lat === 0.0 && $lng === 0.0) {
                            continue;
                        }
                        if ($this->haversineMeters($oLatF, $oLngF, $lat, $lng) < $nearbyMeters) {
                            $nearby = true;
                            break;
                        }
                    }
                }
            }

            $out[] = [
                'id' => $sid,
                'name' => (string) $tm->name,
                'jobs_today' => $jobsToday,
                'free_after' => $freeAfter,
                'nearby' => $nearby,
                'late_min_total' => $lateMinTotal,
                'idle_min_total' => $idleMinTotal,
                'shift_start' => $shiftStart,
                'shift_end' => $shiftEnd,
                'max_jobs_per_day' => $tm->max_jobs_per_day !== null ? (int) $tm->max_jobs_per_day : null,
            ];
        }

        return $out;
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

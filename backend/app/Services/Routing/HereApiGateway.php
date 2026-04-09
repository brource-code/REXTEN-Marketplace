<?php

namespace App\Services\Routing;

use App\Models\ApiUsageLog;
use App\Services\Routing\Dto\GeoPoint;
use App\Services\Routing\Dto\RouteResult;
use Heremaps\FlexiblePolyline\FlexiblePolyline;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class HereApiGateway
{
    public const DAILY_LIMITS = [
        'geocode' => 500,
        'routing' => 200,
    ];

    /** Попыток HTTP: первая + повторы (итого 3 запроса). */
    private const HTTP_ATTEMPTS = 3;

    private const RETRY_SLEEP_MS = 250;

    /**
     * @param  string|null  $in  HERE Geocode параметр `in` (например countryCode:USA).
     */
    public function geocode(string $address, int $companyId, ?string $in = null): ?GeoPoint
    {
        $address = trim($address);
        if ($address === '') {
            return null;
        }
        if (! $this->checkLimit($companyId, 'geocode')) {
            return null;
        }
        $apiKey = $this->getApiKey();
        if ($apiKey === null) {
            return null;
        }

        $base = rtrim((string) config('services.here.geocode_url'), '/');
        $url = $base.'/v1/geocode';

        $query = [
            'q' => $address,
            'apiKey' => $apiKey,
            'limit' => 1,
        ];
        if ($in !== null && $in !== '') {
            $query['in'] = $in;
        }

        try {
            $response = Http::timeout(12)
                ->retry(self::HTTP_ATTEMPTS, self::RETRY_SLEEP_MS, null, false)
                ->get($url, $query);
        } catch (\Throwable) {
            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        $items = $response->json('items');
        if (! is_array($items) || $items === []) {
            return null;
        }

        $pos = $items[0]['position'] ?? null;
        if (! is_array($pos)) {
            return null;
        }

        $lat = $pos['lat'] ?? null;
        $lng = $pos['lng'] ?? null;
        if (! is_numeric($lat) || ! is_numeric($lng)) {
            return null;
        }

        $this->logUsage($companyId, 'geocode', 0.0);

        return new GeoPoint((float) $lat, (float) $lng);
    }

    /**
     * @param  array<int, GeoPoint>  $waypoints
     */
    public function calculateRoute(array $waypoints, int $companyId): RouteResult
    {
        if (count($waypoints) < 2) {
            return $this->buildApproximateRouteResult($waypoints);
        }

        if (! $this->checkLimit($companyId, 'routing')) {
            return $this->buildApproximateRouteResult($waypoints);
        }

        $apiKey = $this->getApiKey();
        if ($apiKey === null) {
            return $this->buildApproximateRouteResult($waypoints);
        }

        $base = rtrim((string) config('services.here.router_url'), '/');
        $url = $base.'/v8/routes';

        $first = $waypoints[0];
        $last = $waypoints[count($waypoints) - 1];

        $query = [
            'apiKey' => $apiKey,
            'transportMode' => 'car',
            'origin' => $first->latitude.','.$first->longitude,
            'destination' => $last->latitude.','.$last->longitude,
            'return' => 'summary,polyline',
        ];

        $queryString = http_build_query($query, '', '&', PHP_QUERY_RFC3986);
        $vias = array_slice($waypoints, 1, -1);
        foreach ($vias as $via) {
            $queryString .= '&via='.rawurlencode($via->latitude.','.$via->longitude);
        }

        $fullUrl = $url.'?'.$queryString;

        try {
            $response = Http::timeout(25)
                ->retry(self::HTTP_ATTEMPTS, self::RETRY_SLEEP_MS, null, false)
                ->get($fullUrl);
        } catch (\Throwable) {
            return $this->buildApproximateRouteResult($waypoints);
        }

        if (! $response->successful()) {
            return $this->buildApproximateRouteResult($waypoints);
        }

        $routes = $response->json('routes');
        if (! is_array($routes) || $routes === []) {
            return $this->buildApproximateRouteResult($waypoints);
        }

        $sections = $routes[0]['sections'] ?? null;
        if (! is_array($sections) || $sections === []) {
            return $this->buildApproximateRouteResult($waypoints);
        }

        $distance = 0;
        $duration = 0;
        $polyline = null;
        $legs = [];

        foreach ($sections as $section) {
            if (! is_array($section)) {
                continue;
            }
            $summary = $section['summary'] ?? [];
            $legDistance = 0;
            $legDuration = 0;
            if (is_array($summary)) {
                if (isset($summary['length'])) {
                    $len = (int) $summary['length'];
                    $distance += $len;
                    $legDistance = $len;
                }
                if (isset($summary['duration'])) {
                    $dur = (int) $summary['duration'];
                    $duration += $dur;
                    $legDuration = $dur;
                }
            }
            $legs[] = [
                'distanceMeters' => $legDistance,
                'durationSeconds' => $legDuration,
            ];
            if ($polyline === null && ! empty($section['polyline']) && is_string($section['polyline'])) {
                $polyline = $section['polyline'];
            }
        }

        $pathLngLat = $this->mergeSectionPolylinesToLngLat($sections);

        $this->logUsage($companyId, 'routing', 0.0);

        return new RouteResult(
            $distance,
            $duration,
            $polyline,
            false,
            $pathLngLat !== [] ? $pathLngLat : null,
            $legs !== [] ? $legs : null
        );
    }

    /**
     * Склеивает flexible polyline всех секций маршрута (через via) в одну линию [lng, lat] для GeoJSON.
     *
     * @param  array<int, mixed>  $sections
     * @return array<int, array{0: float, 1: float}>
     */
    protected function mergeSectionPolylinesToLngLat(array $sections): array
    {
        $merged = [];

        foreach ($sections as $section) {
            if (! is_array($section)) {
                continue;
            }
            $enc = $section['polyline'] ?? null;
            if (! is_string($enc) || $enc === '') {
                continue;
            }

            try {
                $decoded = FlexiblePolyline::decode($enc);
                $pts = $decoded['polyline'] ?? [];
            } catch (\Throwable) {
                continue;
            }

            foreach ($pts as $tuple) {
                if (! is_array($tuple) || count($tuple) < 2) {
                    continue;
                }
                $lat = (float) $tuple[0];
                $lng = (float) $tuple[1];
                $pair = [$lng, $lat];
                if ($merged !== [] && $this->coordsAlmostEqual($merged[array_key_last($merged)], $pair)) {
                    continue;
                }
                $merged[] = $pair;
            }
        }

        return $merged;
    }

    /**
     * @param  array{0: float, 1: float}  $a
     * @param  array{0: float, 1: float}  $b
     */
    protected function coordsAlmostEqual(array $a, array $b): bool
    {
        return abs($a[0] - $b[0]) < 1e-5 && abs($a[1] - $b[1]) < 1e-5;
    }

    public function checkLimit(int $companyId, string $endpoint): bool
    {
        $limit = self::DAILY_LIMITS[$endpoint] ?? 0;
        if ($limit <= 0) {
            return false;
        }

        $key = $this->usageCacheKey($companyId, $endpoint);
        $count = (int) Cache::get($key, 0);

        return $count < $limit;
    }

    public function logUsage(int $companyId, string $endpoint, float $cost): void
    {
        $key = $this->usageCacheKey($companyId, $endpoint);
        if (! Cache::has($key)) {
            Cache::put($key, 0, now()->endOfDay());
        }
        Cache::increment($key);

        ApiUsageLog::query()->create([
            'company_id' => $companyId,
            'provider' => 'here',
            'endpoint' => $endpoint,
            'cost_estimate' => $cost,
            'request_count' => 1,
            'created_at' => now(),
        ]);
    }

    protected function usageCacheKey(int $companyId, string $endpoint): string
    {
        return sprintf('here_api_usage:%d:%s:%s', $companyId, $endpoint, now()->toDateString());
    }

    protected function getApiKey(): ?string
    {
        $key = config('services.here.api_key');

        return $key !== null && $key !== '' ? (string) $key : null;
    }

    /**
     * @param  array<int, GeoPoint>  $waypoints
     */
    protected function buildApproximateRouteResult(array $waypoints): RouteResult
    {
        if (count($waypoints) < 2) {
            return new RouteResult(0, 0, null, true, null, null);
        }

        $speedMps = 30 / 3.6;
        $legs = [];
        $totalMeters = 0;
        $totalDuration = 0;

        for ($i = 0; $i < count($waypoints) - 1; $i++) {
            $a = $waypoints[$i];
            $b = $waypoints[$i + 1];
            $m = $this->haversineMeters(
                $a->latitude,
                $a->longitude,
                $b->latitude,
                $b->longitude
            );
            $d = (int) round($m);
            $dur = (int) max(1, round($d / max(0.001, $speedMps)));
            $legs[] = [
                'distanceMeters' => $d,
                'durationSeconds' => $dur,
            ];
            $totalMeters += $d;
            $totalDuration += $dur;
        }

        return new RouteResult($totalMeters, max(0, $totalDuration), null, true, null, $legs);
    }

    /**
     * Приблизительный маршрут без вызова HERE (лимиты и ключ не используются).
     *
     * @param  array<int, GeoPoint>  $waypoints
     */
    public function approximateRoute(array $waypoints): RouteResult
    {
        return $this->buildApproximateRouteResult($waypoints);
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

<?php

namespace App\Services\Routing;

use App\Models\Booking;
use App\Models\GeocodingCache;
use App\Services\Routing\Dto\GeoPoint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class GeocodingService
{
    private const CACHE_TTL_DAYS = 30;

    public function __construct(
        protected HereApiGateway $hereApiGateway,
    ) {
    }

    /**
     * Геокодирование адреса визита и сохранение в кэш брони (рынок США — см. HERE `in` в конфиге).
     */
    public function geocodeBooking(Booking $booking): void
    {
        $companyId = (int) $booking->company_id;

        $primary = $booking->addressLineForGeocodingUs();
        $point = $primary !== '' ? $this->geocodeAddress($primary, $companyId) : null;

        if ($point === null) {
            $fallback = $booking->addressLineForGeocodingLocationOnlyUs();
            if ($fallback !== '' && $fallback !== $primary) {
                $point = $this->geocodeAddress($fallback, $companyId);
            }
        }

        if ($point === null) {
            return;
        }

        $booking->cached_lat = $point->latitude;
        $booking->cached_lng = $point->longitude;
        $booking->geocoded_at = now();
        $booking->saveQuietly();
    }

    /**
     * Адрес для геокодера: город/штат/ZIP как у клиентов в США.
     */
    public function geocodeAddress(string $address, int $companyId): ?GeoPoint
    {
        $address = trim($address);
        if ($address === '') {
            return null;
        }

        $hash = hash('sha256', $address);
        $redisKey = $this->redisKey($hash);

        $cached = Cache::get($redisKey);
        if (is_array($cached) && isset($cached['lat'], $cached['lng'])
            && is_numeric($cached['lat']) && is_numeric($cached['lng'])) {
            return new GeoPoint((float) $cached['lat'], (float) $cached['lng']);
        }

        $row = GeocodingCache::query()
            ->where('address_hash', $hash)
            ->where('expires_at', '>', now())
            ->first();

        if ($row !== null && $row->latitude !== null && $row->longitude !== null) {
            $point = new GeoPoint((float) $row->latitude, (float) $row->longitude);
            $this->putRedisCache($hash, $point);

            return $point;
        }

        $in = (string) config('services.here.geocode_in', 'countryCode:USA');
        $point = $this->hereApiGateway->geocode($address, $companyId, $in !== '' ? $in : null);
        $provider = 'here';
        if ($point === null) {
            $mapboxPoint = $this->geocodeViaMapbox($address);
            if ($mapboxPoint !== null) {
                $point = $mapboxPoint;
                $provider = 'mapbox';
            }
        }
        if ($point === null) {
            return null;
        }

        $expiresAt = now()->addDays(self::CACHE_TTL_DAYS);

        DB::transaction(function () use ($hash, $address, $point, $expiresAt, $provider): void {
            GeocodingCache::query()->updateOrInsert(
                ['address_hash' => $hash],
                [
                    'original_address' => $address,
                    'latitude' => $point->latitude,
                    'longitude' => $point->longitude,
                    'formatted_address' => null,
                    'confidence' => null,
                    'provider' => $provider,
                    'created_at' => now(),
                    'expires_at' => $expiresAt,
                ]
            );
        });

        $this->putRedisCache($hash, $point);

        return $point;
    }

    protected function putRedisCache(string $hash, GeoPoint $point): void
    {
        $key = $this->redisKey($hash);
        Cache::put($key, [
            'lat' => $point->latitude,
            'lng' => $point->longitude,
        ], now()->addDays(self::CACHE_TTL_DAYS));
    }

    protected function redisKey(string $hash): string
    {
        return 'geocoding:us:'.$hash;
    }

    /**
     * Резерв, если HERE недоступен (ключ, лимит, ошибка ответа): тот же публичный токен Mapbox, что у карты.
     */
    protected function geocodeViaMapbox(string $address): ?GeoPoint
    {
        $token = config('services.mapbox.public_token');
        if ($token === null || $token === '') {
            return null;
        }

        $encoded = rawurlencode($address);
        $url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/'.$encoded.'.json';

        try {
            $response = Http::timeout(12)
                ->retry(2, 200, null, false)
                ->get($url, [
                    'access_token' => (string) $token,
                    'limit' => 1,
                    'country' => 'US',
                ]);
        } catch (\Throwable) {
            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        $features = $response->json('features');
        if (! is_array($features) || $features === []) {
            return null;
        }

        $center = $features[0]['center'] ?? null;
        if (! is_array($center) || count($center) < 2) {
            return null;
        }

        $lng = $center[0];
        $lat = $center[1];
        if (! is_numeric($lat) || ! is_numeric($lng)) {
            return null;
        }

        return new GeoPoint((float) $lat, (float) $lng);
    }

}

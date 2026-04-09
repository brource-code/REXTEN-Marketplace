<?php

namespace App\Services\Routing\Dto;

final class RouteResult
{
    /**
     * @param  array<int, array{0: float, 1: float}>|null  $pathLngLat  Цепочка [lng, lat] для линии на карте (HERE driving).
     * @param  array<int, array{distanceMeters: int, durationSeconds: int}>|null  $legs  По одному сегменту между последовательными waypoints (как у HERE sections).
     */
    public function __construct(
        public readonly int $distanceMeters,
        public readonly int $durationSeconds,
        public readonly ?string $polyline,
        public readonly bool $isApproximate,
        public readonly ?array $pathLngLat = null,
        public readonly ?array $legs = null,
    ) {
    }
}

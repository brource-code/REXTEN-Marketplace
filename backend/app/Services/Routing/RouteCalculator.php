<?php

namespace App\Services\Routing;

use App\Services\Routing\Dto\GeoPoint;
use App\Services\Routing\Dto\RouteResult;

class RouteCalculator
{
    public function __construct(
        protected HereApiGateway $hereApiGateway,
    ) {
    }

    /**
     * @param  array<int, GeoPoint>  $waypoints
     */
    public function calculate(array $waypoints, int $companyId): RouteResult
    {
        return $this->hereApiGateway->calculateRoute($waypoints, $companyId);
    }

    /**
     * @param  array<int, GeoPoint>  $waypoints
     */
    public function buildApproximateRoute(array $waypoints): RouteResult
    {
        return $this->hereApiGateway->approximateRoute($waypoints);
    }
}

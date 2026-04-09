<?php

namespace App\Services\Routing\Dto;

final class OptimizationResult
{
    /**
     * @param  array<int, int>  $order  Booking ids in visit order
     * @param  array<int, array<string, mixed>>  $warnings
     */
    public function __construct(
        public readonly array $order,
        public readonly int $savingsMeters,
        public readonly array $warnings,
        public readonly int $lockedCount,
    ) {
    }
}

<?php

namespace App\Services\Routing\Dto;

final class PreviewResult
{
    /**
     * @param  array<string, mixed>  $currentRoute
     * @param  array<string, mixed>  $proposedRoute
     * @param  array<string, mixed>  $comparison
     * @param  'high'|'medium'|'low'  $confidence
     * @param  array<string, mixed>  $reorderDetails
     * @param  array<int, array<string, mixed>>  $warnings
     */
    public function __construct(
        public readonly array $currentRoute,
        public readonly array $proposedRoute,
        public readonly array $comparison,
        public readonly string $confidence,
        public readonly array $reorderDetails,
        public readonly array $warnings = [],
        public readonly bool $suppressedWorseProposal = false,
    ) {
    }
}

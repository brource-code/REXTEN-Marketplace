<?php

namespace App\Services\AI;

use App\Models\Route;
use App\Services\Routing\RouteOrchestrator;

/**
 * Унификация: какие ID броней в маршруте и сравнение set_included с текущим.
 */
final class RouteAssistantInclusion
{
    /**
     * @return list<int> отсортировано по возрастанию
     */
    public static function dayBookingIdList(RouteOrchestrator $orchestrator, int $specialistId, string $date, int $companyId): array
    {
        $ids = $orchestrator->allBookingsForDate($specialistId, $date, $companyId)
            ->pluck('id')
            ->map(static fn ($id) => (int) $id)
            ->filter()
            ->values()
            ->all();
        sort($ids);

        return $ids;
    }

    /**
     * Фактически входящие в день (null в маршруте = «все на день»).
     *
     * @param  list<int>  $daySortedIds
     * @return list<int> отсортировано
     */
    public static function effectiveIncludedIds(Route $route, array $daySortedIds): array
    {
        $raw = $route->included_booking_ids;
        if ($raw === null) {
            return $daySortedIds;
        }
        $a = array_map('intval', (array) $raw);
        $a = array_values(array_unique(array_filter($a)));
        sort($a);

        return $a;
    }

    /**
     * @param  list<int>|null  $paramIds  null = весь день, как null в маршруте
     * @param  list<int>  $daySortedIds
     * @return list<int> отсортировано
     */
    public static function includedIdsForActionParams(?array $paramIds, array $daySortedIds): array
    {
        if ($paramIds === null) {
            return $daySortedIds;
        }
        $a = array_map('intval', $paramIds);
        $a = array_values(array_unique(array_filter($a)));
        sort($a);

        return $a;
    }

    /**
     * @param  list<int>  $currentSorted
     * @param  list<int>  $nextSorted
     * @return list<int> убранные id
     */
    public static function removedBookingIds(array $currentSorted, array $nextSorted): array
    {
        $set = array_fill_keys($nextSorted, true);
        $out = [];
        foreach ($currentSorted as $id) {
            if (! isset($set[$id])) {
                $out[] = $id;
            }
        }
        sort($out);

        return $out;
    }
}

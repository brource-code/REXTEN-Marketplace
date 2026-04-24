<?php

namespace App\Services\AI;

use App\Models\Route;
use App\Services\Routing\RouteOrchestrator;

/**
 * Убирает пустой эффект и рискованные «удаления визитов» из ответа диспетчера
 * (strict-ответ всё ещё может нарушать правила — дублируем проверки на бэкенде).
 */
final class RouteAssistantResponseFilter
{
    public const THRESH_LATE_MIN = 10.0;

    public const THRESH_IDLE_MIN = 10.0;

    public const THRESH_MILES = 1.0;

    public const THRESH_REMOVAL_MIN_EFFECT = 20.0;

    public function __construct(
        private RouteOrchestrator $orchestrator,
    ) {
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function filter(
        array $data,
        int $companyId,
        int $specialistId,
        string $date,
        ?Route $route
    ): array {
        if (! is_array($data) || (isset($data['raw']))) {
            return $data;
        }

        $dayIds = RouteAssistantInclusion::dayBookingIdList(
            $this->orchestrator,
            $specialistId,
            $date,
            $companyId
        );

        $currentIncluded = $route !== null
            ? RouteAssistantInclusion::effectiveIncludedIds($route, $dayIds)
            : $dayIds;
        $includeReturn = (bool) ($route !== null
            ? ($route->include_return_leg ?? true)
            : true);

        $recs = $data['recommendations'] ?? null;
        if (is_array($recs)) {
            $out = [];
            foreach ($recs as $r) {
                if (! is_array($r) || ! $this->isMeaningfulExpected($r['expected'] ?? null)) {
                    continue;
                }
                $out[] = $r;
            }
            $data['recommendations'] = array_values(array_slice($out, 0, 3));
        }

        $actions = $data['proposed_actions'] ?? null;
        if (is_array($actions)) {
            $outA = [];
            foreach ($actions as $a) {
                if (! is_array($a)) {
                    continue;
                }
                $ac = $this->filterProposedAction($a, $currentIncluded, $includeReturn, $dayIds);
                if ($ac === null) {
                    continue;
                }
                $outA[] = $ac;
            }
            $data['proposed_actions'] = array_values(array_slice($outA, 0, 3));
        }

        return $this->sanitizeAssistantUserStrings($data);
    }

    /**
     * Убираем из текста для пользователя имена внутренних инструментов и «simulation».
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function sanitizeAssistantUserStrings(array $data): array
    {
        if (isset($data['summary']) && is_string($data['summary'])) {
            $data['summary'] = $this->sanitizeOneLine($data['summary']);
        }

        $issues = $data['issues'] ?? null;
        if (is_array($issues)) {
            foreach ($issues as $i => $row) {
                if (is_array($row) && isset($row['human']) && is_string($row['human'])) {
                    $data['issues'][$i]['human'] = $this->sanitizeOneLine($row['human']);
                }
            }
        }

        $recs = $data['recommendations'] ?? null;
        if (is_array($recs)) {
            foreach ($recs as $i => $r) {
                if (! is_array($r)) {
                    continue;
                }
                if (isset($r['title']) && is_string($r['title'])) {
                    $data['recommendations'][$i]['title'] = $this->sanitizeOneLine($r['title']);
                }
                if (isset($r['detail']) && is_string($r['detail'])) {
                    $data['recommendations'][$i]['detail'] = $this->sanitizeOneLine($r['detail']);
                }
            }
        }

        $actions = $data['proposed_actions'] ?? null;
        if (is_array($actions)) {
            foreach ($actions as $i => $a) {
                if (is_array($a) && isset($a['explain']) && is_string($a['explain'])) {
                    $data['proposed_actions'][$i]['explain'] = $this->sanitizeOneLine($a['explain']);
                }
            }
        }

        return $data;
    }

    private function sanitizeOneLine(string $s): string
    {
        $s = str_ireplace(
            ['simulate_route', 'get_route_snapshot', 'list_unassigned_for_day'],
            '',
            $s
        );
        $s = str_ireplace(
            ['симуляция', 'симуляции', 'симуляцию', 'симуляцией', 'симуляций'],
            'оценка',
            $s
        );
        $s = (string) preg_replace('/\b(route\s+)?simulations?\b/ui', '$1estimate', $s);
        $s = (string) preg_replace('/\bsimulate\b/ui', 'estimate', $s);
        $s = (string) preg_replace('/\s{2,}/u', ' ', $s);
        $s = (string) preg_replace('/\s*,\s*,/u', ',', $s);
        $s = (string) preg_replace('/\(\s*\)/u', '', $s);

        return trim($s);
    }

    /**
     * @param  mixed  $e
     */
    private function isMeaningfulExpected($e): bool
    {
        if (! is_array($e)) {
            return false;
        }
        $l = abs((float) ($e['late_min'] ?? 0.0));
        $i = abs((float) ($e['idle_min'] ?? 0.0));
        $m = abs((float) ($e['miles'] ?? 0.0));
        if ($l >= self::THRESH_LATE_MIN) {
            return true;
        }
        if ($i >= self::THRESH_IDLE_MIN) {
            return true;
        }
        if ($m >= self::THRESH_MILES) {
            return true;
        }

        return false;
    }

    private function hasStrongRemovalEffect(array $expected): bool
    {
        $l = abs((float) ($expected['late_min'] ?? 0.0));
        $i = abs((float) ($expected['idle_min'] ?? 0.0));

        return $l + $i >= self::THRESH_REMOVAL_MIN_EFFECT
            || $l >= self::THRESH_REMOVAL_MIN_EFFECT
            || $i >= self::THRESH_REMOVAL_MIN_EFFECT;
    }

    /**
     * @param  list<int>  $currentIncluded
     * @param  list<int>  $dayIds
     * @return ?array<string, mixed>
     */
    private function filterProposedAction(
        array $a,
        array $currentIncluded,
        bool $includeReturn,
        array $dayIds
    ): ?array {
        $exp = is_array($a['expected'] ?? null) ? $a['expected'] : null;
        if (! is_array($exp) || ! $this->isMeaningfulExpected($exp)) {
            return null;
        }
        $kind = $a['kind'] ?? '';
        if (! in_array($kind, ['set_included', 'optimize', 'toggle_return_leg'], true)) {
            return null;
        }
        $p = is_array($a['params'] ?? null) ? $a['params'] : [];

        if ($kind === 'toggle_return_leg') {
            $t = $p['include_return_leg'] ?? null;
            if (! is_bool($t) && ! is_int($t)) {
                return null;
            }
            if ((bool) $t === $includeReturn) {
                return null;
            }

            return $a;
        }

        if ($kind === 'set_included') {
            $paramIds = $p['included_booking_ids'] ?? null;
            if ($paramIds !== null && ! is_array($paramIds)) {
                return null;
            }
            $next = RouteAssistantInclusion::includedIdsForActionParams($paramIds, $dayIds);
            if ($next === $currentIncluded) {
                return null;
            }
            $removed = RouteAssistantInclusion::removedBookingIds($currentIncluded, $next);
            if ($removed !== [] && ! $this->hasStrongRemovalEffect($exp)) {
                return null;
            }

            return $a;
        }

        if ($kind === 'optimize') {
            return $a;
        }

        return null;
    }
}

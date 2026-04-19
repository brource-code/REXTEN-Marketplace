<?php

namespace App\Http\Controllers\Api\V1\Concerns;

use Illuminate\Http\Request;

trait PaginatesV1
{
    protected function v1Pagination(Request $request): array
    {
        $max = (int) config('api.v1.max_per_page', 100);
        $default = (int) config('api.v1.default_per_page', 25);
        $page = max(1, (int) $request->get('page', 1));
        $perPage = min($max, max(1, (int) $request->get('per_page', $default)));

        return [$page, $perPage];
    }

    /**
     * @return array{page: int, per_page: int, total: int, last_page: int}
     */
    protected function v1Meta(int $total, int $page, int $perPage): array
    {
        $lastPage = (int) max(1, ceil($total / max(1, $perPage)));

        return [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => $lastPage,
        ];
    }
}

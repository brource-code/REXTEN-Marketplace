<?php

namespace App\Traits;

use App\Helpers\DatabaseHelper;

/**
 * Trait для кроссплатформенного поиска (LIKE/ILIKE)
 */
trait SearchableTrait
{
    /**
     * Применить LIKE поиск к query builder (кроссплатформенный)
     * 
     * @param \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder $query
     * @param string $column
     * @param string $value
     * @param string $boolean
     * @return \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder
     */
    protected function applyLikeSearch($query, string $column, string $value, string $boolean = 'and')
    {
        return DatabaseHelper::whereLike($query, $column, $value, $boolean);
    }

    /**
     * Применить поиск по нескольким колонкам
     * 
     * @param \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder $query
     * @param array $columns
     * @param string $value
     * @return \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder
     */
    protected function applyMultiColumnSearch($query, array $columns, string $value)
    {
        return $query->where(function ($q) use ($columns, $value) {
            foreach ($columns as $index => $column) {
                $this->applyLikeSearch($q, $column, "%{$value}%", $index === 0 ? 'and' : 'or');
            }
        });
    }
}

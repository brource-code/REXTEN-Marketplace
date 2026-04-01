<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;

/**
 * Helper для кроссплатформенных SQL запросов
 * Поддерживает SQLite, MySQL и PostgreSQL
 */
class DatabaseHelper
{
    /**
     * Получить текущий драйвер БД
     */
    public static function getDriver(): string
    {
        return DB::connection()->getDriverName();
    }

    /**
     * Проверить, является ли текущая БД PostgreSQL
     */
    public static function isPostgres(): bool
    {
        return self::getDriver() === 'pgsql';
    }

    /**
     * Проверить, является ли текущая БД SQLite
     */
    public static function isSqlite(): bool
    {
        return self::getDriver() === 'sqlite';
    }

    /**
     * Проверить, является ли текущая БД MySQL
     */
    public static function isMysql(): bool
    {
        return self::getDriver() === 'mysql';
    }

    /**
     * Форматирование даты для GROUP BY по месяцам (YYYY-MM)
     * 
     * @param string $column Название колонки с датой
     * @return string SQL выражение
     */
    public static function dateFormatYearMonth(string $column): string
    {
        return match(self::getDriver()) {
            'sqlite' => "strftime('%Y-%m', {$column})",
            'mysql' => "DATE_FORMAT({$column}, '%Y-%m')",
            'pgsql' => "TO_CHAR({$column}, 'YYYY-MM')",
            default => "DATE_FORMAT({$column}, '%Y-%m')",
        };
    }

    /**
     * Форматирование даты для GROUP BY по дням (YYYY-MM-DD)
     * 
     * @param string $column Название колонки с датой
     * @return string SQL выражение
     */
    public static function dateFormatYearMonthDay(string $column): string
    {
        return match(self::getDriver()) {
            'sqlite' => "strftime('%Y-%m-%d', {$column})",
            'mysql' => "DATE_FORMAT({$column}, '%Y-%m-%d')",
            'pgsql' => "TO_CHAR({$column}, 'YYYY-MM-DD')",
            default => "DATE_FORMAT({$column}, '%Y-%m-%d')",
        };
    }

    /**
     * Извлечение месяца из даты
     * 
     * @param string $column Название колонки с датой
     * @return string SQL выражение
     */
    public static function extractMonth(string $column): string
    {
        return match(self::getDriver()) {
            'sqlite' => "strftime('%m', {$column})",
            'mysql' => "MONTH({$column})",
            'pgsql' => "EXTRACT(MONTH FROM {$column})",
            default => "MONTH({$column})",
        };
    }

    /**
     * Извлечение года из даты
     * 
     * @param string $column Название колонки с датой
     * @return string SQL выражение
     */
    public static function extractYear(string $column): string
    {
        return match(self::getDriver()) {
            'sqlite' => "strftime('%Y', {$column})",
            'mysql' => "YEAR({$column})",
            'pgsql' => "EXTRACT(YEAR FROM {$column})",
            default => "YEAR({$column})",
        };
    }

    /**
     * Конкатенация строк
     * 
     * @param array $parts Части для конкатенации
     * @return string SQL выражение
     */
    public static function concat(array $parts): string
    {
        $partsStr = implode(', ', $parts);
        
        return match(self::getDriver()) {
            'sqlite' => implode(' || ', $parts),
            'mysql' => "CONCAT({$partsStr})",
            'pgsql' => implode(' || ', $parts), // PostgreSQL поддерживает ||
            default => "CONCAT({$partsStr})",
        };
    }

    /**
     * LIKE запрос (регистронезависимый)
     * Возвращает оператор и модифицированное значение
     * 
     * @param string $value Значение для поиска
     * @return array ['operator' => string, 'value' => string]
     */
    public static function ilike(string $value): array
    {
        if (self::isPostgres()) {
            return [
                'operator' => 'ILIKE',
                'value' => $value,
            ];
        }
        
        // SQLite и MySQL - LIKE регистронезависим по умолчанию
        return [
            'operator' => 'LIKE',
            'value' => $value,
        ];
    }

    /**
     * Применить LIKE запрос к query builder
     * 
     * Безопасно работает с текстовыми колонками.
     * Для PostgreSQL использует ILIKE (регистронезависимый поиск).
     * 
     * ВАЖНО: Используйте только для текстовых колонок (varchar, text).
     * Для нетекстовых колонок PostgreSQL может выдать ошибку.
     * 
     * @param \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder $query
     * @param string $column Название колонки (должна быть текстовой)
     * @param string $value Значение для поиска (будет экранировано через prepared statement)
     * @param string $boolean 'and' или 'or'
     * @param bool $castToText Принудительно привести к тексту (для нетекстовых колонок)
     * @return \Illuminate\Database\Query\Builder|\Illuminate\Database\Eloquent\Builder
     */
    public static function whereLike($query, string $column, string $value, string $boolean = 'and', bool $castToText = false)
    {
        $like = self::ilike($value);
        
        // Для PostgreSQL можно принудительно привести к тексту
        $columnExpr = $column;
        if ($castToText && self::isPostgres()) {
            $columnExpr = "CAST({$column} AS TEXT)";
        }
        
        if ($boolean === 'or') {
            return $query->orWhereRaw("{$columnExpr} {$like['operator']} ?", [$like['value']]);
        }
        
        return $query->whereRaw("{$columnExpr} {$like['operator']} ?", [$like['value']]);
    }

    /**
     * Получить SQL для фильтрации по месяцу и году
     * 
     * @param string $column Название колонки с датой
     * @param int $month Месяц (1-12)
     * @param int $year Год
     * @return array ['sql' => string, 'bindings' => array]
     */
    public static function whereMonthYear(string $column, int $month, int $year): array
    {
        $monthPadded = str_pad($month, 2, '0', STR_PAD_LEFT);
        
        return match(self::getDriver()) {
            'sqlite' => [
                'sql' => "strftime('%m', {$column}) = ? AND strftime('%Y', {$column}) = ?",
                'bindings' => [$monthPadded, (string)$year],
            ],
            'mysql' => [
                'sql' => "MONTH({$column}) = ? AND YEAR({$column}) = ?",
                'bindings' => [$month, $year],
            ],
            'pgsql' => [
                'sql' => "EXTRACT(MONTH FROM {$column}) = ? AND EXTRACT(YEAR FROM {$column}) = ?",
                'bindings' => [$month, $year],
            ],
            default => [
                'sql' => "MONTH({$column}) = ? AND YEAR({$column}) = ?",
                'bindings' => [$month, $year],
            ],
        };
    }

    /**
     * Получить raw SQL для SUM с COALESCE
     * 
     * @param string $primary Основная колонка
     * @param string $fallback Запасная колонка
     * @param string $alias Алиас результата
     * @return string SQL выражение
     */
    public static function sumCoalesce(string $primary, string $fallback, string $alias = 'amount'): string
    {
        return "SUM(COALESCE({$primary}, {$fallback})) as {$alias}";
    }

    /**
     * Получить raw SQL для COUNT DISTINCT с COALESCE для уникальных клиентов
     * 
     * @param string $userIdColumn Колонка с user_id
     * @param string $clientNameColumn Колонка с именем клиента
     * @param string $alias Алиас результата
     * @return string SQL выражение
     */
    public static function countDistinctClients(string $userIdColumn = 'user_id', string $clientNameColumn = 'client_name', string $alias = 'count'): string
    {
        $driver = self::getDriver();
        
        // Для PostgreSQL нужно привести user_id к тексту, так как он bigint
        if ($driver === 'pgsql') {
            $userIdCast = "CAST({$userIdColumn} AS TEXT)";
            $concat = "'unregistered_' || {$clientNameColumn}";
            return "COUNT(DISTINCT COALESCE({$userIdCast}, {$concat})) as {$alias}";
        } elseif ($driver === 'mysql') {
            $concat = "CONCAT('unregistered_', {$clientNameColumn})";
            return "COUNT(DISTINCT COALESCE({$userIdColumn}, {$concat})) as {$alias}";
        } else {
            // SQLite - автоматически приводит типы
            $concat = "'unregistered_' || {$clientNameColumn}";
            return "COUNT(DISTINCT COALESCE({$userIdColumn}, {$concat})) as {$alias}";
        }
    }
}

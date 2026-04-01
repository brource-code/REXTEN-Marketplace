<?php

/**
 * Скрипт для проверки валидности JSON данных перед миграцией на PostgreSQL
 * 
 * Запуск: php artisan tinker < database/scripts/validate_json_before_migration.php
 * или: php database/scripts/validate_json_before_migration.php (из корня проекта с bootstrap)
 */

// Если запускается напрямую, подключаем Laravel
if (!function_exists('app')) {
    require_once __DIR__ . '/../../vendor/autoload.php';
    $app = require_once __DIR__ . '/../../bootstrap/app.php';
    $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
}

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "=== Проверка валидности JSON данных ===\n\n";

$tables = [
    'advertisements' => ['services', 'team', 'portfolio', 'schedule', 'moderation_categories'],
    'salary_calculations' => ['calculation_details'],
];

$hasErrors = false;
$totalChecked = 0;
$totalInvalid = 0;

foreach ($tables as $table => $columns) {
    if (!Schema::hasTable($table)) {
        echo "⚠️  Таблица '{$table}' не существует, пропускаем\n";
        continue;
    }
    
    echo "📋 Таблица: {$table}\n";
    
    foreach ($columns as $column) {
        if (!Schema::hasColumn($table, $column)) {
            echo "   ⚠️  Колонка '{$column}' не существует, пропускаем\n";
            continue;
        }
        
        // Получаем все записи с непустыми значениями
        $rows = DB::table($table)
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->where($column, '!=', 'null')
            ->select(['id', $column])
            ->get();
        
        $totalChecked += $rows->count();
        $invalidRows = [];
        
        foreach ($rows as $row) {
            $value = $row->{$column};
            
            // Пробуем декодировать JSON
            $decoded = json_decode($value);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                $invalidRows[] = [
                    'id' => $row->id,
                    'error' => json_last_error_msg(),
                    'value' => mb_substr($value, 0, 100) . (mb_strlen($value) > 100 ? '...' : ''),
                ];
            }
        }
        
        if (empty($invalidRows)) {
            echo "   ✅ {$column}: {$rows->count()} записей - OK\n";
        } else {
            $hasErrors = true;
            $totalInvalid += count($invalidRows);
            echo "   ❌ {$column}: " . count($invalidRows) . " из {$rows->count()} записей с невалидным JSON:\n";
            
            foreach (array_slice($invalidRows, 0, 5) as $invalid) {
                echo "      - ID {$invalid['id']}: {$invalid['error']}\n";
                echo "        Значение: {$invalid['value']}\n";
            }
            
            if (count($invalidRows) > 5) {
                echo "      ... и ещё " . (count($invalidRows) - 5) . " записей\n";
            }
        }
    }
    
    echo "\n";
}

echo "=== Итог ===\n";
echo "Проверено записей: {$totalChecked}\n";

if ($hasErrors) {
    echo "❌ Найдено невалидных записей: {$totalInvalid}\n";
    echo "\n⚠️  ВНИМАНИЕ: Перед миграцией на PostgreSQL необходимо исправить невалидные JSON данные!\n";
    echo "\nВарианты исправления:\n";
    echo "1. Вручную исправить данные в SQLite\n";
    echo "2. Установить NULL для невалидных записей:\n";
    echo "   UPDATE table SET column = NULL WHERE id IN (...);\n";
    echo "3. Удалить невалидные записи (если они не нужны)\n";
    exit(1);
} else {
    echo "✅ Все JSON данные валидны! Можно приступать к миграции.\n";
    exit(0);
}

<?php

require __DIR__.'/../../vendor/autoload.php';

use Illuminate\Container\Container;
use Illuminate\Database\Capsule\Manager as Capsule;

// Load environment variables
try {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__.'/../../');
    $dotenv->load();
} catch (Dotenv\Exception\InvalidPathException $e) {
    // .env not found, assume environment variables are set
}

// Configure SQLite connection
$sqliteCapsule = new Capsule;
$sqliteCapsule->addConnection([
    'driver'    => 'sqlite',
    'database'  => __DIR__.'/../../database/database.sqlite',
    'prefix'    => '',
], 'sqlite');
$sqliteCapsule->setAsGlobal();
$sqliteCapsule->bootEloquent();

// Configure PostgreSQL connection
$pgsqlCapsule = new Capsule;
$pgsqlCapsule->addConnection([
    'driver'    => 'pgsql',
    'host'      => env('DB_HOST', '127.0.0.1'),
    'port'      => env('DB_PORT', '5432'),
    'database'  => env('DB_DATABASE', 'ecme_marketplace'),
    'username'  => env('DB_USERNAME', 'postgres'),
    'password'  => env('DB_PASSWORD', ''),
    'charset'   => 'utf8',
    'prefix'    => '',
], 'pgsql');
$pgsqlCapsule->setAsGlobal();
$pgsqlCapsule->bootEloquent();

$sqliteDb = $sqliteCapsule->getConnection('sqlite');
$pgsqlDb = $pgsqlCapsule->getConnection('pgsql');

echo "=== ДЕТАЛЬНОЕ СРАВНЕНИЕ СХЕМ ===\n\n";

// Получаем список таблиц из SQLite
$sqliteTables = $sqliteDb->select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
$sqliteTableNames = array_column($sqliteTables, 'name');

$allDifferences = [];
$migrationSQL = [];

foreach ($sqliteTableNames as $table) {
    // SQLite колонки
    $sqliteCols = $sqliteDb->select("PRAGMA table_info({$table})");
    $sqliteColMap = [];
    foreach ($sqliteCols as $col) {
        $sqliteColMap[$col->name] = $col;
    }
    
    // PostgreSQL колонки
    $pgsqlCols = $pgsqlDb->select("
        SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = ?
        ORDER BY ordinal_position
    ", [$table]);
    
    if (empty($pgsqlCols)) {
        echo "⚠️  Таблица {$table} отсутствует в PostgreSQL\n";
        continue;
    }
    
    $pgsqlColMap = [];
    foreach ($pgsqlCols as $col) {
        $pgsqlColMap[$col->column_name] = $col;
    }
    
    $missing = array_diff(array_keys($sqliteColMap), array_keys($pgsqlColMap));
    
    if (!empty($missing)) {
        echo "\n=== Таблица: {$table} ===\n";
        $allDifferences[$table] = [];
        
        foreach ($missing as $colName) {
            $colInfo = $sqliteColMap[$colName];
            $type = $colInfo->type;
            $notNull = $colInfo->notnull ? 'NOT NULL' : 'NULL';
            $default = $colInfo->dflt_value ?? null;
            
            // Преобразуем типы SQLite в PostgreSQL
            $pgType = match(true) {
                stripos($type, 'INTEGER') !== false && stripos($type, 'BIGINT') === false => 'bigint',
                stripos($type, 'TINYINT') !== false => 'smallint',
                stripos($type, 'VARCHAR') !== false => 'character varying(255)',
                stripos($type, 'TEXT') !== false => 'text',
                stripos($type, 'DATETIME') !== false => 'timestamp without time zone',
                stripos($type, 'TIMESTAMP') !== false => 'timestamp without time zone',
                stripos($type, 'DATE') !== false => 'date',
                stripos($type, 'TIME') !== false => 'time without time zone',
                stripos($type, 'DECIMAL') !== false || stripos($type, 'NUMERIC') !== false => 'numeric(10,2)',
                stripos($type, 'BOOLEAN') !== false || stripos($type, 'tinyint(1)') !== false => 'boolean',
                default => 'text'
            };
            
            // Обработка default значений
            $defaultClause = '';
            if ($default !== null) {
                if (is_numeric($default)) {
                    $defaultClause = " DEFAULT {$default}";
                } elseif (strtolower($default) === 'null') {
                    $defaultClause = '';
                } else {
                    $defaultClause = " DEFAULT '{$default}'";
                }
            }
            
            echo "  ❌ Отсутствует: {$colName} ({$pgType} {$notNull}{$defaultClause})\n";
            
            $allDifferences[$table][$colName] = [
                'type' => $pgType,
                'notnull' => $notNull,
                'default' => $defaultClause
            ];
            
            $migrationSQL[] = "ALTER TABLE {$table} ADD COLUMN {$colName} {$pgType} {$notNull}{$defaultClause};";
        }
    }
}

if (empty($allDifferences)) {
    echo "✅ Все колонки на месте!\n";
} else {
    echo "\n\n=== SQL ДЛЯ ВОССТАНОВЛЕНИЯ СТРУКТУРЫ ===\n\n";
    foreach ($migrationSQL as $sql) {
        echo $sql . "\n";
    }
    
    // Сохраняем в файл
    file_put_contents(__DIR__ . '/restore_missing_columns.sql', implode("\n", $migrationSQL));
    echo "\n✅ SQL сохранен в: database/scripts/restore_missing_columns.sql\n";
}

<?php

require __DIR__.'/../../vendor/autoload.php';

use Illuminate\Container\Container;
use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Support\Facades\DB;

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
]);
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
]);
$pgsqlCapsule->setAsGlobal();
$pgsqlCapsule->bootEloquent();

echo "=== СРАВНЕНИЕ СХЕМ SQLite и PostgreSQL ===\n\n";

// Получаем список таблиц из SQLite
$sqliteDb = $sqliteCapsule->getConnection('default');
$sqliteTables = $sqliteDb->select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
$sqliteTableNames = array_column($sqliteTables, 'name');

// Получаем список таблиц из PostgreSQL
$pgsqlDb = $pgsqlCapsule->getConnection('default');
$pgsqlTables = $pgsqlDb->select("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name");
$pgsqlTableNames = array_column($pgsqlTables, 'table_name');

echo "SQLite таблиц: " . count($sqliteTableNames) . "\n";
echo "PostgreSQL таблиц: " . count($pgsqlTableNames) . "\n\n";

$missingInPg = array_diff($sqliteTableNames, $pgsqlTableNames);
if (!empty($missingInPg)) {
    echo "❌ Отсутствуют в PostgreSQL: " . implode(', ', $missingInPg) . "\n\n";
}

// Сравниваем колонки для каждой таблицы
$differences = [];
$migrations = [];

foreach ($sqliteTableNames as $table) {
    if (!in_array($table, $pgsqlTableNames)) {
        continue;
    }
    
    // SQLite колонки
    $sqliteCols = $sqliteDb->select("PRAGMA table_info({$table})");
    $sqliteColNames = array_column($sqliteCols, 'name');
    $sqliteColMap = [];
    foreach ($sqliteCols as $col) {
        $sqliteColMap[$col->name] = $col;
    }
    
    // PostgreSQL колонки
    $pgsqlCols = $pgsqlDb->select("
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = ?
        ORDER BY ordinal_position
    ", [$table]);
    $pgsqlColNames = array_column($pgsqlCols, 'column_name');
    
    $missing = array_diff($sqliteColNames, $pgsqlColNames);
    if (!empty($missing)) {
        $differences[$table] = [];
        foreach ($missing as $colName) {
            $colInfo = $sqliteColMap[$colName];
            $differences[$table][$colName] = $colInfo;
        }
    }
}

if (!empty($differences)) {
    echo "=== ОТСУТСТВУЮЩИЕ КОЛОНКИ ===\n\n";
    foreach ($differences as $table => $cols) {
        echo "Таблица: {$table}\n";
        foreach ($cols as $colName => $colInfo) {
            $type = $colInfo->type;
            $notNull = $colInfo->notnull ? 'NOT NULL' : 'NULL';
            $default = $colInfo->dflt_value ?? null;
            
            // Преобразуем типы SQLite в PostgreSQL
            $pgType = match(true) {
                stripos($type, 'INTEGER') !== false => 'bigint',
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
            
            $defaultClause = $default !== null ? " DEFAULT " . (is_numeric($default) ? $default : "'{$default}'") : "";
            
            echo "  - {$colName}: {$pgType} {$notNull}{$defaultClause}\n";
            
            $migrations[] = "ALTER TABLE {$table} ADD COLUMN {$colName} {$pgType} {$notNull}{$defaultClause};";
        }
        echo "\n";
    }
    
    echo "\n=== SQL ДЛЯ ДОБАВЛЕНИЯ КОЛОНОК ===\n\n";
    foreach ($migrations as $sql) {
        echo $sql . "\n";
    }
} else {
    echo "✅ Все колонки на месте!\n";
}

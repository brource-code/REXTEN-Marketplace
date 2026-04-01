<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Миграция для обновления JSON колонок на JSONB для PostgreSQL
 * 
 * JSONB более производительный для запросов и индексирования в PostgreSQL.
 * Для SQLite и MySQL эта миграция ничего не делает.
 * 
 * ⚠️ ВАЖНО: Перед запуском убедитесь, что все JSON данные валидны!
 * Невалидный JSON приведёт к ошибке миграции.
 * 
 * Проверка валидности JSON перед миграцией:
 * php artisan tinker --execute="
 *   \$tables = ['advertisements' => ['services', 'team', 'portfolio', 'schedule', 'moderation_categories'], 'salary_calculations' => ['calculation_details']];
 *   foreach (\$tables as \$table => \$columns) {
 *     foreach (\$columns as \$col) {
 *       \$invalid = DB::table(\$table)->whereNotNull(\$col)->get()->filter(fn(\$r) => json_decode(\$r->{\$col}) === null && \$r->{\$col} !== 'null');
 *       if (\$invalid->count()) echo \"Invalid JSON in {\$table}.{\$col}: \" . \$invalid->count() . \" rows\n\";
 *     }
 *   }
 * "
 */
return new class extends Migration
{
    /**
     * Безопасная конвертация колонки в JSONB с обработкой NULL и пустых значений
     */
    private function safeConvertToJsonb(string $table, string $column): void
    {
        if (!Schema::hasTable($table) || !Schema::hasColumn($table, $column)) {
            return;
        }

        // Сначала заменяем пустые строки и невалидные значения на NULL
        // В PostgreSQL JSON нельзя сравнивать с текстом напрямую, используем CAST
        DB::statement("UPDATE {$table} SET {$column} = NULL WHERE {$column}::text = '' OR {$column}::text = 'null' OR {$column}::text = '\"\"'");
        
        // Конвертируем в JSONB
        // COALESCE обрабатывает NULL значения, 'null'::jsonb создаёт JSON null
        DB::statement("ALTER TABLE {$table} ALTER COLUMN {$column} TYPE jsonb USING COALESCE({$column}::jsonb, 'null'::jsonb)");
    }

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Эта миграция применяется только для PostgreSQL
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        // Конвертируем JSON колонки в JSONB для лучшей производительности
        
        // advertisements table
        $this->safeConvertToJsonb('advertisements', 'services');
        $this->safeConvertToJsonb('advertisements', 'team');
        $this->safeConvertToJsonb('advertisements', 'portfolio');
        $this->safeConvertToJsonb('advertisements', 'schedule');
        $this->safeConvertToJsonb('advertisements', 'moderation_categories');

        // salary_calculations table
        $this->safeConvertToJsonb('salary_calculations', 'calculation_details');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Эта миграция применяется только для PostgreSQL
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        // Конвертируем JSONB обратно в JSON
        
        // advertisements table
        if (Schema::hasTable('advertisements')) {
            if (Schema::hasColumn('advertisements', 'services')) {
                DB::statement('ALTER TABLE advertisements ALTER COLUMN services TYPE json USING services::json');
            }
            if (Schema::hasColumn('advertisements', 'team')) {
                DB::statement('ALTER TABLE advertisements ALTER COLUMN team TYPE json USING team::json');
            }
            if (Schema::hasColumn('advertisements', 'portfolio')) {
                DB::statement('ALTER TABLE advertisements ALTER COLUMN portfolio TYPE json USING portfolio::json');
            }
            if (Schema::hasColumn('advertisements', 'schedule')) {
                DB::statement('ALTER TABLE advertisements ALTER COLUMN schedule TYPE json USING schedule::json');
            }
            if (Schema::hasColumn('advertisements', 'moderation_categories')) {
                DB::statement('ALTER TABLE advertisements ALTER COLUMN moderation_categories TYPE json USING moderation_categories::json');
            }
        }

        // salary_calculations table
        if (Schema::hasTable('salary_calculations')) {
            if (Schema::hasColumn('salary_calculations', 'calculation_details')) {
                DB::statement('ALTER TABLE salary_calculations ALTER COLUMN calculation_details TYPE json USING calculation_details::json');
            }
        }
    }
};

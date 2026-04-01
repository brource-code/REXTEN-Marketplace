<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasColumn('recurring_booking_chains', 'frequency')) {
            // Изменяем enum на string для большей гибкости (если это PostgreSQL)
            try {
                DB::statement("ALTER TABLE recurring_booking_chains ALTER COLUMN frequency TYPE VARCHAR(50)");
            } catch (\Exception $e) {
                // Если не PostgreSQL или уже VARCHAR, пропускаем
            }
        }
        
        // Добавляем поле interval_days для гибких интервалов (каждые N дней)
        if (!Schema::hasColumn('recurring_booking_chains', 'interval_days')) {
            Schema::table('recurring_booking_chains', function (Blueprint $table) {
                $table->integer('interval_days')->nullable()->after('frequency'); // Для daily, every_n_days, etc.
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('recurring_booking_chains', function (Blueprint $table) {
            $table->dropColumn('interval_days');
        });
        
        // Возвращаем enum (только для PostgreSQL)
        DB::statement("ALTER TABLE recurring_booking_chains ALTER COLUMN frequency TYPE VARCHAR(50)");
    }
};

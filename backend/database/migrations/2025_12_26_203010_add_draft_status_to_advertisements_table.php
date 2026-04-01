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
        $driver = DB::getDriverName();
        
        if ($driver === 'sqlite') {
            // SQLite не поддерживает MODIFY COLUMN для enum
            // В SQLite статус хранится как VARCHAR, поэтому просто проверяем, что значение валидно
            // Ничего не делаем, так как SQLite не имеет строгой проверки enum
        } else {
            // Для MySQL/PostgreSQL
            if ($driver === 'pgsql') {
                // PostgreSQL не поддерживает MODIFY, используем ALTER COLUMN
                // ENUM в PostgreSQL создаётся как тип, но проще использовать VARCHAR с CHECK
                DB::statement("ALTER TABLE advertisements ALTER COLUMN status TYPE VARCHAR(255)");
                DB::statement("ALTER TABLE advertisements ALTER COLUMN status SET DEFAULT 'pending'");
                // Добавляем CHECK constraint для валидации значений (если ещё нет)
                DB::statement("ALTER TABLE advertisements DROP CONSTRAINT IF EXISTS advertisements_status_check");
                DB::statement("ALTER TABLE advertisements ADD CONSTRAINT advertisements_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'inactive', 'draft'))");
            } else {
                // MySQL синтаксис
                DB::statement("ALTER TABLE advertisements MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'active', 'inactive', 'draft') DEFAULT 'pending'");
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();
        
        if ($driver === 'sqlite') {
            // SQLite не требует отката
        } else {
            // Возвращаем enum к исходному состоянию (без 'draft')
            // Сначала обновляем все 'draft' на 'pending'
            DB::statement("UPDATE advertisements SET status = 'pending' WHERE status = 'draft'");
            
            if ($driver === 'pgsql') {
                // PostgreSQL
                DB::statement("ALTER TABLE advertisements DROP CONSTRAINT IF EXISTS advertisements_status_check");
                DB::statement("ALTER TABLE advertisements ADD CONSTRAINT advertisements_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'inactive'))");
            } else {
                // MySQL синтаксис
                DB::statement("ALTER TABLE advertisements MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'active', 'inactive') DEFAULT 'pending'");
            }
        }
    }
};

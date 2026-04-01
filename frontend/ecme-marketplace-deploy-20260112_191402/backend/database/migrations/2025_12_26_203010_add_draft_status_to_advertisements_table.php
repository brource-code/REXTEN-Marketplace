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
            // Для MySQL/MariaDB изменяем enum для добавления статуса 'draft' без потери данных
            DB::statement("ALTER TABLE advertisements MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'active', 'inactive', 'draft') DEFAULT 'pending'");
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
            // Затем изменяем enum
            DB::statement("ALTER TABLE advertisements MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'active', 'inactive') DEFAULT 'pending'");
        }
    }
};

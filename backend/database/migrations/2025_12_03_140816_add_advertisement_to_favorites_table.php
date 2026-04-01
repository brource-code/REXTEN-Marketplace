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
        // Для SQLite нужно пересоздать таблицу
        if (DB::getDriverName() === 'sqlite') {
            // Создаем временную таблицу с новым типом
            DB::statement('CREATE TABLE favorites_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                favoriteable_type VARCHAR(255) NOT NULL,
                favoriteable_id INTEGER NOT NULL,
                created_at TIMESTAMP NULL,
                updated_at TIMESTAMP NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, favoriteable_type, favoriteable_id)
            )');
            
            // Копируем данные
            DB::statement('INSERT INTO favorites_new SELECT * FROM favorites');
            
            // Удаляем старую таблицу
            DB::statement('DROP TABLE favorites');
            
            // Переименовываем новую таблицу
            DB::statement('ALTER TABLE favorites_new RENAME TO favorites');
        } else {
            // Для MySQL/PostgreSQL
            $driver = DB::connection()->getDriverName();
            if ($driver === 'pgsql') {
                // PostgreSQL синтаксис
                DB::statement("ALTER TABLE favorites ALTER COLUMN favoriteable_type TYPE VARCHAR(255)");
                DB::statement("ALTER TABLE favorites ALTER COLUMN favoriteable_type SET NOT NULL");
            } else {
                // MySQL синтаксис
                DB::statement("ALTER TABLE favorites MODIFY COLUMN favoriteable_type VARCHAR(255) NOT NULL");
            }
        }
        
        // Добавляем индекс для производительности
        Schema::table('favorites', function (Blueprint $table) {
            if (!Schema::hasIndex('favorites', ['favoriteable_type', 'favoriteable_id'])) {
                $table->index(['favoriteable_type', 'favoriteable_id']);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Возвращаем обратно enum (только для MySQL/PostgreSQL)
        $driver = DB::connection()->getDriverName();
        if ($driver !== 'sqlite') {
            if ($driver === 'pgsql') {
                // PostgreSQL не поддерживает ENUM напрямую, используем VARCHAR
                DB::statement("ALTER TABLE favorites ALTER COLUMN favoriteable_type TYPE VARCHAR(255)");
                DB::statement("ALTER TABLE favorites ALTER COLUMN favoriteable_type SET NOT NULL");
            } else {
                // MySQL синтаксис
                DB::statement("ALTER TABLE favorites MODIFY COLUMN favoriteable_type ENUM('service', 'business') NOT NULL");
            }
        }
        
        Schema::table('favorites', function (Blueprint $table) {
            $table->dropIndex(['favoriteable_type', 'favoriteable_id']);
        });
    }
};

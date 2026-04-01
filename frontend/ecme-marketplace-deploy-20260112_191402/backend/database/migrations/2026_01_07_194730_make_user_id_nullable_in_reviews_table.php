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
        // Для SQLite используем прямой SQL
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys=off;');
            // Удаляем временную таблицу, если она существует
            DB::statement('DROP TABLE IF EXISTS reviews_new;');
            DB::statement('CREATE TABLE reviews_new AS SELECT * FROM reviews;');
            DB::statement('DROP TABLE reviews;');
            DB::statement('CREATE TABLE reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                company_id INTEGER NOT NULL,
                service_id INTEGER,
                booking_id INTEGER,
                order_id INTEGER,
                advertisement_id INTEGER,
                rating INTEGER NOT NULL,
                comment TEXT,
                response TEXT,
                response_at TIMESTAMP,
                is_visible INTEGER DEFAULT 1,
                created_at TIMESTAMP,
                updated_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
                FOREIGN KEY (advertisement_id) REFERENCES advertisements(id) ON DELETE SET NULL
            );');
            DB::statement('INSERT INTO reviews SELECT * FROM reviews_new;');
            DB::statement('DROP TABLE reviews_new;');
            DB::statement('PRAGMA foreign_keys=on;');
        } else {
            Schema::table('reviews', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // Для SQLite откат сложнее, лучше не делать
            return;
        } else {
            Schema::table('reviews', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable(false)->change();
            });
        }
    }
};

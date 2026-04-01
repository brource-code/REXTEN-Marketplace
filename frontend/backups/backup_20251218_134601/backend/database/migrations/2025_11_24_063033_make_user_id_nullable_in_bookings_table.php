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
        DB::statement('PRAGMA foreign_keys=off;');
        DB::statement('CREATE TABLE bookings_new AS SELECT * FROM bookings;');
        DB::statement('DROP TABLE bookings;');
        DB::statement('CREATE TABLE bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            user_id INTEGER,
            service_id INTEGER NOT NULL,
            specialist_id INTEGER,
            booking_date DATETIME NOT NULL,
            booking_time TIME NOT NULL,
            duration_minutes INTEGER DEFAULT 60,
            price DECIMAL(10,2) NOT NULL,
            status VARCHAR(255) DEFAULT "pending",
            notes TEXT,
            client_notes TEXT,
            client_name VARCHAR(255),
            client_phone VARCHAR(255),
            client_email VARCHAR(255),
            cancelled_at TIMESTAMP,
            cancellation_reason TEXT,
            created_at TIMESTAMP,
            updated_at TIMESTAMP,
            deleted_at TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
            FOREIGN KEY (specialist_id) REFERENCES users(id) ON DELETE SET NULL
        );');
        DB::statement('INSERT INTO bookings SELECT * FROM bookings_new;');
        DB::statement('DROP TABLE bookings_new;');
        DB::statement('PRAGMA foreign_keys=on;');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable(false)->change();
        });
    }
};

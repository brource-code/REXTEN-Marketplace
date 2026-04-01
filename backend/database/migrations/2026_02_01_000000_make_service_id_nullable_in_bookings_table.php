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
        // Проверяем тип базы данных
        $driver = DB::getDriverName();
        
        if ($driver === 'sqlite') {
            // Для SQLite используем прямой SQL
            // Получаем список всех колонок из существующей таблицы
            $columns = DB::select("PRAGMA table_info(bookings)");
            $columnNames = array_map(function($col) {
                return $col->name;
            }, $columns);
            
            DB::statement('PRAGMA foreign_keys=off;');
            DB::statement('CREATE TABLE bookings_new AS SELECT * FROM bookings;');
            DB::statement('DROP TABLE bookings;');
            DB::statement('CREATE TABLE bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER NOT NULL,
                user_id INTEGER,
                service_id INTEGER,
                advertisement_id INTEGER,
                execution_type VARCHAR(255) DEFAULT "onsite",
                specialist_id INTEGER,
                team_member_id INTEGER,
                booking_date DATETIME NOT NULL,
                booking_time TIME NOT NULL,
                duration_minutes INTEGER DEFAULT 60,
                price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2),
                status VARCHAR(255) DEFAULT "new",
                notes TEXT,
                client_notes TEXT,
                client_name VARCHAR(255),
                client_phone VARCHAR(255),
                client_email VARCHAR(255),
                review_token VARCHAR(64),
                review_token_expires_at TIMESTAMP,
                cancelled_at TIMESTAMP,
                cancellation_reason TEXT,
                created_at TIMESTAMP,
                updated_at TIMESTAMP,
                deleted_at TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (specialist_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (advertisement_id) REFERENCES advertisements(id) ON DELETE SET NULL,
                FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE SET NULL
            );');
            
            // Копируем данные, указывая только существующие колонки
            $columnsStr = implode(', ', $columnNames);
            DB::statement("INSERT INTO bookings ({$columnsStr}) SELECT {$columnsStr} FROM bookings_new;");
            DB::statement('DROP TABLE bookings_new;');
            DB::statement('PRAGMA foreign_keys=on;');
        } else {
            // Для MySQL и PostgreSQL
            $driver = DB::connection()->getDriverName();
            if ($driver === 'pgsql') {
                // PostgreSQL синтаксис
                DB::statement('ALTER TABLE bookings ALTER COLUMN service_id DROP NOT NULL');
            } else {
                // MySQL синтаксис
                DB::statement('ALTER TABLE bookings MODIFY service_id BIGINT UNSIGNED NULL');
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
            // Для SQLite используем прямой SQL
            // Получаем список всех колонок из существующей таблицы
            $columns = DB::select("PRAGMA table_info(bookings)");
            $columnNames = array_map(function($col) {
                return $col->name;
            }, $columns);
            
            DB::statement('PRAGMA foreign_keys=off;');
            DB::statement('CREATE TABLE bookings_new AS SELECT * FROM bookings;');
            DB::statement('DROP TABLE bookings;');
            DB::statement('CREATE TABLE bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER NOT NULL,
                user_id INTEGER,
                service_id INTEGER NOT NULL,
                advertisement_id INTEGER,
                execution_type VARCHAR(255) DEFAULT "onsite",
                specialist_id INTEGER,
                team_member_id INTEGER,
                booking_date DATETIME NOT NULL,
                booking_time TIME NOT NULL,
                duration_minutes INTEGER DEFAULT 60,
                price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2),
                status VARCHAR(255) DEFAULT "new",
                notes TEXT,
                client_notes TEXT,
                client_name VARCHAR(255),
                client_phone VARCHAR(255),
                client_email VARCHAR(255),
                review_token VARCHAR(64),
                review_token_expires_at TIMESTAMP,
                cancelled_at TIMESTAMP,
                cancellation_reason TEXT,
                created_at TIMESTAMP,
                updated_at TIMESTAMP,
                deleted_at TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (specialist_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (advertisement_id) REFERENCES advertisements(id) ON DELETE SET NULL,
                FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE SET NULL
            );');
            
            // Копируем данные, указывая только существующие колонки
            $columnsStr = implode(', ', $columnNames);
            DB::statement("INSERT INTO bookings ({$columnsStr}) SELECT {$columnsStr} FROM bookings_new;");
            DB::statement('DROP TABLE bookings_new;');
            DB::statement('PRAGMA foreign_keys=on;');
        } else {
            // Для MySQL и других баз данных используем прямой SQL
            DB::statement('ALTER TABLE bookings MODIFY service_id BIGINT UNSIGNED NOT NULL');
        }
    }
};

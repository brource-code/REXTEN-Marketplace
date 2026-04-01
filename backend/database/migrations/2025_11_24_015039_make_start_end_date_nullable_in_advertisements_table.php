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
        // Для SQLite используем прямой SQL запрос
        if (DB::getDriverName() === 'sqlite') {
            // SQLite не поддерживает ALTER COLUMN напрямую, нужно пересоздать таблицу
            // Но для простоты используем DB::statement
            DB::statement('PRAGMA foreign_keys=off;');
            DB::statement('CREATE TABLE advertisements_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER,
                type VARCHAR(255) DEFAULT "advertisement",
                title VARCHAR(255) NOT NULL,
                description TEXT,
                image VARCHAR(255),
                link VARCHAR(255),
                placement VARCHAR(255) DEFAULT "homepage",
                start_date DATETIME,
                end_date DATETIME,
                impressions INTEGER DEFAULT 0,
                clicks INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                status VARCHAR(255),
                priority INTEGER DEFAULT 1,
                created_at DATETIME,
                updated_at DATETIME,
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
            );');
            DB::statement('INSERT INTO advertisements_new SELECT * FROM advertisements;');
            DB::statement('DROP TABLE advertisements;');
            DB::statement('ALTER TABLE advertisements_new RENAME TO advertisements;');
            DB::statement('PRAGMA foreign_keys=on;');
        } else {
            // Для других БД используем стандартный подход
            Schema::table('advertisements', function (Blueprint $table) {
                $table->dateTime('start_date')->nullable()->change();
                $table->dateTime('end_date')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // Для отката в SQLite нужно пересоздать таблицу с NOT NULL
            DB::statement('PRAGMA foreign_keys=off;');
            DB::statement('CREATE TABLE advertisements_old (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER,
                type VARCHAR(255) DEFAULT "advertisement",
                title VARCHAR(255) NOT NULL,
                description TEXT,
                image VARCHAR(255),
                link VARCHAR(255),
                placement VARCHAR(255) DEFAULT "homepage",
                start_date DATETIME NOT NULL,
                end_date DATETIME NOT NULL,
                impressions INTEGER DEFAULT 0,
                clicks INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                status VARCHAR(255),
                priority INTEGER DEFAULT 1,
                created_at DATETIME,
                updated_at DATETIME,
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
            );');
            DB::statement('INSERT INTO advertisements_old SELECT * FROM advertisements WHERE start_date IS NOT NULL AND end_date IS NOT NULL;');
            DB::statement('DROP TABLE advertisements;');
            DB::statement('ALTER TABLE advertisements_old RENAME TO advertisements;');
            DB::statement('PRAGMA foreign_keys=on;');
        } else {
            Schema::table('advertisements', function (Blueprint $table) {
                $table->dateTime('start_date')->nullable(false)->change();
                $table->dateTime('end_date')->nullable(false)->change();
            });
        }
    }
};

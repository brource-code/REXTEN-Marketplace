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
            DB::statement('DROP TABLE IF EXISTS users_new;');
            
            // Создаем новую таблицу с nullable email
            DB::statement('CREATE TABLE users_new AS SELECT * FROM users;');
            DB::statement('DROP TABLE users;');
            DB::statement('CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR,
                email_verified_at DATETIME,
                password VARCHAR NOT NULL,
                role VARCHAR CHECK (role IN (\'CLIENT\', \'BUSINESS_OWNER\', \'SUPERADMIN\')) NOT NULL DEFAULT \'CLIENT\',
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                is_blocked TINYINT(1) NOT NULL DEFAULT 0,
                remember_token VARCHAR,
                created_at DATETIME,
                updated_at DATETIME,
                deleted_at DATETIME,
                client_status VARCHAR NOT NULL DEFAULT \'regular\',
                google_id VARCHAR,
                provider VARCHAR
            );');
            
            // Копируем данные
            DB::statement('INSERT INTO users SELECT * FROM users_new;');
            DB::statement('DROP TABLE users_new;');
            
            // Создаем уникальный индекс на email только для не-null значений
            // В SQLite это делается через частичный индекс
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email) WHERE email IS NOT NULL;');
            
            DB::statement('PRAGMA foreign_keys=on;');
        } else {
            Schema::table('users', function (Blueprint $table) {
                $table->string('email')->nullable()->change();
            });
            
            // Удаляем старый уникальный индекс и создаем новый частичный
            Schema::table('users', function (Blueprint $table) {
                $table->dropUnique(['email']);
            });
            
            // Для MySQL/PostgreSQL создаем частичный уникальный индекс
            DB::statement('CREATE UNIQUE INDEX users_email_unique ON users(email) WHERE email IS NOT NULL;');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys=off;');
            DB::statement('DROP TABLE IF EXISTS users_new;');
            DB::statement('CREATE TABLE users_new AS SELECT * FROM users;');
            DB::statement('DROP TABLE users;');
            DB::statement('CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR NOT NULL,
                email_verified_at DATETIME,
                password VARCHAR NOT NULL,
                role VARCHAR CHECK (role IN (\'CLIENT\', \'BUSINESS_OWNER\', \'SUPERADMIN\')) NOT NULL DEFAULT \'CLIENT\',
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                is_blocked TINYINT(1) NOT NULL DEFAULT 0,
                remember_token VARCHAR,
                created_at DATETIME,
                updated_at DATETIME,
                deleted_at DATETIME,
                client_status VARCHAR NOT NULL DEFAULT \'regular\',
                google_id VARCHAR,
                provider VARCHAR
            );');
            DB::statement('INSERT INTO users SELECT * FROM users_new WHERE email IS NOT NULL;');
            DB::statement('DROP TABLE users_new;');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);');
            DB::statement('PRAGMA foreign_keys=on;');
        } else {
            DB::statement('DROP INDEX IF EXISTS users_email_unique;');
            Schema::table('users', function (Blueprint $table) {
                $table->string('email')->nullable(false)->change();
                $table->unique('email');
            });
        }
    }
};

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
        // Удаляем временную таблицу и индексы если они существуют (на случай повторного запуска)
        DB::statement('DROP INDEX IF EXISTS additional_services_new_service_id_index');
        DB::statement('DROP INDEX IF EXISTS additional_services_new_is_active_index');
        DB::statement('DROP TABLE IF EXISTS additional_services_new');
        
        // Пересоздать таблицу с NOT NULL для service_id (надежнее для SQLite)
        Schema::create('additional_services_new', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->nullable(false)->constrained('services')->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->integer('duration')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            
            // foreignId уже создает индекс, поэтому не нужно создавать его вручную
            $table->index('is_active');
        });
        
        // Скопировать данные (только записи с service_id)
        DB::statement('
            INSERT INTO additional_services_new 
            (id, service_id, name, description, price, duration, is_active, sort_order, created_at, updated_at)
            SELECT id, service_id, name, description, price, duration, is_active, sort_order, created_at, updated_at
            FROM additional_services
            WHERE service_id IS NOT NULL
        ');
        
        // Удалить внешний ключ перед удалением таблицы (для PostgreSQL)
        $driver = DB::connection()->getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE booking_additional_services DROP CONSTRAINT IF EXISTS booking_additional_services_additional_service_id_foreign');
        }
        
        Schema::dropIfExists('additional_services');
        Schema::rename('additional_services_new', 'additional_services');
        
        // Восстановить внешний ключ
        Schema::table('booking_additional_services', function (Blueprint $table) {
            $table->foreign('additional_service_id')->references('id')->on('additional_services')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Вернуть nullable для service_id
        Schema::table('additional_services', function (Blueprint $table) {
            $table->foreignId('service_id')->nullable()->change();
        });
    }
};


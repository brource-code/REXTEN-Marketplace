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
        // Проверяем, существуют ли колонки для удаления
        $columns = Schema::getColumnListing('additional_services');
        $hasAdvertisementId = in_array('advertisement_id', $columns);
        $hasServiceJsonId = in_array('service_json_id', $columns);
        
        // Если колонок нет, миграция уже выполнена или не нужна
        if (!$hasAdvertisementId && !$hasServiceJsonId) {
            return;
        }
        
        // SQLite НЕ поддерживает DROP COLUMN напрямую
        // Используем подход rename/create/copy/drop
        
        // Удаляем временную таблицу и индексы если они существуют (на случай повторного запуска)
        DB::statement('DROP INDEX IF EXISTS additional_services_new_service_id_index');
        DB::statement('DROP INDEX IF EXISTS additional_services_new_is_active_index');
        DB::statement('DROP TABLE IF EXISTS additional_services_new');
        
        // 1. Создать новую таблицу без ненужных колонок
        Schema::create('additional_services_new', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->nullable()->constrained('services')->onDelete('cascade');
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
        
        // 2. Скопировать данные (только нужные колонки)
        DB::statement('
            INSERT INTO additional_services_new 
            (id, service_id, name, description, price, duration, is_active, sort_order, created_at, updated_at)
            SELECT id, service_id, name, description, price, duration, is_active, sort_order, created_at, updated_at
            FROM additional_services
        ');
        
        // 3. Удалить старую таблицу
        Schema::dropIfExists('additional_services');
        
        // 4. Переименовать новую таблицу
        Schema::rename('additional_services_new', 'additional_services');
        
        // 5. Пересоздать foreign key для booking_additional_services (если нужно)
        // SQLite автоматически обновит ссылки при переименовании
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Восстановление колонок (для отката)
        Schema::table('additional_services', function (Blueprint $table) {
            $table->foreignId('advertisement_id')->nullable()->after('service_id')
                ->constrained('advertisements')->onDelete('cascade');
            $table->string('service_json_id')->nullable()->after('advertisement_id');
        });
    }
};


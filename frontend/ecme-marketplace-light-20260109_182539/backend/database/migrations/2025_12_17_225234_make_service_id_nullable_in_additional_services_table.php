<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Для SQLite нужно пересоздать таблицу, так как ALTER COLUMN не поддерживается
        if (config('database.default') === 'sqlite') {
            Schema::table('additional_services', function (Blueprint $table) {
                // SQLite не поддерживает изменение колонки напрямую
                // Нужно пересоздать таблицу
            });
            
            // Пересоздаем таблицу с nullable service_id
            Schema::rename('additional_services', 'additional_services_old');
            
            Schema::create('additional_services', function (Blueprint $table) {
                $table->id();
                $table->foreignId('service_id')->nullable()->constrained('services')->onDelete('cascade');
                $table->foreignId('advertisement_id')->nullable()->constrained('advertisements')->onDelete('cascade');
                $table->string('name');
                $table->text('description')->nullable();
                $table->decimal('price', 10, 2);
                $table->integer('duration')->nullable();
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });
            
            // Копируем данные из старой таблицы
            DB::statement('INSERT INTO additional_services SELECT * FROM additional_services_old');
            
            // Удаляем старую таблицу
            Schema::drop('additional_services_old');
        } else {
            // Для других БД используем стандартный ALTER
            Schema::table('additional_services', function (Blueprint $table) {
                $table->foreignId('service_id')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('additional_services', function (Blueprint $table) {
            $table->foreignId('service_id')->nullable(false)->change();
        });
    }
};

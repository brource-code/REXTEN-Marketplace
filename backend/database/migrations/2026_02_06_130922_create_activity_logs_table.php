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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('action', 50)->index(); // create, update, delete, approve, reject, block, login, logout
            $table->string('entity_type', 100)->index(); // Company, User, Advertisement, Category, Review, Settings, Booking
            $table->unsignedBigInteger('entity_id')->nullable()->index();
            $table->string('entity_name')->nullable(); // Название сущности для удобства
            $table->jsonb('old_values')->nullable(); // Старые значения (для update)
            $table->jsonb('new_values')->nullable(); // Новые значения
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->text('description')->nullable(); // Человекочитаемое описание
            $table->timestamps();
            
            // Индексы для быстрого поиска
            $table->index(['entity_type', 'entity_id']);
            $table->index(['user_id', 'created_at']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};

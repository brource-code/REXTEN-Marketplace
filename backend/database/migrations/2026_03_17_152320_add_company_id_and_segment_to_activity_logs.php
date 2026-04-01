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
        Schema::table('activity_logs', function (Blueprint $table) {
            // Связь с компанией (для фильтрации по компании)
            $table->unsignedBigInteger('company_id')->nullable()->after('user_id')->index();
            
            // Сегмент активности для группировки
            // admin - действия суперадмина
            // business - действия владельца бизнеса
            // client - действия клиента
            // system - системные действия
            $table->string('segment', 20)->default('system')->after('action')->index();
            
            // Категория действия для более детальной фильтрации
            // auth - авторизация (login, logout, register)
            // company - действия с компанией
            // booking - действия с бронированиями
            // user - действия с пользователями
            // advertisement - действия с объявлениями
            // review - действия с отзывами
            // payment - действия с платежами
            // settings - действия с настройками
            $table->string('category', 30)->nullable()->after('segment')->index();
            
            // Дополнительные метаданные
            $table->jsonb('metadata')->nullable()->after('description');
            
            // Индексы для быстрого поиска
            $table->index(['company_id', 'created_at']);
            $table->index(['segment', 'created_at']);
            $table->index(['category', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndex(['company_id', 'created_at']);
            $table->dropIndex(['segment', 'created_at']);
            $table->dropIndex(['category', 'created_at']);
            
            $table->dropColumn(['company_id', 'segment', 'category', 'metadata']);
        });
    }
};

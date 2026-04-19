<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Привязка пользователя к Telegram (бизнес-бот).
 * - telegram_chat_id: id личного чата с ботом (null — не подключен).
 * - telegram_username: @username из профиля Telegram (для UI).
 * - telegram_linked_at: момент успешной привязки.
 * - telegram_link_token / _expires_at: одноразовый токен для deep-link /start <token>.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('telegram_chat_id', 64)->nullable()->after('locale');
            $table->string('telegram_username', 64)->nullable()->after('telegram_chat_id');
            $table->timestamp('telegram_linked_at')->nullable()->after('telegram_username');
            $table->string('telegram_link_token', 64)->nullable()->after('telegram_linked_at');
            $table->timestamp('telegram_link_token_expires_at')->nullable()->after('telegram_link_token');

            $table->unique('telegram_chat_id', 'users_telegram_chat_id_unique');
            $table->unique('telegram_link_token', 'users_telegram_link_token_unique');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_telegram_chat_id_unique');
            $table->dropUnique('users_telegram_link_token_unique');
            $table->dropColumn([
                'telegram_chat_id',
                'telegram_username',
                'telegram_linked_at',
                'telegram_link_token',
                'telegram_link_token_expires_at',
            ]);
        });
    }
};

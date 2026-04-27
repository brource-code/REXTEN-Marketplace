<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Одноразовые напоминания о конце триала (письма за 3 и за 1 календарный день до даты окончания).
     */
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->timestamp('trial_reminder_3d_sent_at')->nullable()->after('trial_ends_at');
            $table->timestamp('trial_reminder_1d_sent_at')->nullable()->after('trial_reminder_3d_sent_at');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['trial_reminder_3d_sent_at', 'trial_reminder_1d_sent_at']);
        });
    }
};

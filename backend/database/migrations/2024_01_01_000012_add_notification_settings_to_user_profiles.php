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
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->boolean('notification_email')->default(true)->after('gender');
            $table->boolean('notification_sms')->default(false)->after('notification_email');
            $table->boolean('notification_telegram')->default(false)->after('notification_sms');
            $table->boolean('notification_push')->default(true)->after('notification_telegram');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'notification_email',
                'notification_sms',
                'notification_telegram',
                'notification_push',
            ]);
        });
    }
};


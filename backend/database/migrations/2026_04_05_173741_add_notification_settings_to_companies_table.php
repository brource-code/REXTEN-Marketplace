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
        Schema::table('companies', function (Blueprint $table) {
            $table->boolean('notification_email_enabled')->default(true)->after('loyalty_booking_count_rule');
            $table->boolean('notification_sms_enabled')->default(false)->after('notification_email_enabled');
            $table->boolean('notification_new_bookings')->default(true)->after('notification_sms_enabled');
            $table->boolean('notification_cancellations')->default(true)->after('notification_new_bookings');
            $table->boolean('notification_payments')->default(true)->after('notification_cancellations');
            $table->boolean('notification_reviews')->default(true)->after('notification_payments');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn([
                'notification_email_enabled',
                'notification_sms_enabled',
                'notification_new_bookings',
                'notification_cancellations',
                'notification_payments',
                'notification_reviews',
            ]);
        });
    }
};

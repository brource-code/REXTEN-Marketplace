<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->string('stripe_subscription_schedule_id')->nullable()->after('stripe_subscription_id');
            $table->index('stripe_subscription_schedule_id', 'subscriptions_stripe_schedule_id_idx');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex('subscriptions_stripe_schedule_id_idx');
            $table->dropColumn('stripe_subscription_schedule_id');
        });
    }
};

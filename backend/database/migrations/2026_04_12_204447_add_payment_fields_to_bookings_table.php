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
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('stripe_payment_intent_id', 255)->nullable()->after('promo_code_id');
            $table->string('payment_status', 20)->default('unpaid')->after('stripe_payment_intent_id');

            $table->index('stripe_payment_intent_id');
            $table->index('payment_status');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex(['stripe_payment_intent_id']);
            $table->dropIndex(['payment_status']);

            $table->dropColumn(['stripe_payment_intent_id', 'payment_status']);
        });
    }
};

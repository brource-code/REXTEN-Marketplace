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
            $table->string('stripe_account_id', 255)->nullable()->after('onboarding_version');
            $table->string('stripe_account_status', 20)->default('none')->after('stripe_account_id');
            $table->boolean('stripe_payouts_enabled')->default(false)->after('stripe_account_status');
            $table->boolean('stripe_charges_enabled')->default(false)->after('stripe_payouts_enabled');
            $table->timestamp('stripe_onboarding_completed_at')->nullable()->after('stripe_charges_enabled');
            $table->string('stripe_disabled_reason', 255)->nullable()->after('stripe_onboarding_completed_at');
            $table->boolean('has_active_dispute')->default(false)->after('stripe_disabled_reason');

            $table->index('stripe_account_id');
            $table->index('stripe_account_status');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropIndex(['stripe_account_id']);
            $table->dropIndex(['stripe_account_status']);

            $table->dropColumn([
                'stripe_account_id',
                'stripe_account_status',
                'stripe_payouts_enabled',
                'stripe_charges_enabled',
                'stripe_onboarding_completed_at',
                'stripe_disabled_reason',
                'has_active_dispute',
            ]);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_plans', function (Blueprint $table) {
            // Lazy-кэш ID Stripe Product/Price для плана.
            // Создаются при первом checkout этого плана и переиспользуются.
            $table->string('stripe_product_id', 100)->nullable()->after('color');
            $table->string('stripe_price_id_monthly', 100)->nullable()->after('stripe_product_id');
            $table->string('stripe_price_id_yearly', 100)->nullable()->after('stripe_price_id_monthly');
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            // Источник истины для отмены — Stripe (`cancel_at_period_end`).
            // Дублируем локально для UI и фильтров без обращения к Stripe.
            $table->boolean('cancel_at_period_end')->default(false)->after('canceled_at');
            $table->string('stripe_customer_id', 100)->nullable()->after('stripe_subscription_id');
            $table->string('stripe_price_id', 100)->nullable()->after('stripe_customer_id');
            $table->index('stripe_subscription_id');
        });
    }

    public function down(): void
    {
        Schema::table('subscription_plans', function (Blueprint $table) {
            $table->dropColumn(['stripe_product_id', 'stripe_price_id_monthly', 'stripe_price_id_yearly']);
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['stripe_subscription_id']);
            $table->dropColumn(['cancel_at_period_end', 'stripe_customer_id', 'stripe_price_id']);
        });
    }
};

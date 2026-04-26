<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Тариф Professional: $39.99/мес и $249/год (в Stripe unit_amount в центах).
 * Обнуляем сохранённые stripe_price_id_* — при следующем checkout StripeSubscriptionService::ensurePrice()
 * создаст новые Price на том же Product с актуальными суммами из БД.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('subscription_plans')
            ->where('slug', 'professional')
            ->update([
                'price_monthly_cents' => 3999,
                'price_yearly_cents' => 24900,
                'stripe_price_id_monthly' => null,
                'stripe_price_id_yearly' => null,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('subscription_plans')
            ->where('slug', 'professional')
            ->update([
                'price_monthly_cents' => 7900,
                'price_yearly_cents' => 79000,
                'stripe_price_id_monthly' => null,
                'stripe_price_id_yearly' => null,
                'updated_at' => now(),
            ]);
    }
};

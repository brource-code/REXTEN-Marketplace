<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Тарифы: Starter $39/мес, Professional $99/мес, Enterprise $249/мес.
 * Год — ×10 от месяца (как в исходном сидере планов).
 * Обнуляем stripe_price_id_* — ensurePrice() создаст новые Price в Stripe.
 */
return new class extends Migration
{
    public function up(): void
    {
        $rows = [
            'starter' => ['price_monthly_cents' => 3900, 'price_yearly_cents' => 39000],
            'professional' => ['price_monthly_cents' => 9900, 'price_yearly_cents' => 99000],
            'enterprise' => ['price_monthly_cents' => 24900, 'price_yearly_cents' => 249000],
        ];

        foreach ($rows as $slug => $prices) {
            DB::table('subscription_plans')
                ->where('slug', $slug)
                ->update(array_merge($prices, [
                    'stripe_price_id_monthly' => null,
                    'stripe_price_id_yearly' => null,
                    'updated_at' => now(),
                ]));
        }
    }

    public function down(): void
    {
        $rows = [
            'starter' => ['price_monthly_cents' => 2900, 'price_yearly_cents' => 29000],
            'professional' => ['price_monthly_cents' => 3999, 'price_yearly_cents' => 24900],
            'enterprise' => ['price_monthly_cents' => 19900, 'price_yearly_cents' => 199000],
        ];

        foreach ($rows as $slug => $prices) {
            DB::table('subscription_plans')
                ->where('slug', $slug)
                ->update(array_merge($prices, [
                    'stripe_price_id_monthly' => null,
                    'stripe_price_id_yearly' => null,
                    'updated_at' => now(),
                ]));
        }
    }
};

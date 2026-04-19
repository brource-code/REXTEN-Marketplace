<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Добавляем boolean-фичу `routes` ко всем существующим планам.
     * Включаем её только на professional и enterprise — это платная функция
     * (страница «Маршруты» в бизнес-кабинете).
     */
    public function up(): void
    {
        $map = [
            'free' => false,
            'starter' => false,
            'professional' => true,
            'enterprise' => true,
        ];

        $plans = DB::table('subscription_plans')->get(['id', 'slug', 'features']);

        foreach ($plans as $plan) {
            $features = json_decode((string) $plan->features, true);
            if (!is_array($features)) {
                $features = [];
            }

            // Если фича уже есть и админ поставил вручную — не перетираем.
            if (array_key_exists('routes', $features)) {
                continue;
            }

            $features['routes'] = $map[$plan->slug] ?? false;

            DB::table('subscription_plans')
                ->where('id', $plan->id)
                ->update([
                    'features' => json_encode($features),
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        $plans = DB::table('subscription_plans')->get(['id', 'features']);

        foreach ($plans as $plan) {
            $features = json_decode((string) $plan->features, true);
            if (!is_array($features) || !array_key_exists('routes', $features)) {
                continue;
            }
            unset($features['routes']);

            DB::table('subscription_plans')
                ->where('id', $plan->id)
                ->update([
                    'features' => json_encode($features),
                    'updated_at' => now(),
                ]);
        }
    }
};

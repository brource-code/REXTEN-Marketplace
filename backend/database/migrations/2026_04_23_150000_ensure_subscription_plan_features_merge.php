<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Восстанавливает отсутствующие ключи в subscription_plans.features.
 *
 * Сценарий: миграция add_ai_limits при json_decode === null подставляла [] и
 * перезаписывала JSON только ai_max_*, затирая routes, analytics, лимиты и т.д.
 * Здесь для известных slug мержим **только отсутствующие** ключи, не трогая
 * кастомные правки в БД.
 */
return new class extends Migration
{
    public function up(): void
    {
        $canonical = [
            'free' => [
                'max_team_members' => 1,
                'max_services' => 5,
                'max_advertisements' => 1,
                'analytics' => false,
                'priority_support' => false,
                'api_access' => false,
                'routes' => false,
            ],
            'starter' => [
                'max_team_members' => 3,
                'max_services' => 20,
                'max_advertisements' => 5,
                'analytics' => false,
                'priority_support' => false,
                'api_access' => false,
                'routes' => false,
            ],
            'professional' => [
                'max_team_members' => 10,
                'max_services' => 50,
                'max_advertisements' => 20,
                'analytics' => true,
                'priority_support' => false,
                'api_access' => false,
                'routes' => true,
            ],
            'enterprise' => [
                'max_team_members' => -1,
                'max_services' => -1,
                'max_advertisements' => -1,
                'analytics' => true,
                'priority_support' => true,
                'api_access' => true,
                'routes' => true,
            ],
        ];

        $aiDefaults = [
            'free' => [0, 0],
            'starter' => [100, 500_000],
            'professional' => [500, 2_500_000],
            'enterprise' => [2000, 10_000_000],
        ];

        $plans = DB::table('subscription_plans')->get(['id', 'slug', 'features']);

        foreach ($plans as $plan) {
            $slug = (string) $plan->slug;
            $features = json_decode((string) $plan->features, true);
            if (! is_array($features)) {
                $features = [];
            }

            if (isset($canonical[$slug])) {
                foreach ($canonical[$slug] as $key => $default) {
                    if (! array_key_exists($key, $features)) {
                        $features[$key] = $default;
                    }
                }
            }

            if (isset($aiDefaults[$slug])) {
                [$req, $tok] = $aiDefaults[$slug];
                if (! array_key_exists('ai_max_requests_per_month', $features)) {
                    $features['ai_max_requests_per_month'] = $req;
                }
                if (! array_key_exists('ai_max_tokens_per_month', $features)) {
                    $features['ai_max_tokens_per_month'] = $tok;
                }
            }

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
        // Не откатываем: восстановление идемпотентно и не удаляет ключи.
    }
};

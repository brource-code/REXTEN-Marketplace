<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Pro (Professional) и выше: маршруты, аналитика, AI (квоты pro/enterprise).
 * Free/Starter: без маршрутов, аналитики и AI.
 * API и приоритетная поддержка — только Enterprise.
 */
return new class extends Migration
{
    public function up(): void
    {
        $forced = [
            'free' => [
                'max_team_members' => 1,
                'max_services' => 5,
                'max_advertisements' => 1,
                'analytics' => false,
                'priority_support' => false,
                'api_access' => false,
                'routes' => false,
                'ai_max_requests_per_month' => 0,
                'ai_max_tokens_per_month' => 0,
            ],
            'starter' => [
                'max_team_members' => 3,
                'max_services' => 20,
                'max_advertisements' => 5,
                'analytics' => false,
                'priority_support' => false,
                'api_access' => false,
                'routes' => false,
                'ai_max_requests_per_month' => 0,
                'ai_max_tokens_per_month' => 0,
            ],
            'professional' => [
                'max_team_members' => 10,
                'max_services' => 50,
                'max_advertisements' => 20,
                'analytics' => true,
                'priority_support' => false,
                'api_access' => false,
                'routes' => true,
                'ai_max_requests_per_month' => 500,
                'ai_max_tokens_per_month' => 2_500_000,
            ],
            'enterprise' => [
                'max_team_members' => -1,
                'max_services' => -1,
                'max_advertisements' => -1,
                'analytics' => true,
                'priority_support' => true,
                'api_access' => true,
                'routes' => true,
                'ai_max_requests_per_month' => 2000,
                'ai_max_tokens_per_month' => 10_000_000,
            ],
        ];

        foreach ($forced as $slug => $patch) {
            $row = DB::table('subscription_plans')->where('slug', $slug)->first();
            if ($row === null) {
                continue;
            }
            $features = json_decode((string) $row->features, true);
            if (! is_array($features)) {
                $features = [];
            }
            $features = array_merge($features, $patch);
            DB::table('subscription_plans')
                ->where('slug', $slug)
                ->update([
                    'features' => json_encode($features),
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        // Сознательно без отката: матрица нормативна для продукта; при откате вручную смотрите сид/бэкап.
    }
};

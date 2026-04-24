<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $map = [
            'free' => [0, 0],
            'starter' => [100, 500_000],
            'professional' => [500, 2_500_000],
            'enterprise' => [2000, 10_000_000],
        ];

        foreach ($map as $slug => [$req, $tok]) {
            $row = DB::table('subscription_plans')->where('slug', $slug)->first();
            if ($row === null) {
                continue;
            }
            $features = json_decode((string) $row->features, true);
            if (! is_array($features)) {
                $features = [];
            }
            $features['ai_max_requests_per_month'] = $req;
            $features['ai_max_tokens_per_month'] = $tok;
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
        $slugs = ['free', 'starter', 'professional', 'enterprise'];
        foreach ($slugs as $slug) {
            $row = DB::table('subscription_plans')->where('slug', $slug)->first();
            if ($row === null) {
                continue;
            }
            $features = json_decode((string) $row->features, true);
            if (! is_array($features)) {
                $features = [];
            }
            unset($features['ai_max_requests_per_month'], $features['ai_max_tokens_per_month']);
            DB::table('subscription_plans')
                ->where('slug', $slug)
                ->update([
                    'features' => json_encode($features),
                    'updated_at' => now(),
                ]);
        }
    }
};

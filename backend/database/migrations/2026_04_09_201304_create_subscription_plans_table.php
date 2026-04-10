<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 50)->unique();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->integer('price_monthly_cents')->default(0);
            $table->integer('price_yearly_cents')->default(0);
            $table->string('currency', 10)->default('usd');
            
            // Лимиты и фичи (JSON для гибкости)
            $table->json('features')->nullable();
            
            // Управление
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_free')->default(false);
            $table->integer('sort_order')->default(0);
            
            // Визуальные настройки
            $table->string('badge_text', 50)->nullable();
            $table->string('color', 20)->default('blue');
            
            $table->timestamps();
            
            $table->index(['is_active', 'sort_order']);
        });

        // Сидим базовые планы
        $this->seedDefaultPlans();
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }

    private function seedDefaultPlans(): void
    {
        $now = now();
        
        DB::table('subscription_plans')->insert([
            'slug' => 'free',
            'name' => 'Free',
            'description' => 'Basic features to get started',
            'price_monthly_cents' => 0,
            'price_yearly_cents' => 0,
            'features' => json_encode([
                'max_team_members' => 1,
                'max_services' => 5,
                'max_advertisements' => 1,
                'analytics' => false,
                'priority_support' => false,
                'api_access' => false,
            ]),
            'is_active' => true,
            'is_default' => true,
            'is_free' => true,
            'sort_order' => 0,
            'color' => 'gray',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('subscription_plans')->insert([
            'slug' => 'starter',
            'name' => 'Starter',
            'description' => 'Perfect for small businesses',
            'price_monthly_cents' => 2900,
            'price_yearly_cents' => 29000,
            'features' => json_encode([
                'max_team_members' => 3,
                'max_services' => 20,
                'max_advertisements' => 5,
                'analytics' => false,
                'priority_support' => false,
                'api_access' => false,
            ]),
            'is_active' => true,
            'is_default' => false,
            'is_free' => false,
            'sort_order' => 1,
            'color' => 'blue',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('subscription_plans')->insert([
            'slug' => 'professional',
            'name' => 'Professional',
            'description' => 'Advanced features for growing teams',
            'price_monthly_cents' => 7900,
            'price_yearly_cents' => 79000,
            'features' => json_encode([
                'max_team_members' => 10,
                'max_services' => 50,
                'max_advertisements' => 20,
                'analytics' => true,
                'priority_support' => true,
                'api_access' => false,
            ]),
            'is_active' => true,
            'is_default' => false,
            'is_free' => false,
            'sort_order' => 2,
            'badge_text' => 'Popular',
            'color' => 'indigo',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('subscription_plans')->insert([
            'slug' => 'enterprise',
            'name' => 'Enterprise',
            'description' => 'Full power for large organizations',
            'price_monthly_cents' => 19900,
            'price_yearly_cents' => 199000,
            'features' => json_encode([
                'max_team_members' => -1,
                'max_services' => -1,
                'max_advertisements' => -1,
                'analytics' => true,
                'priority_support' => true,
                'api_access' => true,
            ]),
            'is_active' => true,
            'is_default' => false,
            'is_free' => false,
            'sort_order' => 3,
            'color' => 'amber',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
};

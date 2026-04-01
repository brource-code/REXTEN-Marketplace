<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Service;
use App\Models\Company;
use App\Models\ServiceCategory;

class ServiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $glowLab = Company::where('slug', 'glow-lab')->first();
        $urbanBarber = Company::where('slug', 'urban-barber')->first();

        $hairCategory = ServiceCategory::where('slug', 'hair-services')->first();
        $nailCategory = ServiceCategory::where('slug', 'nail-services')->first();
        $barberCategory = ServiceCategory::where('slug', 'barbershop')->first();

        // Услуги для Glow Lab Studio
        if ($glowLab && $hairCategory) {
            $services = [
                [
                    'company_id' => $glowLab->id,
                    'category_id' => $hairCategory->id,
                    'name' => 'Стрижка и укладка',
                    'slug' => 'haircut-styling',
                    'description' => 'Профессиональная стрижка и укладка волос',
                    'price' => 1200.00,
                    'duration_minutes' => 60,
                    'is_active' => true,
                    'sort_order' => 1,
                ],
                [
                    'company_id' => $glowLab->id,
                    'category_id' => $hairCategory->id,
                    'name' => 'Окрашивание волос',
                    'slug' => 'hair-coloring',
                    'description' => 'Полное окрашивание волос с тонированием',
                    'price' => 3500.00,
                    'duration_minutes' => 180,
                    'is_active' => true,
                    'sort_order' => 2,
                ],
            ];

            foreach ($services as $service) {
                Service::create($service);
            }
        }

        if ($glowLab && $nailCategory) {
            $services = [
                [
                    'company_id' => $glowLab->id,
                    'category_id' => $nailCategory->id,
                    'name' => 'Маникюр премиум',
                    'slug' => 'premium-manicure',
                    'description' => 'Премиальный маникюр с покрытием гель-лак',
                    'price' => 800.00,
                    'duration_minutes' => 90,
                    'is_active' => true,
                    'sort_order' => 3,
                ],
            ];

            foreach ($services as $service) {
                Service::create($service);
            }
        }

        // Услуги для Urban Barber Club
        if ($urbanBarber && $barberCategory) {
            $services = [
                [
                    'company_id' => $urbanBarber->id,
                    'category_id' => $barberCategory->id,
                    'name' => 'Классическая стрижка',
                    'slug' => 'classic-haircut',
                    'description' => 'Классическая мужская стрижка',
                    'price' => 800.00,
                    'duration_minutes' => 45,
                    'is_active' => true,
                    'sort_order' => 1,
                ],
                [
                    'company_id' => $urbanBarber->id,
                    'category_id' => $barberCategory->id,
                    'name' => 'Стрижка + Борода',
                    'slug' => 'haircut-beard',
                    'description' => 'Стрижка волос и оформление бороды',
                    'price' => 1200.00,
                    'duration_minutes' => 60,
                    'is_active' => true,
                    'sort_order' => 2,
                ],
            ];

            foreach ($services as $service) {
                Service::create($service);
            }
        }
    }
}


<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Company;
use App\Models\User;

class CompanySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $businessOwner = User::where('email', 'business@ecme.com')->first();

        if (!$businessOwner) {
            return;
        }

        $companies = [
            [
                'owner_id' => $businessOwner->id,
                'name' => 'Glow Lab Studio',
                'slug' => 'glow-lab',
                'description' => 'Премиальный салон красоты с полным спектром услуг',
                'category' => 'Салон красоты',
                'address' => 'г. Москва, ул. Тверская, д. 10',
                'city' => 'Москва',
                'state' => 'Московская область',
                'zip_code' => '101000',
                'phone' => '+7 (495) 123-45-67',
                'email' => 'info@glowlab.ru',
                'website' => 'https://glowlab.ru',
                'status' => 'active',
                'is_visible_on_marketplace' => true,
            ],
            [
                'owner_id' => $businessOwner->id,
                'name' => 'Urban Barber Club',
                'slug' => 'urban-barber',
                'description' => 'Современный барбершоп для настоящих мужчин',
                'category' => 'Барбершоп',
                'address' => 'г. Москва, ул. Арбат, д. 25',
                'city' => 'Москва',
                'state' => 'Московская область',
                'zip_code' => '119002',
                'phone' => '+7 (495) 234-56-78',
                'email' => 'info@urbanbarber.ru',
                'status' => 'active',
                'is_visible_on_marketplace' => true,
            ],
        ];

        foreach ($companies as $companyData) {
            Company::create($companyData);
        }
    }
}


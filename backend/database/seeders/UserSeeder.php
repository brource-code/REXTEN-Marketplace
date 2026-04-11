<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\UserProfile;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Суперадмин
        $superadmin = User::create([
            'email' => 'admin@ecme.com',
            'password' => Hash::make('demo12345'),
            'role' => 'SUPERADMIN',
            'is_active' => true,
            'is_blocked' => false,
        ]);

        UserProfile::create([
            'user_id' => $superadmin->id,
            'first_name' => 'Администратор',
            'last_name' => 'Системы',
            'phone' => '+7 (999) 000-00-01',
        ]);

        // Владелец бизнеса
        $businessOwner = User::create([
            'email' => 'business@ecme.com',
            'password' => Hash::make('demo12345'),
            'role' => 'BUSINESS_OWNER',
            'is_active' => true,
            'is_blocked' => false,
        ]);

        UserProfile::create([
            'user_id' => $businessOwner->id,
            'first_name' => 'Владелец',
            'last_name' => 'Бизнеса',
            'phone' => '+7 (999) 000-00-02',
        ]);

        // Клиенты
        $clients = [
            [
                'email' => 'client@ecme.com',
                'first_name' => 'Иван',
                'last_name' => 'Иванов',
                'phone' => '+7 (999) 111-11-11',
            ],
            [
                'email' => 'client2@ecme.com',
                'first_name' => 'Мария',
                'last_name' => 'Петрова',
                'phone' => '+7 (999) 222-22-22',
            ],
            [
                'email' => 'client3@ecme.com',
                'first_name' => 'Алексей',
                'last_name' => 'Сидоров',
                'phone' => '+7 (999) 333-33-33',
            ],
        ];

        foreach ($clients as $clientData) {
            $client = User::create([
                'email' => $clientData['email'],
                'password' => Hash::make('demo12345'),
                'role' => 'CLIENT',
                'is_active' => true,
                'is_blocked' => false,
            ]);

            UserProfile::create([
                'user_id' => $client->id,
                'first_name' => $clientData['first_name'],
                'last_name' => $clientData['last_name'],
                'phone' => $clientData['phone'],
                'city' => 'Los Angeles',
                'state' => 'CA',
            ]);
        }
    }
}


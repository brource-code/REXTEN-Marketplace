<?php

require __DIR__.'/../../vendor/autoload.php';

use Illuminate\Container\Container;
use Illuminate\Database\Capsule\Manager as Capsule;

// Load environment variables
try {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__.'/../../');
    $dotenv->load();
} catch (Dotenv\Exception\InvalidPathException $e) {
    // .env not found, assume environment variables are set
}

// Configure PostgreSQL connection
$pgsqlCapsule = new Capsule;
$pgsqlCapsule->addConnection([
    'driver'    => 'pgsql',
    'host'      => env('DB_HOST', '127.0.0.1'),
    'port'      => env('DB_PORT', '5432'),
    'database'  => env('DB_DATABASE', 'ecme_marketplace'),
    'username'  => env('DB_USERNAME', 'postgres'),
    'password'  => env('DB_PASSWORD', ''),
    'charset'   => 'utf8',
    'prefix'    => '',
], 'pgsql');
$pgsqlCapsule->setAsGlobal();
$pgsqlCapsule->bootEloquent();

$db = $pgsqlCapsule->getConnection('pgsql');

echo "=== ДОБАВЛЕНИЕ ДОПОЛНИТЕЛЬНЫХ УСЛУГ К БРОНИРОВАНИЯМ ===\n\n";

// Находим компанию REXTEN LLC
$company = $db->table('companies')->where('slug', 'rexten')->first();
if (!$company) {
    echo "❌ Компания REXTEN LLC не найдена\n";
    exit(1);
}

// Получаем услуги компании
$serviceIds = $db->table('services')
    ->where('company_id', $company->id)
    ->pluck('id')
    ->toArray();

// Получаем дополнительные услуги через service_id
$additionalServices = $db->table('additional_services')
    ->whereIn('service_id', $serviceIds)
    ->where('is_active', true)
    ->get();
    
if ($additionalServices->isEmpty()) {
    echo "⚠️  У компании нет дополнительных услуг, пропускаем...\n";
    exit(0);
}

echo "Дополнительных услуг найдено: " . $additionalServices->count() . "\n";

// Получаем бронирования за январь и февраль
$bookings = $db->table('bookings')
    ->where('company_id', $company->id)
    ->where(function($query) {
        $query->where('booking_date', '>=', '2026-01-01')
              ->where('booking_date', '<', '2026-03-01');
    })
    ->get();

echo "Бронирований найдено: " . $bookings->count() . "\n\n";

$addedCount = 0;

// Добавляем дополнительные услуги к 60% бронирований (случайно)
foreach ($bookings as $booking) {
    // 60% вероятность добавить услуги
    if (rand(1, 100) > 40) {
        // От 1 до 3 дополнительных услуг
        $servicesToAdd = $additionalServices->random(rand(1, min(3, $additionalServices->count())));
        
        foreach ($servicesToAdd as $service) {
            // Проверяем, не добавлена ли уже эта услуга
            $exists = $db->table('booking_additional_services')
                ->where('booking_id', $booking->id)
                ->where('additional_service_id', $service->id)
                ->exists();
                
            if (!$exists) {
                $quantity = rand(1, 3);
                $price = $service->price ?? 0;
                
                $db->table('booking_additional_services')->insert([
                    'booking_id' => $booking->id,
                    'additional_service_id' => $service->id,
                    'quantity' => $quantity,
                    'price' => $price,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                
                $addedCount++;
            }
        }
        
        // Обновляем total_price бронирования
        $totalAdditional = $db->table('booking_additional_services')
            ->where('booking_id', $booking->id)
            ->selectRaw('SUM(price * quantity) as total')
            ->value('total') ?? 0;
            
        $newTotal = ($booking->price ?? 0) + $totalAdditional;
        
        $db->table('bookings')
            ->where('id', $booking->id)
            ->update(['total_price' => $newTotal]);
    }
}

echo "✅ Добавлено {$addedCount} дополнительных услуг к бронированиям\n";
echo "✅ Обновлены total_price для бронирований\n";
echo "\n✅ Готово!\n";

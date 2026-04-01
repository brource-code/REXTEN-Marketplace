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

echo "=== ГЕНЕРАЦИЯ ТЕСТОВЫХ БРОНИРОВАНИЙ ===\n\n";

// Находим компанию REXTEN LLC
$company = $db->table('companies')->where('slug', 'rexten')->first();
if (!$company) {
    echo "❌ Компания REXTEN LLC не найдена\n";
    exit(1);
}

echo "Компания: {$company->name} (ID: {$company->id})\n";

// Получаем услуги компании
$services = $db->table('services')
    ->where('company_id', $company->id)
    ->where('is_active', true)
    ->get();
    
if ($services->isEmpty()) {
    echo "❌ У компании нет активных услуг\n";
    exit(1);
}

echo "Услуг найдено: " . $services->count() . "\n";

// Получаем исполнителей
$teamMembers = $db->table('team_members')
    ->where('company_id', $company->id)
    ->where('status', 'active')
    ->get();
    
if ($teamMembers->isEmpty()) {
    echo "❌ У компании нет активных исполнителей\n";
    exit(1);
}

echo "Исполнителей найдено: " . $teamMembers->count() . "\n\n";

// Статусы для февраля
$februaryStatuses = ['new', 'pending', 'confirmed', 'completed', 'cancelled'];

// Генерируем 30 завершенных бронирований за январь
echo "Создаю 30 завершенных бронирований за январь...\n";
$januaryBookings = [];

for ($i = 1; $i <= 30; $i++) {
    $service = $services->random();
    $specialist = $teamMembers->random();
    
    // Случайная дата в январе 2026
    $day = rand(1, 31);
    $hour = rand(8, 17);
    $minute = rand(0, 59);
    
    $bookingDate = "2026-01-{$day}";
    $bookingTime = sprintf("%02d:%02d:00", $hour, $minute);
    
    $duration = $service->duration_minutes ?? 60;
    $price = $service->price ?? 100;
    
    $bookingId = $db->table('bookings')->insertGetId([
        'company_id' => $company->id,
        'user_id' => null, // Незарегистрированный клиент
        'service_id' => $service->id,
        'team_member_id' => $specialist->id, // Используем team_member_id вместо specialist_id
        'specialist_id' => null, // Оставляем null, так как FK на users
        'booking_date' => $bookingDate,
        'booking_time' => $bookingTime,
        'duration_minutes' => $duration,
        'price' => $price,
        'total_price' => $price,
        'status' => 'completed',
        'client_name' => "Клиент {$i}",
        'client_phone' => "+1" . rand(2000000000, 9999999999),
        'client_email' => "client{$i}@test.com",
        'execution_type' => 'onsite',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    
    $januaryBookings[] = $bookingId;
}

echo "✅ Создано 30 бронирований за январь\n\n";

// Генерируем 15 бронирований за февраль с разными статусами
echo "Создаю 15 бронирований за февраль с разными статусами...\n";
$februaryBookings = [];

for ($i = 1; $i <= 15; $i++) {
    $service = $services->random();
    $specialist = $teamMembers->random();
    $status = $februaryStatuses[($i - 1) % count($februaryStatuses)];
    
    // Случайная дата в феврале 2026
    $day = rand(1, 28);
    $hour = rand(8, 17);
    $minute = rand(0, 59);
    
    $bookingDate = "2026-02-{$day}";
    $bookingTime = sprintf("%02d:%02d:00", $hour, $minute);
    
    $duration = $service->duration_minutes ?? 60;
    $price = $service->price ?? 100;
    
    $bookingData = [
        'company_id' => $company->id,
        'user_id' => null,
        'service_id' => $service->id,
        'team_member_id' => $specialist->id, // Используем team_member_id вместо specialist_id
        'specialist_id' => null, // Оставляем null, так как FK на users
        'booking_date' => $bookingDate,
        'booking_time' => $bookingTime,
        'duration_minutes' => $duration,
        'price' => $price,
        'total_price' => $price,
        'status' => $status,
        'client_name' => "Клиент Фев {$i}",
        'client_phone' => "+1" . rand(2000000000, 9999999999),
        'client_email' => "client_feb{$i}@test.com",
        'execution_type' => 'onsite',
        'created_at' => now(),
        'updated_at' => now(),
    ];
    
    // Для отмененных добавляем cancelled_at
    if ($status === 'cancelled') {
        $bookingData['cancelled_at'] = now();
        $bookingData['cancellation_reason'] = 'Тестовая отмена';
    }
    
    $bookingId = $db->table('bookings')->insertGetId($bookingData);
    $februaryBookings[] = ['id' => $bookingId, 'status' => $status];
}

echo "✅ Создано 15 бронирований за февраль\n\n";

// Статистика по статусам
$statusCounts = [];
foreach ($februaryBookings as $booking) {
    $statusCounts[$booking['status']] = ($statusCounts[$booking['status']] ?? 0) + 1;
}

echo "=== СТАТИСТИКА ===\n";
echo "Январь: 30 завершенных бронирований\n";
echo "Февраль по статусам:\n";
foreach ($statusCounts as $status => $count) {
    echo "  - {$status}: {$count}\n";
}

echo "\n✅ Готово!\n";

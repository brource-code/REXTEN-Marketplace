<?php

/**
 * Скрипт для проверки данных тенанта
 * Запуск: php check_tenant_data.php <company_id|company_name>
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Booking;
use App\Models\Order;
use App\Models\Company;
use Illuminate\Support\Facades\DB;

if ($argc < 2) {
    echo "Usage: php check_tenant_data.php <company_id|company_name>\n";
    echo "Example: php check_tenant_data.php 1\n";
    echo "Example: php check_tenant_data.php REXTEN\n";
    exit(1);
}

$input = $argv[1];

// Пытаемся найти компанию по ID или имени
if (is_numeric($input)) {
    $company = Company::find((int) $input);
} else {
    $company = Company::where('name', 'like', '%' . $input . '%')->first();
}

if (!$company) {
    echo "Компания не найдена: {$input}\n";
    echo "\nДоступные компании:\n";
    $companies = Company::select('id', 'name', 'slug')->get();
    foreach ($companies as $c) {
        echo "  ID: {$c->id}, Name: {$c->name}, Slug: {$c->slug}\n";
    }
    exit(1);
}

$companyId = $company->id;

echo "=== Проверка данных для компании ===\n";
echo "ID: {$companyId}\n";
echo "Name: {$company->name}\n";
echo "Slug: {$company->slug}\n\n";

// 1. Все бронирования
$totalBookings = Booking::where('company_id', $companyId)->count();
echo "1. Всего бронирований: {$totalBookings}\n";

// 2. Бронирования по статусам
$statuses = ['new', 'pending', 'confirmed', 'completed', 'cancelled'];
foreach ($statuses as $status) {
    $count = Booking::where('company_id', $companyId)
        ->where('status', $status)
        ->count();
    echo "   - {$status}: {$count}\n";
}

// 3. Активные бронирования (new, pending, confirmed)
$activeBookings = Booking::where('company_id', $companyId)
    ->whereIn('status', ['new', 'pending', 'confirmed'])
    ->count();
echo "   - Активные (new, pending, confirmed): {$activeBookings}\n";

// 4. Завершенные бронирования
$completedBookings = Booking::where('company_id', $companyId)
    ->where('status', 'completed')
    ->count();
echo "   - Завершенные: {$completedBookings}\n";

// 5. Отмененные бронирования
$cancelledBookings = Booking::where('company_id', $companyId)
    ->where('status', 'cancelled')
    ->count();
echo "   - Отмененные: {$cancelledBookings}\n";

// 6. Доход от заказов
$orderRevenue = Order::where('company_id', $companyId)
    ->where('payment_status', 'paid')
    ->sum('total');
$orderRevenue = $orderRevenue ? (float) $orderRevenue : 0;
echo "\n2. Доход от оплаченных заказов: $" . number_format($orderRevenue, 2) . "\n";

// 7. Доход от завершенных бронирований без заказов
$completedBookingsRevenue = Booking::where('company_id', $companyId)
    ->where('status', 'completed')
    ->whereDoesntHave('order')
    ->sum(DB::raw('COALESCE(total_price, price)'));
$completedBookingsRevenue = $completedBookingsRevenue ? (float) $completedBookingsRevenue : 0;
echo "3. Доход от завершенных бронирований без заказов: $" . number_format($completedBookingsRevenue, 2) . "\n";

// 8. Общий доход
$totalRevenue = $orderRevenue + $completedBookingsRevenue;
echo "4. Общий доход: $" . number_format($totalRevenue, 2) . "\n";

// 9. Средний чек
$averageCheck = $completedBookings > 0 
    ? round($totalRevenue / $completedBookings, 2) 
    : 0;
echo "5. Средний чек: $" . number_format($averageCheck, 2) . "\n";

// 10. Уникальные клиенты
$uniqueClients = Booking::where('company_id', $companyId)
    ->distinct('user_id')
    ->count('user_id');
echo "6. Уникальных клиентов (по user_id): {$uniqueClients}\n";

// 11. Активные исполнители
$activeSpecialists = Booking::where('company_id', $companyId)
    ->whereNotNull('specialist_id')
    ->select('specialist_id')
    ->distinct()
    ->count('specialist_id');
echo "7. Активных исполнителей: {$activeSpecialists}\n";

// 12. Детали по бронированиям
echo "\n=== Детали по бронированиям ===\n";
$bookings = Booking::where('company_id', $companyId)
    ->select('id', 'status', 'price', 'total_price', 'user_id', 'specialist_id', 'booking_date')
    ->get();

echo "Всего записей: " . $bookings->count() . "\n";
echo "\nПервые 10 бронирований:\n";
foreach ($bookings->take(10) as $booking) {
    $hasOrder = $booking->order ? 'Да' : 'Нет';
    echo "ID: {$booking->id}, Статус: {$booking->status}, Цена: {$booking->price}, Total: {$booking->total_price}, User: {$booking->user_id}, Specialist: {$booking->specialist_id}, Order: {$hasOrder}\n";
}

// 13. Детали по заказам
echo "\n=== Детали по заказам ===\n";
$orders = Order::where('company_id', $companyId)
    ->where('payment_status', 'paid')
    ->select('id', 'booking_id', 'total', 'payment_status')
    ->get();

echo "Всего оплаченных заказов: " . $orders->count() . "\n";
echo "\nПервые 10 заказов:\n";
foreach ($orders->take(10) as $order) {
    echo "ID: {$order->id}, Booking ID: {$order->booking_id}, Total: {$order->total}\n";
}

echo "\n=== Проверка завершена ===\n";


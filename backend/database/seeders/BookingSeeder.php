<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Booking;
use App\Models\Advertisement;
use App\Models\Company;
use App\Models\User;
use Carbon\Carbon;

class BookingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Получаем или создаем тестового пользователя
        $user = User::where('email', 'client@ecme.com')->first();
        if (!$user) {
            $user = User::create([
                'name' => 'Test Client',
                'email' => 'client@ecme.com',
                'password' => bcrypt('password'),
                'role' => 'client',
            ]);
        }

        // Получаем объявления
        $advertisements = Advertisement::where('type', 'regular')
            ->where('is_active', true)
            ->where('status', 'approved')
            ->with('company')
            ->get();

        if ($advertisements->isEmpty()) {
            $this->command->info('No advertisements found. Skipping booking seeding.');
            return;
        }

        $bookingsCreated = 0;
        $timezone = config('app.timezone') ?: 'America/New_York';
        $now = Carbon::now($timezone);

        foreach ($advertisements->take(10) as $ad) {
            $company = $ad->company;
            if (!$company) {
                continue;
            }

            // Получаем расписание объявления
            $schedule = $ad->schedule ?? [];
            if (empty($schedule)) {
                continue;
            }

            // Создаем несколько бронирований на ближайшие дни
            for ($dayOffset = 1; $dayOffset <= 7; $dayOffset++) {
                $bookingDate = $now->copy()->addDays($dayOffset);
                $dayOfWeek = strtolower($bookingDate->format('l')); // monday, tuesday, etc.

                // Проверяем, активен ли этот день в расписании
                if (!isset($schedule[$dayOfWeek]) || !($schedule[$dayOfWeek]['enabled'] ?? false)) {
                    continue;
                }

                $daySchedule = $schedule[$dayOfWeek];
                $fromTime = $daySchedule['from'] ?? '09:00';
                $toTime = $daySchedule['to'] ?? '18:00';
                $duration = $daySchedule['duration'] ?? 60;

                // Создаем 1-2 бронирования на день (чтобы показать занятые слоты)
                $numBookings = rand(1, 2);
                
                for ($i = 0; $i < $numBookings; $i++) {
                    // Генерируем случайное время в рабочем диапазоне
                    $fromParts = explode(':', $fromTime);
                    $toParts = explode(':', $toTime);
                    $fromMinutes = (int)$fromParts[0] * 60 + (int)$fromParts[1];
                    $toMinutes = (int)$toParts[0] * 60 + (int)$toParts[1];
                    
                    // Выбираем случайное время, оставляя место для длительности
                    $maxStartMinutes = $toMinutes - $duration;
                    if ($maxStartMinutes <= $fromMinutes) {
                        continue;
                    }
                    
                    $randomMinutes = rand($fromMinutes, $maxStartMinutes);
                    $hours = floor($randomMinutes / 60);
                    $minutes = $randomMinutes % 60;
                    $bookingTime = sprintf('%02d:%02d', $hours, $minutes);

                    // Получаем первую услугу из списка услуг объявления
                    $services = $ad->services ?? [];
                    if (empty($services)) {
                        continue;
                    }
                    $firstService = $services[0];
                    $servicePrice = $firstService['price'] ?? 100;
                    $serviceDuration = $firstService['duration'] ?? 60;

                    // Для объявлений нужно создать или найти услугу в таблице services
                    // Создаем временную услугу для бронирования, если её нет
                    $serviceId = $firstService['id'] ?? null;
                    $service = null;
                    
                    if ($serviceId) {
                        // Пытаемся найти услугу по ID
                        $service = \App\Models\Service::find($serviceId);
                    }
                    
                    // Если услуга не найдена, создаем временную для этого объявления
                    if (!$service) {
                        $category = \App\Models\ServiceCategory::where('slug', $ad->category_slug)->first();
                        if (!$category) {
                            $category = \App\Models\ServiceCategory::first();
                        }
                        
                        if ($category) {
                            $service = \App\Models\Service::firstOrCreate(
                                [
                                    'company_id' => $company->id,
                                    'name' => $firstService['name'] ?? 'Услуга',
                                ],
                                [
                                    'category_id' => $category->id,
                                    'slug' => 'service-' . $ad->id . '-' . ($firstService['id'] ?? 1),
                                    'description' => $firstService['description'] ?? '',
                                    'price' => $servicePrice,
                                    'duration_minutes' => $serviceDuration,
                                    'is_active' => true,
                                    'sort_order' => 1,
                                ]
                            );
                            $serviceId = $service->id;
                        } else {
                            continue; // Не можем создать бронирование без категории
                        }
                    } else {
                        $serviceId = $service->id;
                    }
                    
                    try {
                        Booking::create([
                            'company_id' => $company->id,
                            'user_id' => $user->id,
                            'service_id' => $serviceId, // Используем ID из массива услуг объявления
                            'booking_date' => $bookingDate->format('Y-m-d') . ' 00:00:00',
                            'booking_time' => $bookingTime,
                            'duration_minutes' => $serviceDuration,
                            'price' => $servicePrice,
                            'status' => rand(0, 1) ? 'confirmed' : 'pending', // Случайный статус
                            'notes' => 'Тестовое бронирование для ' . $ad->title,
                            'client_name' => $user->name ?? 'Test Client',
                            'client_email' => $user->email ?? 'client@ecme.com',
                            'client_phone' => '+1 (555) 123-4567',
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                        $bookingsCreated++;
                    } catch (\Exception $e) {
                        // Игнорируем ошибки (возможно, service_id не существует в таблице services)
                        // Для объявлений это нормально, так как услуги хранятся в JSON
                        continue;
                    }
                }
            }
        }

        $this->command->info("Created {$bookingsCreated} test bookings");
    }
}


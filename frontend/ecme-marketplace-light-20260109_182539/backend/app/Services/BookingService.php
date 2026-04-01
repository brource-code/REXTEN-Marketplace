<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Service;
use App\Models\Company;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BookingService
{
    /**
     * Проверка доступности слота для бронирования
     */
    public function isSlotAvailable($companyId, $serviceId, $date, $time, $durationMinutes = 60, $excludeBookingId = null, $serviceData = null, $specialistId = null)
    {
        // Используем системную таймзону (пока системную, в будущем по штату)
        $timezone = config('app.timezone') ?: date_default_timezone_get();
        
        // Нормализуем формат даты (может быть datetime или только дата)
        $bookingDate = Carbon::parse($date, $timezone)->startOfDay();
        
        // Нормализуем формат времени (может быть HH:mm или HH:mm:ss)
        $normalizedTime = $time;
        if (strlen($normalizedTime) === 5) {
            // Если формат HH:mm, добавляем секунды
            $normalizedTime .= ':00';
        }
        
        $bookingTime = Carbon::parse($normalizedTime, $timezone);
        $bookingDateTime = $bookingDate->copy()->setTimeFromTimeString($bookingTime->format('H:i:s'));
        $endDateTime = $bookingDateTime->copy()->addMinutes($durationMinutes);
        
        // Проверяем, что бронирование не в прошлом
        $now = Carbon::now($timezone);
        if ($bookingDateTime->lt($now)) {
            Log::warning('BookingService: isSlotAvailable - booking in the past', [
                'bookingDateTime' => $bookingDateTime->format('Y-m-d H:i:s'),
                'now' => $now->format('Y-m-d H:i:s'),
            ]);
            return false;
        }

        // Проверяем, не пересекается ли с существующими бронированиями
        // Используем более простую логику для совместимости с SQLite и MySQL
        // Исключаем отмененные бронирования - они не должны блокировать слоты
        
        // Нормализуем дату для сравнения (может быть datetime или только дата)
        $normalizedDate = $bookingDate->format('Y-m-d');
        
        // Получаем все активные бронирования на эту дату для этой компании
        // ВАЖНО: Если указан specialist_id, проверяем только бронирования этого специалиста
        // Если specialist_id не указан, проверяем только бронирования без специалиста (для совместимости)
        $existingBookingsQuery = Booking::where('company_id', $companyId)
            ->whereDate('booking_date', $normalizedDate) // Используем whereDate для надежности
            ->whereIn('status', ['new', 'pending', 'confirmed', 'completed'])
            ->where('status', '!=', 'cancelled'); // Дополнительная проверка на всякий случай
        
        // Фильтруем по specialist_id
        if ($specialistId !== null) {
            // Если указан специалист, проверяем только его бронирования
            // И бронирования без специалиста (для совместимости со старыми данными)
            $existingBookingsQuery->where(function($q) use ($specialistId) {
                $q->where('specialist_id', $specialistId)
                  ->orWhereNull('specialist_id'); // Старые бронирования без специалиста
            });
        } else {
            // Если специалист не указан, проверяем только бронирования без специалиста
            // Это предотвращает блокировку слотов специалистов общими бронированиями
            $existingBookingsQuery->whereNull('specialist_id');
        }
        
        $existingBookings = $existingBookingsQuery->get();
        
        Log::info('BookingService: isSlotAvailable - filtering bookings by specialist', [
            'specialist_id' => $specialistId,
            'bookings_count' => $existingBookings->count(),
        ]);

        if ($excludeBookingId) {
            $existingBookings = $existingBookings->reject(function ($booking) use ($excludeBookingId) {
                return $booking->id == $excludeBookingId;
            });
        }

        // Проверяем пересечение временных интервалов
        Log::info('BookingService: isSlotAvailable - checking overlaps', [
            'bookingDateTime' => $bookingDateTime->format('Y-m-d H:i:s'),
            'endDateTime' => $endDateTime->format('Y-m-d H:i:s'),
            'existingBookingsCount' => $existingBookings->count(),
        ]);
        
        foreach ($existingBookings as $existing) {
            // Нормализуем формат времени (может быть HH:mm или HH:mm:ss)
            $existingTime = $existing->booking_time;
            if (strlen($existingTime) === 5) {
                // Если формат HH:mm, добавляем секунды
                $existingTime .= ':00';
            }
            
            // Парсим время существующего бронирования
            // Используем нормализованную дату для сравнения
            $existingStart = Carbon::parse($normalizedDate . ' ' . $existingTime, $timezone);
            $existingEnd = $existingStart->copy()->addMinutes($existing->duration_minutes ?? 60);

            // Проверяем пересечение временных интервалов
            // Два интервала пересекаются, если они действительно перекрываются во времени
            // Интервалы НЕ пересекаются, если они только касаются (конец одного = начало другого)
            // Правильная проверка: интервалы пересекаются только если они перекрываются
            // Интервалы пересекаются, если:
            // - начало нового < конец существующего И конец нового > начало существующего
            // Если они только касаются (конец одного = начало другого), это НЕ пересечение
            $overlaps = (
                $bookingDateTime->lt($existingEnd) && // Начало нового < конец существующего
                $endDateTime->gt($existingStart)     // Конец нового > начало существующего
            );
            
            Log::info('BookingService: isSlotAvailable - checking booking', [
                'existing_id' => $existing->id,
                'existing_time' => $existingTime,
                'existing_start' => $existingStart->format('Y-m-d H:i:s'),
                'existing_end' => $existingEnd->format('Y-m-d H:i:s'),
                'booking_start' => $bookingDateTime->format('Y-m-d H:i:s'),
                'booking_end' => $endDateTime->format('Y-m-d H:i:s'),
                'overlaps' => $overlaps,
            ]);
            
            if ($overlaps) {
                // Реальное пересечение (не просто касание)
                Log::warning('BookingService: isSlotAvailable - slot overlaps with existing booking', [
                    'slot_start' => $bookingDateTime->format('H:i'),
                    'slot_end' => $endDateTime->format('H:i'),
                    'existing_start' => $existingStart->format('H:i'),
                    'existing_end' => $existingEnd->format('H:i'),
                    'existing_id' => $existing->id,
                ]);
                return false;
            }
        }

        // Проверяем, что время находится в рабочих часах (если есть расписание)
        // ВАЖНО: Если расписание не настроено, разрешаем бронирование (для совместимости со старыми данными)
        if ($serviceData && isset($serviceData->schedule)) {
            // Если расписание - это строка JSON, декодируем ее
            $schedule = null;
            if (is_string($serviceData->schedule)) {
                $schedule = json_decode($serviceData->schedule, true);
            } elseif (is_array($serviceData->schedule)) {
                $schedule = $serviceData->schedule;
            }
            
            if ($schedule && is_array($schedule) && !empty($schedule)) {
                $dayOfWeek = strtolower($bookingDate->format('l')); // monday, tuesday, etc.
                
                Log::info('BookingService: isSlotAvailable - checking schedule', [
                    'date' => $date,
                    'dayOfWeek' => $dayOfWeek,
                    'schedule_keys' => array_keys($schedule),
                    'daySchedule_exists' => isset($schedule[$dayOfWeek]),
                    'daySchedule' => $schedule[$dayOfWeek] ?? null,
                    'bookingDateTime' => $bookingDateTime->format('Y-m-d H:i:s'),
                    'endDateTime' => $endDateTime->format('Y-m-d H:i:s'),
                ]);
                
                if (isset($schedule[$dayOfWeek]) && isset($schedule[$dayOfWeek]['enabled']) && $schedule[$dayOfWeek]['enabled']) {
                    $daySchedule = $schedule[$dayOfWeek];
                    if (isset($daySchedule['from']) && isset($daySchedule['to'])) {
                        $workStart = Carbon::parse($date . ' ' . $daySchedule['from'], $timezone);
                        $workEnd = Carbon::parse($date . ' ' . $daySchedule['to'], $timezone);
                        
                        Log::info('BookingService: isSlotAvailable - checking working hours', [
                            'workStart' => $workStart->format('Y-m-d H:i:s'),
                            'workEnd' => $workEnd->format('Y-m-d H:i:s'),
                            'bookingDateTime' => $bookingDateTime->format('Y-m-d H:i:s'),
                            'endDateTime' => $endDateTime->format('Y-m-d H:i:s'),
                            'isBeforeWorkStart' => $bookingDateTime->lt($workStart),
                            'isAfterWorkEnd' => $endDateTime->gt($workEnd),
                        ]);
                        
                        // Проверяем, что бронирование полностью находится в рабочих часах
                        // ВАЖНО: Если время 00:00, это может быть полночь, которая технически находится вне рабочих часов
                        // Но если пользователь явно выбрал это время, разрешаем его (возможно, это круглосуточная услуга)
                        $isMidnight = $bookingDateTime->format('H:i') === '00:00';
                        if (!$isMidnight && ($bookingDateTime->lt($workStart) || $endDateTime->gt($workEnd))) {
                            Log::warning('BookingService: isSlotAvailable - outside working hours', [
                                'date' => $date,
                                'time' => $time,
                                'workStart' => $daySchedule['from'],
                                'workEnd' => $daySchedule['to'],
                                'bookingDateTime' => $bookingDateTime->format('Y-m-d H:i:s'),
                                'endDateTime' => $endDateTime->format('Y-m-d H:i:s'),
                            ]);
                            return false;
                        }
                        // Если время 00:00, пропускаем проверку рабочих часов (может быть круглосуточная услуга)
                    }
                } else {
                    // Если день не активен в расписании, слот недоступен
                    // НО только если расписание действительно настроено (есть хотя бы один активный день)
                    $hasAnyEnabledDay = false;
                    foreach ($schedule as $daySchedule) {
                        if (isset($daySchedule['enabled']) && $daySchedule['enabled']) {
                            $hasAnyEnabledDay = true;
                            break;
                        }
                    }
                    
                    if ($hasAnyEnabledDay) {
                        // Расписание настроено, но этот день не активен
                        Log::warning('BookingService: isSlotAvailable - day not enabled in schedule', [
                            'date' => $date,
                            'dayOfWeek' => $dayOfWeek,
                            'schedule' => $schedule,
                        ]);
                        return false;
                    }
                    // Если расписание пустое или не настроено, разрешаем бронирование
                }
            }
            // Если расписание пустое или не настроено, разрешаем бронирование
        }

        Log::info('BookingService: isSlotAvailable - slot is available', [
            'date' => $date,
            'time' => $time,
            'durationMinutes' => $durationMinutes,
        ]);

        return true;
    }

    /**
     * Получить доступные временные слоты для даты
     */
    public function getAvailableSlots($companyId, $serviceId, $date, $serviceData = null, $specialistId = null)
    {
        // Логирование убрано для производительности (можно включить при отладке)
        
        $service = $serviceData;
        if (!$service) {
            $service = Service::find($serviceId);
        }
        if (!$service) {
            Log::warning('BookingService: Service not found', [
                'serviceId' => $serviceId,
                'hasServiceData' => $serviceData !== null,
            ]);
            return [];
        }

        $company = Company::find($companyId);
        if (!$company) {
            Log::warning('BookingService: Company not found', [
                'companyId' => $companyId,
            ]);
            return [];
        }

        // Получаем длительность услуги
        // ВАЖНО: duration из расписания (daySchedule['duration']) - это НЕ длительность услуги!
        // Также duration из JSON услуги может быть 1440 (24 часа) - это срок выполнения, а не длительность сеанса!
        // Используем только разумные значения или дефолт 60 минут
        $durationMinutes = 60; // Дефолтное значение
        
        // Сначала проверяем duration_minutes (если есть)
        if (isset($service->duration_minutes) && is_numeric($service->duration_minutes)) {
            $durationValue = (int)$service->duration_minutes;
            if ($durationValue >= 15 && $durationValue <= 480) { // От 15 минут до 8 часов
                $durationMinutes = $durationValue;
            }
        }
        
        // Если duration_minutes не подходит, проверяем duration из JSON
        // Но игнорируем значения >= 480 минут (8 часов), так как это скорее всего срок выполнения, а не длительность сеанса
        if ($durationMinutes === 60 && isset($service->duration) && is_numeric($service->duration)) {
            $durationValue = (int)$service->duration;
            // Принимаем только разумные значения для длительности сеанса
            if ($durationValue >= 15 && $durationValue < 480) { // От 15 минут до 8 часов (не включая 8 часов)
                $durationMinutes = $durationValue;
            }
            // Если duration >= 480 (например, 1440), игнорируем его - это не длительность сеанса
        }
        
        if ($durationMinutes < 15) {
            $durationMinutes = 15;
        }
        
        Log::info('BookingService: Service duration determined', [
            'durationMinutes' => $durationMinutes,
            'service->duration_minutes' => $service->duration_minutes ?? null,
            'service->duration' => $service->duration ?? null,
            'service_type' => gettype($service),
            'service_object' => is_object($service) ? get_object_vars($service) : $service,
        ]);

        // Определяем рабочие часы из расписания объявления или используем дефолтные
        $workingHours = [
            'start' => '09:00',
            'end' => '18:00',
            'duration' => $durationMinutes, // Длительность услуги для генерации слотов
        ];

        // Если есть расписание в объекте услуги (из объявления), используем его
        $schedule = null;
        if (isset($service->schedule)) {
            // Если расписание - это строка JSON, декодируем ее
            if (is_string($service->schedule)) {
                $schedule = json_decode($service->schedule, true);
            } elseif (is_array($service->schedule)) {
                $schedule = $service->schedule;
            }
        }
        
        if ($schedule && is_array($schedule)) {
            // Используем системную таймзону (пока системную, в будущем по штату)
            $timezone = config('app.timezone') ?: date_default_timezone_get();
            $dateObj = Carbon::parse($date, $timezone);
            $dayOfWeek = strtolower($dateObj->format('l')); // monday, tuesday, etc.
            
            Log::info('BookingService: Checking schedule for slots', [
                'date' => $date,
                'dayOfWeek' => $dayOfWeek,
                'schedule_keys' => array_keys($schedule),
                'daySchedule_exists' => isset($schedule[$dayOfWeek]),
                'daySchedule' => $schedule[$dayOfWeek] ?? null,
            ]);
            
            if (isset($schedule[$dayOfWeek]) && isset($schedule[$dayOfWeek]['enabled']) && $schedule[$dayOfWeek]['enabled']) {
                $daySchedule = $schedule[$dayOfWeek];
                if (isset($daySchedule['from']) && isset($daySchedule['to'])) {
                    $workingHours['start'] = $daySchedule['from'];
                    $workingHours['end'] = $daySchedule['to'];
                    // НЕ используем daySchedule['duration'] - это не длительность услуги!
                }
            } else {
                // Если день не активен в расписании, возвращаем пустой массив
                Log::warning('BookingService: Day not enabled in schedule', [
                    'date' => $date,
                    'dayOfWeek' => $dayOfWeek,
                    'schedule' => $schedule,
                    'daySchedule' => $schedule[$dayOfWeek] ?? null,
                ]);
                return [];
            }
        }

        // Генерируем слоты
        // Используем системную таймзону (пока системную, в будущем по штату)
        $timezone = config('app.timezone') ?: date_default_timezone_get();
        $now = Carbon::now($timezone);
        
        // Получаем существующие бронирования на эту дату
        // Форматируем дату для сравнения (Y-m-d)
        $dateFormatted = Carbon::parse($date, $timezone)->format('Y-m-d');
        $existingBookingsQuery = Booking::where('company_id', $companyId)
            ->whereDate('booking_date', $dateFormatted)
            ->whereIn('status', ['new', 'pending', 'confirmed', 'completed']);
        
        // Фильтруем по specialist_id (логика такая же, как в isSlotAvailable)
        if ($specialistId !== null) {
            $existingBookingsQuery->where(function($q) use ($specialistId) {
                $q->where('specialist_id', $specialistId)
                  ->orWhereNull('specialist_id');
            });
        } else {
            $existingBookingsQuery->whereNull('specialist_id');
        }
        
        $existingBookings = $existingBookingsQuery->get();
        
        Log::info('BookingService: Generating slots', [
            'date' => $date,
            'dateFormatted' => $dateFormatted,
            'workingHours' => $workingHours,
            'durationMinutes' => $durationMinutes,
            'existingBookingsCount' => $existingBookings->count(),
            'existingBookings' => $existingBookings->map(function($b) {
                return [
                    'id' => $b->id,
                    'time' => $b->booking_time,
                    'duration' => $b->duration_minutes,
                    'status' => $b->status,
                ];
            })->toArray(),
        ]);
        
        // Получаем шаг слотов из объявления или используем дефолт (60 минут = 1 час)
        $slotStepMinutes = 60; // Дефолтное значение (1 час)
        
        // Пытаемся получить шаг слотов из объявления
        if ($serviceData && isset($serviceData->advertisement_id)) {
            $advertisement = \App\Models\Advertisement::find($serviceData->advertisement_id);
            if ($advertisement && $advertisement->slot_step_minutes) {
                $slotStepValue = (int)$advertisement->slot_step_minutes;
                // Минимум 15 минут, максимум 240 минут (4 часа)
                if ($slotStepValue >= 15 && $slotStepValue <= 240) {
                    $slotStepMinutes = $slotStepValue;
                }
            }
        } elseif ($serviceData && isset($serviceData->slot_step_minutes)) {
            // Если шаг слотов передан напрямую в serviceData
            $slotStepValue = (int)$serviceData->slot_step_minutes;
            if ($slotStepValue >= 15 && $slotStepValue <= 240) {
                $slotStepMinutes = $slotStepValue;
            }
        }
        
        Log::info('BookingService: Slot step determined', [
            'slotStepMinutes' => $slotStepMinutes,
            'hasAdvertisementId' => isset($serviceData->advertisement_id),
        ]);
        
        $slots = [];
        $startTime = Carbon::parse($date . ' ' . $workingHours['start'], $timezone);
        $endTime = Carbon::parse($date . ' ' . $workingHours['end'], $timezone);
        $currentTime = $startTime->copy();
        
        // ВАЖНО: Слоты генерируются с настраиваемым шагом (из объявления или дефолт 60 минут)
        // Проверка доступности использует длительность услуги (durationMinutes)
        // Это позволяет показывать слоты с нужным шагом, но проверять, можно ли начать бронирование
        // с длительностью услуги в это время
        $slotDisplayDuration = $slotStepMinutes; // Длительность отображения слота = шаг слотов

        while ($currentTime->copy()->addMinutes($slotDisplayDuration)->lte($endTime)) {
            $slotTime = $currentTime->format('H:i');
            // end_time используется только для отображения в UI, не для проверки доступности
            $slotEndTime = $currentTime->copy()->addMinutes($slotDisplayDuration)->format('H:i');

            // ВАЖНО: Используем isSlotAvailable для проверки каждого слота
            // Проверяем, можно ли начать бронирование в это время с длительностью услуги
            // Это гарантирует, что проверка такая же, как при создании бронирования
            // (рабочие часы, пересечения с существующими бронированиями, прошлое время)
            $isAvailable = $this->isSlotAvailable(
                $companyId,
                $serviceId,
                $date,
                $slotTime,
                $durationMinutes, // Используем длительность услуги для проверки доступности
                null, // excludeBookingId
                $serviceData, // Передаем данные услуги для проверки расписания
                $specialistId // Передаем specialist_id для фильтрации бронирований
            );

            // Добавляем слот с правильным флагом доступности
            $slots[] = [
                'time' => $slotTime,
                'end_time' => $slotEndTime, // Только для отображения в UI
                'available' => $isAvailable,
            ];

            $currentTime->addMinutes($slotStepMinutes); // Используем шаг слотов из настройки
        }

        Log::info('BookingService: Generated slots', [
            'date' => $date,
            'slotsCount' => count($slots),
            'availableSlotsCount' => count(array_filter($slots, fn($s) => $s['available'])),
        ]);

        return $slots;
    }

    /**
     * Создать бронирование
     */
    public function createBooking($data)
    {
        // Получаем данные услуги для проверки расписания
        $serviceData = null;
        if (isset($data['service_data'])) {
            $serviceData = $data['service_data'];
        } else {
            // Пытаемся найти услугу в БД
            $service = Service::find($data['service_id']);
            if ($service) {
                $serviceData = $service;
            }
        }
        
        $durationMinutes = $data['duration_minutes'] ?? 60;
        
        Log::info('BookingService: createBooking - checking availability', [
            'company_id' => $data['company_id'],
            'service_id' => $data['service_id'],
            'booking_date' => $data['booking_date'],
            'booking_time' => $data['booking_time'],
            'duration_minutes' => $durationMinutes,
            'has_service_data' => $serviceData !== null,
            'service_data_type' => $serviceData ? gettype($serviceData) : null,
            'advertisement_id' => $data['advertisement_id'] ?? null,
        ]);
        
        // Проверяем доступность с передачей serviceData для проверки расписания
        // Передаем specialist_id для правильной фильтрации бронирований
        $isAvailable = $this->isSlotAvailable(
            $data['company_id'],
            $data['service_id'],
            $data['booking_date'],
            $data['booking_time'],
            $durationMinutes,
            null, // excludeBookingId
            $serviceData, // Передаем данные услуги для проверки расписания
            $data['specialist_id'] ?? null // Передаем specialist_id для фильтрации бронирований
        );

        Log::info('BookingService: createBooking - availability check result', [
            'isAvailable' => $isAvailable,
            'booking_date' => $data['booking_date'],
            'booking_time' => $data['booking_time'],
        ]);

        if (!$isAvailable) {
            throw new \Exception('Выбранное время уже занято. Пожалуйста, выберите другое время.');
        }

        // Получаем цену услуги (если услуга существует в таблице services)
        $service = Service::find($data['service_id']);
        $price = $data['price'] ?? ($service ? $service->price : 0);

        // Парсим дату БЕЗ учета часового пояса - просто как дату
        // Это предотвращает смещение даты при сохранении в базу данных
        $bookingDateString = $data['booking_date'];
        
        // Если дата в формате Y-m-d, добавляем время
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $bookingDateString)) {
            $bookingDateString .= ' 00:00:00';
        }
        
        $booking = Booking::create([
            'company_id' => $data['company_id'],
            'user_id' => $data['user_id'] ?? null,
            'service_id' => $data['service_id'],
            'advertisement_id' => $data['advertisement_id'] ?? null, // Сохраняем ID объявления для правильного отображения
            'specialist_id' => $data['specialist_id'] ?? null,
            'booking_date' => $bookingDateString, // Сохраняем как есть, без конвертации часового пояса
            'booking_time' => $data['booking_time'],
            'duration_minutes' => $data['duration_minutes'] ?? ($service ? $service->duration_minutes : 60),
            'price' => $price,
            'status' => $data['status'] ?? 'new',
            'notes' => $data['notes'] ?? null,
            'client_notes' => $data['client_notes'] ?? null,
            'client_name' => $data['client_name'] ?? null,
            'client_phone' => $data['client_phone'] ?? null,
            'client_email' => $data['client_email'] ?? null,
        ]);

        return $booking;
    }
}


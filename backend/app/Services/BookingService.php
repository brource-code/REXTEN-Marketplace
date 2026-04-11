<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Service;
use App\Models\Company;
use App\Services\ActivityService;
use App\Services\Routing\GeocodingService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Support\NotificationLocale;

class BookingService
{
    /**
     * Проверка доступности слота для бронирования
     */
    public function isSlotAvailable($companyId, $serviceId, $date, $time, $durationMinutes = 60, $excludeBookingId = null, $serviceData = null, $specialistId = null)
    {
        $timezone = Company::timezoneById((int) $companyId);

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
        Log::info('BookingService: checking serviceData for schedule', [
            'hasServiceData' => $serviceData !== null,
            'hasSchedule' => $serviceData && isset($serviceData->schedule),
            'scheduleType' => $serviceData && isset($serviceData->schedule) ? gettype($serviceData->schedule) : 'none',
        ]);
        
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
                        
                        // Проверяем перерывы
                        Log::info('BookingService: checking breaks', [
                            'breakEnabled' => $schedule['breakEnabled'] ?? null,
                            'breakFrom' => $schedule['breakFrom'] ?? null,
                            'breakTo' => $schedule['breakTo'] ?? null,
                            'time' => $time,
                        ]);
                        
                        if (isset($schedule['breakEnabled']) && $schedule['breakEnabled'] && 
                            isset($schedule['breakFrom']) && isset($schedule['breakTo'])) {
                            $breakStart = Carbon::parse($date . ' ' . $schedule['breakFrom'], $timezone);
                            $breakEnd = Carbon::parse($date . ' ' . $schedule['breakTo'], $timezone);
                            
                            // Проверяем, что бронирование не пересекается с перерывом
                            // Интервалы пересекаются, если начало нового < конец перерыва И конец нового > начало перерыва
                            $overlapsBreak = $bookingDateTime->lt($breakEnd) && $endDateTime->gt($breakStart);
                            
                            if ($overlapsBreak) {
                                Log::warning('BookingService: isSlotAvailable - overlaps with break time', [
                                    'date' => $date,
                                    'time' => $time,
                                    'breakFrom' => $schedule['breakFrom'],
                                    'breakTo' => $schedule['breakTo'],
                                    'bookingDateTime' => $bookingDateTime->format('Y-m-d H:i:s'),
                                    'endDateTime' => $endDateTime->format('Y-m-d H:i:s'),
                                ]);
                                return false;
                            }
                        }
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

        $timezone = $company->resolveTimezone();

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
        // Определяем, является ли это произвольным событием (нет service_id)
        $isCustomEvent = empty($data['service_id']);
        
        // Получаем данные услуги для проверки расписания (только для событий с услугой)
        $serviceData = null;
        if (!$isCustomEvent) {
            if (isset($data['service_data'])) {
                $serviceData = $data['service_data'];
            } else {
                // Пытаемся найти услугу в БД
                $service = Service::find($data['service_id']);
                if ($service) {
                    $serviceData = $service;
                }
            }
        }
        
        $durationMinutes = $data['duration_minutes'] ?? 60;
        
        Log::info('BookingService: createBooking - checking availability', [
            'company_id' => $data['company_id'],
            'service_id' => $data['service_id'],
            'is_custom_event' => $isCustomEvent,
            'booking_date' => $data['booking_date'],
            'booking_time' => $data['booking_time'],
            'duration_minutes' => $durationMinutes,
            'has_service_data' => $serviceData !== null,
            'service_data_type' => $serviceData ? gettype($serviceData) : null,
            'advertisement_id' => $data['advertisement_id'] ?? null,
        ]);
        
        // Проверяем доступность только для событий с услугой
        // Для произвольных событий проверка доступности уже выполнена в контроллере
        if (!$isCustomEvent) {
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
        } else {
            Log::info('BookingService: createBooking - skipping availability check for custom event');
        }

        // Получаем цену услуги (если услуга существует в таблице services)
        // Для произвольных событий service_id может быть null
        $service = null;
        if (!$isCustomEvent && !empty($data['service_id'])) {
            $service = Service::find($data['service_id']);
        }
        $price = $data['price'] ?? ($service ? $service->price : 0);

        // Парсим дату БЕЗ учета часового пояса - просто как дату
        // Это предотвращает смещение даты при сохранении в базу данных
        $bookingDateString = $data['booking_date'];
        
        // Если дата в формате Y-m-d, добавляем время
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $bookingDateString)) {
            $bookingDateString .= ' 00:00:00';
        }
        
        try {
            $booking = Booking::create([
                'company_id' => $data['company_id'],
                'user_id' => $data['user_id'] ?? null,
                'service_id' => $data['service_id'] ?? null, // Может быть null для произвольных событий
                'title' => $data['title'] ?? null, // Название для кастомных событий
                'advertisement_id' => $data['advertisement_id'] ?? null, // Сохраняем ID объявления для правильного отображения
                'execution_type' => $data['execution_type'] ?? 'onsite',
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
        } catch (\Exception $e) {
            Log::error('BookingService: createBooking - failed to create booking', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'data' => [
                    'company_id' => $data['company_id'] ?? null,
                    'user_id' => $data['user_id'] ?? null,
                    'service_id' => $data['service_id'] ?? null,
                    'is_custom_event' => $isCustomEvent,
                    'booking_date' => $bookingDateString,
                    'booking_time' => $data['booking_time'] ?? null,
                ],
            ]);
            throw $e;
        }

        // Если execution_type = 'offsite', создаем booking_location при непустой строке адреса
        if (($data['execution_type'] ?? 'onsite') === 'offsite') {
            $line1 = isset($data['address_line1']) ? trim((string) $data['address_line1']) : '';
            if ($line1 !== '') {
                \App\Models\BookingLocation::create([
                    'booking_id' => $booking->id,
                    'type' => 'client',
                    'address_line1' => $line1,
                    'city' => isset($data['city']) && $data['city'] !== null && trim((string) $data['city']) !== '' ? trim((string) $data['city']) : null,
                    'state' => isset($data['state']) && $data['state'] !== null && trim((string) $data['state']) !== '' ? trim((string) $data['state']) : null,
                    'zip' => isset($data['zip']) && $data['zip'] !== null && trim((string) $data['zip']) !== '' ? trim((string) $data['zip']) : null,
                    'lat' => $data['lat'] ?? null,
                    'lng' => $data['lng'] ?? null,
                    'notes' => $data['location_notes'] ?? null,
                ]);
            }
        }

        try {
            app(GeocodingService::class)->geocodeBooking(
                $booking->fresh(['location', 'user.profile'])
            );
        } catch (\Throwable $e) {
            Log::warning('BookingService: geocodeBooking after create: '.$e->getMessage());
        }

        try {
            ActivityService::logBookingCreated($booking->fresh());
        } catch (\Throwable $e) {
            Log::warning('Activity log booking created: '.$e->getMessage());
        }

        return $booking;
    }

    /**
     * Отправить уведомление владельцу бизнеса о новом бронировании.
     * Вызывать после создания бронирования (из календаря, с маркетплейса или через API).
     */
    public function notifyOwnerAboutNewBooking(Booking $booking): void
    {
        $company = $booking->company;
        if (!$company || !$company->owner_id) {
            return;
        }

        $serviceName = 'Услуга';
        if ($booking->advertisement_id) {
            $advertisement = \App\Models\Advertisement::find($booking->advertisement_id);
            if ($advertisement) {
                $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                $serviceData = collect($services)->first(function ($s) use ($booking) {
                    return isset($s['id']) && (string)($s['id'] ?? '') === (string)$booking->service_id;
                });
                if ($serviceData && isset($serviceData['name'])) {
                    $serviceName = $serviceData['name'];
                }
            }
        }
        if ($serviceName === 'Услуга' && $booking->service) {
            $serviceName = $booking->service->name;
        }

        $clientName = $booking->client_name;
        if (!$clientName && $booking->user_id && $booking->user) {
            $profile = $booking->user->profile;
            $clientName = $profile ? trim(($profile->first_name ?? '') . ' ' . ($profile->last_name ?? '')) : $booking->user->email;
        }

        $owner = \App\Models\User::find($company->owner_id);
        $ownerLocale = NotificationLocale::forBusinessOwner($owner);
        $clientName = $clientName ?: ($ownerLocale === 'ru' ? 'Клиент' : ($ownerLocale === 'es-mx' ? 'Cliente' : ($ownerLocale === 'hy-am' ? 'Հաճախորդ' : ($ownerLocale === 'uk-ua' ? 'Клієнт' : 'Client'))));

        $bookingDate = '';
        if ($booking->booking_date) {
            $date = $booking->booking_date instanceof \Carbon\Carbon
                ? $booking->booking_date
                : \Carbon\Carbon::parse($booking->booking_date);
            $bookingDate = ($ownerLocale === 'en' || $ownerLocale === 'es-mx' || $ownerLocale === 'hy-am' || $ownerLocale === 'uk-ua')
                ? $date->format('M d, Y')
                : $date->format('d.m.Y');
        }
        $bookingTime = $booking->booking_time ?? '';

        $translations = [
            'ru' => [
                'title' => 'Новое бронирование',
                'message' => "Клиент {$clientName} забронировал «{$serviceName}» на {$bookingDate} в {$bookingTime}.",
            ],
            'en' => [
                'title' => 'New booking',
                'message' => "Client {$clientName} booked «{$serviceName}» on {$bookingDate} at {$bookingTime}.",
            ],
            'es-mx' => [
                'title' => 'Nueva reserva',
                'message' => "El cliente {$clientName} reservó «{$serviceName}» el {$bookingDate} a las {$bookingTime}.",
            ],
            'hy-am' => [
                'title' => 'Նոր ամրագրում',
                'message' => "Հաճախորդ {$clientName}-ը ամրագրել է «{$serviceName}»-ը՝ {$bookingDate}, ժամը {$bookingTime}։",
            ],
            'uk-ua' => [
                'title' => 'Нове бронювання',
                'message' => "Клієнт {$clientName} забронював(ла) «{$serviceName}» на {$bookingDate} о {$bookingTime}.",
            ],
        ];
        $t = $translations[$ownerLocale];
        $link = '/business/schedule';

        if (BusinessOwnerNotificationPreferences::allowsOwnerInAppNotification(
            $company,
            BusinessOwnerNotificationPreferences::EVENT_NEW_BOOKING
        )) {
            try {
                \App\Models\Notification::create([
                    'user_id' => $company->owner_id,
                    'type' => 'new_booking',
                    'title' => $t['title'],
                    'message' => $t['message'],
                    'link' => $link,
                    'read' => false,
                ]);
                Log::info('BookingService: New booking notification sent to owner', [
                    'booking_id' => $booking->id,
                    'owner_id' => $company->owner_id,
                ]);
            } catch (\Exception $e) {
                Log::error('BookingService: Failed to send new booking notification to owner', [
                    'booking_id' => $booking->id,
                    'owner_id' => $company->owner_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        BusinessOwnerMailer::notifyIfEnabled(
            $company,
            (int) $company->owner_id,
            BusinessOwnerNotificationPreferences::EVENT_NEW_BOOKING,
            $t['title'],
            $t['message'],
            '/business/schedule'
        );
    }

    /**
     * Уведомить владельца бизнеса об изменении статуса бронирования (подтверждено / отменено).
     */
    public function notifyOwnerAboutBookingStatusChange(Booking $booking, string $newStatus): void
    {
        if (!in_array($newStatus, ['confirmed', 'cancelled'], true)) {
            return;
        }

        $company = $booking->company;
        if (!$company || !$company->owner_id) {
            return;
        }

        $prefEvent = $newStatus === 'confirmed'
            ? BusinessOwnerNotificationPreferences::EVENT_NEW_BOOKING
            : BusinessOwnerNotificationPreferences::EVENT_BOOKING_CANCELLED;

        $serviceName = 'Услуга';
        if ($booking->advertisement_id) {
            $advertisement = \App\Models\Advertisement::find($booking->advertisement_id);
            if ($advertisement) {
                $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                $serviceData = collect($services)->first(function ($s) use ($booking) {
                    return isset($s['id']) && (string)($s['id'] ?? '') === (string)$booking->service_id;
                });
                if ($serviceData && isset($serviceData['name'])) {
                    $serviceName = $serviceData['name'];
                }
            }
        }
        if ($serviceName === 'Услуга' && $booking->service) {
            $serviceName = $booking->service->name;
        }

        $clientName = $booking->client_name;
        if (!$clientName && $booking->user_id && $booking->user) {
            $profile = $booking->user->profile;
            $clientName = $profile ? trim(($profile->first_name ?? '') . ' ' . ($profile->last_name ?? '')) : $booking->user->email;
        }

        $owner = \App\Models\User::find($company->owner_id);
        $ownerLocale = NotificationLocale::forBusinessOwner($owner);
        $clientName = $clientName ?: ($ownerLocale === 'ru' ? 'Клиент' : ($ownerLocale === 'es-mx' ? 'Cliente' : ($ownerLocale === 'hy-am' ? 'Հաճախորդ' : ($ownerLocale === 'uk-ua' ? 'Клієнт' : 'Client'))));

        $bookingDate = '';
        if ($booking->booking_date) {
            $date = $booking->booking_date instanceof \Carbon\Carbon
                ? $booking->booking_date
                : \Carbon\Carbon::parse($booking->booking_date);
            $bookingDate = ($ownerLocale === 'en' || $ownerLocale === 'es-mx' || $ownerLocale === 'hy-am' || $ownerLocale === 'uk-ua') ? $date->format('M d, Y') : $date->format('d.m.Y');
        }
        $bookingTime = $booking->booking_time ?? '';

        $translations = [
            'ru' => [
                'new_booking' => ['title' => 'Новое бронирование подтверждено', 'message' => "Клиент {$clientName} забронировал «{$serviceName}» на {$bookingDate} в {$bookingTime}."],
                'booking_cancelled' => ['title' => 'Бронирование отменено', 'message' => "Бронирование «{$serviceName}» от {$clientName} на {$bookingDate} в {$bookingTime} отменено."],
            ],
            'en' => [
                'new_booking' => ['title' => 'New booking confirmed', 'message' => "Client {$clientName} booked «{$serviceName}» on {$bookingDate} at {$bookingTime}."],
                'booking_cancelled' => ['title' => 'Booking cancelled', 'message' => "Booking «{$serviceName}» from {$clientName} on {$bookingDate} at {$bookingTime} has been cancelled."],
            ],
            'es-mx' => [
                'new_booking' => ['title' => 'Reserva confirmada', 'message' => "El cliente {$clientName} reservó «{$serviceName}» el {$bookingDate} a las {$bookingTime}."],
                'booking_cancelled' => ['title' => 'Reserva cancelada', 'message' => "La reserva de «{$serviceName}» de {$clientName} el {$bookingDate} a las {$bookingTime} fue cancelada."],
            ],
            'hy-am' => [
                'new_booking' => ['title' => 'Ամրագրումը հաստատված է', 'message' => "Հաճախորդ {$clientName}-ը ամրագրել է «{$serviceName}»-ը՝ {$bookingDate}, ժամը {$bookingTime}։"],
                'booking_cancelled' => ['title' => 'Ամրագրումը չեղարկված է', 'message' => "«{$serviceName}» ամրագրումը ({$clientName}, {$bookingDate}, {$bookingTime}) չեղարկվել է։"],
            ],
            'uk-ua' => [
                'new_booking' => ['title' => 'Нове бронювання підтверджено', 'message' => "Клієнт {$clientName} забронював(ла) «{$serviceName}» на {$bookingDate} о {$bookingTime}."],
                'booking_cancelled' => ['title' => 'Бронювання скасовано', 'message' => "Бронювання «{$serviceName}» від {$clientName} на {$bookingDate} о {$bookingTime} скасовано."],
            ],
        ];
        $type = $newStatus === 'confirmed' ? 'new_booking' : 'booking_cancelled';
        $t = $translations[$ownerLocale][$type];

        if (BusinessOwnerNotificationPreferences::allowsOwnerInAppNotification($company, $prefEvent)) {
            try {
                \App\Models\Notification::create([
                    'user_id' => $company->owner_id,
                    'type' => $type,
                    'title' => $t['title'],
                    'message' => $t['message'],
                    'link' => '/business/schedule',
                    'read' => false,
                ]);
            } catch (\Exception $e) {
                Log::error('BookingService: Failed to send booking status notification to owner', [
                    'booking_id' => $booking->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        BusinessOwnerMailer::notifyIfEnabled(
            $company,
            (int) $company->owner_id,
            $prefEvent,
            $t['title'],
            $t['message'],
            '/business/schedule'
        );
    }

    /**
     * Отправить уведомление владельцу бизнеса о новом отзыве.
     */
    public function notifyOwnerAboutNewReview(\App\Models\Review $review): void
    {
        $company = $review->company;
        if (!$company || !$company->owner_id) {
            return;
        }

        $owner = \App\Models\User::find($company->owner_id);
        $ownerLocale = NotificationLocale::forBusinessOwner($owner);

        $serviceName = $review->service ? $review->service->name : ($ownerLocale === 'ru' ? 'Услуга' : ($ownerLocale === 'es-mx' ? 'Servicio' : ($ownerLocale === 'hy-am' ? 'Ծառայություն' : ($ownerLocale === 'uk-ua' ? 'Послуга' : 'Service'))));
        $rating = $review->rating;
        $commentPreview = mb_strlen($review->comment) > 80 ? mb_substr($review->comment, 0, 77) . '...' : $review->comment;

        $translations = [
            'ru' => [
                'title' => 'Новый отзыв',
                'message' => "Оценка {$rating}/5. «{$commentPreview}»",
            ],
            'en' => [
                'title' => 'New review',
                'message' => "Rating {$rating}/5. «{$commentPreview}»",
            ],
            'es-mx' => [
                'title' => 'Nueva reseña',
                'message' => "Calificación {$rating}/5. «{$commentPreview}»",
            ],
            'hy-am' => [
                'title' => 'Նոր կարծիք',
                'message' => "Գնահատում՝ {$rating}/5։ «{$commentPreview}»",
            ],
            'uk-ua' => [
                'title' => 'Новий відгук',
                'message' => "Оцінка {$rating}/5. «{$commentPreview}»",
            ],
        ];
        $t = $translations[$ownerLocale];
        $link = '/business/reviews';

        if (BusinessOwnerNotificationPreferences::allowsOwnerInAppNotification(
            $company,
            BusinessOwnerNotificationPreferences::EVENT_REVIEW
        )) {
            try {
                \App\Models\Notification::create([
                    'user_id' => $company->owner_id,
                    'type' => 'review',
                    'title' => $t['title'],
                    'message' => $t['message'],
                    'link' => $link,
                    'read' => false,
                ]);
                Log::info('BookingService: New review notification sent to owner', [
                    'review_id' => $review->id,
                    'owner_id' => $company->owner_id,
                ]);
            } catch (\Exception $e) {
                Log::error('BookingService: Failed to send new review notification to owner', [
                    'review_id' => $review->id,
                    'owner_id' => $company->owner_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        BusinessOwnerMailer::notifyIfEnabled(
            $company,
            (int) $company->owner_id,
            BusinessOwnerNotificationPreferences::EVENT_REVIEW,
            $t['title'],
            $t['message'],
            '/business/reviews'
        );
    }
}


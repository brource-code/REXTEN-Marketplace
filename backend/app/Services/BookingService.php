<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Service;
use App\Models\TeamMember;
use App\Models\Company;
use App\Services\ActivityService;
use App\Services\Routing\GeocodingService;
use Carbon\Carbon;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Support\MarketplaceClient;
use App\Support\NotificationLocale;
use App\Services\ClientNotificationMailer;
use Stripe\PaymentIntent;
use Stripe\Refund;
use Stripe\Stripe;

class BookingService
{
    /**
     * Проверка доступности слота для бронирования
     */
    public function isSlotAvailable($companyId, $serviceId, $date, $time, $durationMinutes = 60, $excludeBookingId = null, $serviceData = null, $specialistId = null)
    {
        if ($serviceId) {
            $svc = Service::where('id', $serviceId)->where('company_id', $companyId)->first();
            if (!$svc || !$svc->is_active) {
                return false;
            }
        }
        if ($specialistId !== null && $specialistId !== '') {
            $tm = TeamMember::where('id', $specialistId)->where('company_id', $companyId)->first();
            if (!$tm || !$tm->is_active) {
                return false;
            }
        }

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

        if ($excludeBookingId) {
            $existingBookings = $existingBookings->reject(function ($booking) use ($excludeBookingId) {
                return $booking->id == $excludeBookingId;
            });
        }

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
            
            if ($overlaps) {
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
                
                if (isset($schedule[$dayOfWeek]) && isset($schedule[$dayOfWeek]['enabled']) && $schedule[$dayOfWeek]['enabled']) {
                    $daySchedule = $schedule[$dayOfWeek];
                    if (isset($daySchedule['from']) && isset($daySchedule['to'])) {
                        $workStart = Carbon::parse($date . ' ' . $daySchedule['from'], $timezone);
                        $workEnd = Carbon::parse($date . ' ' . $daySchedule['to'], $timezone);
                        
                        // Проверяем, что бронирование полностью находится в рабочих часах
                        // ВАЖНО: Если время 00:00, это может быть полночь, которая технически находится вне рабочих часов
                        // Но если пользователь явно выбрал это время, разрешаем его (возможно, это круглосуточная услуга)
                        $isMidnight = $bookingDateTime->format('H:i') === '00:00';
                        if (!$isMidnight && ($bookingDateTime->lt($workStart) || $endDateTime->gt($workEnd))) {
                            return false;
                        }
                        // Если время 00:00, пропускаем проверку рабочих часов (может быть круглосуточная услуга)
                        
                        if (isset($schedule['breakEnabled']) && $schedule['breakEnabled'] && 
                            isset($schedule['breakFrom']) && isset($schedule['breakTo'])) {
                            $breakStart = Carbon::parse($date . ' ' . $schedule['breakFrom'], $timezone);
                            $breakEnd = Carbon::parse($date . ' ' . $schedule['breakTo'], $timezone);
                            
                            // Проверяем, что бронирование не пересекается с перерывом
                            // Интервалы пересекаются, если начало нового < конец перерыва И конец нового > начало перерыва
                            $overlapsBreak = $bookingDateTime->lt($breakEnd) && $endDateTime->gt($breakStart);
                            
                            if ($overlapsBreak) {
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
                        return false;
                    }
                    // Если расписание пустое или не настроено, разрешаем бронирование
                }
            }
            // Если расписание пустое или не настроено, разрешаем бронирование
        }

        return true;
    }

    /**
     * Получить доступные временные слоты для даты
     */
    public function getAvailableSlots($companyId, $serviceId, $date, $serviceData = null, $specialistId = null)
    {
        $service = $serviceData;
        if (!$service) {
            $service = Service::where('id', $serviceId)->where('company_id', $companyId)->first();
        }
        if (!$service || !$service->is_active) {
            return [];
        }

        $company = Company::find($companyId);
        if (!$company) {
            return [];
        }

        $timezone = $company->resolveTimezone();
        $durationMinutes = $this->resolveServiceDuration($service);

        $workingHours = ['start' => '09:00', 'end' => '18:00'];
        $schedule = $this->resolveSchedule($service);
        $breakStart = null;
        $breakEnd = null;

        if ($schedule && is_array($schedule)) {
            $dateObj = Carbon::parse($date, $timezone);
            $dayOfWeek = strtolower($dateObj->format('l'));

            if (isset($schedule[$dayOfWeek]['enabled']) && $schedule[$dayOfWeek]['enabled']) {
                $daySchedule = $schedule[$dayOfWeek];
                if (isset($daySchedule['from']) && isset($daySchedule['to'])) {
                    $workingHours['start'] = $daySchedule['from'];
                    $workingHours['end'] = $daySchedule['to'];
                }
            } else {
                return [];
            }

            if (!empty($schedule['breakEnabled']) && isset($schedule['breakFrom']) && isset($schedule['breakTo'])) {
                $breakStart = Carbon::parse($date . ' ' . $schedule['breakFrom'], $timezone);
                $breakEnd = Carbon::parse($date . ' ' . $schedule['breakTo'], $timezone);
            }
        }

        $now = Carbon::now($timezone);
        $dateFormatted = Carbon::parse($date, $timezone)->format('Y-m-d');

        $existingBookingsQuery = Booking::where('company_id', $companyId)
            ->whereDate('booking_date', $dateFormatted)
            ->whereIn('status', ['new', 'pending', 'confirmed', 'completed']);

        if ($specialistId !== null) {
            $existingBookingsQuery->where(function($q) use ($specialistId) {
                $q->where('specialist_id', $specialistId)
                  ->orWhereNull('specialist_id');
            });
        } else {
            $existingBookingsQuery->whereNull('specialist_id');
        }

        $existingBookings = $existingBookingsQuery->get();

        $parsedBookings = $existingBookings->map(function ($b) use ($dateFormatted, $timezone) {
            $t = $b->booking_time;
            if (strlen($t) === 5) $t .= ':00';
            $start = Carbon::parse($dateFormatted . ' ' . $t, $timezone);
            $end = $start->copy()->addMinutes($b->duration_minutes ?? 60);
            return (object)['start' => $start, 'end' => $end];
        });

        $slotStepMinutes = $this->resolveSlotStep($serviceData);

        $slots = [];
        $startTime = Carbon::parse($date . ' ' . $workingHours['start'], $timezone);
        $endTime = Carbon::parse($date . ' ' . $workingHours['end'], $timezone);
        $currentTime = $startTime->copy();
        $slotDisplayDuration = $slotStepMinutes;

        while ($currentTime->copy()->addMinutes($slotDisplayDuration)->lte($endTime)) {
            $slotTime = $currentTime->format('H:i');
            $slotEndTime = $currentTime->copy()->addMinutes($slotDisplayDuration)->format('H:i');

            $bookingStart = $currentTime->copy();
            $bookingEnd = $currentTime->copy()->addMinutes($durationMinutes);

            $isAvailable = true;

            if ($bookingStart->lt($now)) {
                $isAvailable = false;
            }

            if ($isAvailable && $breakStart && $breakEnd) {
                if ($bookingStart->lt($breakEnd) && $bookingEnd->gt($breakStart)) {
                    $isAvailable = false;
                }
            }

            if ($isAvailable) {
                foreach ($parsedBookings as $pb) {
                    if ($bookingStart->lt($pb->end) && $bookingEnd->gt($pb->start)) {
                        $isAvailable = false;
                        break;
                    }
                }
            }

            $slots[] = [
                'time' => $slotTime,
                'end_time' => $slotEndTime,
                'available' => $isAvailable,
            ];

            $currentTime->addMinutes($slotStepMinutes);
        }

        Log::info('BookingService: Generated slots', [
            'date' => $date,
            'slotsCount' => count($slots),
            'availableSlotsCount' => count(array_filter($slots, fn($s) => $s['available'])),
        ]);

        return $slots;
    }

    /**
     * Resolve service duration from various sources (duration_minutes, duration JSON field).
     * Returns value in minutes (15..480), default 60.
     */
    private function resolveServiceDuration($service): int
    {
        $durationMinutes = 60;

        if (isset($service->duration_minutes) && is_numeric($service->duration_minutes)) {
            $v = (int)$service->duration_minutes;
            if ($v >= 15 && $v <= 480) $durationMinutes = $v;
        }

        if ($durationMinutes === 60 && isset($service->duration) && is_numeric($service->duration)) {
            $v = (int)$service->duration;
            if ($v >= 15 && $v < 480) $durationMinutes = $v;
        }

        return max(15, $durationMinutes);
    }

    /**
     * Parse schedule from service object (string or array).
     */
    private function resolveSchedule($service): ?array
    {
        if (!isset($service->schedule)) return null;

        if (is_string($service->schedule)) {
            return json_decode($service->schedule, true);
        }
        if (is_array($service->schedule)) {
            return $service->schedule;
        }
        return null;
    }

    /**
     * Resolve slot step minutes from advertisement or serviceData.
     */
    private function resolveSlotStep($serviceData): int
    {
        $slotStepMinutes = 60;

        if ($serviceData && isset($serviceData->advertisement_id)) {
            $ad = \App\Models\Advertisement::find($serviceData->advertisement_id);
            if ($ad && $ad->slot_step_minutes) {
                $v = (int)$ad->slot_step_minutes;
                if ($v >= 15 && $v <= 240) $slotStepMinutes = $v;
            }
        } elseif ($serviceData && isset($serviceData->slot_step_minutes)) {
            $v = (int)$serviceData->slot_step_minutes;
            if ($v >= 15 && $v <= 240) $slotStepMinutes = $v;
        }

        return $slotStepMinutes;
    }

    /**
     * Услуга и специалист должны быть активны (в т.ч. после даунгрейда подписки).
     */
    private function assertActiveBookingEntities(int $companyId, ?int $serviceId, ?int $specialistId): void
    {
        if ($serviceId) {
            $svc = Service::where('id', $serviceId)->where('company_id', $companyId)->first();
            if (!$svc) {
                throw ValidationException::withMessages([
                    'service_id' => ['Услуга не найдена для этой компании.'],
                ]);
            }
            if (!$svc->is_active) {
                throw ValidationException::withMessages([
                    'service_id' => ['Услуга недоступна для записи (деактивирована).'],
                ]);
            }
        }
        if ($specialistId) {
            $tm = TeamMember::where('id', $specialistId)->where('company_id', $companyId)->first();
            if (!$tm) {
                throw ValidationException::withMessages([
                    'specialist_id' => ['Специалист не найден для этой компании.'],
                ]);
            }
            if (!$tm->is_active) {
                throw ValidationException::withMessages([
                    'specialist_id' => ['Специалист недоступен для записи (деактивирован).'],
                ]);
            }
        }
    }

    /**
     * Batch: get available slots for multiple dates at once.
     * Returns ['2025-04-12' => [...slots], '2025-04-13' => [...slots], ...]
     */
    public function getAvailableSlotsBatch($companyId, $serviceId, array $dates, $serviceData = null, $specialistId = null): array
    {
        $service = $serviceData;
        if (!$service) {
            $service = Service::where('id', $serviceId)->where('company_id', $companyId)->first();
        }
        if (!$service || !$service->is_active) {
            return [];
        }

        $company = Company::find($companyId);
        if (!$company) return [];

        $timezone = $company->resolveTimezone();
        $durationMinutes = $this->resolveServiceDuration($service);
        $schedule = $this->resolveSchedule($service);
        $slotStepMinutes = $this->resolveSlotStep($serviceData);
        $now = Carbon::now($timezone);

        $globalBreakFrom = ($schedule && !empty($schedule['breakEnabled']) && isset($schedule['breakFrom'])) ? $schedule['breakFrom'] : null;
        $globalBreakTo = ($schedule && !empty($schedule['breakEnabled']) && isset($schedule['breakTo'])) ? $schedule['breakTo'] : null;

        $formattedDates = array_map(fn($d) => Carbon::parse($d, $timezone)->format('Y-m-d'), $dates);

        $existingBookingsQuery = Booking::where('company_id', $companyId)
            ->whereIn(\DB::raw("TO_CHAR(booking_date, 'YYYY-MM-DD')"), $formattedDates)
            ->whereIn('status', ['new', 'pending', 'confirmed', 'completed']);

        if ($specialistId !== null) {
            $existingBookingsQuery->where(function($q) use ($specialistId) {
                $q->where('specialist_id', $specialistId)
                  ->orWhereNull('specialist_id');
            });
        } else {
            $existingBookingsQuery->whereNull('specialist_id');
        }

        $allBookings = $existingBookingsQuery->get();

        $bookingsByDate = [];
        foreach ($allBookings as $b) {
            $bDate = Carbon::parse($b->booking_date, $timezone)->format('Y-m-d');
            $t = $b->booking_time;
            if (strlen($t) === 5) $t .= ':00';
            $start = Carbon::parse($bDate . ' ' . $t, $timezone);
            $end = $start->copy()->addMinutes($b->duration_minutes ?? 60);

            if (!isset($bookingsByDate[$bDate])) $bookingsByDate[$bDate] = [];
            $bookingsByDate[$bDate][] = (object)['start' => $start, 'end' => $end];
        }

        $result = [];
        foreach ($formattedDates as $dateStr) {
            $workingHours = ['start' => '09:00', 'end' => '18:00'];
            $breakStart = null;
            $breakEnd = null;

            if ($schedule && is_array($schedule)) {
                $dayOfWeek = strtolower(Carbon::parse($dateStr, $timezone)->format('l'));
                if (isset($schedule[$dayOfWeek]['enabled']) && $schedule[$dayOfWeek]['enabled']) {
                    $ds = $schedule[$dayOfWeek];
                    if (isset($ds['from']) && isset($ds['to'])) {
                        $workingHours['start'] = $ds['from'];
                        $workingHours['end'] = $ds['to'];
                    }
                } else {
                    $result[$dateStr] = [];
                    continue;
                }

                if ($globalBreakFrom && $globalBreakTo) {
                    $breakStart = Carbon::parse($dateStr . ' ' . $globalBreakFrom, $timezone);
                    $breakEnd = Carbon::parse($dateStr . ' ' . $globalBreakTo, $timezone);
                }
            }

            $parsedBookings = $bookingsByDate[$dateStr] ?? [];
            $startTime = Carbon::parse($dateStr . ' ' . $workingHours['start'], $timezone);
            $endTime = Carbon::parse($dateStr . ' ' . $workingHours['end'], $timezone);
            $currentTime = $startTime->copy();
            $slotDisplayDuration = $slotStepMinutes;
            $slots = [];

            while ($currentTime->copy()->addMinutes($slotDisplayDuration)->lte($endTime)) {
                $slotTime = $currentTime->format('H:i');
                $slotEndTime = $currentTime->copy()->addMinutes($slotDisplayDuration)->format('H:i');
                $bookingStart = $currentTime->copy();
                $bookingEnd = $currentTime->copy()->addMinutes($durationMinutes);

                $isAvailable = true;

                if ($bookingStart->lt($now)) {
                    $isAvailable = false;
                }

                if ($isAvailable && $breakStart && $breakEnd) {
                    if ($bookingStart->lt($breakEnd) && $bookingEnd->gt($breakStart)) {
                        $isAvailable = false;
                    }
                }

                if ($isAvailable) {
                    foreach ($parsedBookings as $pb) {
                        if ($bookingStart->lt($pb->end) && $bookingEnd->gt($pb->start)) {
                            $isAvailable = false;
                            break;
                        }
                    }
                }

                $slots[] = [
                    'time' => $slotTime,
                    'end_time' => $slotEndTime,
                    'available' => $isAvailable,
                ];

                $currentTime->addMinutes($slotStepMinutes);
            }

            $result[$dateStr] = $slots;
        }

        return $result;
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

        $this->assertActiveBookingEntities(
            (int) $data['company_id'],
            $isCustomEvent ? null : (int) $data['service_id'],
            isset($data['specialist_id']) && $data['specialist_id'] !== '' && $data['specialist_id'] !== null
                ? (int) $data['specialist_id']
                : null
        );
        
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
        
        $resolvedClientUserId = $data['user_id'] ?? null;
        if ($resolvedClientUserId !== null && $resolvedClientUserId !== ''
            && ! MarketplaceClient::isClientUserId((int) $resolvedClientUserId)) {
            Log::warning('BookingService: createBooking — user_id is not role CLIENT, storing as guest (CRM fields only)', [
                'rejected_user_id' => $resolvedClientUserId,
                'company_id' => $data['company_id'] ?? null,
            ]);
            $resolvedClientUserId = null;
        }

        try {
            $booking = Booking::create([
                'company_id' => $data['company_id'],
                'user_id' => $resolvedClientUserId,
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
     * Уведомить владельца бизнеса об онлайн-оплате бронирования.
     */
    public function notifyOwnerAboutPayment(Booking $booking): void
    {
        $company = $booking->company;
        if (!$company || !$company->owner_id) {
            return;
        }

        $serviceName = 'Service';
        if ($booking->advertisement_id) {
            $advertisement = \App\Models\Advertisement::find($booking->advertisement_id);
            if ($advertisement) {
                $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                $serviceData = collect($services)->first(fn($s) => isset($s['id']) && (string)($s['id'] ?? '') === (string)$booking->service_id);
                if ($serviceData && isset($serviceData['name'])) {
                    $serviceName = $serviceData['name'];
                }
            }
        }
        if ($serviceName === 'Service' && $booking->service) {
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

        $amount = $booking->total_price ?? $booking->price ?? 0;

        $translations = [
            'ru' => ['title' => 'Оплата онлайн', 'message' => "Клиент {$clientName} оплатил «{$serviceName}» — \${$amount}."],
            'en' => ['title' => 'Online payment', 'message' => "Client {$clientName} paid for «{$serviceName}» — \${$amount}."],
            'es-mx' => ['title' => 'Pago en línea', 'message' => "El cliente {$clientName} pagó «{$serviceName}» — \${$amount}."],
            'hy-am' => ['title' => 'Առցանց վճարում', 'message' => "Հաճախորդ {$clientName}-ը վճարեց «{$serviceName}»-ի համար — \${$amount}։"],
            'uk-ua' => ['title' => 'Онлайн-оплата', 'message' => "Клієнт {$clientName} оплатив(ла) «{$serviceName}» — \${$amount}."],
        ];

        $t = $translations[$ownerLocale] ?? $translations['en'];

        if (BusinessOwnerNotificationPreferences::allowsOwnerInAppNotification(
            $company,
            BusinessOwnerNotificationPreferences::EVENT_PAYMENT
        )) {
            try {
                \App\Models\Notification::create([
                    'user_id' => $company->owner_id,
                    'type' => 'booking_paid',
                    'title' => $t['title'],
                    'message' => $t['message'],
                    'link' => '/business/schedule',
                    'read' => false,
                ]);
            } catch (\Exception $e) {
                Log::error('BookingService: Failed to send payment notification', [
                    'booking_id' => $booking->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        BusinessOwnerMailer::notifyIfEnabled(
            $company,
            (int) $company->owner_id,
            BusinessOwnerNotificationPreferences::EVENT_PAYMENT,
            $t['title'],
            $t['message'],
            '/business/schedule'
        );
    }

    /**
     * Email + in-app клиенту: онлайн-оплата авторизована (холд).
     */
    public function notifyClientAboutAuthorizedPayment(Booking $booking): void
    {
        if (! $booking->user_id || ! MarketplaceClient::isClientUserId((int) $booking->user_id)) {
            return;
        }

        $locale = NotificationLocale::forClientRecipient($booking->user_id);
        $serviceName = $this->resolveBookingServiceName($booking);

        $paymentRow = Payment::where('booking_id', $booking->id)->first();
        if ($paymentRow && (int) $paymentRow->amount > 0) {
            $amountDollars = ((float) $paymentRow->amount) / 100.0;
        } else {
            $amountDollars = (float) ($booking->total_price ?? $booking->price ?? 0);
        }
        $amount = number_format($amountDollars, 2, '.', '');

        $translations = [
            'en' => ['title' => 'Payment confirmed', 'message' => "Your bank confirmed the payment for «{$serviceName}»: \${$amount}. For now, the amount is only reserved on your card. The business will charge it after the visit is completed."],
            'ru' => ['title' => 'Оплата подтверждена', 'message' => "Банк подтвердил оплату для «{$serviceName}»: \${$amount}. Сейчас сумма только зарезервирована на карте. Исполнитель спишет её после завершения визита."],
            'es-mx' => ['title' => 'Pago confirmado', 'message' => "Tu banco confirmó el pago de «{$serviceName}» por \${$amount}. Por ahora, el importe solo quedó reservado en tu tarjeta. El negocio lo cobrará después de completar la cita."],
            'hy-am' => ['title' => 'Վճարումը հաստատված է', 'message' => "Բանկը հաստատել է «{$serviceName}»-ի վճարումը՝ \${$amount}։ Այս պահին գումարը միայն պահված է քարտի վրա։ Այն կգանձվի այցի ավարտից հետո։"],
            'uk-ua' => ['title' => 'Оплату підтверджено', 'message' => "Банк підтвердив оплату за «{$serviceName}»: \${$amount}. Зараз сума лише зарезервована на картці. Бізнес спише її після завершення візиту."],
        ];

        $t = $translations[$locale] ?? $translations['en'];

        try {
            \App\Models\Notification::create([
                'user_id' => $booking->user_id,
                'type' => 'booking_payment',
                'title' => $t['title'],
                'message' => $t['message'],
                'link' => '/booking',
                'read' => false,
            ]);
        } catch (\Throwable $e) {
            Log::warning('BookingService: client payment notification (in-app) failed', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
        }

        ClientNotificationMailer::bookingStatusIfEnabled(
            (int) $booking->user_id,
            $t['title'],
            $t['message'],
            '/booking'
        );
    }

    /**
     * Email клиенту: возврат или снятие холда (в т.ч. частичное удержание по политике отмены).
     *
     * @param  float|null  $retainedDollars  Удержано у бизнеса; если задано и > 0 — текст про частичный исход.
     */
    public function notifyClientAboutRefundOrRelease(
        Booking $booking,
        bool $moneyReturned,
        float $toClientDollars,
        ?float $retainedDollars = null
    ): void {
        if (! $booking->user_id || ! MarketplaceClient::isClientUserId((int) $booking->user_id)) {
            return;
        }

        $locale = NotificationLocale::forClientRecipient($booking->user_id);
        $serviceName = $this->resolveBookingServiceName($booking);
        $tc = number_format($toClientDollars, 2, '.', '');
        $tr = $retainedDollars !== null ? number_format($retainedDollars, 2, '.', '') : null;

        $partial = $retainedDollars !== null && (float) $retainedDollars > 0.009;

        if ($partial) {
            $translations = [
                'en' => ['title' => 'Cancellation and payment', 'message' => "For «{$serviceName}»: \${$tc} is returned to your card; \${$tr} is charged according to the cancellation policy."],
                'ru' => ['title' => 'Отмена и оплата', 'message' => "По «{$serviceName}»: на карту возвращается \${$tc}; по правилам отмены удерживается \${$tr}."],
                'es-mx' => ['title' => 'Cancelación y pago', 'message' => "Para «{$serviceName}»: se devuelven \${$tc} a tu tarjeta; según la política de cancelación se cobran \${$tr}."],
                'hy-am' => ['title' => 'Չեղարկում և վճարում', 'message' => "«{$serviceName}»-ի համար․ քարտ են վերադարձվում \${$tc}․ չեղարկման կանոններով գանձվում է \${$tr}։"],
                'uk-ua' => ['title' => 'Скасування та оплата', 'message' => "Для «{$serviceName}»: на картку повертається \${$tc}; згідно з правилами скасування утримується \${$tr}."],
            ];
        } elseif ($moneyReturned && $toClientDollars > 0.009) {
            $translations = [
                'en' => ['title' => 'Refund on the way', 'message' => "We sent a refund of \${$tc} for «{$serviceName}» to your card. Banks usually show it within a few business days."],
                'ru' => ['title' => 'Возврат отправлен', 'message' => "Возврат \${$tc} за «{$serviceName}» отправлен на карту. Обычно банк отображает его в течение нескольких рабочих дней."],
                'es-mx' => ['title' => 'Reembolso enviado', 'message' => "Enviamos un reembolso de \${$tc} por «{$serviceName}» a tu tarjeta. El banco suele mostrarlo en unos días hábiles."],
                'hy-am' => ['title' => 'Վերադարձը ուղարկված է', 'message' => "«{$serviceName}»-ի համար \${$tc} վերադարձը ուղարկվել է քարտ։ Բանկը սովորաբար ցուցադրում է այն մի քանի աշխատանքային օրվա ընթացքում։"],
                'uk-ua' => ['title' => 'Повернення надіслано', 'message' => "Повернення \${$tc} за «{$serviceName}» надіслано на картку. Зазвичай банк відображає його протягом кількох робочих днів."],
            ];
        } elseif (! $moneyReturned && ! $partial) {
            $translations = [
                'en' => ['title' => 'Payment will not be charged', 'message' => "The reserved amount for «{$serviceName}» was released from your card. No charge was made."],
                'ru' => ['title' => 'Оплата не будет списана', 'message' => "Зарезервированная сумма за «{$serviceName}» разблокирована на карте. Списания не было."],
                'es-mx' => ['title' => 'No se realizará el cobro', 'message' => "El importe reservado para «{$serviceName}» se liberó de tu tarjeta. No se realizó ningún cargo."],
                'hy-am' => ['title' => 'Վճարում չի գանձվի', 'message' => "«{$serviceName}»-ի համար պահված գումարը հանվել է քարտից։ Գանձում չի կատարվել։"],
                'uk-ua' => ['title' => 'Оплату не буде списано', 'message' => "Зарезервовану суму за «{$serviceName}» розблоковано на картці. Списання не було."],
            ];
        } else {
            return;
        }

        $t = $translations[$locale] ?? $translations['en'];

        ClientNotificationMailer::bookingStatusIfEnabled(
            (int) $booking->user_id,
            $t['title'],
            $t['message'],
            '/booking'
        );
    }

    /**
     * Доля суммы, возвращаемая клиенту при отмене (1.0 = полностью). Только смысл при $applyCancellationPolicy === true.
     */
    public function clientRefundFractionForCancellation(Booking $booking, bool $applyCancellationPolicy): float
    {
        if (! $applyCancellationPolicy) {
            return 1.0;
        }

        $booking->loadMissing('company');
        $company = $booking->company;
        if (! $company) {
            return 1.0;
        }

        $freeHours = (int) ($company->cancellation_free_hours ?? 12);
        $freeHours = max(1, $freeHours);
        $lateFeePercent = (int) ($company->cancellation_late_fee_percent ?? 50);
        $lateFeePercent = max(0, min(100, $lateFeePercent));

        $start = $booking->getTimeWindow()['start'];
        $now = Carbon::now($start->timezone);
        if ($start->lte($now)) {
            $hoursUntil = 0.0;
        } else {
            $hoursUntil = $now->floatDiffInHours($start);
        }

        if ($hoursUntil >= $freeHours) {
            return 1.0;
        }

        return max(0.0, min(1.0, (100 - $lateFeePercent) / 100.0));
    }

    /**
     * Email клиенту: бронь отменена из-за неоплаты (cron).
     */
    public function notifyClientAboutUnpaidBookingExpired(Booking $booking): void
    {
        if (! $booking->user_id || ! MarketplaceClient::isClientUserId((int) $booking->user_id)) {
            return;
        }

        $locale = NotificationLocale::forClientRecipient($booking->user_id);
        $serviceName = $this->resolveBookingServiceName($booking);

        $translations = [
            'en' => ['title' => 'Booking cancelled', 'message' => "We cancelled your booking for «{$serviceName}» because the payment was not completed in time. You can book the service again anytime."],
            'ru' => ['title' => 'Бронирование отменено', 'message' => "Бронирование «{$serviceName}» отменено, потому что оплата не была завершена вовремя. Вы можете записаться снова в любое время."],
            'es-mx' => ['title' => 'Reserva cancelada', 'message' => "Cancelamos tu reserva para «{$serviceName}» porque el pago no se completó a tiempo. Puedes reservar de nuevo cuando quieras."],
            'hy-am' => ['title' => 'Ամրագրումը չեղարկված է', 'message' => "«{$serviceName}» ամրագրումը չեղարկվել է, քանի որ վճարումը ժամանակին չի ավարտվել։ Կարող եք կրկին ամրագրել ցանկացած ժամանակ։"],
            'uk-ua' => ['title' => 'Бронювання скасовано', 'message' => "Бронювання «{$serviceName}» скасовано, тому що оплату не було завершено вчасно. Ви можете знову забронювати послугу будь-коли."],
        ];

        $t = $translations[$locale] ?? $translations['en'];

        ClientNotificationMailer::bookingStatusIfEnabled(
            (int) $booking->user_id,
            $t['title'],
            $t['message'],
            '/booking'
        );
    }

    private function resolveBookingServiceName(Booking $booking): string
    {
        $serviceName = 'Service';
        if ($booking->advertisement_id) {
            $advertisement = \App\Models\Advertisement::find($booking->advertisement_id);
            if ($advertisement) {
                $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                $serviceData = collect($services)->first(fn ($s) => isset($s['id']) && (string) ($s['id'] ?? '') === (string) $booking->service_id);
                if ($serviceData && isset($serviceData['name'])) {
                    $serviceName = $serviceData['name'];
                }
            }
        }
        if ($serviceName === 'Service' && $booking->service) {
            $serviceName = $booking->service->name;
        }

        return $serviceName;
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

    /**
     * Capture an authorized (held) payment for a booking.
     * Called automatically when business marks booking as completed.
     *
     * @return array{captured: bool, error?: string}
     */
    public function captureAuthorizedPayment(Booking $booking, ?int $userId = null, ?string $userRole = null): array
    {
        Stripe::setApiKey(config('services.stripe.secret'));

        if ($booking->payment_status !== 'authorized') {
            return ['captured' => false, 'error' => 'not_authorized'];
        }

        $payment = Payment::where('booking_id', $booking->id)->first();
        if (!$payment || $payment->capture_status !== Payment::CAPTURE_PENDING) {
            return ['captured' => false, 'error' => 'no_pending_payment'];
        }

        try {
            $pi = PaymentIntent::retrieve($payment->stripe_payment_intent_id);

            if ($pi->status === 'succeeded') {
                $payment->update([
                    'status' => Payment::STATUS_SUCCEEDED,
                    'capture_status' => Payment::CAPTURE_CAPTURED,
                    'captured_at' => now(),
                ]);
                $booking->update(['payment_status' => 'paid']);
                return ['captured' => true];
            }

            if ($pi->status !== 'requires_capture') {
                Log::warning('BookingService: cannot capture, unexpected PI status', [
                    'booking_id' => $booking->id,
                    'pi_status' => $pi->status,
                ]);
                return ['captured' => false, 'error' => "pi_status_{$pi->status}"];
            }

            $capturedPi = $pi->capture();

            $payment->addAuditTrail('capture', $userId, $userRole, [
                'amount' => $payment->amount,
                'trigger' => 'booking_completed',
            ]);

            $payment->update([
                'status' => Payment::STATUS_SUCCEEDED,
                'capture_status' => Payment::CAPTURE_CAPTURED,
                'captured_at' => now(),
                'stripe_charge_id' => $capturedPi->latest_charge ?? null,
            ]);

            $booking->update(['payment_status' => 'paid']);

            Log::info('BookingService: Payment auto-captured on booking completion', [
                'booking_id' => $booking->id,
                'payment_id' => $payment->id,
                'amount' => $payment->amount,
            ]);

            return ['captured' => true];
        } catch (\Exception $e) {
            Log::error('BookingService: Auto-capture failed', [
                'booking_id' => $booking->id,
                'payment_id' => $payment->id ?? null,
                'error' => $e->getMessage(),
            ]);
            return ['captured' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Refund or cancel an authorized payment when booking is cancelled.
     * При $applyCancellationPolicy учитываются поля компании: окно бесплатной отмены и процент удержания.
     *
     * @return array{
     *   refunded: bool,
     *   action?: string,
     *   error?: string,
     *   client_refund_fraction?: float,
     *   to_client_cents?: int,
     *   retained_cents?: int
     * }
     */
    public function refundOrCancelPayment(
        Booking $booking,
        ?int $userId = null,
        ?string $userRole = null,
        ?string $reason = null,
        bool $applyCancellationPolicy = false
    ): array {
        Stripe::setApiKey(config('services.stripe.secret'));

        $payment = Payment::where('booking_id', $booking->id)->first();
        if (! $payment) {
            return ['refunded' => false, 'error' => 'no_payment'];
        }

        if (! $payment->stripe_payment_intent_id) {
            return ['refunded' => false, 'error' => 'no_payment_intent'];
        }

        $fraction = $this->clientRefundFractionForCancellation($booking, $applyCancellationPolicy);
        $totalCents = (int) $payment->amount;
        $clientCents = min($totalCents, max(0, (int) round($totalCents * $fraction)));
        $keepCents = $totalCents - $clientCents;

        $canCancel = in_array($payment->status, [
            Payment::STATUS_PENDING,
            Payment::STATUS_REQUIRES_CAPTURE,
            Payment::STATUS_AUTHORIZED,
        ], true) && $payment->capture_status === Payment::CAPTURE_PENDING;

        $canRefund = $payment->status === Payment::STATUS_SUCCEEDED
            && $payment->canBeRefunded();

        if (! $canCancel && ! $canRefund) {
            return ['refunded' => false, 'error' => "status_{$payment->status}"];
        }

        $initiatedBy = match ($userRole) {
            'SUPERADMIN' => Payment::INITIATED_BY_PLATFORM,
            'CLIENT' => Payment::INITIATED_BY_CLIENT,
            'BUSINESS_OWNER' => Payment::INITIATED_BY_BUSINESS,
            default => Payment::INITIATED_BY_SYSTEM,
        };

        try {
            $pi = PaymentIntent::retrieve($payment->stripe_payment_intent_id);

            if ($canCancel && in_array($pi->status, ['requires_capture', 'requires_payment_method', 'requires_confirmation', 'requires_action'], true)) {
                if ($keepCents <= 0) {
                    $pi->cancel();

                    $payment->addAuditTrail('cancel_hold', $userId, $userRole ?? 'system', [
                        'trigger' => 'booking_cancelled',
                        'reason' => $reason,
                        'client_refund_fraction' => $fraction,
                    ]);

                    $payment->update([
                        'status' => Payment::STATUS_CANCELLED,
                        'capture_status' => Payment::CAPTURE_CANCELLED,
                    ]);

                    $booking->update(['payment_status' => 'cancelled']);

                    Log::info('BookingService: Hold cancelled on booking cancellation', [
                        'booking_id' => $booking->id,
                        'payment_id' => $payment->id,
                    ]);

                    $booking->refresh();
                    $this->notifyClientAboutRefundOrRelease($booking, false, 0.0, null);

                    return [
                        'refunded' => true,
                        'action' => 'cancelled',
                        'client_refund_fraction' => $fraction,
                        'to_client_cents' => $totalCents,
                        'retained_cents' => 0,
                    ];
                }

                if ($clientCents <= 0) {
                    $capturedPi = $pi->capture();

                    $payment->addAuditTrail('capture_cancellation_fee', $userId, $userRole ?? 'system', [
                        'trigger' => 'booking_cancelled',
                        'reason' => $reason,
                        'amount_captured_cents' => $totalCents,
                        'client_refund_fraction' => $fraction,
                    ]);

                    $payment->update([
                        'status' => Payment::STATUS_SUCCEEDED,
                        'capture_status' => Payment::CAPTURE_CAPTURED,
                        'captured_at' => now(),
                        'stripe_charge_id' => $capturedPi->latest_charge ?? null,
                    ]);

                    $booking->update(['payment_status' => 'paid']);

                    $booking->refresh();
                    $this->notifyClientAboutRefundOrRelease(
                        $booking,
                        false,
                        0.0,
                        round($totalCents / 100, 2)
                    );

                    return [
                        'refunded' => true,
                        'action' => 'captured_full',
                        'client_refund_fraction' => $fraction,
                        'to_client_cents' => 0,
                        'retained_cents' => $totalCents,
                    ];
                }

                $capturedPi = $pi->capture(['amount_to_capture' => $keepCents]);

                $payment->addAuditTrail('partial_capture_cancellation', $userId, $userRole ?? 'system', [
                    'trigger' => 'booking_cancelled',
                    'reason' => $reason,
                    'captured_cents' => $keepCents,
                    'released_to_client_cents' => $clientCents,
                    'client_refund_fraction' => $fraction,
                ]);

                $payment->update([
                    'status' => Payment::STATUS_SUCCEEDED,
                    'capture_status' => Payment::CAPTURE_CAPTURED,
                    'captured_at' => now(),
                    'stripe_charge_id' => $capturedPi->latest_charge ?? null,
                ]);

                $booking->update(['payment_status' => 'paid']);

                $booking->refresh();
                $this->notifyClientAboutRefundOrRelease(
                    $booking,
                    false,
                    round($clientCents / 100, 2),
                    round($keepCents / 100, 2)
                );

                return [
                    'refunded' => true,
                    'action' => 'partial_capture',
                    'client_refund_fraction' => $fraction,
                    'to_client_cents' => $clientCents,
                    'retained_cents' => $keepCents,
                ];
            }

            if ($canRefund || $pi->status === 'succeeded') {
                $maxRefundable = $payment->getRefundableAmount();
                $refundCents = (int) min($maxRefundable, max(0, round($totalCents * $fraction)));

                if ($refundCents <= 0) {
                    $payment->addAuditTrail('no_refund_retained', $userId, $userRole ?? 'system', [
                        'trigger' => 'booking_cancelled',
                        'reason' => $reason,
                        'client_refund_fraction' => $fraction,
                    ]);

                    $booking->update(['payment_status' => 'paid']);

                    $booking->refresh();
                    $this->notifyClientAboutRefundOrRelease(
                        $booking,
                        false,
                        0.0,
                        round($totalCents / 100, 2)
                    );

                    return [
                        'refunded' => true,
                        'action' => 'retained_no_refund',
                        'client_refund_fraction' => $fraction,
                        'to_client_cents' => 0,
                        'retained_cents' => $totalCents,
                    ];
                }

                $refundParams = [
                    'payment_intent' => $payment->stripe_payment_intent_id,
                    'refund_application_fee' => true,
                    'reverse_transfer' => true,
                ];
                if ($refundCents < $totalCents) {
                    $refundParams['amount'] = $refundCents;
                }

                $refund = Refund::create($refundParams);

                $newRefunded = (int) ($payment->refunded_amount + $refund->amount);
                $isFullRefund = $newRefunded >= $totalCents;

                $payment->addAuditTrail('refund', $userId, $userRole ?? 'system', [
                    'amount' => $refund->amount,
                    'trigger' => 'booking_cancelled',
                    'reason' => $reason,
                    'refund_id' => $refund->id,
                    'client_refund_fraction' => $fraction,
                ]);

                $payment->update([
                    'status' => $isFullRefund ? Payment::STATUS_REFUNDED : Payment::STATUS_PARTIALLY_REFUNDED,
                    'refunded_amount' => $newRefunded,
                    'refund_reason' => $reason ?? 'Booking cancelled',
                    'refund_initiated_by' => $initiatedBy,
                ]);

                $booking->update(['payment_status' => $isFullRefund ? 'refunded' : 'partially_refunded']);

                Log::info('BookingService: Payment refunded on booking cancellation', [
                    'booking_id' => $booking->id,
                    'payment_id' => $payment->id,
                    'refund_id' => $refund->id,
                    'amount' => $refund->amount,
                ]);

                $booking->refresh();

                $toClient = round(((float) $refund->amount) / 100, 2);
                $retainedAfterCents = $totalCents - $newRefunded;
                $retainedDollars = round($retainedAfterCents / 100, 2);

                if ($isFullRefund) {
                    $this->notifyClientAboutRefundOrRelease($booking, true, $toClient, null);
                } else {
                    $this->notifyClientAboutRefundOrRelease($booking, true, $toClient, max(0.0, $retainedDollars));
                }

                return [
                    'refunded' => true,
                    'action' => $isFullRefund ? 'refunded' : 'partially_refunded',
                    'client_refund_fraction' => $fraction,
                    'to_client_cents' => (int) $refund->amount,
                    'retained_cents' => (int) $payment->amount - $newRefunded,
                ];
            }

            return ['refunded' => false, 'error' => "unexpected_pi_status_{$pi->status}"];
        } catch (\Exception $e) {
            Log::error('BookingService: Auto-refund/cancel failed', [
                'booking_id' => $booking->id,
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);

            return ['refunded' => false, 'error' => $e->getMessage()];
        }
    }
}


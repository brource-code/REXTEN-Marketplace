<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ScheduleController extends Controller
{
    /**
     * Get schedule slots.
     */
    public function index(Request $request)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                return response()->json([
                    'message' => 'Company not found',
                ], 404);
            }

            $bookings = Booking::where('company_id', $companyId)
                ->whereNotNull('booking_date')
                ->with([
                    'service:id,name', 
                    'user:id,name,email', 
                    'user.profile:user_id,phone,full_name',
                    'advertisement:id,team,company_id,type,is_active,status', // Загружаем объявление для получения команды
                    'additionalServices' // Загружаем дополнительные услуги
                ])
                ->get();

            $data = $bookings->map(function ($booking) {
                try {
                    // Проверяем наличие необходимых полей
                    if (!$booking->booking_date) {
                        return null;
                    }

                    // Получаем дату из booking_date БЕЗ учета часового пояса
                    // booking_date хранится как datetime, но нам нужна только дата
                    $bookingDateRaw = $booking->booking_date;
                    
                    // Если это Carbon объект, получаем только дату (год, месяц, день)
                    if ($bookingDateRaw instanceof \Carbon\Carbon) {
                        // Используем year, month, day напрямую, без конвертации часового пояса
                        $bookingDate = \Carbon\Carbon::create(
                            $bookingDateRaw->year,
                            $bookingDateRaw->month,
                            $bookingDateRaw->day,
                            0, 0, 0,
                            'UTC' // Используем UTC для избежания конвертации
                        );
                    } else {
                        // Если строка, парсим как есть
                        $bookingDate = \Carbon\Carbon::parse($bookingDateRaw, 'UTC')->startOfDay();
                    }
                    
                    // Создаем копию даты для вычисления end, чтобы не мутировать оригинал
                    $endDate = $bookingDate->copy()->addMinutes($booking->duration_minutes ?? 60);

                    // Форматируем время, если оно есть
                    $bookingTime = $booking->booking_time ?? '00:00:00';
                    if (strlen($bookingTime) === 5) {
                        // Если формат HH:mm, добавляем секунды
                        $bookingTime .= ':00';
                    }

                    // Формируем название: имя клиента + услуга
                    $clientName = $booking->client_name ?? ($booking->user?->name ?? 'Клиент');
                    
                    // Определяем название услуги
                    // ВАЖНО: Если есть advertisement_id, сначала ищем услугу в этом объявлении!
                    // Иначе может быть путаница с виртуальными ID из объявлений
                    $serviceName = 'Услуга';
                    $serviceId = null;
                    
                    // Приоритет 1: Если есть advertisement_id, ищем услугу в этом объявлении
                    if ($booking->advertisement_id) {
                        $advertisement = \App\Models\Advertisement::find($booking->advertisement_id);
                        if ($advertisement) {
                            $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                            $serviceData = collect($services)->first(function ($s) use ($booking) {
                                return isset($s['id']) && (string)$s['id'] === (string)$booking->service_id;
                            });
                            if ($serviceData && isset($serviceData['name'])) {
                                $serviceName = $serviceData['name'];
                                $serviceId = $serviceData['id'];
                            }
                        }
                    }
                    
                    // Приоритет 2: Если не нашли в объявлении или advertisement_id нет, проверяем таблицу services
                    // Но только если услуга принадлежит той же компании
                    if ($serviceName === 'Услуга' && $booking->service) {
                        // Проверяем, что услуга принадлежит компании из бронирования
                        if ($booking->service->company_id == $booking->company_id) {
                            $serviceName = $booking->service->name;
                            $serviceId = $booking->service->id;
                        } else {
                            // Если услуга принадлежит другой компании, ищем в объявлениях
                            $advertisement = \App\Models\Advertisement::where('company_id', $booking->company_id)
                                ->where('type', 'regular')
                                ->where('is_active', true)
                                ->where('status', 'approved')
                                ->get()
                                ->first(function ($ad) use ($booking) {
                                    $services = is_array($ad->services) ? $ad->services : (json_decode($ad->services, true) ?? []);
                                    foreach ($services as $svc) {
                                        if (isset($svc['id']) && (string)$svc['id'] === (string)$booking->service_id) {
                                            return true;
                                        }
                                    }
                                    return false;
                                });
                            
                            if ($advertisement) {
                                $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                                $serviceData = collect($services)->first(function ($s) use ($booking) {
                                    return isset($s['id']) && (string)$s['id'] === (string)$booking->service_id;
                                });
                                if ($serviceData && isset($serviceData['name'])) {
                                    $serviceName = $serviceData['name'];
                                    $serviceId = $serviceData['id'];
                                }
                            }
                        }
                    }
                    
                    // Приоритет 3: Если все еще не нашли, ищем в любых объявлениях компании
                    if ($serviceName === 'Услуга' && !$booking->advertisement_id) {
                        $advertisement = \App\Models\Advertisement::where('company_id', $booking->company_id)
                            ->where('type', 'regular')
                            ->where('is_active', true)
                            ->where('status', 'approved')
                            ->get()
                            ->first(function ($ad) use ($booking) {
                                $services = is_array($ad->services) ? $ad->services : (json_decode($ad->services, true) ?? []);
                                foreach ($services as $svc) {
                                    if (isset($svc['id']) && (string)$svc['id'] === (string)$booking->service_id) {
                                        return true;
                                    }
                                }
                                return false;
                            });
                        
                        if ($advertisement) {
                            $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                            $serviceData = collect($services)->first(function ($s) use ($booking) {
                                return isset($s['id']) && (string)$s['id'] === (string)$booking->service_id;
                            });
                            if ($serviceData && isset($serviceData['name'])) {
                                $serviceName = $serviceData['name'];
                                $serviceId = $serviceData['id'];
                            }
                        }
                    }
                    
                    $title = $clientName . ' - ' . $serviceName;
                    
                    // Цвет определяется по статусу
                    $status = $booking->status ?? 'new';
                    
                    return [
                        'id' => (string) $booking->id,
                        'title' => $title,
                        'start' => $bookingDate->format('Y-m-d') . 'T' . $bookingTime,
                        'end' => $endDate->format('Y-m-d\TH:i:s'),
                        'eventColor' => $this->getStatusColor($status), // Цвет на основе статуса
                        'status' => $status,
                        // Дополнительные данные для модалки
                        'service' => [
                            'id' => $serviceId,
                            'name' => $serviceName,
                        ],
                        'client' => [
                            'id' => $booking->user->id ?? null,
                            'name' => $booking->client_name ?? ($booking->user?->name ?? 'Гость'),
                            'email' => $booking->client_email ?? ($booking->user?->email ?? null),
                            'phone' => $booking->client_phone ?? ($booking->user?->profile->phone ?? null),
                        ],
                        'user_id' => $booking->user_id, // ID зарегистрированного пользователя (null для незарегистрированных)
                        'review_token' => $booking->review_token, // Токен для отзыва незарегистрированных клиентов
                        'specialist_id' => $booking->specialist_id,
                        'specialist' => $this->getSpecialistFromTeam($booking) ?: null,
                        'booking_date' => $booking->booking_date->format('Y-m-d'),
                        'booking_time' => $booking->booking_time,
                        'duration_minutes' => $booking->duration_minutes ?? 60,
                        'price' => (float) $booking->price,
                        'total_price' => (float) ($booking->total_price ?? $booking->price),
                        'notes' => $booking->notes,
                        'client_notes' => $booking->client_notes,
                        'advertisement_id' => $booking->advertisement_id,
                        'additional_services' => $booking->additionalServices->map(function ($addService) {
                            return [
                                'id' => $addService->id,
                                'name' => $addService->name,
                                'description' => $addService->description,
                                'price' => (float) ($addService->pivot->price ?? $addService->price),
                                'quantity' => (int) ($addService->pivot->quantity ?? 1),
                                'duration' => $addService->duration,
                                'duration_unit' => $addService->duration_unit ?? 'hours',
                                'pivot' => [
                                    'price' => (float) ($addService->pivot->price ?? $addService->price),
                                    'quantity' => (int) ($addService->pivot->quantity ?? 1),
                                ],
                                'additional_service' => [
                                    'id' => $addService->id,
                                    'name' => $addService->name,
                                    'description' => $addService->description,
                                    'price' => (float) ($addService->pivot->price ?? $addService->price),
                                    'duration' => $addService->duration,
                                    'duration_unit' => $addService->duration_unit ?? 'hours',
                                ],
                            ];
                        })->toArray(),
                    ];
                } catch (\Exception $e) {
                    // Пропускаем проблемные записи
                    Log::warning('Error processing booking: ' . $e->getMessage(), [
                        'booking_id' => $booking->id ?? null,
                        'trace' => $e->getTraceAsString(),
                    ]);
                    return null;
                }
            })->filter(); // Удаляем null значения

            return response()->json($data->values()->all());
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error fetching schedule slots',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create schedule slot (booking).
     */
    public function store(Request $request)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                return response()->json([
                    'message' => 'Company not found',
                ], 404);
            }

            // Валидация данных
            $validated = $request->validate([
                'service_id' => 'required|integer',
                'user_id' => 'nullable|exists:users,id',
                'booking_date' => 'required|date',
                'booking_time' => 'required|date_format:H:i',
                'duration_minutes' => 'nullable|integer|min:15',
                'specialist_id' => 'nullable|exists:users,id',
                'price' => 'nullable|numeric|min:0',
                'status' => 'nullable|in:new,pending,confirmed,completed,cancelled',
                'notes' => 'nullable|string|max:1000',
                'client_notes' => 'nullable|string|max:1000',
                'client_name' => 'nullable|string|max:255',
                'client_email' => 'nullable|email|max:255',
                'client_phone' => 'nullable|string|max:20',
                'advertisement_id' => 'nullable|exists:advertisements,id',
                'additional_services' => 'nullable|array',
                'additional_services.*.id' => 'required|exists:additional_services,id',
                'additional_services.*.quantity' => 'required|integer|min:1',
            ]);

            // Проверяем, что дата и время бронирования не в прошлом
            $bookingDateTime = \Carbon\Carbon::parse($validated['booking_date'] . ' ' . $validated['booking_time']);
            $now = \Carbon\Carbon::now();
            
            if ($bookingDateTime->lt($now)) {
                return response()->json([
                    'message' => 'Нельзя создать бронирование на прошедшую дату. Выберите будущую дату и время.',
                    'error' => 'past_date',
                ], 400);
            }

            // Получаем данные услуги для проверки расписания и цены
            $service = \App\Models\Service::find($validated['service_id']);
            
            // Проверяем доступность слота
            $bookingService = app(\App\Services\BookingService::class);
            
            \Log::info('ScheduleController: store - checking availability', [
                'company_id' => $companyId,
                'service_id' => $validated['service_id'],
                'booking_date' => $validated['booking_date'],
                'booking_time' => $validated['booking_time'],
                'duration_minutes' => $validated['duration_minutes'] ?? 60,
                'specialist_id' => $validated['specialist_id'] ?? null,
                'has_service' => $service !== null,
            ]);
            
            $isAvailable = $bookingService->isSlotAvailable(
                $companyId,
                $validated['service_id'],
                $validated['booking_date'],
                $validated['booking_time'],
                $validated['duration_minutes'] ?? 60,
                null, // excludeBookingId
                $service, // serviceData для проверки расписания
                $validated['specialist_id'] ?? null // specialist_id для фильтрации бронирований
            );

            \Log::info('ScheduleController: store - availability check result', [
                'isAvailable' => $isAvailable,
                'booking_date' => $validated['booking_date'],
                'booking_time' => $validated['booking_time'],
            ]);

            if (!$isAvailable) {
                return response()->json([
                    'message' => 'Это время уже занято. Выберите другое время.',
                    'error' => 'slot_occupied',
                ], 400);
            }

            // Получаем цену услуги, если не передана
            $servicePrice = $validated['price'] ?? null;
            if ($servicePrice === null || $servicePrice === 0) {
                if ($service) {
                    $servicePrice = $service->price ?? 0;
                } else {
                    $servicePrice = 0;
                }
            }

            // Если указан client_email, проверяем, существует ли зарегистрированный пользователь
            // Это позволит связать бронирование с пользователем для отображения в его личном кабинете
            $userId = $validated['user_id'] ?? null;
            if (empty($userId) && !empty($validated['client_email'])) {
                $existingUser = \App\Models\User::where('email', $validated['client_email'])
                    ->whereNull('deleted_at')
                    ->first();
                
                if ($existingUser) {
                    // Если пользователь найден, связываем бронирование с ним
                    // Это позволит ему видеть бронирование в личном кабинете
                    $userId = $existingUser->id;
                    
                    \Log::info('ScheduleController: Found existing user by email', [
                        'email' => $validated['client_email'],
                        'user_id' => $userId,
                    ]);
                }
            }

            // Создаем бронирование
            $booking = $bookingService->createBooking([
                'company_id' => $companyId,
                'user_id' => $userId, // Используем найденный user_id или null
                'service_id' => $validated['service_id'],
                'advertisement_id' => $validated['advertisement_id'] ?? null,
                'specialist_id' => $validated['specialist_id'] ?? null,
                'booking_date' => $validated['booking_date'],
                'booking_time' => $validated['booking_time'],
                'duration_minutes' => $validated['duration_minutes'] ?? 60,
                'price' => $servicePrice, // Используем цену услуги
                'status' => $validated['status'] ?? 'new',
                'notes' => $validated['notes'] ?? null,
                'client_notes' => $validated['client_notes'] ?? null,
                'client_name' => $validated['client_name'] ?? null,
                'client_email' => $validated['client_email'] ?? null, // Всегда сохраняем client_email
                'client_phone' => $validated['client_phone'] ?? null,
            ]);

            // Прикрепляем дополнительные услуги, если они есть
            if (!empty($validated['additional_services'])) {
                $syncData = [];
                foreach ($validated['additional_services'] as $item) {
                    $additionalService = \App\Models\AdditionalService::find($item['id']);
                    if ($additionalService) {
                        $syncData[$item['id']] = [
                            'quantity' => $item['quantity'],
                            'price' => $additionalService->price, // Сохраняем цену на момент бронирования
                        ];
                    }
                }
                $booking->additionalServices()->sync($syncData);
            }
            
            // Всегда пересчитываем общую стоимость (с учетом базовой цены и дополнительных услуг)
            $booking->refresh(); // Обновляем связи
            $booking->load('additionalServices'); // Загружаем дополнительные услуги
            $booking->total_price = $booking->calculateTotalWithAdditionalServices();
            $booking->save();

            // Возвращаем созданное бронирование в формате для календаря
            $bookingDate = $booking->booking_date;
            if ($bookingDate instanceof \Carbon\Carbon) {
                $bookingDate = \Carbon\Carbon::create(
                    $bookingDate->year,
                    $bookingDate->month,
                    $bookingDate->day,
                    0, 0, 0,
                    'UTC'
                );
            } else {
                $bookingDate = \Carbon\Carbon::parse($bookingDate, 'UTC')->startOfDay();
            }

            $endDate = $bookingDate->copy()->addMinutes($booking->duration_minutes ?? 60);
            $bookingTime = $booking->booking_time ?? '00:00:00';
            if (strlen($bookingTime) === 5) {
                $bookingTime .= ':00';
            }

            // Определяем название услуги с учетом advertisement_id
            $serviceName = 'Услуга';
            if ($booking->advertisement_id) {
                $advertisement = \App\Models\Advertisement::find($booking->advertisement_id);
                if ($advertisement) {
                    $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                    $serviceData = collect($services)->first(function ($s) use ($booking) {
                        return isset($s['id']) && (string)$s['id'] === (string)$booking->service_id;
                    });
                    if ($serviceData && isset($serviceData['name'])) {
                        $serviceName = $serviceData['name'];
                    }
                }
            }
            
            if ($serviceName === 'Услуга' && $booking->service && $booking->service->company_id == $booking->company_id) {
                $serviceName = $booking->service->name;
            }

            $clientName = $booking->client_name ?? ($booking->user?->name ?? 'Клиент');
            $title = $clientName . ' - ' . $serviceName;

            return response()->json([
                'id' => (string) $booking->id,
                'title' => $title,
                'start' => $bookingDate->format('Y-m-d') . 'T' . $bookingTime,
                'end' => $endDate->format('Y-m-d\TH:i:s'),
                'eventColor' => $this->getStatusColor($booking->status),
                'status' => $booking->status,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating schedule slot: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Error creating booking',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update schedule slot (booking).
     */
    public function update(Request $request, $id)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                return response()->json([
                    'message' => 'Company not found',
                ], 404);
            }

            // Находим бронирование по ID и company_id
            $booking = Booking::where('company_id', $companyId)
                ->where('id', $id)
                ->first();

            if (!$booking) {
                return response()->json([
                    'message' => 'Booking not found',
                ], 404);
            }

            // Валидация данных
            $validated = $request->validate([
                'status' => 'sometimes|in:new,pending,confirmed,completed,cancelled',
                'start' => 'sometimes|date',
                'end' => 'sometimes|date',
                'booking_date' => 'sometimes|date',
                'booking_time' => ['sometimes', 'string', function ($attribute, $value, $fail) {
                    // Принимаем H:i или H:i:s
                    if (!preg_match('/^([0-1][0-9]|2[0-3]):[0-5][0-9](:00)?$/', $value)) {
                        $fail('The ' . $attribute . ' field must be in format H:i or H:i:s.');
                    }
                }],
                'duration_minutes' => 'sometimes|integer|min:15',
                'notes' => 'nullable|string|max:1000',
                'title' => 'sometimes|string|max:255',
            ]);

            // Обновляем статус, если передан
            // Разрешаем изменение статуса даже для прошедших дат
            if ($request->has('status')) {
                $oldStatus = $booking->status;
                $booking->status = $request->status;
                
                // Если статус меняется на completed, генерируем токен для незарегистрированных клиентов
                if ($request->status === 'completed' && $oldStatus !== 'completed') {
                    // Генерируем токен для отзыва, если клиент незарегистрирован
                    // Проверяем, что user_id пустой (null или 0) и токен еще не сгенерирован
                    if (empty($booking->user_id) && empty($booking->review_token)) {
                        $booking->generateReviewToken();
                        
                        \Log::info('ScheduleController: Generated review token for unregistered client', [
                            'booking_id' => $booking->id,
                            'user_id' => $booking->user_id,
                            'client_email' => $booking->client_email,
                            'client_name' => $booking->client_name,
                            'review_token' => $booking->review_token,
                        ]);
                    } else {
                        \Log::info('ScheduleController: Skipped review token generation', [
                            'booking_id' => $booking->id,
                            'user_id' => $booking->user_id,
                            'has_review_token' => !empty($booking->review_token),
                        ]);
                    }
                }
                
                // Если статус меняется на cancelled, устанавливаем дату отмены
                if ($request->status === 'cancelled' && $oldStatus !== 'cancelled') {
                    $booking->cancelled_at = now();
                    $booking->cancellation_reason = $request->cancellation_reason ?? 'Отменено администратором';
                }
            }

            // Обновляем дату и время
            // Запрещаем изменение даты/времени на прошедшие (но разрешаем изменение статуса для прошедших)
            // Проверяем, действительно ли меняется дата/время, сравнивая с текущей датой бронирования
            $dateTimeChanged = false;
            
            if ($request->has('booking_date') && $request->has('booking_time')) {
                // Нормализуем формат времени для сравнения
                $requestTime = $request->booking_time;
                if (strlen($requestTime) === 8 && substr($requestTime, -3) === ':00') {
                    $requestTime = substr($requestTime, 0, 5);
                }
                
                $newBookingDateTime = \Carbon\Carbon::parse($request->booking_date . ' ' . $requestTime);
                
                // Нормализуем текущее время бронирования для сравнения
                $currentTime = $booking->booking_time;
                if (strlen($currentTime) === 8 && substr($currentTime, -3) === ':00') {
                    $currentTime = substr($currentTime, 0, 5);
                }
                $currentBookingDateTime = \Carbon\Carbon::parse($booking->booking_date->format('Y-m-d') . ' ' . $currentTime);
                
                // Проверяем, действительно ли дата/время изменились (с точностью до минуты)
                $dateTimeChanged = !$newBookingDateTime->equalTo($currentBookingDateTime);
                
                if ($dateTimeChanged) {
                    // Проверяем, что новая дата и время не в прошлом
                    $now = \Carbon\Carbon::now();
                    
                    if ($newBookingDateTime->lt($now)) {
                        return response()->json([
                            'message' => 'Нельзя изменить бронирование на прошедшую дату. Выберите будущую дату и время.',
                            'error' => 'past_date',
                        ], 400);
                    }
                    
                    // Приоритет: booking_date и booking_time
                    $booking->booking_date = $request->booking_date;
                    $booking->booking_time = $requestTime;
                }
            } elseif ($request->has('start')) {
                // Fallback: вычисляем из start
                $startDate = \Carbon\Carbon::parse($request->start);
                
                // Нормализуем текущее время бронирования для сравнения
                $currentTime = $booking->booking_time;
                if (strlen($currentTime) === 8 && substr($currentTime, -3) === ':00') {
                    $currentTime = substr($currentTime, 0, 5);
                }
                $currentBookingDateTime = \Carbon\Carbon::parse($booking->booking_date->format('Y-m-d') . ' ' . $currentTime);
                
                // Проверяем, действительно ли дата/время изменились (с точностью до минуты)
                $dateTimeChanged = !$startDate->equalTo($currentBookingDateTime);
                
                if ($dateTimeChanged) {
                    // Запрещаем изменение даты/времени на прошедшие (но разрешаем изменение статуса для прошедших)
                    $now = \Carbon\Carbon::now();
                    
                    if ($startDate->lt($now)) {
                        return response()->json([
                            'message' => 'Нельзя изменить бронирование на прошедшую дату. Выберите будущую дату и время.',
                            'error' => 'past_date',
                        ], 400);
                    }
                    
                    $booking->booking_date = $startDate->format('Y-m-d');
                    $booking->booking_time = $startDate->format('H:i');
                }
            }

            // Обновляем длительность
            if ($request->has('duration_minutes')) {
                $booking->duration_minutes = $request->duration_minutes;
            } elseif ($request->has('end') && $request->has('start')) {
                // Fallback: вычисляем из start и end
                $startDate = \Carbon\Carbon::parse($request->start);
                $endDate = \Carbon\Carbon::parse($request->end);
                $duration = $startDate->diffInMinutes($endDate);
                if ($duration > 0) {
                    $booking->duration_minutes = $duration;
                }
            }

            // Обновляем примечания
            if ($request->has('notes')) {
                $booking->notes = $request->notes;
            }

            // Обновляем дополнительные услуги, если они переданы
            if ($request->has('additional_services')) {
                $syncData = [];
                foreach ($request->additional_services as $item) {
                    $additionalService = \App\Models\AdditionalService::find($item['id']);
                    if ($additionalService) {
                        $syncData[$item['id']] = [
                            'quantity' => $item['quantity'],
                            'price' => $additionalService->price, // Сохраняем цену на момент бронирования
                        ];
                    }
                }
                $booking->additionalServices()->sync($syncData);
                
                // Пересчитываем общую стоимость
                $booking->total_price = $booking->calculateTotalWithAdditionalServices();
            }

            $booking->save();

            // Возвращаем обновленное бронирование в формате для календаря
            $bookingDate = $booking->booking_date;
            if ($bookingDate instanceof \Carbon\Carbon) {
                $bookingDate = \Carbon\Carbon::create(
                    $bookingDate->year,
                    $bookingDate->month,
                    $bookingDate->day,
                    0, 0, 0,
                    'UTC'
                );
            } else {
                $bookingDate = \Carbon\Carbon::parse($bookingDate, 'UTC')->startOfDay();
            }

            $endDate = $bookingDate->copy()->addMinutes($booking->duration_minutes ?? 60);
            $bookingTime = $booking->booking_time ?? '00:00:00';
            if (strlen($bookingTime) === 5) {
                $bookingTime .= ':00';
            }

            $clientName = $booking->client_name ?? ($booking->user?->name ?? 'Клиент');
            
            // Определяем название услуги с учетом advertisement_id
            $serviceName = 'Услуга';
            if ($booking->advertisement_id) {
                $advertisement = \App\Models\Advertisement::find($booking->advertisement_id);
                if ($advertisement) {
                    $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                    $serviceData = collect($services)->first(function ($s) use ($booking) {
                        return isset($s['id']) && (string)$s['id'] === (string)$booking->service_id;
                    });
                    if ($serviceData && isset($serviceData['name'])) {
                        $serviceName = $serviceData['name'];
                    }
                }
            }
            
            // Если не нашли в объявлении, проверяем таблицу services (только если услуга принадлежит компании)
            if ($serviceName === 'Услуга' && $booking->service && $booking->service->company_id == $booking->company_id) {
                $serviceName = $booking->service->name;
            }
            
            $title = $clientName . ' - ' . $serviceName;

            // Обновляем данные бронирования перед возвратом
            $booking->refresh();
            
            return response()->json([
                'id' => (string) $booking->id,
                'title' => $title,
                'start' => $bookingDate->format('Y-m-d') . 'T' . $bookingTime,
                'end' => $endDate->format('Y-m-d\TH:i:s'),
                'eventColor' => $this->getStatusColor($booking->status),
                'status' => $booking->status,
                'user_id' => $booking->user_id, // ID зарегистрированного пользователя (null для незарегистрированных)
                'review_token' => $booking->review_token, // Токен для отзыва незарегистрированных клиентов
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating schedule slot: ' . $e->getMessage(), [
                'booking_id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Error updating booking',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete schedule slot (booking).
     */
    public function destroy(Request $request, $id)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                return response()->json([
                    'message' => 'Company not found',
                ], 404);
            }

            // Находим бронирование по ID и company_id
            $booking = Booking::where('company_id', $companyId)
                ->where('id', $id)
                ->first();

            if (!$booking) {
                return response()->json([
                    'message' => 'Booking not found',
                ], 404);
            }

            // Удаляем бронирование
            $booking->delete();

            return response()->json([
                'message' => 'Booking deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error deleting booking',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Получить информацию о специалисте из команды объявления.
     * Исполнители хранятся в команде объявления (team), а не в таблице users.
     */
    private function getSpecialistFromTeam($booking)
    {
        if (!$booking->specialist_id) {
            return null;
        }

        // Если есть объявление, ищем специалиста в его команде
        if ($booking->advertisement_id) {
            $advertisement = \App\Models\Advertisement::find($booking->advertisement_id);
            if ($advertisement && $advertisement->team) {
                $team = is_array($advertisement->team) ? $advertisement->team : (json_decode($advertisement->team, true) ?? []);
                
                // Ищем специалиста по ID в команде
                $specialist = collect($team)->first(function ($member) use ($booking) {
                    $memberId = $member['id'] ?? null;
                    return $memberId !== null && (string)$memberId === (string)$booking->specialist_id;
                });
                
                if ($specialist) {
                    return [
                        'id' => $specialist['id'] ?? $booking->specialist_id,
                        'name' => $specialist['name'] ?? 'Не указано',
                    ];
                }
            }
        }

        // Если объявления нет, ищем в любом объявлении компании
        $advertisement = \App\Models\Advertisement::where('company_id', $booking->company_id)
            ->where('type', 'regular')
            ->where('is_active', true)
            ->where('status', 'approved')
            ->first();
            
        if ($advertisement && $advertisement->team) {
            $team = is_array($advertisement->team) ? $advertisement->team : (json_decode($advertisement->team, true) ?? []);
            
            $specialist = collect($team)->first(function ($member) use ($booking) {
                $memberId = $member['id'] ?? null;
                return $memberId !== null && (string)$memberId === (string)$booking->specialist_id;
            });
            
            if ($specialist) {
                return [
                    'id' => $specialist['id'] ?? $booking->specialist_id,
                    'name' => $specialist['name'] ?? 'Не указано',
                ];
            }
        }

        return null;
    }

    /**
     * Get status color (название цвета для фронтенда).
     */
    private function getStatusColor($status)
    {
        return match($status) {
            'new' => 'blue',         // Синий - новый
            'pending' => 'orange',    // Оранжевый - ожидает
            'confirmed' => 'orange', // Оранжевый - подтверждено
            'completed' => 'green',  // Зеленый - завершено
            'cancelled' => 'red',   // Красный - отменено
            default => 'blue',       // По умолчанию синий (новый)
        };
    }
}


<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Notification;
use App\Services\BusinessOwnerMailer;
use App\Services\BusinessOwnerNotificationPreferences;
use App\Services\ClientBookingNotificationTexts;
use App\Services\ClientNotificationMailer;
use App\Support\MarketplaceClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

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
                ->withoutPendingPayment()
                ->with([
                    'service:id,name,service_type', 
                    'user:id,email,role',
                    'user.profile:user_id,phone,first_name,last_name,address,city,state,zip_code',
                    'advertisement:id,team,company_id,type,is_active,status',
                    'additionalServices',
                    'location',
                    'discountTier:id,name',
                    'promoCode:id,code',
                    'payment:id,booking_id,amount,application_fee,currency,status,capture_status',
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

                    // Конец интервала = время начала + длительность (не полночь + длительность — иначе end < start,
                    // FullCalendar трактует как переход через полночь и «заливает» весь день → ложные пересечения)
                    [$bookingStart, $endDate] = $this->calendarBookingWindowFromDay(
                        $bookingDate,
                        $booking->booking_time,
                        (int) ($booking->duration_minutes ?? 60)
                    );

                    // Определяем название события
                    // Для кастомных событий используем title из поля title, для обычных - формируем из клиента и услуги
                    $isCustomEvent = empty($booking->service_id) && !empty($booking->title);
                    if ($isCustomEvent && !empty($booking->title)) {
                        $title = $booking->title; // Для кастомных событий title сохранен в поле title
                        $serviceId = null;
                        $serviceName = null;
                    } else {
                        // Формируем название: имя клиента + услуга
                        $clientName = $booking->client_name ?? ($booking->user?->profile ? trim(($booking->user->profile?->first_name ?? '') . ' ' . ($booking->user->profile?->last_name ?? '')) : null) ?? 'Клиент';
                        
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
                    }
                    
                    // Цвет определяется по статусу
                    $status = $booking->status ?? 'new';
                    
                    // Определяем service_type из услуги
                    $serviceType = 'onsite';
                    if ($booking->service && $booking->service->service_type) {
                        $serviceType = $booking->service->service_type;
                    } elseif ($booking->advertisement_id) {
                        // Если услуга из объявления, берем service_type из JSON
                        $advertisement = \App\Models\Advertisement::find($booking->advertisement_id);
                        if ($advertisement) {
                            $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                            $serviceData = collect($services)->first(function ($s) use ($booking) {
                                return isset($s['id']) && (string)$s['id'] === (string)$booking->service_id;
                            });
                            if ($serviceData && isset($serviceData['service_type'])) {
                                $serviceType = $serviceData['service_type'];
                            }
                        }
                    }
                    
                    $result = [
                        'id' => (string) $booking->id,
                        'company_id' => $booking->company_id,
                        'title' => $title,
                        'start' => $bookingStart->format('Y-m-d\TH:i:s'),
                        'end' => $endDate->format('Y-m-d\TH:i:s'),
                        'eventColor' => $this->getStatusColor($status), // Цвет на основе статуса
                        'status' => $status,
                        // ВАЖНО: Передаём service_id напрямую из бронирования для надёжности
                        'service_id' => $booking->service_id,
                        // Дополнительные данные для модалки
                        'service' => [
                            'id' => $serviceId,
                            'name' => $serviceName,
                            'service_type' => $serviceType,
                        ],
                        'client' => [
                            'id' => $booking->user->id ?? null,
                            'name' => $booking->client_name ?? ($booking->user?->profile ? trim(($booking->user->profile?->first_name ?? '') . ' ' . ($booking->user->profile?->last_name ?? '')) : null) ?? 'Гость',
                            'email' => $booking->client_email ?? ($booking->user?->email ?? null),
                            'phone' => $booking->client_phone ?? ($booking->user?->profile?->phone ?? null),
                            // Добавляем адрес клиента для отображения в модалке
                            'address' => $booking->user?->profile?->address ?? null,
                            'city' => $booking->user?->profile?->city ?? null,
                            'state' => $booking->user?->profile?->state ?? null,
                            'zip_code' => $booking->user?->profile?->zip_code ?? null,
                        ],
                        'user_id' => $booking->user_id, // ID зарегистрированного пользователя (null для незарегистрированных)
                        'has_client_account' => $booking->user_id ? ($booking->user && $booking->user->isClient() && strpos($booking->user->email, '@local.local') === false) : false, // Есть ли у клиента аккаунт с ролью CLIENT (исключаем CRM клиентов с @local.local)
                        'review_token' => $booking->review_token, // Токен для отзыва клиентов без клиентского аккаунта
                        'specialist_id' => $booking->specialist_id,
                        'specialist' => $this->getSpecialistFromTeam($booking) ?: null,
                        'booking_date' => $bookingDate->format('Y-m-d'),
                        'booking_time' => $booking->booking_time,
                        'duration_minutes' => $booking->duration_minutes ?? 60,
                        'price' => (float) $booking->price,
                        'total_price' => (float) ($booking->total_price ?? $booking->price),
                        'discount_amount' => (float) ($booking->discount_amount ?? 0),
                        'discount_source' => $booking->discount_source,
                        'discount_tier_name' => $booking->discountTier?->name,
                        'promo_code' => $booking->promoCode?->code,
                        // Не дублировать ключ title: вычисленное $title уже включает кастомные события (см. блок $isCustomEvent выше)
                        'notes' => $booking->notes,
                        'client_notes' => $booking->client_notes,
                        'advertisement_id' => $booking->advertisement_id,
                        'payment_status' => $booking->payment_status ?? 'unpaid',
                        'platform_fee' => $booking->payment ? round((float)$booking->payment->application_fee / 100, 2) : null,
                        'net_amount' => $booking->payment ? round(((float)$booking->payment->amount - (float)$booking->payment->application_fee) / 100, 2) : null,
                        'execution_type' => $booking->execution_type ?? 'onsite',
                        'additional_services' => $booking->additionalServices ? $booking->additionalServices->map(function ($addService) {
                            return [
                                'id' => $addService->id ?? null,
                                'name' => $addService->name ?? '',
                                'description' => $addService->description ?? null,
                                'price' => (float) ($addService->pivot->price ?? $addService->price ?? 0),
                                'quantity' => (int) ($addService->pivot->quantity ?? 1),
                                'duration' => $addService->duration ?? null,
                                'duration_unit' => $addService->duration_unit ?? 'hours',
                                'pivot' => [
                                    'price' => (float) ($addService->pivot->price ?? $addService->price),
                                    'quantity' => (int) ($addService->pivot->quantity ?? 1),
                                ],
                                'additional_service' => [
                                    'id' => $addService->id ?? null,
                                    'name' => $addService->name ?? '',
                                    'description' => $addService->description ?? null,
                                    'price' => (float) ($addService->pivot->price ?? $addService->price ?? 0),
                                    'duration' => $addService->duration ?? null,
                                    'duration_unit' => $addService->duration_unit ?? 'hours',
                                ],
                            ];
                        })->toArray() : [],
                    ];
                    
                    // Добавляем адрес для offsite бронирований
                    if (($booking->execution_type ?? 'onsite') === 'offsite' && $booking->location) {
                        $result['location'] = [
                            'address_line1' => $booking->location->address_line1,
                            'city' => $booking->location->city,
                            'state' => $booking->location->state,
                            'zip' => $booking->location->zip,
                            'lat' => $booking->location->lat,
                            'lng' => $booking->location->lng,
                            'notes' => $booking->location->notes,
                        ];
                    }
                    
                    return $result;
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
            // Для кастомных событий service_id может быть null, но тогда требуется title
            $validated = $request->validate([
                'service_id' => 'nullable|integer|exists:services,id',
                'title' => 'nullable|string|max:255', // Название для кастомных событий
                'user_id' => ['nullable', Rule::exists('users', 'id')->where(fn ($q) => $q->where('role', 'CLIENT'))],
                'booking_date' => 'required|date',
                'booking_time' => 'required|date_format:H:i',
                'duration_minutes' => 'nullable|integer|min:15',
                'specialist_id' => 'nullable|exists:team_members,id',
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
                'execution_type' => 'nullable|in:onsite,offsite',
                'address_line1' => 'nullable|string|max:255',
                'city' => 'nullable|string|max:100',
                'state' => 'nullable|string|max:50',
                'zip' => 'nullable|string|max:20',
                'lat' => 'nullable|numeric',
                'lng' => 'nullable|numeric',
                'location_notes' => 'nullable|string|max:1000',
            ]);

            // Проверяем, что либо service_id, либо title указан
            if (empty($validated['service_id']) && empty($validated['title'])) {
                return response()->json([
                    'message' => 'Необходимо указать либо услугу (service_id), либо название события (title)',
                    'error' => 'service_or_title_required',
                ], 422);
            }

            // Получаем данные услуги для проверки расписания и цены (только если service_id указан)
            $service = null;
            if (!empty($validated['service_id'])) {
                $service = \App\Models\Service::where('id', $validated['service_id'])
                    ->where('company_id', $companyId)
                    ->first();
                if ($service && !$service->is_active) {
                    return response()->json([
                        'message' => 'Услуга недоступна для записи (деактивирована).',
                        'error' => 'service_inactive',
                    ], 422);
                }
            }

            if (!empty($validated['specialist_id'])) {
                $tm = \App\Models\TeamMember::where('id', $validated['specialist_id'])
                    ->where('company_id', $companyId)
                    ->first();
                if (!$tm || !$tm->is_active) {
                    return response()->json([
                        'message' => 'Специалист недоступен для записи (деактивирован).',
                        'error' => 'specialist_inactive',
                    ], 422);
                }
            }
            
            // Проверяем доступность слота (только для событий с услугой)
            // Для кастомных событий проверяем только пересечение времени
            $bookingService = app(\App\Services\BookingService::class);
            $isCustomEvent = empty($validated['service_id']) && !empty($validated['title']);
            
            if ($isCustomEvent) {
                // Для кастомных событий проверяем только пересечение времени
                $bookingDateTime = \Carbon\Carbon::parse($validated['booking_date'] . ' ' . $validated['booking_time']);
                $endDateTime = $bookingDateTime->copy()->addMinutes($validated['duration_minutes'] ?? 60);
                
                // Получаем все бронирования на эту дату (совместимо с SQLite и MySQL)
                $existingBookings = Booking::where('company_id', $companyId)
                    ->whereDate('booking_date', $validated['booking_date'])
                    ->whereIn('status', ['new', 'pending', 'confirmed', 'completed'])
                    ->where(function($query) use ($validated) {
                        // Если указан specialist_id, проверяем только его бронирования
                        if (!empty($validated['specialist_id'])) {
                            $query->where(function($q) use ($validated) {
                                $q->where('specialist_id', $validated['specialist_id'])
                                  ->orWhereNull('specialist_id'); // Старые бронирования без специалиста
                            });
                        } else {
                            // Если специалист не указан, проверяем только бронирования без специалиста
                            $query->whereNull('specialist_id');
                        }
                    })
                    ->whereNull('deleted_at')
                    ->get();
                
                // Проверяем пересечение времени в PHP (совместимо с любой БД)
                $overlappingBooking = null;
                foreach ($existingBookings as $existing) {
                    // Нормализуем формат времени
                    $existingTime = $existing->booking_time;
                    if (strlen($existingTime) === 5) {
                        $existingTime .= ':00';
                    }
                    
                    $existingStart = \Carbon\Carbon::parse($validated['booking_date'] . ' ' . $existingTime);
                    $existingEnd = $existingStart->copy()->addMinutes($existing->duration_minutes ?? 60);
                    
                    // Проверяем пересечение: начало нового < конец существующего И конец нового > начало существующего
                    if ($bookingDateTime->lt($existingEnd) && $endDateTime->gt($existingStart)) {
                        $overlappingBooking = $existing;
                        break;
                    }
                }
                
                $isAvailable = $overlappingBooking === null;
            } else {
                // Для событий с услугой используем стандартную проверку
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
            }

            \Log::info('ScheduleController: store - availability check result', [
                'isAvailable' => $isAvailable,
                'isCustomEvent' => $isCustomEvent,
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
                
                if ($existingUser && MarketplaceClient::isClientUserId((int) $existingUser->id)) {
                    // Только аккаунт с ролью CLIENT — иначе при совпадении email с владельцем бизнеса
                    // бронь ошибочно привязывалась к owner_id и клиентские уведомления попадали в inbox бизнеса.
                    $userId = $existingUser->id;

                    \Log::info('ScheduleController: Found existing CLIENT user by email', [
                        'email' => $validated['client_email'],
                        'user_id' => $userId,
                    ]);
                } elseif ($existingUser) {
                    \Log::info('ScheduleController: Skip linking booking to user — email matches non-CLIENT account', [
                        'email' => $validated['client_email'],
                        'resolved_user_id' => $existingUser->id,
                        'role' => $existingUser->role,
                    ]);
                }
            }

            // Определяем service_type из услуги (только для событий с услугой)
            $serviceType = 'onsite'; // По умолчанию
            if (!$isCustomEvent) {
                if ($service && isset($service->service_type)) {
                    $serviceType = $service->service_type;
                } elseif ($validated['advertisement_id']) {
                    // Если услуга из объявления, берем service_type из JSON
                    $advertisement = \App\Models\Advertisement::find($validated['advertisement_id']);
                    if ($advertisement) {
                        $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                        $serviceData = collect($services)->first(function ($s) use ($validated) {
                            return isset($s['id']) && (string)$s['id'] === (string)$validated['service_id'];
                        });
                        if ($serviceData && isset($serviceData['service_type'])) {
                            $serviceType = $serviceData['service_type'];
                        }
                    }
                }

                // Определяем execution_type на основе service_type
                $executionType = 'onsite'; // По умолчанию
                if ($serviceType === 'onsite') {
                    $executionType = 'onsite';
                } elseif ($serviceType === 'offsite') {
                    $executionType = 'offsite';
                } elseif ($serviceType === 'hybrid') {
                    // Для гибридных услуг используем значение из запроса или дефолт 'onsite'
                    $executionType = $validated['execution_type'] ?? 'onsite';
                }
            } else {
                // Для кастомных событий всегда onsite
                $executionType = 'onsite';
            }

            // Получаем адрес клиента для offsite бронирований (только для событий с услугой)
            $addressData = [];
            if (!$isCustomEvent && $executionType === 'offsite') {
                // Сначала проверяем, передан ли адрес в запросе
                if ($request->has('address_line1') && !empty($request->address_line1)) {
                    $addressData = [
                        'address_line1' => $request->address_line1,
                        'city' => $request->city ?? null,
                        'state' => $request->state ?? null,
                        'zip' => $request->zip ?? null,
                        'lat' => $request->lat ?? null,
                        'lng' => $request->lng ?? null,
                        'location_notes' => $request->location_notes ?? null,
                    ];
                } elseif ($userId) {
                    // Если адрес не передан, пытаемся получить из профиля пользователя
                    $user = \App\Models\User::with('profile')->find($userId);
                    if ($user && $user->profile) {
                        $profile = $user->profile;
                        // Парсим адрес из поля address (может быть в формате "address, city, state zip")
                        $addressLine1 = $profile->address ?? null;
                        $city = $profile->city ?? null;
                        $state = $profile->state ?? null;
                        $zip = $profile->zip_code ?? null;
                        
                        // Если есть хотя бы address_line1, используем данные из профиля
                        if ($addressLine1) {
                            $addressData = [
                                'address_line1' => $addressLine1,
                                'city' => $city,
                                'state' => $state,
                                'zip' => $zip,
                                'lat' => null,
                                'lng' => null,
                                'location_notes' => null,
                            ];
                        }
                    }
                }
                
                // Проверяем, что адрес есть (обязателен для offsite бронирований)
                if (empty($addressData) || empty($addressData['address_line1'])) {
                    return response()->json([
                        'message' => 'Для выездных услуг необходимо указать адрес клиента',
                        'error' => 'address_required',
                    ], 400);
                }
            }

            // Создаем бронирование
            // Для произвольных событий используем переданную цену из запроса (округлённую до 2 знаков), иначе — цену услуги
            $priceForBooking = $isCustomEvent
                ? round((float)($validated['price'] ?? 0), 2)
                : $servicePrice;

            $bookingData = [
                'company_id' => $companyId,
                'user_id' => $isCustomEvent ? null : $userId, // Для кастомных событий не требуется клиент
                'service_id' => $validated['service_id'] ?? null, // Может быть null для кастомных событий
                'title' => $isCustomEvent ? ($validated['title'] ?? null) : null, // Для кастомных событий сохраняем title в поле title
                'advertisement_id' => $validated['advertisement_id'] ?? null,
                'specialist_id' => $validated['specialist_id'] ?? null,
                'booking_date' => $validated['booking_date'],
                'booking_time' => $validated['booking_time'],
                'duration_minutes' => $validated['duration_minutes'] ?? 60,
                'price' => $priceForBooking,
                'status' => $validated['status'] ?? 'new',
                'notes' => $validated['notes'] ?? null, // Notes отдельно от title
                'client_notes' => $validated['client_notes'] ?? null,
                'client_name' => $isCustomEvent ? null : ($validated['client_name'] ?? null), // Для кастомных событий не требуется
                'client_email' => $isCustomEvent ? null : ($validated['client_email'] ?? null), // Для кастомных событий не требуется
                'client_phone' => $isCustomEvent ? null : ($validated['client_phone'] ?? null), // Для кастомных событий не требуется
                'execution_type' => $executionType,
            ];

            // Добавляем данные адреса для offsite бронирований
            if ($executionType === 'offsite' && !empty($addressData)) {
                $bookingData = array_merge($bookingData, $addressData);
            }

            $booking = $bookingService->createBooking($bookingData);

            // Прикрепляем дополнительные услуги, если они есть (только для событий с услугой)
            if (!$isCustomEvent && !empty($validated['additional_services'])) {
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
            $booking->refresh();
            $booking->load('additionalServices');
            $booking->total_price = $booking->calculateTotalWithAdditionalServices();
            $booking->save();

            // Применяем скидку лояльности для клиента (если он зарегистрирован)
            if (!$isCustomEvent && $booking->user_id) {
                $discountService = app(\App\Services\DiscountCalculationService::class);
                $discountService->applyToBooking($booking, null, $booking->user_id);
            }

            // Уведомление владельцу бизнеса о новом бронировании (не для кастомных событий)
            if (!$isCustomEvent && $booking->company_id) {
                $bookingService->notifyOwnerAboutNewBooking($booking);
            }

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

            [$bookingStart, $endDate] = $this->calendarBookingWindowFromDay(
                $bookingDate,
                $booking->booking_time,
                (int) ($booking->duration_minutes ?? 60)
            );

            // Определяем название события
            // Для кастомных событий используем title из поля title, для обычных - формируем из клиента и услуги
            if ($isCustomEvent && !empty($booking->title)) {
                $title = $booking->title; // Для кастомных событий title сохранен в поле title
            } else {
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

                $clientName = $booking->client_name ?? ($booking->user?->profile ? trim(($booking->user->profile?->first_name ?? '') . ' ' . ($booking->user->profile?->last_name ?? '')) : null) ?? 'Клиент';
                $title = $clientName . ' - ' . $serviceName;
            }

            return response()->json([
                'id' => (string) $booking->id,
                'title' => $title,
                'start' => $bookingStart->format('Y-m-d\TH:i:s'),
                'end' => $endDate->format('Y-m-d\TH:i:s'),
                'eventColor' => $this->getStatusColor($booking->status),
                'status' => $booking->status,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating schedule slot: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'request_data' => [
                    'service_id' => $request->input('service_id'),
                    'title' => $request->input('title'),
                    'is_custom_event' => empty($request->input('service_id')) && !empty($request->input('title')),
                    'booking_date' => $request->input('booking_date'),
                    'booking_time' => $request->input('booking_time'),
                ],
            ]);
            return response()->json([
                'message' => 'Error creating booking',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
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

            Log::info('ScheduleController: update slot request', [
                'id' => $id,
                'current_company_id' => $companyId,
                'booking_date' => $request->get('booking_date'),
                'booking_time' => $request->get('booking_time'),
                'has_body' => $request->getContent() !== '',
            ]);

            if (!$companyId) {
                return response()->json([
                    'message' => 'Company not found',
                ], 404);
            }

            // Находим бронирование по ID и company_id
            // Брони в pending_payment скрыты от бизнеса — обновлять их нельзя.
            $booking = Booking::where('company_id', $companyId)
                ->where('id', $id)
                ->withoutPendingPayment()
                ->first();

            if (!$booking) {
                $existsElsewhere = Booking::where('id', $id)->first();
                Log::warning('ScheduleController: Booking not found for update', [
                    'id' => $id,
                    'company_id' => $companyId,
                    'booking_exists' => (bool) $existsElsewhere,
                    'actual_company' => $existsElsewhere?->company_id,
                ]);
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
                'title' => 'nullable|string|max:255',
                'specialist_id' => 'nullable|exists:team_members,id',
                'service_id' => 'sometimes|nullable|integer|exists:services,id',
                'advertisement_id' => 'sometimes|nullable|integer|exists:advertisements,id',
                'price' => 'nullable|numeric|min:0',
                'additional_services' => 'nullable|array',
                'additional_services.*.id' => 'required|exists:additional_services,id',
                'additional_services.*.quantity' => 'required|integer|min:1',
                'additional_services.*.price' => 'nullable|numeric|min:0',
            ]);

            // Обновляем статус, если передан
            // Разрешаем изменение статуса даже для прошедших дат
            $oldStatus = $booking->status;
            $statusChanged = false;
            
            if ($request->has('status')) {
                if ($request->status === 'completed') {
                    $bookingDateStr = $booking->booking_date instanceof \Carbon\Carbon
                        ? $booking->booking_date->format('Y-m-d')
                        : substr((string) $booking->booking_date, 0, 10);
                    if ($bookingDateStr > now()->format('Y-m-d')) {
                        return response()->json([
                            'error' => 'Cannot mark a future booking as completed',
                            'message' => 'Нельзя завершить бронирование с датой в будущем',
                        ], 422);
                    }
                }

                $statusChanged = $oldStatus !== $request->status;
                $booking->status = $request->status;
                
                if ($request->status === 'completed' && $oldStatus !== 'completed') {
                    if ($booking->payment_status === 'authorized') {
                        $user = auth('api')->user();
                        $captureResult = app(\App\Services\BookingService::class)
                            ->captureAuthorizedPayment($booking, $user?->id, $user?->role);
                        if ($captureResult['captured']) {
                            $booking->refresh();
                        }
                    }

                    // Генерируем токен для отзыва, если у клиента нет клиентского аккаунта
                    // Проверяем, что у пользователя нет роли CLIENT ИЛИ это CRM клиент (email содержит @local.local)
                    $hasClientAccount = $booking->user_id && $booking->user && $booking->user->isClient() && strpos($booking->user->email, '@local.local') === false;
                    
                    if (!$hasClientAccount && empty($booking->review_token)) {
                        $booking->generateReviewToken();
                        
                        \Log::info('ScheduleController: Generated review token for client without account', [
                            'booking_id' => $booking->id,
                            'user_id' => $booking->user_id,
                            'has_client_account' => $hasClientAccount,
                            'user_role' => $booking->user ? $booking->user->role : null,
                            'client_email' => $booking->client_email,
                            'client_name' => $booking->client_name,
                            'review_token' => $booking->review_token,
                        ]);
                    } else {
                        \Log::info('ScheduleController: Skipped review token generation', [
                            'booking_id' => $booking->id,
                            'user_id' => $booking->user_id,
                            'has_client_account' => $hasClientAccount,
                            'user_role' => $booking->user ? $booking->user->role : null,
                            'has_review_token' => !empty($booking->review_token),
                        ]);
                    }
                }
                
                // Если статус меняется на cancelled — дата отмены и авто-refund
                if ($request->status === 'cancelled' && $oldStatus !== 'cancelled') {
                    $booking->cancelled_at = now();
                    $booking->cancellation_reason = $request->cancellation_reason ?? 'Отменено администратором';
                    $booking->save();

                    if (in_array($booking->payment_status, ['authorized', 'paid'])) {
                        $user = auth('api')->user();
                        app(\App\Services\BookingService::class)
                            ->refundOrCancelPayment($booking, $user?->id, $user?->role, $booking->cancellation_reason);
                        $booking->refresh();
                    }
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

            // Обновляем title для кастомных событий
            if ($request->filled('title')) {
                $booking->title = $request->title;
            } elseif ($request->has('title') && $request->title === null) {
                // Если явно передан null, очищаем поле
                $booking->title = null;
            }

            // Обновляем исполнителя (specialist_id), включая явный null (has() не видит null в JSON)
            $inputAll = $request->all();
            if (array_key_exists('specialist_id', $inputAll)) {
                $sid = $inputAll['specialist_id'];
                if ($sid !== null && $sid !== '') {
                    $tm = \App\Models\TeamMember::where('id', $sid)->where('company_id', $companyId)->first();
                    if (!$tm || !$tm->is_active) {
                        return response()->json([
                            'message' => 'Специалист недоступен для записи (деактивирован).',
                            'error' => 'specialist_inactive',
                        ], 422);
                    }
                    $booking->specialist_id = (int) $tm->id;
                } else {
                    $booking->specialist_id = null;
                }
            }

            // Смена услуги / объявления (мобилка и API; проверяем принадлежность компании)
            if (array_key_exists('service_id', $inputAll)) {
                $newServiceId = $inputAll['service_id'];
                if ($newServiceId !== null && $newServiceId !== '') {
                    $svc = \App\Models\Service::where('id', $newServiceId)->where('company_id', $companyId)->first();
                    if ($svc && !$svc->is_active) {
                        return response()->json([
                            'message' => 'Услуга недоступна для записи (деактивирована).',
                            'error' => 'service_inactive',
                        ], 422);
                    }
                    if ($svc) {
                        $booking->service_id = (int) $svc->id;
                    }
                }
            }
            if (array_key_exists('advertisement_id', $inputAll)) {
                $aid = $inputAll['advertisement_id'];
                if ($aid !== null && $aid !== '') {
                    $ad = \App\Models\Advertisement::where('id', $aid)->where('company_id', $companyId)->first();
                    if ($ad) {
                        $booking->advertisement_id = (int) $ad->id;
                    }
                }
            }

            // Обновляем базовую цену услуги (округление до 2 знаков)
            if ($request->has('price')) {
                $booking->price = round((float) $request->price, 2);
            }

            // Обновляем дополнительные услуги, если они переданы
            if ($request->has('additional_services')) {
                $syncData = [];
                foreach ($request->additional_services as $item) {
                    $additionalService = \App\Models\AdditionalService::find($item['id']);
                    if ($additionalService) {
                        $syncData[$item['id']] = [
                            'quantity' => $item['quantity'],
                            'price' => isset($item['price']) ? (float) $item['price'] : $additionalService->price,
                        ];
                    }
                }
                $booking->additionalServices()->sync($syncData);
                $booking->load('additionalServices');
            }
            
            // Пересчитываем общую стоимость при изменении цены, доп. услуг или базовой услуги
            $priceChanged = $request->has('price')
                || $request->has('additional_services')
                || array_key_exists('service_id', $inputAll)
                || array_key_exists('advertisement_id', $inputAll);

            if ($priceChanged) {
                $booking->total_price = $booking->calculateTotalWithAdditionalServices();
            }

            $booking->save();

            // Пересчитываем скидку лояльности если изменилась цена/услуга
            if ($priceChanged && $booking->user_id && $booking->service_id) {
                $discountService = app(\App\Services\DiscountCalculationService::class);
                $discountService->applyToBooking($booking, null, $booking->user_id);
            }

            // Отправляем уведомление клиенту при изменении статуса
            if ($statusChanged && $booking->user_id) {
                $this->sendBookingStatusNotification($booking, $oldStatus, $request->status);
            }

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

            [$bookingStart, $endDate] = $this->calendarBookingWindowFromDay(
                $bookingDate,
                $booking->booking_time,
                (int) ($booking->duration_minutes ?? 60)
            );

            // Определяем название события
            // Для кастомных событий используем title из поля title, для обычных - формируем из клиента и услуги
            $isCustomEvent = empty($booking->service_id) && !empty($booking->title);
            if ($isCustomEvent && !empty($booking->title)) {
                $title = $booking->title; // Для кастомных событий title сохранен в поле title
            } else {
                $clientName = $booking->client_name ?? ($booking->user?->profile ? trim(($booking->user->profile?->first_name ?? '') . ' ' . ($booking->user->profile?->last_name ?? '')) : null) ?? 'Клиент';
                
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
            }

            // Обновляем данные бронирования перед возвратом
            $booking->refresh();
            
            // Загружаем связи для правильного вычисления has_client_account
            $booking->load('user:id,email,role', 'user.profile:user_id,first_name,last_name');
            
            return response()->json([
                'id' => (string) $booking->id,
                'title' => $title, // Сформированный title (для кастомных событий - из booking->title, для обычных - "Клиент - Услуга")
                'start' => $bookingStart->format('Y-m-d\TH:i:s'),
                'end' => $endDate->format('Y-m-d\TH:i:s'),
                'eventColor' => $this->getStatusColor($booking->status),
                'status' => $booking->status,
                'service_id' => $booking->service_id, // Добавляем service_id для правильного определения кастомных событий
                'user_id' => $booking->user_id, // ID зарегистрированного пользователя (null для незарегистрированных)
                'has_client_account' => $booking->user_id ? ($booking->user && $booking->user->isClient() && strpos($booking->user->email, '@local.local') === false) : false, // Есть ли у клиента аккаунт с ролью CLIENT (исключаем CRM клиентов с @local.local)
                'review_token' => $booking->review_token, // Токен для отзыва клиентов без клиентского аккаунта
                'specialist_id' => $booking->specialist_id,
                'specialist' => $this->getSpecialistFromTeam($booking) ?: null,
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
                ->withoutPendingPayment()
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

        // Сначала ищем в team_members (основной источник)
        $teamMember = \App\Models\TeamMember::where('id', $booking->specialist_id)
            ->where('company_id', $booking->company_id)
            ->first();
        
        if ($teamMember) {
            return [
                'id' => $teamMember->id,
                'name' => $teamMember->name ?? 'Не указано',
            ];
        }

        // Если не найден в БД, ищем в объявлении (для старых данных)
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
     * Начало и конец слота для календаря: дата (start of day) + booking_time + duration.
     * Нельзя считать end как полночь + duration — иначе при брони в 09:00 получается end 01:00 того же дня,
     * календарь считает интервал «через полночь» и пересечение с любым временем днём.
     *
     * @return array{0: \Carbon\Carbon, 1: \Carbon\Carbon}
     */
    private function calendarBookingWindowFromDay(\Carbon\Carbon $dateStartOfDay, ?string $bookingTime, int $durationMinutes): array
    {
        $time = $bookingTime ?? '00:00:00';
        if (strlen($time) === 5) {
            $time .= ':00';
        }
        $start = $dateStartOfDay->copy()->setTimeFromTimeString($time);
        $duration = $durationMinutes > 0 ? $durationMinutes : 60;
        $end = $start->copy()->addMinutes($duration);

        return [$start, $end];
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

    /**
     * Отправить уведомление клиенту об изменении статуса бронирования.
     */
    private function sendBookingStatusNotification(Booking $booking, string $oldStatus, string $newStatus): void
    {
        $payload = ClientBookingNotificationTexts::forBookingStatusChange($booking, $newStatus);
        if ($payload === null) {
            return;
        }

        try {
            if (MarketplaceClient::isClientUserId((int) $booking->user_id)) {
                Notification::create([
                    'user_id' => $booking->user_id,
                    'company_id' => $booking->company_id,
                    'type' => 'booking',
                    'title' => $payload['title'],
                    'message' => $payload['message'],
                    'link' => $payload['link'],
                    'read' => false,
                ]);

                ClientNotificationMailer::bookingStatusIfEnabled(
                    $booking->user_id,
                    $payload['title'],
                    $payload['message'],
                    $payload['link']
                );

                Log::info('ScheduleController: Notification sent', [
                    'booking_id' => $booking->id,
                    'user_id' => $booking->user_id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'title' => $payload['title'],
                ]);
            } else {
                Log::warning('ScheduleController: skip client booking status in-app/email — user_id is not a CLIENT', [
                    'booking_id' => $booking->id,
                    'user_id' => $booking->user_id,
                    'new_status' => $newStatus,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('ScheduleController: Failed to send notification', [
                'booking_id' => $booking->id,
                'user_id' => $booking->user_id,
                'error' => $e->getMessage(),
            ]);
        }

        $this->sendBusinessOwnerBookingNotification(
            $booking,
            $newStatus,
            $payload['serviceName'],
            $payload['companyName'],
            $payload['bookingDate'],
            $payload['bookingTime']
        );
    }

    /**
     * Отправить уведомление владельцу бизнеса об изменении бронирования (новое/отмена).
     */
    private function sendBusinessOwnerBookingNotification(
        Booking $booking,
        string $newStatus,
        string $serviceName,
        string $companyName,
        string $bookingDate,
        string $bookingTime
    ): void {
        $company = $booking->company;
        if (!$company || !$company->owner_id) {
            return;
        }

        $owner = \App\Models\User::find($company->owner_id);
        $ownerLocale = \App\Support\NotificationLocale::forBusinessOwner($owner);
        $clientName = $booking->client_name;
        if (!$clientName && $booking->user_id && $booking->user) {
            $profile = $booking->user->profile;
            $clientName = $profile ? trim(($profile->first_name ?? '') . ' ' . ($profile->last_name ?? '')) : $booking->user->email;
        }
        $clientName = $clientName ?: ($ownerLocale === 'ru' ? 'Клиент' : ($ownerLocale === 'es-mx' ? 'Cliente' : ($ownerLocale === 'hy-am' ? 'Հաճախորդ' : ($ownerLocale === 'uk-ua' ? 'Клієнт' : 'Client'))));

        $translations = [
            'ru' => [
                'new_booking' => [
                    'title' => 'Новое бронирование подтверждено',
                    'message' => "Клиент {$clientName} забронировал «{$serviceName}» на {$bookingDate} в {$bookingTime}.",
                ],
                'booking_cancelled' => [
                    'title' => 'Бронирование отменено',
                    'message' => "Бронирование «{$serviceName}» от {$clientName} на {$bookingDate} в {$bookingTime} отменено.",
                ],
            ],
            'en' => [
                'new_booking' => [
                    'title' => 'New booking confirmed',
                    'message' => "Client {$clientName} booked «{$serviceName}» on {$bookingDate} at {$bookingTime}.",
                ],
                'booking_cancelled' => [
                    'title' => 'Booking cancelled',
                    'message' => "Booking «{$serviceName}» from {$clientName} on {$bookingDate} at {$bookingTime} has been cancelled.",
                ],
            ],
            'es-mx' => [
                'new_booking' => [
                    'title' => 'Reserva confirmada',
                    'message' => "El cliente {$clientName} reservó «{$serviceName}» el {$bookingDate} a las {$bookingTime}.",
                ],
                'booking_cancelled' => [
                    'title' => 'Reserva cancelada',
                    'message' => "La reserva de «{$serviceName}» de {$clientName} el {$bookingDate} a las {$bookingTime} fue cancelada.",
                ],
            ],
            'hy-am' => [
                'new_booking' => [
                    'title' => 'Ամրագրումը հաստատված է',
                    'message' => "Հաճախորդ {$clientName}-ը ամրագրել է «{$serviceName}»-ը՝ {$bookingDate}, ժամը {$bookingTime}։",
                ],
                'booking_cancelled' => [
                    'title' => 'Ամրագրումը չեղարկված է',
                    'message' => "«{$serviceName}» ամրագրումը ({$clientName}, {$bookingDate}, {$bookingTime}) չեղարկվել է։",
                ],
            ],
            'uk-ua' => [
                'new_booking' => [
                    'title' => 'Нове бронювання підтверджено',
                    'message' => "Клієнт {$clientName} забронював(ла) «{$serviceName}» на {$bookingDate} о {$bookingTime}.",
                ],
                'booking_cancelled' => [
                    'title' => 'Бронювання скасовано',
                    'message' => "Бронювання «{$serviceName}» від {$clientName} на {$bookingDate} о {$bookingTime} скасовано.",
                ],
            ],
        ];

        $type = null;
        if ($newStatus === 'confirmed') {
            $type = 'new_booking';
        } elseif ($newStatus === 'cancelled') {
            $type = 'booking_cancelled';
        }
        if (!$type) {
            return;
        }

        $prefEvent = $type === 'new_booking'
            ? BusinessOwnerNotificationPreferences::EVENT_NEW_BOOKING
            : BusinessOwnerNotificationPreferences::EVENT_BOOKING_CANCELLED;

        $title = $translations[$ownerLocale][$type]['title'];
        $message = $translations[$ownerLocale][$type]['message'];
        $link = '/business/schedule';

        if (BusinessOwnerNotificationPreferences::allowsOwnerInAppNotification($company, $prefEvent)) {
            try {
                Notification::create([
                    'user_id' => $company->owner_id,
                    'type' => $type,
                    'title' => $title,
                    'message' => $message,
                    'link' => $link,
                    'read' => false,
                ]);
            } catch (\Exception $e) {
                Log::error('ScheduleController: Failed to send business owner notification', [
                    'booking_id' => $booking->id,
                    'owner_id' => $company->owner_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        BusinessOwnerMailer::notifyIfEnabled(
            $company,
            (int) $company->owner_id,
            $prefEvent,
            $title,
            $message,
            '/business/schedule'
        );

        \App\Services\TelegramBusinessNotifier::notifyCompany(
            $company,
            $prefEvent,
            $title,
            $message,
            '/business/schedule'
        );
    }
}


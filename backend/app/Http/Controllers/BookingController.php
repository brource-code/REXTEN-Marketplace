<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Service;
use App\Models\Company;
use App\Models\Advertisement;
use App\Models\AdditionalService;
use App\Services\BookingService;
use App\Services\DiscountCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;
use Tymon\JWTAuth\Facades\JWTAuth;

class BookingController extends Controller
{
    protected $bookingService;

    public function __construct(BookingService $bookingService)
    {
        $this->bookingService = $bookingService;
    }

    /**
     * Создать бронирование (публичный endpoint)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'company_id' => 'required|exists:companies,id',
            'service_id' => 'required|integer',
            'booking_date' => 'required|date',
            'booking_time' => 'required|date_format:H:i',
            'duration_minutes' => 'nullable|integer|min:15',
            'specialist_id' => 'nullable|exists:team_members,id',
            'client_name' => 'required|string|max:255',
            'client_phone' => 'required|string|max:20',
            'client_email' => 'nullable|email|max:255',
            'client_notes' => 'nullable|string|max:1000',
            'advertisement_id' => 'nullable|exists:advertisements,id', // Добавляем опциональный advertisement_id
            'execution_type' => 'nullable|in:onsite,offsite', // Для гибридных услуг обязательно
            'address_line1' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:50',
            'zip' => 'nullable|string|max:20',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
            'location_notes' => 'nullable|string|max:1000',
            'additional_services' => 'nullable|array',
            'additional_services.*.id' => 'required|integer|exists:additional_services,id',
            'additional_services.*.quantity' => 'required|integer|min:1',
            'promo_code' => 'nullable|string|max:64',
        ]);
        
        // Дополнительная проверка даты с учетом таймзоны
        $timezone = config('app.timezone') ?: date_default_timezone_get();
        $today = Carbon::today($timezone);
        $bookingDate = Carbon::parse($request->booking_date, $timezone)->startOfDay();
        
        if ($bookingDate->lt($today)) {
            $validator->errors()->add('booking_date', 'Дата бронирования не может быть в прошлом');
        }

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Логируем входящий запрос для отладки
            Log::info('Booking request', [
                'company_id' => $request->company_id,
                'service_id' => $request->service_id,
                'advertisement_id' => $request->advertisement_id ?? 'not provided',
                'all_request' => $request->all(),
            ]);
            
            // Проверяем существование компании
            $company = Company::findOrFail($request->company_id);
            
            // ВАЖНО: Если передан advertisement_id, это объявление с виртуальными услугами
            // НЕ ищем в таблице services, сразу переходим к объявлениям!
            $service = null;
            if (!$request->has('advertisement_id') || !$request->advertisement_id) {
                // Только если advertisement_id НЕ передан, ищем в таблице services
                $service = Service::where('id', $request->service_id)
                    ->where('company_id', $company->id)
                    ->first();
            }
            
            // Если услуга не найдена в таблице services (или это объявление), проверяем объявления
            if (!$service) {
                // ВАЖНО: Если передан advertisement_id, используем ТОЛЬКО его!
                // Иначе может быть путаница, так как виртуальные ID могут совпадать между объявлениями
                if ($request->has('advertisement_id') && $request->advertisement_id) {
                    // Используем конкретное объявление
                    // ВАЖНО: Ищем объявления типа 'regular' И 'advertisement' (рекламные объявления тоже могут иметь услуги)
                    $advertisement = \App\Models\Advertisement::where('id', $request->advertisement_id)
                        ->where('company_id', $company->id)
                        ->whereIn('type', ['regular', 'advertisement'])
                        ->where('is_active', true)
                        ->where('status', 'approved')
                        ->first();
                    
                    if (!$advertisement) {
                        Log::warning('Advertisement not found', [
                            'advertisement_id' => $request->advertisement_id,
                            'company_id' => $company->id,
                        ]);
                        return response()->json([
                            'success' => false,
                            'message' => 'Объявление не найдено',
                        ], 404);
                    }
                    
                    // Проверяем, есть ли услуга с таким ID в этом объявлении
                    $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                    $serviceIdStr = (string)$request->service_id;
                    $serviceIdInt = (int)$request->service_id;
                    
                    Log::info('Looking for service in advertisement', [
                        'advertisement_id' => $request->advertisement_id,
                        'advertisement_title' => $advertisement->title,
                        'requested_service_id' => $request->service_id,
                        'service_id_str' => $serviceIdStr,
                        'service_id_int' => $serviceIdInt,
                        'available_services' => $services,
                    ]);
                    
                    $serviceFound = false;
                    $foundService = null;
                    foreach ($services as $svc) {
                        $sId = $svc['id'] ?? null;
                        if ($sId !== null && ((string)$sId === $serviceIdStr || (int)$sId === $serviceIdInt)) {
                            $serviceFound = true;
                            $foundService = $svc;
                            break;
                        }
                    }
                    
                    if (!$serviceFound) {
                        Log::warning('Service not found in advertisement', [
                            'advertisement_id' => $request->advertisement_id,
                            'service_id' => $request->service_id,
                            'available_service_ids' => collect($services)->pluck('id')->toArray(),
                        ]);
                        return response()->json([
                            'success' => false,
                            'message' => 'Услуга не найдена в объявлении',
                        ], 404);
                    }
                    
                    Log::info('Service found in advertisement', [
                        'advertisement_id' => $request->advertisement_id,
                        'found_service' => $foundService,
                    ]);
                } else {
                    // Если advertisement_id не передан, ищем во всех объявлениях (старая логика)
                    // ВНИМАНИЕ: Это может привести к путанице, если виртуальные ID совпадают!
                    Log::warning('No advertisement_id provided, searching in all advertisements', [
                        'company_id' => $company->id,
                        'service_id' => $request->service_id,
                    ]);
                    
                    // ВАЖНО: Ищем объявления типа 'regular' И 'advertisement' (рекламные объявления тоже могут иметь услуги)
                    $advertisementsQuery = \App\Models\Advertisement::where('company_id', $company->id)
                        ->whereIn('type', ['regular', 'advertisement'])
                        ->where('is_active', true)
                        ->where('status', 'approved');
                    
                    $advertisement = $advertisementsQuery->get()
                        ->first(function ($ad) use ($request) {
                            $services = is_array($ad->services) ? $ad->services : (json_decode($ad->services, true) ?? []);
                            $serviceIdStr = (string)$request->service_id;
                            $serviceIdInt = (int)$request->service_id;
                            foreach ($services as $svc) {
                                $sId = $svc['id'] ?? null;
                                if ($sId !== null && ((string)$sId === $serviceIdStr || (int)$sId === $serviceIdInt)) {
                                    return true;
                                }
                            }
                            return false;
                        });
                    
                    if (!$advertisement) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Услуга не найдена',
                        ], 404);
                    }
                }
                
                // Создаем временную услугу из данных объявления
                $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                $serviceIdStr = (string)$request->service_id;
                $serviceIdInt = (int)$request->service_id;
                $serviceData = collect($services)->first(function ($s) use ($serviceIdStr, $serviceIdInt) {
                    $sId = $s['id'] ?? null;
                    if ($sId === null) return false;
                    return (string)$sId === $serviceIdStr || (int)$sId === $serviceIdInt;
                });
                
                if (!$serviceData) {
                    Log::error('Service data not found after verification', [
                        'advertisement_id' => $request->advertisement_id,
                        'service_id' => $request->service_id,
                        'available_services' => $services,
                    ]);
                    return response()->json([
                        'success' => false,
                        'message' => 'Услуга не найдена в объявлении',
                    ], 404);
                }
                
                Log::info('Creating service object from advertisement', [
                    'advertisement_id' => $request->advertisement_id,
                    'advertisement_title' => $advertisement->title,
                    'service_data' => $serviceData,
                    'service_name' => $serviceData['name'] ?? 'Услуга',
                ]);
                
                // Создаем временный объект услуги для дальнейшей обработки
                // ВАЖНО: duration из JSON может быть 1440 (24 часа) - это срок выполнения, а не длительность сеанса!
                // Используем только разумные значения (15-480 минут) или дефолт 60
                $serviceDuration = $serviceData['duration'] ?? 60;
                if (is_numeric($serviceDuration)) {
                    $serviceDuration = (int)$serviceDuration;
                    // Если duration >= 480 минут (8 часов), это скорее всего срок выполнения, а не длительность сеанса
                    if ($serviceDuration >= 480) {
                        $serviceDuration = 60; // Используем дефолтное значение
                    } elseif ($serviceDuration < 15) {
                        $serviceDuration = 15; // Минимум 15 минут
                    }
                } else {
                    $serviceDuration = 60;
                }
                
                $service = (object)[
                    'id' => $request->service_id,
                    'company_id' => $company->id,
                    'name' => $serviceData['name'] ?? 'Услуга',
                    'price' => $serviceData['price'] ?? 0,
                    'duration_minutes' => $serviceDuration,
                    'service_type' => $serviceData['service_type'] ?? 'onsite', // Добавляем service_type из JSON
                    'schedule' => $advertisement->schedule ?? null, // Добавляем расписание
                    'advertisement_id' => $advertisement->id, // Добавляем ID объявления для получения slot_step_minutes
                ];
            }

            // Проверяем, что услуга принадлежит компании (если это объект Service)
            if (is_object($service) && isset($service->company_id) && $service->company_id !== $company->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Услуга не принадлежит этой компании',
                ], 400);
            }

            // Проверка доступности выполняется в createBooking
            // Здесь не проверяем, чтобы избежать дублирования и возможных расхождений

            // user_id только из сессии JWT, никогда из тела запроса (защита от подмены)
            $userId = auth('api')->check() ? auth('api')->id() : null;
            if ($userId === null && $request->bearerToken()) {
                try {
                    $tokenUser = JWTAuth::parseToken()->authenticate();
                    if ($tokenUser) {
                        $userId = $tokenUser->id;
                    }
                } catch (\Throwable $e) {
                    $userId = null;
                }
            }

            // Получаем данные услуги
            $servicePrice = is_object($service) ? ($service->price ?? 0) : ($service['price'] ?? 0);
            
            // Нормализуем duration: значения >= 480 минут (8 часов) - это срок выполнения, а не длительность сеанса
            $serviceDurationRaw = is_object($service) ? ($service->duration_minutes ?? 60) : ($service['duration'] ?? 60);
            $serviceDuration = 60; // Дефолтное значение
            if (is_numeric($serviceDurationRaw)) {
                $serviceDurationRaw = (int)$serviceDurationRaw;
                if ($serviceDurationRaw >= 15 && $serviceDurationRaw < 480) { // От 15 минут до 8 часов (не включая)
                    $serviceDuration = $serviceDurationRaw;
                }
            }
            
            $serviceName = is_object($service) ? ($service->name ?? 'Услуга') : ($service['name'] ?? 'Услуга');
            
            // Определяем service_type
            $serviceType = 'onsite'; // По умолчанию
            if (is_object($service) && isset($service->service_type)) {
                // Услуга из таблицы services
                $serviceType = $service->service_type;
            } elseif (is_array($service) && isset($service['service_type'])) {
                // Услуга из JSON объявления
                $serviceType = $service['service_type'];
            } elseif (isset($foundService) && isset($foundService['service_type'])) {
                // Услуга из объявления (foundService)
                $serviceType = $foundService['service_type'];
            }
            
            // Определяем execution_type на основе service_type
            $executionType = 'onsite'; // По умолчанию
            if ($serviceType === 'onsite') {
                $executionType = 'onsite';
            } elseif ($serviceType === 'offsite') {
                $executionType = 'offsite';
            } elseif ($serviceType === 'hybrid') {
                // Для гибридных услуг execution_type должен быть в запросе
                if ($request->has('execution_type') && in_array($request->execution_type, ['onsite', 'offsite'])) {
                    $executionType = $request->execution_type;
                } else {
                    return response()->json([
                        'success' => false,
                        'message' => 'Для гибридной услуги необходимо указать тип исполнения (execution_type)',
                        'errors' => ['execution_type' => ['Поле execution_type обязательно для гибридных услуг']],
                    ], 422);
                }
            }
            
            Log::info('Creating booking with service data', [
                'service_name' => $serviceName,
                'service_price' => $servicePrice,
                'service_duration' => $serviceDuration,
                'service_type' => $serviceType,
                'execution_type' => $executionType,
                'service_object' => is_object($service) ? ['id' => $service->id ?? null, 'name' => $service->name ?? null, 'company_id' => $service->company_id ?? null] : $service,
                'advertisement_id' => $request->advertisement_id ?? null,
            ]);
            
            // Валидация адреса для offsite бронирований
            if ($executionType === 'offsite') {
                if (!$request->has('address_line1') || empty($request->address_line1)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Для выездных услуг необходимо указать адрес',
                        'errors' => ['address_line1' => ['Поле адреса обязательно для выездных услуг']],
                    ], 422);
                }
                if (!$request->has('city') || empty($request->city)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Для выездных услуг необходимо указать город',
                        'errors' => ['city' => ['Поле города обязательно для выездных услуг']],
                    ], 422);
                }
                if (!$request->has('state') || empty($request->state)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Для выездных услуг необходимо указать штат',
                        'errors' => ['state' => ['Поле штата обязательно для выездных услуг']],
                    ], 422);
                }
                if (!$request->has('zip') || empty($request->zip)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Для выездных услуг необходимо указать почтовый индекс',
                        'errors' => ['zip' => ['Поле почтового индекса обязательно для выездных услуг']],
                    ], 422);
                }
            }
            
            // Создаем бронирование
            // ВАЖНО: Передаем serviceData для правильной проверки расписания в createBooking
            // ВАЖНО: Нормализуем duration_minutes из запроса, если оно неразумное (>= 480 минут)
            $requestDuration = $request->duration_minutes;
            if ($requestDuration && is_numeric($requestDuration)) {
                $requestDuration = (int)$requestDuration;
                // Если duration >= 480 минут (8 часов), это скорее всего срок выполнения, а не длительность сеанса
                if ($requestDuration >= 480) {
                    Log::info('BookingController: Normalizing unreasonable duration_minutes', [
                        'request_duration' => $requestDuration,
                        'normalized_duration' => $serviceDuration,
                    ]);
                    $requestDuration = null; // Игнорируем неразумное значение
                }
            }
            $finalDuration = $requestDuration ?? $serviceDuration;
            
            Log::info('BookingController: Final duration determined', [
                'request_duration' => $request->duration_minutes,
                'service_duration' => $serviceDuration,
                'final_duration' => $finalDuration,
            ]);
            
            $bookingData = [
                'company_id' => $request->company_id,
                'user_id' => $userId,
                'service_id' => $request->service_id,
                'advertisement_id' => $request->advertisement_id ?? null, // Сохраняем ID объявления для правильного отображения
                'execution_type' => $executionType,
                'specialist_id' => $request->specialist_id,
                'booking_date' => $request->booking_date,
                'booking_time' => $request->booking_time,
                'duration_minutes' => $finalDuration, // Используем нормализованную длительность
                'price' => $servicePrice,
                'status' => 'new',
                'client_notes' => $request->client_notes,
                'client_name' => $request->client_name,
                'client_phone' => $request->client_phone,
                'client_email' => $request->client_email,
                'service_name' => $serviceName, // Передаем имя услуги для сохранения
            ];
            
            // Добавляем данные адреса для offsite бронирований
            if ($executionType === 'offsite') {
                $bookingData['address_line1'] = $request->address_line1;
                $bookingData['city'] = $request->city;
                $bookingData['state'] = $request->state;
                $bookingData['zip'] = $request->zip;
                if ($request->has('lat')) {
                    $bookingData['lat'] = $request->lat;
                }
                if ($request->has('lng')) {
                    $bookingData['lng'] = $request->lng;
                }
                if ($request->has('location_notes')) {
                    $bookingData['location_notes'] = $request->location_notes;
                }
            }
            
            // Передаем serviceData для проверки расписания (важно для объявлений!)
            if ($service) {
                $bookingData['service_data'] = $service;
            }
            
            $booking = DB::transaction(function () use ($request, $bookingData, $userId) {
                $booking = $this->bookingService->createBooking($bookingData);

                // Обрабатываем дополнительные услуги
                $totalAdditionalPrice = 0;
                if ($request->has('additional_services') && is_array($request->additional_services)) {
                    $syncData = [];
                    foreach ($request->additional_services as $item) {
                        $additionalService = AdditionalService::find($item['id']);
                        if (!$additionalService || !$additionalService->is_active) {
                            continue;
                        }

                        $additionalService->loadMissing(['service', 'advertisement']);
                        $bookingCompanyId = (int) $request->company_id;
                        $svcCompany = $additionalService->service?->company_id;
                        $adCompany = $additionalService->advertisement?->company_id;
                        $belongsCompany = ($svcCompany !== null && $svcCompany === $bookingCompanyId)
                            || ($adCompany !== null && $adCompany === $bookingCompanyId);
                        if (! $belongsCompany) {
                            abort(403, 'Additional service does not belong to this company');
                        }

                        // Проверяем, что дополнительная услуга принадлежит выбранной основной услуге
                        // Для объявлений нужно определить реальный service_id
                        $realServiceId = null;
                        if ($request->has('advertisement_id') && $request->advertisement_id) {
                            // Для объявлений: если у услуги в JSON есть service_id, используем его
                            $advertisement = Advertisement::find($request->advertisement_id);
                            if ($advertisement) {
                                $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                                $serviceData = collect($services)->first(function ($s) use ($request) {
                                    $sId = $s['id'] ?? null;
                                    return $sId !== null && ((string) $sId === (string) $request->service_id || (int) $sId === (int) $request->service_id);
                                });

                                if ($serviceData && isset($serviceData['service_id'])) {
                                    $realServiceId = (int) $serviceData['service_id'];
                                }
                            }
                        } else {
                            // Для обычных услуг используем service_id из запроса
                            $realServiceId = (int) $request->service_id;
                        }

                        // Проверяем принадлежность дополнительной услуги к основной
                        if ($realServiceId && $additionalService->service_id !== $realServiceId) {
                            Log::warning('Additional service does not belong to main service', [
                                'additional_service_id' => $additionalService->id,
                                'additional_service_service_id' => $additionalService->service_id,
                                'requested_service_id' => $realServiceId,
                            ]);
                            continue;
                        }

                        $quantity = isset($item['quantity']) ? max(1, (int) $item['quantity']) : 1;
                        $priceAtBooking = (float) $additionalService->price;
                        $totalAdditionalPrice += $priceAtBooking * $quantity;

                        $syncData[$additionalService->id] = [
                            'quantity' => $quantity,
                            'price' => $priceAtBooking,
                        ];
                    }

                    if (!empty($syncData)) {
                        $booking->additionalServices()->sync($syncData);
                        // Обновляем общую стоимость бронирования
                        $booking->total_price = ($booking->total_price ?? $booking->price ?? 0) + $totalAdditionalPrice;
                        $booking->save();
                    }
                }

                // Скидки (лояльность / промокод) — серверный пересчёт
                $discountService = app(DiscountCalculationService::class);
                $promo = $request->promo_code ? trim($request->promo_code) : null;
                $discountService->applyToBooking($booking, $promo, $userId);

                return $booking;
            });

            // Уведомление владельцу бизнеса о новом бронировании
            $this->bookingService->notifyOwnerAboutNewBooking($booking);

            // Загружаем дополнительные услуги для ответа
            $booking->load('additionalServices');

            return response()->json([
                'success' => true,
                'message' => 'Бронирование успешно создано',
                'data' => [
                    'id' => $booking->id,
                    'booking_date' => $booking->booking_date->format('Y-m-d'),
                    'booking_time' => $booking->booking_time,
                    'status' => $booking->status,
                    'price' => (float) $booking->price,
                    'total_price' => (float) ($booking->total_price ?? $booking->price ?? 0),
                    'discount_amount' => (float) ($booking->discount_amount ?? 0),
                    'discount_source' => $booking->discount_source,
                    'additional_services' => $booking->additionalServices->map(function ($addService) {
                        return [
                            'id' => $addService->id,
                            'name' => $addService->name,
                            'quantity' => $addService->pivot->quantity,
                            'price' => (float) $addService->pivot->price,
                        ];
                    }),
                ],
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Проверьте введённые данные',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось создать бронирование: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Получить доступные слоты для бронирования
     */
    public function getAvailableSlots(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'company_id' => 'required|exists:companies,id',
            'service_id' => 'required|integer', // Изменено с exists:services,id
            'date' => 'required|date',
            'advertisement_id' => 'nullable|exists:advertisements,id', // Добавляем опциональный advertisement_id
        ]);

        // Дополнительная проверка даты с учетом таймзоны
        $timezone = config('app.timezone') ?: date_default_timezone_get();
        $today = Carbon::today($timezone);
        $requestDate = Carbon::parse($request->date, $timezone)->startOfDay();
        
        if ($requestDate->lt($today)) {
            $validator->errors()->add('date', 'Дата не может быть в прошлом');
        }

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $company = Company::findOrFail($request->company_id);
            $service = null;

            Log::info('getAvailableSlots request', [
                'company_id' => $request->company_id,
                'service_id' => $request->service_id,
                'service_id_type' => gettype($request->service_id),
                'date' => $request->date,
            ]);

            // Попытка найти услугу в таблице services
            $dbService = Service::find($request->service_id);
            if ($dbService && $dbService->company_id === $company->id) {
                // Услуга найдена в БД, но расписание берём из объявления
                $advertisementForSchedule = Advertisement::where('company_id', $company->id)
                    ->whereIn('type', ['regular', 'advertisement'])
                    ->where('is_active', true)
                    ->where('status', 'approved');
                
                if ($request->has('advertisement_id') && $request->advertisement_id) {
                    $advertisementForSchedule->where('id', $request->advertisement_id);
                }
                
                $adForSchedule = $advertisementForSchedule->first();
                
                // Добавляем расписание из объявления к услуге из БД
                $dbService->schedule = $adForSchedule ? $adForSchedule->schedule : null;
                $dbService->advertisement_id = $adForSchedule ? $adForSchedule->id : null;
                
                $service = $dbService;
                Log::info('Service found in DB', [
                    'service_id' => $dbService->id,
                    'hasScheduleFromAd' => $adForSchedule && $adForSchedule->schedule ? true : false,
                ]);
            } else {
                // Если услуга не найдена в таблице, ищем ее в JSON данных объявления
                // Если передан advertisement_id, используем его, иначе ищем первое активное объявление
                // ВАЖНО: Ищем объявления типа 'regular' И 'advertisement' (рекламные объявления тоже могут иметь услуги)
                $advertisementQuery = Advertisement::where('company_id', $company->id)
                    ->whereIn('type', ['regular', 'advertisement'])
                    ->where('is_active', true)
                    ->where('status', 'approved');
                
                if ($request->has('advertisement_id') && $request->advertisement_id) {
                    // Используем конкретное объявление, если указано
                    $advertisementQuery->where('id', $request->advertisement_id);
                }
                
                $advertisement = $advertisementQuery->first();

                Log::info('Advertisement search', [
                    'found' => $advertisement ? true : false,
                    'advertisement_id' => $advertisement ? $advertisement->id : null,
                    'requested_advertisement_id' => $request->advertisement_id ?? null,
                ]);

                if ($advertisement) {
                    $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                    
                    if (empty($services)) {
                        Log::warning('Advertisement has no services', [
                            'advertisement_id' => $advertisement->id,
                            'company_id' => $company->id,
                        ]);
                    }
                    
                    // Преобразуем service_id в строку и число для сравнения, так как в JSON это может быть строка или число
                    $serviceIdStr = (string)$request->service_id;
                    $serviceIdInt = (int)$request->service_id;
                    $serviceData = collect($services)->first(function ($s) use ($serviceIdStr, $serviceIdInt) {
                        $sId = $s['id'] ?? null;
                        if ($sId === null) return false;
                        // Нормализуем оба ID для сравнения (преобразуем в строку и число)
                        $sIdStr = (string)$sId;
                        $sIdInt = (int)$sId;
                        // Сравниваем как строку и как число (в обоих направлениях)
                        return ($sIdStr === $serviceIdStr) || ($sIdInt === $serviceIdInt) || 
                               ((string)$sIdInt === $serviceIdStr) || ((int)$sIdStr === $serviceIdInt);
                    });

                    if ($serviceData) {
                        // Нормализуем duration: значения >= 480 минут (8 часов) - это срок выполнения, а не длительность сеанса
                        $serviceDuration = $serviceData['duration'] ?? 60;
                        if (is_numeric($serviceDuration)) {
                            $serviceDuration = (int)$serviceDuration;
                            if ($serviceDuration >= 480) {
                                $serviceDuration = 60; // Используем дефолтное значение
                            } elseif ($serviceDuration < 15) {
                                $serviceDuration = 15; // Минимум 15 минут
                            }
                        } else {
                            $serviceDuration = 60;
                        }
                        
                        // Создаем временный объект услуги из данных объявления
                        $service = (object)[
                            'id' => $request->service_id,
                            'company_id' => $company->id,
                            'name' => $serviceData['name'] ?? 'Услуга',
                            'price' => $serviceData['price'] ?? 0,
                            'duration_minutes' => $serviceDuration,
                            'schedule' => $advertisement->schedule ?? null, // Добавляем расписание
                            'advertisement_id' => $advertisement->id, // Добавляем ID объявления для получения slot_step_minutes
                        ];
                        Log::info('Service found in advertisement', ['service_id' => $request->service_id]);
                    } else {
                        Log::warning('Service not found in advertisement', [
                            'advertisement_id' => $advertisement->id,
                            'company_id' => $company->id,
                            'requested_service_id' => $request->service_id,
                            'requested_service_id_str' => $serviceIdStr,
                            'requested_service_id_int' => $serviceIdInt,
                            'available_service_ids' => collect($services)->pluck('id')->toArray(),
                            'available_services' => $services,
                        ]);
                    }
                } else {
                    Log::warning('No active approved advertisement found', [
                        'company_id' => $company->id,
                        'requested_service_id' => $request->service_id,
                    ]);
                }
            }

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Услуга не найдена или не принадлежит этой компании',
                ], 404);
            }

            // Передаем объект услуги в метод сервиса
            // ВАЖНО: Передаем specialist_id для правильной фильтрации бронирований
            $slots = $this->bookingService->getAvailableSlots(
                $request->company_id,
                $request->service_id,
                $request->date,
                $service, // Передаем объект услуги
                $request->specialist_id ?? null // Передаем specialist_id для фильтрации
            );

            return response()->json([
                'success' => true,
                'data' => $slots,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось получить доступные слоты: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Проверить доступность конкретного слота
     */
    public function checkAvailability(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'company_id' => 'required|exists:companies,id',
            'service_id' => 'required|integer', // Изменено с exists:services,id
            'booking_date' => 'required|date',
            'booking_time' => 'required|date_format:H:i',
            'duration_minutes' => 'nullable|integer|min:15',
            'advertisement_id' => 'nullable|exists:advertisements,id', // Добавляем опциональный advertisement_id
        ]);

        // Дополнительная проверка даты с учетом таймзоны
        $timezone = config('app.timezone') ?: date_default_timezone_get();
        $today = Carbon::today($timezone);
        $bookingDate = Carbon::parse($request->booking_date, $timezone)->startOfDay();
        
        if ($bookingDate->lt($today)) {
            $validator->errors()->add('booking_date', 'Дата бронирования не может быть в прошлом');
        }

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $company = Company::findOrFail($request->company_id);
            $service = null;

            // Попытка найти услугу в таблице services
            $dbService = Service::find($request->service_id);
            if ($dbService && $dbService->company_id === $company->id) {
                // Услуга найдена в БД, но расписание берём из объявления
                $advertisementForSchedule = Advertisement::where('company_id', $company->id)
                    ->whereIn('type', ['regular', 'advertisement'])
                    ->where('is_active', true)
                    ->where('status', 'approved');
                
                if ($request->has('advertisement_id') && $request->advertisement_id) {
                    $advertisementForSchedule->where('id', $request->advertisement_id);
                }
                
                $adForSchedule = $advertisementForSchedule->first();
                
                // Добавляем расписание из объявления к услуге из БД
                $dbService->schedule = $adForSchedule ? $adForSchedule->schedule : null;
                
                $service = $dbService;
            } else {
                // Если услуга не найдена в таблице, ищем ее в JSON данных объявления
                // Если передан advertisement_id, используем его, иначе ищем первое активное объявление
                // ВАЖНО: Ищем объявления типа 'regular' И 'advertisement' (рекламные объявления тоже могут иметь услуги)
                $advertisementQuery = Advertisement::where('company_id', $company->id)
                    ->whereIn('type', ['regular', 'advertisement'])
                    ->where('is_active', true)
                    ->where('status', 'approved');
                
                if ($request->has('advertisement_id') && $request->advertisement_id) {
                    // Используем конкретное объявление, если указано
                    $advertisementQuery->where('id', $request->advertisement_id);
                }
                
                $advertisement = $advertisementQuery->first();

                if ($advertisement) {
                    $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                    
                    if (empty($services)) {
                        \Log::warning('Advertisement has no services', [
                            'advertisement_id' => $advertisement->id,
                            'company_id' => $company->id,
                        ]);
                    }
                    
                    // Преобразуем service_id в строку и число для сравнения, так как в JSON это может быть строка или число
                    $serviceIdStr = (string)$request->service_id;
                    $serviceIdInt = (int)$request->service_id;
                    $serviceData = collect($services)->first(function ($s) use ($serviceIdStr, $serviceIdInt) {
                        $sId = $s['id'] ?? null;
                        if ($sId === null) return false;
                        // Нормализуем оба ID для сравнения (преобразуем в строку и число)
                        $sIdStr = (string)$sId;
                        $sIdInt = (int)$sId;
                        // Сравниваем как строку и как число (в обоих направлениях)
                        return ($sIdStr === $serviceIdStr) || ($sIdInt === $serviceIdInt) || 
                               ((string)$sIdInt === $serviceIdStr) || ((int)$sIdStr === $serviceIdInt);
                    });

                    if ($serviceData) {
                        // Нормализуем duration: значения >= 480 минут (8 часов) - это срок выполнения, а не длительность сеанса
                        $serviceDuration = $serviceData['duration'] ?? 60;
                        if (is_numeric($serviceDuration)) {
                            $serviceDuration = (int)$serviceDuration;
                            if ($serviceDuration >= 480) {
                                $serviceDuration = 60; // Используем дефолтное значение
                            } elseif ($serviceDuration < 15) {
                                $serviceDuration = 15; // Минимум 15 минут
                            }
                        } else {
                            $serviceDuration = 60;
                        }
                        
                        // Создаем временный объект услуги из данных объявления
                        $service = (object)[
                            'id' => $request->service_id,
                            'company_id' => $company->id,
                            'name' => $serviceData['name'] ?? 'Услуга',
                            'price' => $serviceData['price'] ?? 0,
                            'duration_minutes' => $serviceDuration,
                            'schedule' => $advertisement->schedule ?? null, // Добавляем расписание
                        ];
                    } else {
                        \Log::warning('Service not found in advertisement', [
                            'advertisement_id' => $advertisement->id,
                            'company_id' => $company->id,
                            'requested_service_id' => $request->service_id,
                            'available_service_ids' => collect($services)->pluck('id')->toArray(),
                        ]);
                    }
                } else {
                    \Log::warning('No active approved advertisement found', [
                        'company_id' => $company->id,
                        'requested_service_id' => $request->service_id,
                    ]);
                }
            }

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Услуга не найдена или не принадлежит этой компании',
                ], 404);
            }

            $isAvailable = $this->bookingService->isSlotAvailable(
                $request->company_id,
                $request->service_id,
                $request->booking_date,
                $request->booking_time,
                $request->duration_minutes ?? ($service->duration_minutes ?? 60),
                null, // excludeBookingId
                $service, // Передаем объект услуги для использования расписания
                $request->specialist_id ?? null // Передаем specialist_id для фильтрации бронирований
            );

            return response()->json([
                'success' => true,
                'available' => $isAvailable,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось проверить доступность: ' . $e->getMessage(),
            ], 500);
        }
    }
}


<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Advertisement;
use App\Models\AdvertisementDisplay;
use App\Models\ServiceCategory;
use App\Models\Review;
use App\Models\AdditionalService;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class AdvertisementsController extends Controller
{
    /**
     * Get all advertisements.
     */
    public function index(Request $request)
    {
        $query = Advertisement::with('company');

        // Фильтр по статусу
        if ($request->has('status') && $request->get('status') !== 'all') {
            $query->where('status', $request->get('status'));
        }

        // Фильтр по типу
        if ($request->has('type')) {
            $query->where('type', $request->get('type'));
        }

        // Пагинация
        $page = (int) $request->get('page', 1);
        $pageSize = (int) $request->get('pageSize', 10);
        
        $total = $query->count();
        
        $advertisements = $query->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $pageSize)
            ->take($pageSize)
            ->get();

        // Добавляем вычисляемые поля
        $advertisements = $advertisements->map(function ($ad) {
            $ad->ctr = $ad->impressions > 0 
                ? round(($ad->clicks / $ad->impressions) * 100, 2) 
                : 0;
            $ad->business = $ad->company->name ?? 'Без компании';
            // Если статус не установлен, устанавливаем по умолчанию
            if (!$ad->status) {
                $ad->status = 'pending';
            }
            return $ad;
        });

        return response()->json([
            'data' => $advertisements,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }

    /**
     * Get single advertisement.
     */
    public function show($id)
    {
        $advertisement = Advertisement::with('company')->findOrFail($id);
        
        // Вычисляем CTR
        $advertisement->ctr = $advertisement->impressions > 0 
            ? round(($advertisement->clicks / $advertisement->impressions) * 100, 2) 
            : 0;
        $advertisement->business = $advertisement->company->name ?? 'Без компании';
        
        // Если статус не установлен, устанавливаем по умолчанию
        if (!$advertisement->status) {
            $advertisement->status = 'pending';
        }
        
        // ВАЖНО: Для marketplace объявлений загружаем услуги из таблицы services
        // Для рекламных объявлений (ad) используем JSON поле services
        if ($advertisement->isMarketplaceType()) {
            // Marketplace объявление - загружаем услуги из таблицы services
            $dbServices = Service::where('advertisement_id', $advertisement->id)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get();
            
            // Преобразуем услуги в формат для фронтенда
            $servicesData = $dbServices->map(function ($service) {
                // Загружаем дополнительные услуги для этой услуги
                $additionalServices = AdditionalService::where('service_id', $service->id)
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->orderBy('name')
                    ->get()
                    ->map(function ($addService) {
                        return [
                            'id' => $addService->id,
                            'name' => $addService->name,
                            'description' => $addService->description ?? '',
                            'price' => (float) $addService->price,
                            'duration' => $addService->duration ?? null,
                            'is_active' => $addService->is_active,
                            'sort_order' => $addService->sort_order ?? 0,
                        ];
                    })
                    ->toArray();
                
                return [
                    'id' => (string) $service->id, // Виртуальный ID для совместимости с фронтендом
                    'service_id' => (int) $service->id, // Реальный ID из БД
                    'name' => $service->name ?? '',
                    'description' => $service->description ?? '',
                    'price' => (float) ($service->price ?? 0),
                    'duration' => (int) ($service->duration_minutes ?? $service->duration ?? 60),
                    'category' => $service->category->name ?? '',
                    'additional_services' => $additionalServices,
                ];
            })->toArray();
            
            // Заменяем JSON поле services на данные из таблицы
            $advertisement->services = $servicesData;
        }
        // Для рекламных объявлений (ad) оставляем JSON поле services как есть

        return response()->json($advertisement);
    }

    /**
     * Update advertisement.
     */
    public function update(Request $request, $id)
    {
        $advertisement = Advertisement::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'type' => 'sometimes|in:advertisement,regular',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|string|url|max:2048',
            'link' => 'nullable|string|max:2048',
            'placement' => 'nullable|in:homepage,services,sidebar,banner',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'priority' => 'nullable|integer|min:1|max:10',
            'is_active' => 'sometimes|boolean',
            'services' => 'nullable|array',
            'team' => 'nullable|array',
            'portfolio' => 'nullable|array',
            'schedule' => 'nullable|array',
            'slot_step_minutes' => 'nullable|integer|min:15|max:240',
            'priceFrom' => 'nullable|numeric|min:0',
            'priceTo' => 'nullable|numeric|min:0|gte:priceFrom',
            'currency' => 'nullable|string|size:3',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        
        // Логируем входящие данные для отладки
        if (isset($validated['services']) && is_array($validated['services'])) {
            \Log::info('Обновление объявления - входящие services:', [
                'advertisement_id' => $id,
                'services_count' => count($validated['services']),
                'services_with_additional' => count(array_filter($validated['services'], function($s) {
                    return isset($s['additional_services']) && is_array($s['additional_services']) && count($s['additional_services']) > 0;
                })),
                'raw_services' => $validated['services']
            ]);
        }
        
        // Очищаем пустые строки для nullable полей
        if (isset($validated['image']) && $validated['image'] === '') {
            $validated['image'] = null;
        }
        if (isset($validated['link']) && $validated['link'] === '') {
            $validated['link'] = null;
        }
        if (isset($validated['description']) && $validated['description'] === '') {
            $validated['description'] = null;
        }
        
        // Для рекламных объявлений placement всегда 'services'
        if (isset($validated['type']) && $validated['type'] === 'advertisement') {
            $validated['placement'] = 'services';
        }

        // Обрабатываем массивы - если они пустые, устанавливаем null, иначе сохраняем как JSON
        $services = isset($validated['services']) && is_array($validated['services']) && count($validated['services']) > 0 
            ? $validated['services'] 
            : null;
        $team = isset($validated['team']) && is_array($validated['team']) && count($validated['team']) > 0 
            ? $validated['team'] 
            : null;
        $portfolio = isset($validated['portfolio']) && is_array($validated['portfolio']) && count($validated['portfolio']) > 0 
            ? $validated['portfolio'] 
            : null;
        $schedule = isset($validated['schedule']) && is_array($validated['schedule']) && count($validated['schedule']) > 0 
            ? $validated['schedule'] 
            : null;

        // Преобразуем priceFrom/priceTo в price_from/price_to
        $updateData = [];
        foreach ($validated as $key => $value) {
            if ($key === 'priceFrom') {
                $updateData['price_from'] = $value && $value !== '' ? (float)$value : null;
            } elseif ($key === 'priceTo') {
                $updateData['price_to'] = $value && $value !== '' ? (float)$value : null;
            } elseif ($key === 'services') {
                $updateData['services'] = $services;
            } elseif ($key === 'team') {
                $updateData['team'] = $team;
            } elseif ($key === 'portfolio') {
                $updateData['portfolio'] = $portfolio;
            } elseif ($key === 'schedule') {
                $updateData['schedule'] = $schedule;
            } else {
                $updateData[$key] = $value;
            }
        }

        // Логируем перед сохранением
        if (isset($updateData['services']) && $updateData['services']) {
            \Log::info('Обновление объявления - services перед сохранением:', [
                'advertisement_id' => $id,
                'services_count' => count($updateData['services']),
                'services_with_additional' => count(array_filter($updateData['services'], function($s) {
                    return isset($s['additional_services']) && is_array($s['additional_services']) && count($s['additional_services']) > 0;
                })),
                'services_details' => array_map(function($s) {
                    return [
                        'id' => $s['id'] ?? null,
                        'name' => $s['name'] ?? null,
                        'additional_services_count' => isset($s['additional_services']) && is_array($s['additional_services']) ? count($s['additional_services']) : 0,
                        'has_additional_services' => isset($s['additional_services']) && is_array($s['additional_services']) && count($s['additional_services']) > 0
                    ];
                }, $updateData['services'])
            ]);
        }
        
        // Обрабатываем дополнительные услуги и создаем их в БД
        if (isset($updateData['services']) && $updateData['services']) {
            $this->processAdditionalServices($updateData['services'], $id);
        }

        $advertisement->update($updateData);
        
        // Логируем после сохранения
        $advertisement->refresh();
        if ($advertisement->services) {
            $services = is_array($advertisement->services) ? $advertisement->services : json_decode($advertisement->services, true);
            if (is_array($services)) {
                \Log::info('Обновление объявления - services после сохранения:', [
                    'advertisement_id' => $id,
                    'services_count' => count($services),
                    'services_with_additional' => count(array_filter($services, function($s) {
                        return isset($s['additional_services']) && is_array($s['additional_services']) && count($s['additional_services']) > 0;
                    })),
                    'services_details' => array_map(function($s) {
                        return [
                            'id' => $s['id'] ?? null,
                            'name' => $s['name'] ?? null,
                            'additional_services_count' => isset($s['additional_services']) && is_array($s['additional_services']) ? count($s['additional_services']) : 0,
                            'has_additional_services' => isset($s['additional_services']) && is_array($s['additional_services']) && count($s['additional_services']) > 0
                        ];
                    }, $services)
                ]);
            }
        }

        return response()->json($advertisement);
    }

    /**
     * Delete advertisement.
     */
    public function destroy($id)
    {
        $advertisement = Advertisement::findOrFail($id);
        $advertisement->delete();

        return response()->json([
            'message' => 'Advertisement deleted',
        ]);
    }

    /**
     * Upload advertisement image.
     */
    public function uploadImage(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Сохраняем файл в storage/app/public/advertisements
        $path = $request->file('image')->store('advertisements', 'public');
        
        // Получаем относительный путь к файлу
        // Storage::url() возвращает относительный путь вида /storage/advertisements/file.jpg
        $relativeUrl = Storage::disk('public')->url($path);
        
        // Используем APP_URL из конфигурации Laravel для формирования полного URL
        // Это гарантирует правильный URL на всех устройствах
        if (str_starts_with($relativeUrl, 'http://') || str_starts_with($relativeUrl, 'https://')) {
            // Если Storage::url() уже вернул полный URL, используем как есть
            $url = $relativeUrl;
        } else {
            // Используем APP_URL из конфигурации
            $baseUrl = rtrim(config('app.url'), '/');
            $url = $baseUrl . $relativeUrl;
        }

        return response()->json([
            'success' => true,
            'url' => $url,
            'path' => $path,
        ]);
    }

    /**
     * Get rotated advertisements with session-based rotation.
     */
    protected function getRotatedAdvertisements($placement, $state, $city, $limit = 3)
    {
        // 1. Получаем все активные рекламные объявления с учетом локации
        $query = Advertisement::where('type', 'advertisement')
            ->where('placement', $placement)
            ->where('is_active', true)
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            // Показываем только объявления компаний с включенной видимостью на маркетплейсе
            ->whereHas('company', function($q) {
                $q->where('is_visible_on_marketplace', true);
            });
        
        // Фильтруем ТОЛЬКО одобренные объявления
        if (Schema::hasColumn('advertisements', 'status')) {
            $query->where('status', 'approved')
                  ->whereNotNull('status');
        }
        
        // 2. Фильтрация по локации
        // Если state указан - показываем объявления для этого штата + без указания штата
        // Если state НЕ указан (например, "Все штаты") - показываем ВСЕ объявления (включая с указанием штата)
        if ($state && $state !== 'all' && $state !== '') {
            $query->where(function($q) use ($state) {
                $q->where('state', $state)
                  ->orWhereNull('state'); // Объявления без указания штата показываются везде
            });
        }
        // Если state не указан или "all" - показываем все объявления (не фильтруем по штату)
        
        if ($city && $city !== 'all' && $city !== '') {
            $query->where(function($q) use ($city) {
                $q->where('city', $city)
                  ->orWhereNull('city'); // Объявления без указания города показываются везде
            });
        }
        // Если city не указан или "all" - показываем все объявления (не фильтруем по городу)
        
        $allAdvertisements = $query->orderBy('priority', 'desc')
            ->orderBy('created_at', 'desc')
            ->with('company')
            ->get();
        
        // 3. Если объявлений меньше или равно лимиту - возвращаем все
        if ($allAdvertisements->count() <= $limit) {
            // Записываем факт показа для всех объявлений
            $sessionId = session()->getId();
            $userId = auth()->id();
            
            foreach ($allAdvertisements as $ad) {
                AdvertisementDisplay::create([
                    'advertisement_id' => $ad->id,
                    'session_id' => $sessionId,
                    'user_id' => $userId,
                    'placement' => $placement,
                    'displayed_at' => now(),
                    'state' => $state,
                    'city' => $city,
                ]);
                
                // Обновляем счетчик impressions
                $ad->increment('impressions');
            }
            
            return $allAdvertisements;
        }
        
        // 4. Получаем ID сессии
        $sessionId = session()->getId();
        $userId = auth()->id();
        
        // 5. Находим объявления, которые уже показывались в этой сессии
        $shownIds = AdvertisementDisplay::where(function($q) use ($sessionId, $userId) {
                $q->where('session_id', $sessionId);
                if ($userId) {
                    $q->orWhere('user_id', $userId);
                }
            })
            ->where('placement', $placement)
            ->pluck('advertisement_id')
            ->toArray();
        
        // 6. Фильтруем объявления - исключаем уже показанные
        $availableAds = $allAdvertisements->reject(function($ad) use ($shownIds) {
            return in_array($ad->id, $shownIds);
        });
        
        // 7. Если доступных объявлений меньше лимита - начинаем ротацию заново
        if ($availableAds->count() < $limit) {
            $availableAds = $allAdvertisements;
            // Очищаем историю показов для этой сессии (начинаем новый цикл)
            AdvertisementDisplay::where(function($q) use ($sessionId, $userId) {
                    $q->where('session_id', $sessionId);
                    if ($userId) {
                        $q->orWhere('user_id', $userId);
                    }
                })
                ->where('placement', $placement)
                ->delete();
        }
        
        // 8. Выбираем N объявлений с ротацией
        // Используем случайный порядок для ротации между пользователями/сессиями
        // Но учитываем историю показов в сессии для равномерного распределения
        if ($availableAds->count() > $limit) {
            // Если доступных объявлений больше лимита, выбираем случайные из доступных
            $selectedAds = $availableAds->shuffle()->take($limit);
        } else {
            // Если доступных меньше или равно лимиту, берем все доступные
            $selectedAds = $availableAds;
        }
        
        // 9. Записываем факт показа
        foreach ($selectedAds as $ad) {
            AdvertisementDisplay::create([
                'advertisement_id' => $ad->id,
                'session_id' => $sessionId,
                'user_id' => $userId,
                'placement' => $placement,
                'displayed_at' => now(),
                'state' => $state,
                'city' => $city,
            ]);
            
            // Обновляем счетчик impressions в таблице advertisements
            $ad->increment('impressions');
        }
        
        return $selectedAds;
    }

    /**
     * Get featured advertisements (public endpoint).
     * Возвращает только рекламные объявления (type = 'advertisement') с активными датами.
     * Использует ротацию по сессиям.
     */
    public function getFeatured(Request $request)
    {
        $limit = (int) $request->get('limit', 3);
        $placement = $request->get('placement', 'services');
        
        // Получаем локацию из запроса
        $state = $request->get('state');
        $city = $request->get('city');
        
        // Используем новый метод ротации
        $advertisements = $this->getRotatedAdvertisements($placement, $state, $city, $limit);

        // Преобразуем в формат для services page
        $services = $advertisements->map(function ($ad) {
            $company = $ad->company;
            
            // Получаем категорию по category_slug из объявления (как для обычных объявлений)
            $categoryName = 'Услуга';
            $categoryId = null;
            
            if ($ad->category_slug) {
                $category = ServiceCategory::where('slug', $ad->category_slug)->first();
                if ($category) {
                    $categoryName = $category->name;
                    $categoryId = (int) $category->id;
                }
            }
            
            // Если не нашли по slug, пытаемся определить из первой услуги
            if ($categoryName === 'Услуга' && !empty($ad->services) && is_array($ad->services)) {
                $firstService = $ad->services[0];
                if (isset($firstService['category'])) {
                    $categoryName = $firstService['category'];
                }
            }
            
            // Если все еще "Услуга", используем категорию компании
            if ($categoryName === 'Услуга' && $company && $company->category) {
                $categoryName = $company->category;
            }
            
            $adReviews = Review::query()
                ->forMarketplaceAdvertisement($ad)
                ->get();

            $rating = $adReviews->count() > 0
                ? round((float) $adReviews->avg('rating'), 1)
                : 0.0;
            $reviewsCount = $adReviews->count();
            
            return [
                'id' => 'ad_' . (string) $ad->id, // Префикс чтобы не конфликтовать с услугами
                'name' => $ad->title,
                'description' => $ad->description ?? '',
                'category' => $categoryName,
                'group' => $categoryId ?: 'advertisement', // Используем ID категории если нашли (как число)
                'businessName' => $company->name ?? null,
                'company' => [
                    'id' => $company->id ?? null,
                    'name' => $company->name ?? null,
                ],
                'imageUrl' => $this->normalizeAdvertisementImageUrl($ad->image ?? null) ?? '/img/others/placeholder.jpg',
                'path' => $ad->link 
                    ? (filter_var($ad->link, FILTER_VALIDATE_URL) || str_starts_with($ad->link, '/') 
                        ? $ad->link 
                        : '/marketplace/' . $ad->link)
                    : '/services',
                'priceLabel' => $ad->price_from && $ad->price_to 
                    ? ($ad->currency ?? '$') . number_format($ad->price_from, 0) . ' - ' . ($ad->currency ?? '$') . number_format($ad->price_to, 0)
                    : ($ad->price_from ? (($ad->currency ?? '$') . number_format($ad->price_from, 0) . '+') : 'Реклама'),
                'priceValue' => $ad->price_from ? (float) $ad->price_from : 0,
                'rating' => $rating,
                'reviews' => $reviewsCount,
                'reviewsCount' => $reviewsCount,
                'tags' => [],
                'isFeatured' => true,
                'city' => $ad->city ?? $company->city ?? '',
                'state' => $ad->state ?? $company->state ?? '',
            ];
        });

        return response()->json($services);
    }

    /**
     * Approve advertisement.
     */
    public function approve($id)
    {
        $advertisement = Advertisement::findOrFail($id);
        $advertisement->update([
            'status' => 'approved',
            'is_active' => true, // Активируем объявление при одобрении
        ]);

        return response()->json($advertisement);
    }

    /**
     * Reject advertisement.
     */
    public function reject($id)
    {
        $advertisement = Advertisement::findOrFail($id);
        $advertisement->update(['status' => 'rejected']);

        return response()->json($advertisement);
    }

    /**
     * Отслеживание клика по рекламному объявлению (публичный endpoint)
     */
    public function trackClick($id)
    {
        try {
            $advertisement = Advertisement::findOrFail($id);
            
            // Увеличиваем счетчик кликов
            $advertisement->increment('clicks');
            
            return response()->json([
                'success' => true,
                'message' => 'Клик засчитан',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось засчитать клик',
            ], 500);
        }
    }

    /**
     * Отслеживание показа рекламного объявления (публичный endpoint)
     */
    public function trackImpression($id)
    {
        try {
            $advertisement = Advertisement::find($id);
            
            if (!$advertisement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Объявление не найдено',
                ], 404);
            }
            
            // Увеличиваем счетчик показов
            $advertisement->increment('impressions');
            
            // Опционально: записываем в таблицу advertisement_displays для детальной статистики
            AdvertisementDisplay::create([
                'advertisement_id' => $advertisement->id,
                'session_id' => session()->getId(),
                'user_id' => auth()->id(),
                'placement' => request()->get('placement', 'services'),
                'displayed_at' => now(),
                'state' => request()->get('state'),
                'city' => request()->get('city'),
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Показ засчитан',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось засчитать показ',
            ], 500);
        }
    }

    /**
     * Получение детальной статистики рекламного объявления
     */
    public function getStats($id)
    {
        try {
            $advertisement = Advertisement::findOrFail($id);
            
            // Статистика по дням из advertisement_displays
            $displaysByDay = AdvertisementDisplay::where('advertisement_id', $id)
                ->selectRaw('DATE(displayed_at) as date, COUNT(*) as impressions')
                ->groupBy('date')
                ->orderBy('date', 'desc')
                ->limit(30)
                ->get();
            
            // Уникальные показы (по session_id)
            $uniqueImpressions = AdvertisementDisplay::where('advertisement_id', $id)
                ->distinct('session_id')
                ->count('session_id');
            
            // Статистика по геолокации
            $byState = AdvertisementDisplay::where('advertisement_id', $id)
                ->whereNotNull('state')
                ->selectRaw('state, COUNT(*) as impressions')
                ->groupBy('state')
                ->orderBy('impressions', 'desc')
                ->limit(10)
                ->get();
            
            $byCity = AdvertisementDisplay::where('advertisement_id', $id)
                ->whereNotNull('city')
                ->selectRaw('city, COUNT(*) as impressions')
                ->groupBy('city')
                ->orderBy('impressions', 'desc')
                ->limit(10)
                ->get();
            
            // Рассчитываем CTR
            $ctr = $advertisement->impressions > 0 
                ? round(($advertisement->clicks / $advertisement->impressions) * 100, 2) 
                : 0;
            
            return response()->json([
                'advertisement_id' => (int) $id,
                'title' => $advertisement->title,
                'total_impressions' => $advertisement->impressions ?? 0,
                'total_clicks' => $advertisement->clicks ?? 0,
                'unique_impressions' => $uniqueImpressions,
                'ctr' => $ctr,
                'start_date' => $advertisement->start_date?->format('Y-m-d'),
                'end_date' => $advertisement->end_date?->format('Y-m-d'),
                'status' => $advertisement->status,
                'is_active' => $advertisement->is_active,
                'impressions_by_day' => $displaysByDay,
                'by_state' => $byState,
                'by_city' => $byCity,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось получить статистику: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create new advertisement.
     */
    public function store(Request $request)
    {
        $rules = [
            'type' => 'required|in:advertisement,regular',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|string|url|max:2048',
            'link' => 'nullable|string|max:2048',
            'placement' => 'nullable|in:homepage,services,sidebar,banner',
            'company_id' => 'nullable|exists:companies,id',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'priority' => 'nullable|integer|min:1|max:10',
            'is_active' => 'nullable|boolean',
            'services' => 'nullable|array',
            'team' => 'nullable|array',
            'portfolio' => 'nullable|array',
            'schedule' => 'nullable|array',
            'priceFrom' => 'nullable|numeric|min:0',
            'priceTo' => 'nullable|numeric|min:0|gte:priceFrom',
            'currency' => 'nullable|string|size:3',
        ];

        // Даты обязательны только для рекламных объявлений
        if ($request->input('type') === 'advertisement') {
            $rules['start_date'] = 'required|date';
            $rules['end_date'] = 'required|date|after:start_date';
        } else {
            $rules['start_date'] = 'nullable|date';
            $rules['end_date'] = 'nullable|date';
        }

        $validated = $request->validate($rules);

        // Очищаем пустые строки для nullable полей
        if (isset($validated['image']) && $validated['image'] === '') {
            $validated['image'] = null;
        }
        if (isset($validated['link']) && $validated['link'] === '') {
            $validated['link'] = null;
        }
        if (isset($validated['description']) && $validated['description'] === '') {
            $validated['description'] = null;
        }

        // Для рекламных объявлений placement всегда 'services'
        if ($validated['type'] === 'advertisement') {
            $validated['placement'] = 'services';
        }

        // Обрабатываем массивы - если они пустые, устанавливаем null, иначе сохраняем как JSON
        $services = isset($validated['services']) && is_array($validated['services']) && count($validated['services']) > 0 
            ? $validated['services'] 
            : null;
        
        // Логируем services для отладки при создании
        if ($services) {
            \Log::info('Создание объявления - services:', [
                'services_count' => count($services),
                'services_with_additional' => count(array_filter($services, function($s) {
                    return isset($s['additional_services']) && is_array($s['additional_services']) && count($s['additional_services']) > 0;
                })),
                'services_details' => array_map(function($s) {
                    return [
                        'id' => $s['id'] ?? null,
                        'name' => $s['name'] ?? null,
                        'additional_services_count' => isset($s['additional_services']) && is_array($s['additional_services']) ? count($s['additional_services']) : 0,
                        'has_additional_services' => isset($s['additional_services']) && is_array($s['additional_services']) && count($s['additional_services']) > 0
                    ];
                }, $services)
            ]);
        }
        
        $team = isset($validated['team']) && is_array($validated['team']) && count($validated['team']) > 0 
            ? $validated['team'] 
            : null;
        $portfolio = isset($validated['portfolio']) && is_array($validated['portfolio']) && count($validated['portfolio']) > 0 
            ? $validated['portfolio'] 
            : null;
        $schedule = isset($validated['schedule']) && is_array($validated['schedule']) && count($validated['schedule']) > 0 
            ? $validated['schedule'] 
            : null;

        $advertisementData = [
            'type' => $validated['type'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'image' => $validated['image'] ?? null,
            'link' => $validated['link'] ?? null,
            'placement' => $validated['placement'] ?? 'services',
            'company_id' => $validated['company_id'] ?? null,
            'city' => $validated['city'] ?? null,
            'state' => $validated['state'] ?? null,
            'priority' => $validated['priority'] ?? 1,
            'is_active' => $validated['is_active'] ?? true,
            'status' => 'pending',
            // Дополнительные данные
            'services' => $services,
            'team' => $team,
            'portfolio' => $portfolio,
            'schedule' => $schedule,
            'price_from' => isset($validated['priceFrom']) && $validated['priceFrom'] !== '' ? (float)$validated['priceFrom'] : null,
            'price_to' => isset($validated['priceTo']) && $validated['priceTo'] !== '' ? (float)$validated['priceTo'] : null,
            'currency' => $validated['currency'] ?? 'USD',
        ];

        // Даты только для рекламных объявлений
        if ($validated['type'] === 'advertisement' && isset($validated['start_date']) && isset($validated['end_date'])) {
            $advertisementData['start_date'] = $validated['start_date'];
            $advertisementData['end_date'] = $validated['end_date'];
        }
        // Для обычных объявлений даты не устанавливаем (остаются null)

        // Обрабатываем дополнительные услуги и создаем их в БД
        if ($services) {
        }

        $advertisement = Advertisement::create($advertisementData);

        // Обрабатываем дополнительные услуги и создаем их в БД
        if ($services) {
            $this->processAdditionalServices($services, $advertisement->id);
        }
        
        $advertisement->load('company');

        return response()->json($advertisement, 201);
    }

    /**
     * Обработать дополнительные услуги из JSON и создать их в БД
     * Удаляет additional_services из JSON перед сохранением
     */
    private function processAdditionalServices(array &$services, $advertisementId = null)
    {
        if (!is_array($services) || empty($services)) {
            return;
        }

        foreach ($services as &$service) {
            if (!isset($service['additional_services']) || !is_array($service['additional_services']) || empty($service['additional_services'])) {
                continue;
            }

            // Определяем service_id и service_json_id
            // Если service_id есть в JSON - это реальная услуга из таблицы services
            // Если нет - это виртуальная услуга объявления, используем id из JSON как service_json_id
            $serviceId = null;
            $serviceJsonId = null;
            
            if (isset($service['service_id']) && !empty($service['service_id'])) {
                // Реальная услуга из таблицы services
                $serviceId = (int)$service['service_id'];
            } else if (isset($service['id']) && !empty($service['id'])) {
                // Виртуальная услуга - сохраняем ID из JSON
                $serviceJsonId = (string)$service['id'];
            }
            
            $additionalServices = $service['additional_services'];

            // Создаем или обновляем дополнительные услуги в БД
            foreach ($additionalServices as $addService) {
                if (empty($addService['name']) || !isset($addService['price'])) {
                    continue;
                }

                // Ищем существующую услугу по имени, цене, advertisement_id и service_id/service_json_id
                $existingService = AdditionalService::where('name', $addService['name'])
                    ->where('price', (float)$addService['price'])
                    ->where('advertisement_id', $advertisementId)
                    ->where(function($query) use ($serviceId, $serviceJsonId) {
                        if ($serviceId) {
                            // Реальная услуга - ищем по service_id
                            $query->where('service_id', $serviceId)->whereNull('service_json_id');
                        } else if ($serviceJsonId) {
                            // Виртуальная услуга - ищем по service_json_id
                            $query->whereNull('service_id')->where('service_json_id', $serviceJsonId);
                        } else {
                            // Общая услуга для всех (старая логика)
                            $query->whereNull('service_id')->whereNull('service_json_id');
                        }
                    })
                    ->first();

                if ($existingService) {
                    // Обновляем существующую услугу
                    $existingService->update([
                        'description' => $addService['description'] ?? null,
                        'duration' => isset($addService['duration']) ? (int)$addService['duration'] : null,
                        'is_active' => $addService['is_active'] ?? true,
                        'sort_order' => $addService['sort_order'] ?? 0,
                    ]);
                } else {
                    // Создаем новую услугу
                    AdditionalService::create([
                        'service_id' => $serviceId, // NULL для виртуальных услуг, ID для реальных
                        'advertisement_id' => $advertisementId,
                        'service_json_id' => $serviceJsonId, // ID виртуальной услуги из JSON
                        'name' => $addService['name'],
                        'description' => $addService['description'] ?? null,
                        'price' => (float)$addService['price'],
                        'duration' => isset($addService['duration']) ? (int)$addService['duration'] : null,
                        'is_active' => $addService['is_active'] ?? true,
                        'sort_order' => $addService['sort_order'] ?? 0,
                    ]);
                }
            }

            // Удаляем additional_services из JSON перед сохранением
            unset($service['additional_services']);
        }
    }

    /**
     * Нормализует URL изображения объявления для правильного отображения на всех устройствах
     * Использует APP_URL из конфигурации Laravel, а не Origin запроса
     * Также исправляет старые URL с localhost на правильный APP_URL
     */
    private function normalizeAdvertisementImageUrl(?string $image): ?string
    {
        if (!$image || str_contains($image, 'placeholder')) {
            return null;
        }

        // Используем APP_URL из конфигурации Laravel
        $baseUrl = rtrim(config('app.url'), '/');
        
        // Если это уже полный URL, проверяем, не содержит ли он localhost
        if (str_starts_with($image, 'http://') || str_starts_with($image, 'https://')) {
            // Если URL содержит localhost, заменяем его на правильный базовый URL
            if (str_contains($image, 'localhost') || str_contains($image, '127.0.0.1')) {
                // Извлекаем путь из старого URL
                $parsedUrl = parse_url($image);
                $path = $parsedUrl['path'] ?? '';
                // Возвращаем новый URL с правильным базовым адресом
                return $baseUrl . $path;
            }
            // Если это внешний URL (например, Unsplash), возвращаем как есть
            return $image;
        }

        // Логируем для отладки (только в dev режиме)
        if (config('app.debug')) {
            \Log::debug('normalizeAdvertisementImageUrl', [
                'original' => $image,
                'baseUrl' => $baseUrl,
                'app_url_config' => config('app.url'),
            ]);
        }

        // Нормализуем путь к изображению
        if (str_starts_with($image, '/storage/')) {
            return $baseUrl . $image;
        } elseif (str_starts_with($image, 'storage/')) {
            return $baseUrl . '/' . $image;
        } else {
            // Если это просто имя файла или путь без /storage/
            return $baseUrl . '/storage/advertisements/' . ltrim($image, '/');
        }
    }
}


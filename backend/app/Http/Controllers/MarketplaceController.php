<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\Company;
use App\Models\State;
use App\Models\Advertisement;
use App\Models\Review;
use App\Models\Booking;
use App\Models\AdditionalService;
use App\Helpers\DatabaseHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MarketplaceController extends Controller
{
    /**
     * Get all services for marketplace (public endpoint).
     * ВАЖНО: В каталоге маркетплейса показываем ТОЛЬКО объявления, услуги внутри объявлений.
     */
    public function getServices(Request $request)
    {
        // ВАЖНО: В каталоге маркетплейса показываем ТОЛЬКО объявления
        // Услуги показываются внутри каждого объявления через getServiceProfile()
        // Поэтому НЕ загружаем услуги из таблицы services

        // Получаем одобренные обычные объявления (type = 'regular') и рекламные объявления (type = 'advertisement')
        $regularAdsQuery = Advertisement::whereIn('type', ['regular', 'advertisement'])
            ->where('is_active', true)
            ->where('status', 'approved')
            ->whereNotNull('status')
            ->where(function($q) {
                // Для рекламных объявлений проверяем даты, для обычных - нет
                $q->where('type', 'regular')
                  ->orWhere(function($q2) {
                      $q2->where('type', 'advertisement')
                         ->where('start_date', '<=', now())
                         ->where('end_date', '>=', now())
                         ->whereNotNull('start_date')
                         ->whereNotNull('end_date');
                  });
            })
            // Показываем только объявления компаний с включенной видимостью на маркетплейсе
            ->whereHas('company', function($q) {
                $q->where('is_visible_on_marketplace', true);
            })
            ->with('company');

        // Применяем те же фильтры, что и для услуг
        if ($request->has('search') && $request->get('search')) {
            $search = $request->get('search');
            $regularAdsQuery->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'title', "%{$search}%");
                DatabaseHelper::whereLike($q, 'description', "%{$search}%", 'or');
                $q->orWhereHas('company', function ($q) use ($search) {
                    DatabaseHelper::whereLike($q, 'name', "%{$search}%");
                });
            });
        }

        if ($request->has('state')) {
            $state = $request->get('state');
            $regularAdsQuery->where(function ($q) use ($state) {
                $q->where('state', $state)
                  ->orWhereHas('company', function ($q) use ($state) {
                      $q->where('state', $state);
                  });
            });
        }

        if ($request->has('city')) {
            $city = $request->get('city');
            $regularAdsQuery->where(function ($q) use ($city) {
                DatabaseHelper::whereLike($q, 'city', "%{$city}%");
                $q->orWhereHas('company', function ($q) use ($city) {
                    DatabaseHelper::whereLike($q, 'city', "%{$city}%");
                });
            });
        }

        if ($request->has('priceMin')) {
            $regularAdsQuery->where(function ($q) use ($request) {
                $q->where('price_from', '>=', $request->get('priceMin'))
                  ->orWhereNull('price_from');
            });
        }

        if ($request->has('priceMax')) {
            $regularAdsQuery->where(function ($q) use ($request) {
                $q->where('price_to', '<=', $request->get('priceMax'))
                  ->orWhereNull('price_to');
            });
        }

        // Фильтрация по категории (поддерживаем и category_id и category slug)
        if ($request->has('category_id') && $request->get('category_id')) {
            $categoryId = $request->get('category_id');
            $category = ServiceCategory::find($categoryId);
            if ($category) {
                $regularAdsQuery->where('category_slug', $category->slug);
            }
        } elseif ($request->has('category') && $request->get('category') && $request->get('category') !== 'all') {
            $categoryParam = $request->get('category');
            // Ищем категорию по slug или по id
            $categoryQuery = ServiceCategory::where('slug', $categoryParam);
            if (is_numeric($categoryParam)) {
                $categoryQuery->orWhere('id', $categoryParam);
            }
            $category = $categoryQuery->first();
            if ($category) {
                $regularAdsQuery->where('category_slug', $category->slug);
            }
        }

        $regularAdvertisements = $regularAdsQuery
            ->orderBy('priority', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        // ВАЖНО: В каталоге маркетплейса показываем ТОЛЬКО объявления, услуги внутри объявлений
        // Поэтому НЕ преобразуем услуги в формат для frontend
        // $formattedServices = $services->map(function ($service) { ... });

        // Преобразуем обычные объявления в формат для frontend
        $formattedAdvertisements = $regularAdvertisements->map(function ($ad) {
            $company = $ad->company;
            
            // Получаем ID услуг из объявления
            $adServiceIds = [];
            if (!empty($ad->services) && is_array($ad->services)) {
                $adServiceIds = array_map(function ($s) {
                    return isset($s['id']) ? (string) $s['id'] : null;
                }, $ad->services);
                $adServiceIds = array_filter($adServiceIds);
            }
            
            // Вычисляем рейтинг из отзывов для этого объявления
            // Используем advertisement_id для точной привязки
            $adReviews = Review::where('advertisement_id', $ad->id)
                ->where('is_visible', true)
                ->get();
            
            $rating = $adReviews->count() > 0 
                ? round($adReviews->avg('rating'), 1) 
                : 0.0;
            $reviewsCount = $adReviews->count();
            
            // Формируем цену из price_from и price_to
            $priceLabel = 'Цена по запросу';
            $priceValue = 0;
            if ($ad->price_from && $ad->price_to) {
                $priceLabel = $ad->currency . ' ' . number_format($ad->price_from, 0) . ' - ' . number_format($ad->price_to, 0);
                $priceValue = (float) $ad->price_from;
            } elseif ($ad->price_from) {
                $priceLabel = $ad->currency . ' от ' . number_format($ad->price_from, 0);
                $priceValue = (float) $ad->price_from;
            }

            // Формируем путь
            $path = $ad->link 
                ? (filter_var($ad->link, FILTER_VALIDATE_URL) || str_starts_with($ad->link, '/') 
                    ? $ad->link 
                    : '/marketplace/' . $ad->link)
                : ($company ? '/marketplace/' . ($company->slug ?? $company->id) : '/services');

            // Получаем категорию по category_slug из объявления
            $categoryName = 'Услуга';
            $categoryId = '';
            
            if ($ad->category_slug) {
                $category = ServiceCategory::where('slug', $ad->category_slug)->first();
                if ($category) {
                    $categoryName = $category->name;
                    $categoryId = $category->id; // Оставляем как число для совместимости
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

            // Получаем ID первой услуги из объявления для избранного
            // ВАЖНО: services в объявлении - это виртуальные услуги с индексами, а не реальные ID
            // Поэтому мы НЕ можем использовать их ID для избранного
            // Вместо этого проверяем, есть ли у компании реальные услуги из таблицы services
            $serviceId = null;
            if ($company) {
                // Ищем первую активную услугу компании из таблицы services
                $realService = Service::where('company_id', $company->id)
                    ->where('is_active', true)
                    ->first();
                if ($realService) {
                    $serviceId = $realService->id;
                }
            }
            
            // Если не нашли реальную услугу, не устанавливаем service_id
            // Это означает, что объявление нельзя добавить в избранное как услугу

            return [
                'id' => 'ad_' . (string) $ad->id, // Префикс чтобы не конфликтовать с услугами
                'service_id' => $serviceId, // ID услуги для избранного
                'name' => $ad->title,
                'description' => $ad->description ?? '',
                'category' => $categoryName,
                'group' => $categoryId ? (int) $categoryId : ($ad->type === 'advertisement' ? 'advertisement' : 'regular_ad'), // Используем ID категории если нашли (как число)
                'imageUrl' => $this->normalizeAdvertisementImageUrl($ad->image ?? null) ?? '/img/others/placeholder.jpg',
                'path' => $path,
                'priceLabel' => $priceLabel,
                'priceValue' => $priceValue,
                'rating' => $rating,
                'reviews' => $reviewsCount,
                'reviewsCount' => $reviewsCount,
                'tags' => [],
                'isFeatured' => $ad->type === 'advertisement', // Рекламные объявления помечаем как featured
                'city' => $ad->city ?? $company->city ?? '',
                'state' => $ad->state ?? $company->state ?? '',
            ];
        });

        // ВАЖНО: В каталоге маркетплейса показываем ТОЛЬКО объявления
        // Услуги показываются внутри каждого объявления
        // $formatted = $formattedServices->concat($formattedAdvertisements);

        return response()->json($formattedAdvertisements);
    }

    /**
     * Get categories (public endpoint).
     */
    public function getCategories()
    {
        $categories = ServiceCategory::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json($categories);
    }

    /**
     * Get states (public endpoint).
     */
    public function getStates()
    {
        // Получаем штаты из компаний
        $companyStates = Company::select('state')
            ->whereNotNull('state')
            ->where('state', '!=', '')
            ->distinct()
            ->pluck('state');
        
        // Получаем штаты из объявлений
        $adStates = Advertisement::select('state')
            ->where('type', 'regular')
            ->where('is_active', true)
            ->where('status', 'approved')
            ->whereNotNull('state')
            ->where('state', '!=', '')
            ->distinct()
            ->pluck('state');
        
        // Объединяем и убираем дубликаты
        $allStates = $companyStates->merge($adStates)->unique()->sort()->values();
        
        $states = $allStates->map(function ($state) {
            return [
                'id' => $state,
                'name' => $state,
            ];
        });

        return response()->json($states);
    }

    /**
     * Get service by slug (public endpoint).
     */
    public function getServiceBySlug($slug)
    {
        $query = Service::where('slug', $slug);
        if (is_numeric($slug)) {
            $query->orWhere('id', $slug);
        }
        $service = $query->where('is_active', true)
            ->whereHas('company', function ($q) {
                $q->where('status', 'active')
                  ->where('is_visible_on_marketplace', true);
            })
            ->with(['company', 'category', 'reviews'])
            ->first();

        if (!$service) {
            return response()->json(['message' => 'Service not found'], 404);
        }

        $company = $service->company;
        $category = $service->category;
        $reviews = $service->reviews;
        $rating = $reviews->count() > 0 
            ? round($reviews->avg('rating'), 1) 
            : 0.0;
        $reviewsCount = $reviews->count();

        $formatted = [
            'id' => (string) $service->id,
            'name' => $service->name,
            'description' => $service->description ?? '',
            'category' => $category->name ?? 'Услуга',
            'group' => (string) ($category->id ?? ''),
            'imageUrl' => $service->image ?? '/img/others/placeholder.jpg',
            'path' => '/marketplace/' . ($service->slug ?? $service->id),
            'priceLabel' => '$' . number_format($service->price, 0),
            'priceValue' => (float) $service->price,
            'rating' => $rating,
            'reviewsCount' => $reviewsCount,
            'reviews' => $reviewsCount,
            'tags' => [], // TODO: Добавить теги если будут
            'isFeatured' => false,
            'city' => $company->city ?? '',
            'state' => $company->state ?? '',
            'location' => ($company->city ?? '') . ', ' . ($company->state ?? ''),
        ];

        return response()->json($formatted);
    }

    /**
     * Get full service profile with schedule, reviews, team, portfolio (public endpoint).
     * Также поддерживает обычные объявления (type = 'regular').
     */
    public function getServiceProfile($slug)
    {
        // Сначала проверяем, является ли это объявлением (обычным или рекламным)
        // Убираем префикс '/marketplace/' если есть
        $cleanSlug = str_replace('/marketplace/', '', $slug);
        $cleanSlug = ltrim($cleanSlug, '/'); // Убираем ведущий слеш если есть
        
        // Проверяем сначала обычные объявления, потом рекламные
        $advertisement = Advertisement::whereIn('type', ['regular', 'advertisement'])
            ->where('is_active', true)
            ->where('status', 'approved')
            ->whereNotNull('status')
            ->where(function ($q) use ($cleanSlug, $slug) {
                // Проверяем по link в разных вариантах:
                // 1. Точное совпадение со slug (самый частый случай)
                $q->where('link', $cleanSlug)
                  // 2. С префиксом /marketplace/
                  ->orWhere('link', '/marketplace/' . $cleanSlug)
                  // 3. Без префикса marketplace/
                  ->orWhere('link', 'marketplace/' . $cleanSlug)
                  // 4. Оригинальный slug (на случай если он уже содержит /marketplace/)
                  ->orWhere('link', $slug)
                  // 5. Если link заканчивается на этот slug (для случаев типа /path/to/cleaning-la2)
                  ->orWhere('link', 'like', '%/' . $cleanSlug)
                  // 6. Если link содержит этот slug в конце
                  ->orWhere('link', 'like', '%' . $cleanSlug);
            })
            // Показываем только объявления компаний с включенной видимостью
            ->whereHas('company', function($q) {
                $q->where('is_visible_on_marketplace', true);
            })
            ->with('company')
            ->first();
        
        // Если не нашли по link, проверяем по ID объявления (если slug это число)
        if (!$advertisement && is_numeric($cleanSlug)) {
            $advertisement = Advertisement::whereIn('type', ['regular', 'advertisement'])
                ->where('is_active', true)
                ->where('status', 'approved')
                ->whereNotNull('status')
                ->where('id', $cleanSlug)
                // Показываем только объявления компаний с включенной видимостью
                ->whereHas('company', function($q) {
                    $q->where('is_visible_on_marketplace', true);
                })
                ->with('company')
                ->first();
        }

        // Если это обычное объявление, возвращаем его профиль
        if ($advertisement) {
            $company = $advertisement->company;
            
            // Формируем цену
            $priceLabel = 'Цена по запросу';
            $priceValue = 0;
            if ($advertisement->price_from && $advertisement->price_to) {
                $priceLabel = $advertisement->currency . ' ' . number_format($advertisement->price_from, 0) . ' - ' . number_format($advertisement->price_to, 0);
                $priceValue = (float) $advertisement->price_from;
            } elseif ($advertisement->price_from) {
                $priceLabel = $advertisement->currency . ' от ' . number_format($advertisement->price_from, 0);
                $priceValue = (float) $advertisement->price_from;
            }

            // Получаем категорию по category_slug из объявления
            $categoryName = 'Услуга';
            $categoryId = '';
            
            if ($advertisement->category_slug) {
                $category = ServiceCategory::where('slug', $advertisement->category_slug)->first();
                if ($category) {
                    $categoryName = $category->name;
                    $categoryId = (string) $category->id;
                }
            }
            
            // Если не нашли по slug, пытаемся определить из первой услуги
            if ($categoryName === 'Услуга' && !empty($advertisement->services) && is_array($advertisement->services)) {
                $firstService = $advertisement->services[0];
                if (isset($firstService['category'])) {
                    $categoryName = $firstService['category'];
                }
            }
            
            // Если все еще "Услуга", используем категорию компании
            if ($categoryName === 'Услуга' && $company && $company->category) {
                $categoryName = $company->category;
            }

            // Подсчитываем количество объявлений компании (обычные и рекламные, как в getCompanyProfile)
            $companyAdvertisementsCount = Advertisement::where('company_id', $company->id)
                ->whereIn('type', ['regular', 'advertisement'])
                ->where('is_active', true)
                ->where('status', 'approved')
                ->where(function($q) {
                    // Для рекламных объявлений проверяем даты, для обычных - нет
                    $q->where('type', 'regular')
                      ->orWhere(function($q2) {
                          $q2->where('type', 'advertisement')
                             ->where('start_date', '<=', now())
                             ->where('end_date', '>=', now())
                             ->whereNotNull('start_date')
                             ->whereNotNull('end_date');
                      });
                })
                ->count();

            $serviceData = [
                'id' => 'ad_' . (string) $advertisement->id,
                'advertisement_id' => (string) $advertisement->id, // Добавляем ID объявления для использования в BookingController
                'company_id' => (string) $advertisement->company_id,
                'companyName' => $company->name ?? 'N/A',
                'companySlug' => $company->slug ?? '',
                'companyAdvertisementsCount' => $companyAdvertisementsCount,
                'name' => $advertisement->title,
                'description' => $advertisement->description ?? '',
                'category' => $categoryName,
                'category_slug' => $advertisement->category_slug ?? '', // Slug категории для фильтрации похожих услуг
                'group' => $categoryId ? (int) $categoryId : 'regular_ad', // Используем ID категории как число
                'imageUrl' => $this->normalizeAdvertisementImageUrl($advertisement->image),
                'path' => '/marketplace/' . $cleanSlug,
                'priceLabel' => $priceLabel,
                'priceValue' => $priceValue,
                'rating' => 5.0,
                'reviewsCount' => 0,
                'reviews' => 0,
                'tags' => [],
                'isFeatured' => false,
                'city' => $advertisement->city ?? $company->city ?? '',
                'state' => $advertisement->state ?? $company->state ?? '',
                'timezone' => $company->timezone ?? 'America/Los_Angeles',
                'location' => trim(($advertisement->city ?? $company->city ?? '') . ((($advertisement->city ?? $company->city ?? '')) ? ', ' : '') . ($advertisement->state ?? $company->state ?? '')),
            ];

            // Преобразуем данные объявления в формат профиля
            // ВАЖНО: Услуги хранятся в JSON поле services в объявлении
            $servicesList = [];
            
            // Получаем услуги из JSON поля services в объявлении
            // Проверяем, является ли это массивом или JSON строкой
            $servicesData = $advertisement->services;
            if (is_string($servicesData)) {
                $servicesData = json_decode($servicesData, true);
            }
            
            if ($servicesData && is_array($servicesData) && count($servicesData) > 0) {
                $servicesList = array_map(function ($service, $index) use ($advertisement) {
                    $serviceId = $service['id'] ?? null;
                    if ($serviceId === null || $serviceId === '') {
                        $serviceId = 'service_' . $index;
                    }
                    
                    // Если услуга есть в таблице services, берем service_type оттуда
                    $serviceType = $service['service_type'] ?? 'onsite';
                    if (is_numeric($serviceId)) {
                        $serviceModel = \App\Models\Service::find($serviceId);
                        if ($serviceModel) {
                            $serviceType = $serviceModel->service_type ?? $serviceType;
                        }
                    }
                    
                    // Получаем дополнительные услуги из JSON поля additional_services
                    $additionalServices = [];
                    if (isset($service['additional_services']) && is_array($service['additional_services'])) {
                        $additionalServices = array_map(function ($addService) {
                            return [
                                'id' => $addService['id'] ?? null,
                                'name' => $addService['name'] ?? '',
                                'description' => $addService['description'] ?? '',
                                'price' => (float) ($addService['price'] ?? 0),
                                'duration' => (int) ($addService['duration'] ?? 0),
                                'duration_unit' => $addService['duration_unit'] ?? 'hours',
                                'is_active' => $addService['is_active'] ?? true,
                                'sort_order' => $addService['sort_order'] ?? 0,
                            ];
                        }, $service['additional_services']);
                    }
                    
                    // Определяем длительность и единицу измерения
                    $duration = (int) ($service['duration'] ?? 60);
                    $durationUnit = $service['duration_unit'] ?? null;
                    
                    // Если duration_unit не указан или равен 'hours', но duration выглядит как минуты
                    // (больше 24), то конвертируем минуты в часы
                    if ((!$durationUnit || $durationUnit === 'hours') && $duration > 24) {
                        // Если duration больше 24, вероятно это минуты, конвертируем в часы
                        $duration = $duration / 60; // Конвертируем минуты в часы (60 мин = 1 час, 90 мин = 1.5 часа)
                    }
                    
                    return [
                        'id' => (string) $serviceId,
                        'service_id' => is_numeric($serviceId) ? (int) $serviceId : null,
                        'name' => $service['name'] ?? 'Услуга',
                        'description' => $service['description'] ?? '',
                        'price' => (float) ($service['price'] ?? 0),
                        'priceLabel' => '$' . number_format($service['price'] ?? 0, 0),
                        'duration' => $duration,
                        'duration_unit' => $durationUnit ?: 'hours',
                        'category' => $service['category'] ?? 'Услуга',
                        'service_type' => $serviceType,
                        'additional_services' => $additionalServices,
                    ];
                }, $servicesData, array_keys($servicesData));
            }

            // Расписание из объявления
            $schedule = [
                'days' => [],
                'slots' => [],
            ];
            if ($advertisement->schedule && is_array($advertisement->schedule)) {
                // Преобразуем расписание в формат для фронтенда
                $daysMap = [
                    'monday' => ['name' => 'Пн', 'full' => 'Понедельник'],
                    'tuesday' => ['name' => 'Вт', 'full' => 'Вторник'],
                    'wednesday' => ['name' => 'Ср', 'full' => 'Среда'],
                    'thursday' => ['name' => 'Чт', 'full' => 'Четверг'],
                    'friday' => ['name' => 'Пт', 'full' => 'Пятница'],
                    'saturday' => ['name' => 'Сб', 'full' => 'Суббота'],
                    'sunday' => ['name' => 'Вс', 'full' => 'Воскресенье'],
                ];
                
                $days = [];
                $slots = [];
                
                // Генерируем дни на 30 дней вперед
                // Используем системную таймзону (пока системную, в будущем по штату)
                $timezone = config('app.timezone') ?: date_default_timezone_get();
                $today = \Carbon\Carbon::now($timezone);
                $dayIndex = 0;
                
                // Получаем список активных дней недели из расписания
                $activeDays = [];
                foreach ($advertisement->schedule as $dayKey => $daySchedule) {
                    if (isset($daySchedule['enabled']) && $daySchedule['enabled']) {
                        $activeDays[] = $dayKey;
                    }
                }
                
                // Генерируем дни на 30 дней вперед
                for ($i = 0; $i < 30; $i++) {
                    $date = $today->copy()->addDays($i);
                    $dayOfWeek = strtolower($date->format('l')); // monday, tuesday, etc.
                    
                    // Проверяем, активен ли этот день недели в расписании
                    if (in_array($dayOfWeek, $activeDays)) {
                        $daySchedule = $advertisement->schedule[$dayOfWeek];
                        $dayInfo = $daysMap[$dayOfWeek] ?? ['name' => ucfirst($dayOfWeek), 'full' => ucfirst($dayOfWeek)];
                        
                        // Генерируем временные слоты на основе from и to
                        $timeSlots = [];
                        if (isset($daySchedule['from']) && isset($daySchedule['to'])) {
                            $duration = isset($daySchedule['duration']) ? (int)$daySchedule['duration'] : 60; // Длительность слота в минутах
                            
                            // Парсим время начала и конца
                            $fromParts = explode(':', $daySchedule['from']);
                            $toParts = explode(':', $daySchedule['to']);
                            
                            // Парсим время перерыва (если включен)
                            $breakEnabled = $advertisement->schedule['breakEnabled'] ?? false;
                            $breakFromMinutes = 0;
                            $breakToMinutes = 0;
                            if ($breakEnabled && isset($advertisement->schedule['breakFrom']) && isset($advertisement->schedule['breakTo'])) {
                                $breakFromParts = explode(':', $advertisement->schedule['breakFrom']);
                                $breakToParts = explode(':', $advertisement->schedule['breakTo']);
                                if (count($breakFromParts) === 2 && count($breakToParts) === 2) {
                                    $breakFromMinutes = (int)$breakFromParts[0] * 60 + (int)$breakFromParts[1];
                                    $breakToMinutes = (int)$breakToParts[0] * 60 + (int)$breakToParts[1];
                                }
                            }
                            
                            if (count($fromParts) === 2 && count($toParts) === 2) {
                                $fromMinutes = (int)$fromParts[0] * 60 + (int)$fromParts[1];
                                $toMinutes = (int)$toParts[0] * 60 + (int)$toParts[1];
                                $current = $fromMinutes;
                                
                                while ($current < $toMinutes) {
                                    $hours = floor($current / 60);
                                    $minutes = $current % 60;
                                    $slotEndMinutes = $current + $duration;
                                    
                                    // Пропускаем слоты, которые пересекаются с перерывом
                                    $overlapsBreak = $breakEnabled && 
                                        $current < $breakToMinutes && 
                                        $slotEndMinutes > $breakFromMinutes;
                                    
                                    if (!$overlapsBreak) {
                                        $timeSlots[] = [
                                            'time' => sprintf('%02d:%02d', $hours, $minutes),
                                            'available' => true, // Будет проверено на фронтенде через API
                                        ];
                                    }
                                    $current += $duration; // Добавляем длительность слота
                                }
                            }
                        }
                        
                        $days[] = [
                            'id' => $dayIndex,
                            'dayName' => $dayInfo['name'],
                            'dayNumber' => $date->format('d'),
                            'dayKey' => $dayOfWeek,
                            'date' => $date->format('Y-m-d'), // Добавляем полную дату
                        ];
                        
                        $slots[$dayIndex] = $timeSlots;
                        $dayIndex++;
                    }
                }
                
                $schedule = [
                    'days' => $days,
                    'slots' => $slots,
                ];
            }

            // Команда из таблицы team_members (основной источник)
            // Сначала получаем команду из БД
            $team = \App\Models\TeamMember::where('company_id', $advertisement->company_id)
                ->where('status', 'active')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(function ($member) {
                    return [
                        'id' => (string) $member->id,
                        'name' => $member->name ?? 'Сотрудник',
                        'role' => $member->role ?? 'Сотрудник',
                        'avatar' => $member->img ? $this->normalizeAdvertisementImageUrl($member->img) : null,
                        'bio' => null, // TeamMember не имеет bio
                    ];
                })
                ->toArray();
            
            // Синхронизация: если в объявлении есть данные о команде (старый формат с объектами),
            // добавляем специалистов из объявления в таблицу team_members
            // Если в объявлении хранятся только ID (новый формат), они уже учтены в запросе выше
            if ($advertisement->team) {
                $adTeam = is_array($advertisement->team) ? $advertisement->team : json_decode($advertisement->team, true);
                
                if ($adTeam && is_array($adTeam) && !empty($adTeam)) {
                    // Проверяем, является ли это массивом ID (новый формат) или объектов (старый формат)
                    $isNewFormat = true;
                    foreach ($adTeam as $item) {
                        if (!is_numeric($item)) {
                            $isNewFormat = false;
                            break;
                        }
                    }
                    
                    // Если это новый формат (только ID), проверяем, что все ID существуют в таблице
                    if ($isNewFormat) {
                        $existingIds = \App\Models\TeamMember::where('company_id', $advertisement->company_id)
                            ->whereIn('id', $adTeam)
                            ->pluck('id')
                            ->toArray();
                        
                        // Если есть ID, которых нет в таблице, фильтруем их
                        $validIds = array_intersect($adTeam, $existingIds);
                        if (count($validIds) !== count($adTeam)) {
                            // Обновляем объявление, убирая несуществующие ID
                            $advertisement->update(['team' => array_values($validIds)]);
                        }
                    } else {
                        // Старый формат (объекты) - синхронизируем
                        $needsSync = false;
                        
                        foreach ($adTeam as $memberData) {
                            // Если это объект с данными (старый формат), проверяем, существует ли уже такой специалист
                            if (is_array($memberData)) {
                                $memberName = $memberData['name'] ?? null;
                                $memberRole = $memberData['role'] ?? null;
                                
                                if ($memberName) {
                                    // Проверяем, существует ли уже такой специалист по имени и роли
                                    $existingSpecialist = \App\Models\TeamMember::where('company_id', $advertisement->company_id)
                                        ->where('name', $memberName)
                                        ->where(function($query) use ($memberRole) {
                                            if ($memberRole) {
                                                $query->where('role', $memberRole);
                                            } else {
                                                $query->whereNull('role');
                                            }
                                        })
                                        ->first();
                                    
                                    if (!$existingSpecialist) {
                                        // Создаем нового специалиста в таблице team_members
                                        \App\Models\TeamMember::create([
                                            'company_id' => $advertisement->company_id,
                                            'name' => $memberName,
                                            'email' => $memberData['email'] ?? null,
                                            'phone' => $memberData['phone'] ?? null,
                                            'role' => $memberRole,
                                            'status' => 'active',
                                            'img' => $memberData['img'] ?? $memberData['avatar'] ?? null,
                                        ]);
                                        $needsSync = true;
                                    }
                                }
                            }
                        }
                        
                        // После синхронизации обновляем объявление, сохраняя только ID специалистов
                        if ($needsSync) {
                            $syncedIds = \App\Models\TeamMember::where('company_id', $advertisement->company_id)
                                ->where('status', 'active')
                                ->pluck('id')
                                ->toArray();
                            $advertisement->update(['team' => $syncedIds]);
                            
                            // Получаем команду снова из БД
                            $team = \App\Models\TeamMember::where('company_id', $advertisement->company_id)
                                ->where('status', 'active')
                                ->orderBy('sort_order')
                                ->orderBy('name')
                                ->get()
                                ->map(function ($member) {
                                    return [
                                        'id' => (string) $member->id,
                                        'name' => $member->name ?? 'Сотрудник',
                                        'role' => $member->role ?? 'Сотрудник',
                                        'avatar' => $member->img ? $this->normalizeAdvertisementImageUrl($member->img) : null,
                                        'bio' => null,
                                    ];
                                })
                                ->toArray();
                        }
                    }
                }
            }

            // Портфолио из объявления
            $portfolio = [];
            if ($advertisement->portfolio && is_array($advertisement->portfolio)) {
                $portfolio = array_map(function ($item) {
                    // Поддержка новой структуры с массивом images и обратная совместимость с imageUrl
                    $images = $item['images'] ?? [];
                    if (empty($images) && isset($item['imageUrl'])) {
                        $images = [$item['imageUrl']];
                    } elseif (empty($images) && isset($item['image'])) {
                        $images = [$item['image']];
                    }
                    
                    // Нормализуем все изображения в массиве
                    $images = array_map(function ($image) {
                        return $this->normalizeAdvertisementImageUrl($image) ?? $image;
                    }, $images);
                    
                    return [
                        'id' => (string) ($item['id'] ?? uniqid()),
                        'imageUrl' => $images[0] ?? '/img/others/placeholder.jpg', // Для обратной совместимости
                        'images' => $images, // Массив всех изображений
                        'title' => $item['title'] ?? '',
                        'description' => $item['description'] ?? '',
                        'tag' => $item['tag'] ?? '',
                    ];
                }, $advertisement->portfolio);
            }

            // Загружаем отзывы для объявления
            // Получаем ID услуг из объявления
            $adServiceIds = [];
            if (!empty($advertisement->services) && is_array($advertisement->services)) {
                $adServiceIds = array_map(function ($s) {
                    return isset($s['id']) ? (string) $s['id'] : null;
                }, $advertisement->services);
                $adServiceIds = array_filter($adServiceIds);
            }
            
            // Ищем отзывы для этого объявления:
            // 1. По advertisement_id (прямые отзывы на объявление)
            // 2. По company_id (общие отзывы на компанию)
            // 3. По service_id услуг из объявления (отзывы на конкретные услуги)
            $adReviews = Review::where(function($q) use ($advertisement) {
                    // Отзывы напрямую на объявление
                    $q->where('advertisement_id', $advertisement->id)
                      // Или общие отзывы на компанию
                      ->orWhere(function($subQ) use ($advertisement) {
                          $subQ->where('company_id', $advertisement->company_id)
                               ->whereNull('advertisement_id');
                      });
                    
                    // Также включаем отзывы на услуги из этого объявления
                    if (!empty($advertisement->services)) {
                        $services = is_array($advertisement->services) 
                            ? $advertisement->services 
                            : (json_decode($advertisement->services, true) ?? []);
                        $serviceIds = collect($services)->pluck('id')->filter(function($id) {
                            return is_numeric($id);
                        })->map(function($id) {
                            return (int)$id;
                        })->unique()->toArray();
                        
                        if (!empty($serviceIds)) {
                            $q->orWhere(function($subQ) use ($serviceIds, $advertisement) {
                                $subQ->whereIn('service_id', $serviceIds)
                                     ->where('company_id', $advertisement->company_id);
                            });
                        }
                    }
                })
                ->where('is_visible', true)
                ->with(['service', 'booking.specialist', 'order.booking.specialist', 'booking'])
                ->get()
                ->unique('id'); // Убираем дубликаты
            
            // Загружаем пользователей отдельно для отзывов с user_id
            $userIds = $adReviews->pluck('user_id')->filter()->unique();
            if ($userIds->isNotEmpty()) {
                $users = \App\Models\User::whereIn('id', $userIds)->with('profile')->get()->keyBy('id');
                $adReviews->each(function($review) use ($users) {
                    if ($review->user_id && isset($users[$review->user_id])) {
                        $review->setRelation('user', $users[$review->user_id]);
                    }
                });
            }
            
            // Форматируем отзывы
            $reviews = $adReviews->map(function ($review) use ($advertisement) {
                // ОПРЕДЕЛЯЕМ ИМЯ ПОЛЬЗОВАТЕЛЯ
                $userName = 'Аноним';
                
                if ($review->user_id) {
                    // Зарегистрированный пользователь
                    $user = $review->user;
                    if ($user) {
                        $profile = $user->profile ?? null;
                        $userName = $profile 
                            ? ($profile->first_name . ' ' . $profile->last_name)
                            : ($user->email ?? 'Аноним');
                    }
                } else {
                    // Незарегистрированный пользователь - берем имя из бронирования
                    if ($review->booking && $review->booking->client_name) {
                        $userName = $review->booking->client_name . ' (не авторизован)';
                    } elseif ($review->order && $review->order->booking && $review->order->booking->client_name) {
                        $userName = $review->order->booking->client_name . ' (не авторизован)';
                    } else {
                        $userName = 'Аноним (не авторизован)';
                    }
                }
                
                $service = $review->service;
                
                // Определяем название услуги из объявления
                $serviceName = null;
                if ($review->service_id && !empty($advertisement->services)) {
                    $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                    $serviceData = collect($services)->first(function ($s) use ($review) {
                        return isset($s['id']) && (string)$s['id'] === (string)$review->service_id;
                    });
                    if ($serviceData && isset($serviceData['name'])) {
                        $serviceName = $serviceData['name'];
                    }
                }
                
                // Определяем исполнителя (специалиста) из команды объявления
                $specialistName = null;
                $bookingSpecialistId = null;
                
                // Получаем ID специалиста из бронирования
                if ($review->order && $review->order->booking && $review->order->booking->specialist_id) {
                    $bookingSpecialistId = $review->order->booking->specialist_id;
                } elseif ($review->booking && $review->booking->specialist_id) {
                    $bookingSpecialistId = $review->booking->specialist_id;
                }
                
                // Сначала ищем в team_members (основной источник)
                if ($bookingSpecialistId) {
                    $teamMember = \App\Models\TeamMember::where('id', $bookingSpecialistId)
                        ->where('company_id', $advertisement->company_id)
                        ->first();
                    
                    if ($teamMember) {
                        $specialistName = $teamMember->name;
                    } else {
                        // Если не найден в БД, ищем в объявлении (для старых данных)
                        if ($advertisement && $advertisement->team) {
                            $team = is_array($advertisement->team) ? $advertisement->team : (json_decode($advertisement->team, true) ?? []);
                            
                            // Ищем специалиста в команде по ID
                            $teamMember = collect($team)->first(function ($member) use ($bookingSpecialistId) {
                                return isset($member['id']) && (int)$member['id'] === (int)$bookingSpecialistId;
                            });
                            
                            if ($teamMember && isset($teamMember['name'])) {
                                $specialistName = $teamMember['name'];
                            }
                        }
                    }
                }
                
                // Fallback: если не нашли, используем имя из связи specialist (для старых данных)
                if (!$specialistName && $bookingSpecialistId) {
                    $specialist = null;
                    if ($review->order && $review->order->booking && $review->order->booking->specialist) {
                        $specialist = $review->order->booking->specialist;
                    } elseif ($review->booking && $review->booking->specialist) {
                        $specialist = $review->booking->specialist;
                    }
                    
                    if ($specialist) {
                        // specialist теперь это TeamMember, у которого есть только name
                        if ($specialist->name) {
                            $specialistName = $specialist->name;
                        }
                    }
                }
                
                // Безопасное получение аватара пользователя
                // Для неавторизованных пользователей (user_id = null) аватар всегда null (будет использован стандартный)
                $userAvatar = null;
                if ($review->user_id && $review->user) {
                    $userAvatar = $review->user->profile->avatar ?? null;
                }
                // Для неавторизованных пользователей аватар остается null (стандартный)
                
                return [
                    'id' => (string) $review->id,
                    'userName' => $userName,
                    'userAvatar' => $userAvatar,
                    'isAnonymous' => !$review->user_id,
                    'rating' => (float) $review->rating,
                    'comment' => $review->comment ?? '',
                    'date' => $review->created_at->toISOString(),
                    'response' => $review->response ?? null,
                    'responseDate' => $review->response_at ? $review->response_at->toISOString() : null,
                    'serviceName' => $serviceName,
                    'specialistName' => $specialistName,
                    'isAnonymous' => !$review->user_id,
                ];
            });
            
            // Вычисляем средний рейтинг
            $averageRating = $adReviews->count() > 0 
                ? round($adReviews->avg('rating'), 1) 
                : 0.0;
            
            // Обновляем рейтинг в serviceData
            $serviceData['rating'] = $averageRating;
            $serviceData['reviewsCount'] = $adReviews->count();
            $serviceData['reviews'] = $adReviews->count();
            

            return response()->json([
                'service' => $serviceData,
                'servicesList' => $servicesList,
                'schedule' => $schedule,
                'reviews' => $reviews,
                'team' => $team,
                'portfolio' => $portfolio,
                // Настройки маркетплейса компании
                'allowBooking' => (bool) ($company->allow_booking ?? true),
                'showReviews' => (bool) ($company->show_reviews ?? true),
                'showPortfolio' => (bool) ($company->show_portfolio ?? true),
            ]);
        }

        // Если это не объявление, ищем как обычную услугу
        $serviceQuery = Service::where('slug', $slug);
        if (is_numeric($slug)) {
            $serviceQuery->orWhere('id', $slug);
        }
        $service = $serviceQuery->where('is_active', true)
            ->whereHas('company', function ($q) {
                $q->where('status', 'active')
                  ->where('is_visible_on_marketplace', true);
            })
            ->with(['company', 'category', 'reviews' => function($query) {
                $query->with(['user' => function($q) {
                    $q->with('profile');
                }]);
            }, 'bookings'])
            ->first();

        // Если услуга не найдена, проверяем, может это компания
        if (!$service) {
            $companyQuery = Company::where('slug', $slug);
            if (is_numeric($slug)) {
                $companyQuery->orWhere('id', $slug);
            }
            $company = $companyQuery->where('status', 'active')
                ->where('is_visible_on_marketplace', true)
                ->first();
            
            if ($company) {
                // Если это компания, берем первую активную услугу или первую услугу из бронирований
                $firstService = Service::where('company_id', $company->id)
                    ->where('is_active', true)
                    ->first();
                
                if (!$firstService) {
                    // Если нет активных услуг, берем первую из бронирований
                    $bookedServiceId = Booking::where('company_id', $company->id)
                        ->whereNotNull('service_id')
                        ->first();
                    
                    if ($bookedServiceId) {
                        $firstService = Service::find($bookedServiceId->service_id);
                    }
                }
                
                if ($firstService) {
                    $service = $firstService;
                } else {
                    return response()->json(['message' => 'Company found but no services available'], 404);
                }
            } else {
                return response()->json(['message' => 'Service or company not found'], 404);
            }
        }

        $company = $service->company;
        $category = $service->category;
        
        // Форматируем основную информацию об услуге
        // Получаем отзывы для услуги и для компании (если отзыв на компанию, но связан с услугой)
        $serviceReviews = $service->reviews()->where('is_visible', true)->with(['user' => function($query) {
            $query->with('profile');
        }, 'service', 'booking.specialist', 'order.booking.specialist', 'booking'])->get();
        
        // Отзывы для компании (для этой услуги или общие)
        $companyReviews = Review::where('company_id', $company->id)
            ->where('is_visible', true)
            ->where(function($q) use ($service) {
                // Отзывы для этой услуги или без указания услуги (общие отзывы на компанию)
                $q->where('service_id', $service->id)
                  ->orWhere(function($q2) use ($service) {
                      $q2->whereNull('service_id')
                         ->where('company_id', $service->company_id);
                  });
            })
            ->with(['user' => function($query) {
                $query->with('profile');
            }, 'service', 'booking.specialist', 'order.booking.specialist', 'booking'])
            ->get();
        
        // Отзывы через бронирования этой компании (даже если service_id не совпадает или услуга из другой компании)
        $bookingReviews = Review::where('is_visible', true)
            ->whereHas('booking', function($q) use ($company) {
                $q->where('company_id', $company->id);
            })
            ->with(['user' => function($query) {
                $query->with('profile');
            }, 'service', 'booking.specialist', 'order.booking.specialist', 'booking'])
            ->get();
        
        // Объединяем все отзывы, убирая дубликаты
        $allReviews = $serviceReviews
            ->merge($companyReviews)
            ->merge($bookingReviews)
            ->unique('id');
        
        $rating = $allReviews->count() > 0 
            ? round($allReviews->avg('rating'), 1) 
            : 0.0;

        // Подсчитываем количество объявлений компании (обычные и рекламные, как в getCompanyProfile)
        $companyAdvertisementsCount = Advertisement::where('company_id', $company->id)
            ->whereIn('type', ['regular', 'advertisement'])
            ->where('is_active', true)
            ->where('status', 'approved')
            ->where(function($q) {
                // Для рекламных объявлений проверяем даты, для обычных - нет
                $q->where('type', 'regular')
                  ->orWhere(function($q2) {
                      $q2->where('type', 'advertisement')
                         ->where('start_date', '<=', now())
                         ->where('end_date', '>=', now())
                         ->whereNotNull('start_date')
                         ->whereNotNull('end_date');
                  });
            })
            ->count();

        $serviceData = [
            'id' => (string) $service->id,
            'name' => $service->name,
            'description' => $service->description ?? '',
            'category' => $category->name ?? 'Услуга',
            'group' => (string) ($category->id ?? ''),
            'imageUrl' => $service->image ?? '/img/others/placeholder.jpg',
            'path' => '/marketplace/' . ($service->slug ?? $service->id),
            'priceLabel' => '$' . number_format($service->price, 0),
            'priceValue' => (float) $service->price,
            'rating' => $rating,
            'reviewsCount' => $allReviews->count(),
            'reviews' => $allReviews->count(),
            'tags' => [],
            'isFeatured' => false,
            'city' => $company->city ?? '',
            'state' => $company->state ?? '',
            'timezone' => $company->timezone ?? 'America/Los_Angeles',
            'location' => ($company->city ?? '') . ', ' . ($company->state ?? ''),
            'company_id' => (string) $company->id,
            'companyName' => $company->name ?? 'N/A',
            'companySlug' => $company->slug ?? '',
            'companyAdvertisementsCount' => $companyAdvertisementsCount,
        ];

        // Список услуг компании (для вкладки "Услуги")
        // Включаем все услуги, которые есть в бронированиях или активные
        $activeServices = Service::where('company_id', $company->id)
            ->where('is_active', true)
            ->with('category')
            ->get();
        
        // Также получаем услуги из бронирований (даже если они неактивны или из другой компании)
        $bookedServiceIds = Booking::where('company_id', $company->id)
            ->whereNotNull('service_id')
            ->distinct()
            ->pluck('service_id')
            ->toArray();
        
        $bookedServices = Service::whereIn('id', $bookedServiceIds)
            ->with('category')
            ->get();
        
        // Объединяем услуги, убирая дубликаты
        $allServices = $activeServices->merge($bookedServices)->unique('id');
        
        $servicesList = $allServices->map(function ($s) {
            return [
                'id' => (string) $s->id,
                'name' => $s->name,
                'description' => $s->description ?? '',
                'price' => (float) $s->price,
                'priceLabel' => '$' . number_format($s->price, 0),
                'duration' => $s->duration_minutes ?? 60,
                'category' => $s->category->name ?? 'Услуга',
                'service_type' => $s->service_type ?? 'onsite',
            ];
        });

        // Расписание (из bookings или пустой массив)
        // TODO: Реализовать отдельную таблицу schedule_slots если нужно
        $schedule = [
            'days' => [],
            'slots' => [],
        ];

        // Отзывы - используем уже загруженные отзывы
        $reviewsFormatted = $allReviews->map(function ($review) {
            // ОПРЕДЕЛЯЕМ ИМЯ ПОЛЬЗОВАТЕЛЯ
            $userName = 'Аноним';
            
            if ($review->user_id) {
                // Зарегистрированный пользователь
                $user = $review->user;
                $profile = $user->profile ?? null;
                $userName = $profile 
                    ? ($profile->first_name . ' ' . $profile->last_name)
                    : ($user->email ?? 'Аноним');
            } else {
                // Незарегистрированный пользователь - берем имя из бронирования
                if ($review->booking && $review->booking->client_name) {
                    $userName = $review->booking->client_name . ' (не авторизован)';
                } elseif ($review->order && $review->order->booking && $review->order->booking->client_name) {
                    $userName = $review->order->booking->client_name . ' (не авторизован)';
                } else {
                    $userName = 'Аноним (не авторизован)';
                }
            }
            
            $service = $review->service;
            
            // Определяем исполнителя (специалиста)
            $specialistName = null;
            if ($review->order && $review->order->booking && $review->order->booking->specialist) {
                $specialist = $review->order->booking->specialist;
                // specialist теперь это TeamMember, у которого есть только name
                $specialistName = $specialist->name ?? null;
            } elseif ($review->booking && $review->booking->specialist) {
                $specialist = $review->booking->specialist;
                // specialist теперь это TeamMember, у которого есть только name
                $specialistName = $specialist->name ?? null;
            }
            
            // Безопасное получение аватара пользователя
            // Для неавторизованных пользователей (user_id = null) аватар всегда null (будет использован стандартный)
            $userAvatar = null;
            if ($review->user_id && $review->user) {
                $userAvatar = $review->user->profile->avatar ?? null;
            }
            // Для неавторизованных пользователей аватар остается null (стандартный)
            
            return [
                'id' => (string) $review->id,
                'userName' => $userName,
                'userAvatar' => $userAvatar,
                'isAnonymous' => !$review->user_id,
                'rating' => (float) $review->rating,
                'comment' => $review->comment ?? '',
                'date' => $review->created_at->toISOString(),
                'response' => $review->response ?? null,
                'responseDate' => $review->response_at ? $review->response_at->toISOString() : null,
                'serviceName' => $service->name ?? null,
                'specialistName' => $specialistName,
                'isAnonymous' => !$review->user_id,
            ];
        });

        // Команда из таблицы team_members (основной источник)
        $team = \App\Models\TeamMember::where('company_id', $company->id)
            ->where('status', 'active')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(function ($member) {
                return [
                    'id' => (string) $member->id,
                    'name' => $member->name ?? 'Сотрудник',
                    'role' => $member->role ?? 'Сотрудник',
                    'avatar' => $member->img ? $this->normalizeAdvertisementImageUrl($member->img) : null,
                    'bio' => null, // TeamMember не имеет bio
                ];
            });

        // Портфолио (пока пустой массив, можно добавить отдельную таблицу)
        $portfolio = [];

        return response()->json([
            'service' => $serviceData,
            'servicesList' => $servicesList,
            'schedule' => $schedule,
            'reviews' => $reviewsFormatted,
            'team' => $team,
            'portfolio' => $portfolio,
        ]);
    }

    /**
     * Get company profile with all advertisements (public endpoint).
     */
    public function getCompanyProfile($slug)
    {
        $query = Company::where('slug', $slug);
        if (is_numeric($slug)) {
            $query->orWhere('id', $slug);
        }
        $company = $query->where('status', 'active')
            ->where('is_visible_on_marketplace', true)
            ->first();

        if (!$company) {
            return response()->json(['message' => 'Company not found'], 404);
        }

        // Получаем все активные объявления компании (обычные и рекламные)
        $advertisements = Advertisement::where('company_id', $company->id)
            ->whereIn('type', ['regular', 'advertisement'])
            ->where('is_active', true)
            ->where('status', 'approved')
            ->where(function($q) {
                // Для рекламных объявлений проверяем даты, для обычных - нет
                $q->where('type', 'regular')
                  ->orWhere(function($q2) {
                      $q2->where('type', 'advertisement')
                         ->where('start_date', '<=', now())
                         ->where('end_date', '>=', now())
                         ->whereNotNull('start_date')
                         ->whereNotNull('end_date');
                  });
            })
            ->orderBy('priority', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        // Форматируем объявления
        $formattedAdvertisements = $advertisements->map(function ($ad) use ($company) {
            // Формируем цену
            $priceLabel = 'Цена по запросу';
            $priceValue = 0;
            if ($ad->price_from && $ad->price_to) {
                $priceLabel = $ad->currency . ' ' . number_format($ad->price_from, 0) . ' - ' . number_format($ad->price_to, 0);
                $priceValue = (float) $ad->price_from;
            } elseif ($ad->price_from) {
                $priceLabel = $ad->currency . ' от ' . number_format($ad->price_from, 0);
                $priceValue = (float) $ad->price_from;
            }

            // Получаем категорию
            $categoryName = 'Услуга';
            if ($ad->category_slug) {
                $category = ServiceCategory::where('slug', $ad->category_slug)->first();
                if ($category) {
                    $categoryName = $category->name;
                }
            }

            // Формируем путь
            $path = $ad->link 
                ? (filter_var($ad->link, FILTER_VALIDATE_URL) || str_starts_with($ad->link, '/') 
                    ? $ad->link 
                    : '/marketplace/' . $ad->link)
                : '/marketplace/' . ($company->slug ?? $company->id);

            return [
                'id' => 'ad_' . (string) $ad->id,
                'advertisement_id' => (string) $ad->id,
                'name' => $ad->title,
                'description' => $ad->description ?? '',
                'category' => $categoryName,
                'imageUrl' => $this->normalizeAdvertisementImageUrl($ad->image ?? null) ?? '/img/others/placeholder.jpg',
                'path' => $path,
                'priceLabel' => $priceLabel,
                'priceValue' => $priceValue,
                'city' => $ad->city ?? $company->city ?? '',
                'state' => $ad->state ?? $company->state ?? '',
                'location' => trim(($ad->city ?? $company->city ?? '') . ((($ad->city ?? $company->city ?? '')) ? ', ' : '') . ($ad->state ?? $company->state ?? '')),
            ];
        });

        // Получаем общий рейтинг компании из всех отзывов
        $allReviews = Review::where('company_id', $company->id)
            ->where('is_visible', true)
            ->with(['user' => function($q) {
                $q->with('profile');
            }, 'service', 'booking'])
            ->orderBy('created_at', 'desc')
            ->get();
        
        $averageRating = $allReviews->count() > 0 
            ? round($allReviews->avg('rating'), 1) 
            : 0.0;

        // Форматируем отзывы для отображения
        $formattedReviews = $allReviews->map(function ($review) {
            $userName = 'Аноним';
            $userAvatar = null;
            
            if ($review->user_id) {
                $user = $review->user;
                if ($user) {
                    $profile = $user->profile ?? null;
                    $userName = $profile 
                        ? ($profile->first_name . ' ' . $profile->last_name)
                        : ($user->email ?? 'Аноним');
                    $userAvatar = $profile->avatar ?? null;
                }
            } else {
                // Незарегистрированный пользователь - берем имя из бронирования
                if ($review->booking && $review->booking->client_name) {
                    $userName = $review->booking->client_name . ' (не авторизован)';
                }
            }
            
            return [
                'id' => (string) $review->id,
                'userName' => $userName,
                'userAvatar' => $userAvatar,
                'rating' => (float) $review->rating,
                'comment' => $review->comment ?? '',
                'date' => $review->created_at->toISOString(),
                'response' => $review->response ?? null,
                'responseDate' => $review->response_at ? $review->response_at->toISOString() : null,
                'serviceName' => $review->service ? $review->service->name : null,
            ];
        });

        // Получаем услуги компании (если есть)
        $services = Service::where('company_id', $company->id)
            ->where('is_active', true)
            ->with('category')
            ->get()
            ->map(function ($s) {
                return [
                    'id' => (string) $s->id,
                    'name' => $s->name,
                    'description' => $s->description ?? '',
                    'price' => (float) $s->price,
                    'priceLabel' => '$' . number_format($s->price, 0),
                    'duration' => $s->duration_minutes ?? 60,
                    'category' => $s->category->name ?? 'Услуга',
                ];
            });

        // Нормализуем logo URL
        $logoUrl = null;
        if ($company->logo) {
            // Если это полный URL, используем метод нормализации
            if (filter_var($company->logo, FILTER_VALIDATE_URL)) {
                $logoUrl = $this->normalizeAdvertisementImageUrl($company->logo);
            } else {
                // Если это путь в storage, формируем полный URL
                $logoUrl = \Illuminate\Support\Facades\Storage::disk('public')->url($company->logo);
            }
        }

        return response()->json([
            'company' => [
                'id' => (string) $company->id,
                'name' => $company->name,
                'slug' => $company->slug ?? '',
                'description' => $company->description ?? '',
                'logo' => $logoUrl,
                'cover_image' => $company->cover_image ?? null,
                'city' => $company->city ?? '',
                'state' => $company->state ?? '',
                'timezone' => $company->timezone ?? 'America/Los_Angeles',
                'location' => trim(($company->city ?? '') . (($company->city && $company->state) ? ', ' : '') . ($company->state ?? '')),
                'phone' => $company->phone ?? null,
                'email' => $company->email ?? null,
                'telegram' => $company->telegram ?? null,
                'whatsapp' => $company->whatsapp ?? null,
                'website' => $company->website ?? null,
                'rating' => $averageRating,
                'reviewsCount' => $allReviews->count(),
                'advertisementsCount' => $advertisements->count(),
            ],
            'advertisements' => $formattedAdvertisements,
            'services' => $services,
            'reviews' => $formattedReviews,
        ]);
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
        
        // Если это уже полный URL, проверяем, не содержит ли он localhost или IP адреса
        if (str_starts_with($image, 'http://') || str_starts_with($image, 'https://')) {
            // Если URL содержит localhost, 127.0.0.1 или IP адрес (192.168.x.x), заменяем его на правильный базовый URL
            if (str_contains($image, 'localhost') || 
                str_contains($image, '127.0.0.1') || 
                preg_match('/192\.168\.\d+\.\d+/', $image)) {
                // Извлекаем путь из старого URL
                $parsedUrl = parse_url($image);
                $path = $parsedUrl['path'] ?? '';
                // Возвращаем новый URL с правильным базовым адресом (используем HTTPS)
                $baseUrl = rtrim(config('app.url'), '/');
                // Если baseUrl содержит http://, заменяем на https:// для продакшена
                if (str_starts_with($baseUrl, 'http://') && !str_contains($baseUrl, 'localhost') && !str_contains($baseUrl, '127.0.0.1')) {
                    $baseUrl = str_replace('http://', 'https://', $baseUrl);
                }
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


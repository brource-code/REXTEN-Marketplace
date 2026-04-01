<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use App\Models\Service;
use App\Models\Advertisement;
use App\Models\AdditionalService;
use App\Models\ServiceCategory;
use App\Models\TeamMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    /**
     * Генерирует slug из строки
     */
    private function generateSlug($text)
    {
        if (empty($text) || !is_string($text)) {
            return '';
        }
        
        // Транслитерация кириллицы в латиницу
        $translit = [
            'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd',
            'е' => 'e', 'ё' => 'yo', 'ж' => 'zh', 'з' => 'z', 'и' => 'i',
            'й' => 'y', 'к' => 'k', 'л' => 'l', 'м' => 'm', 'н' => 'n',
            'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't',
            'у' => 'u', 'ф' => 'f', 'х' => 'h', 'ц' => 'ts', 'ч' => 'ch',
            'ш' => 'sh', 'щ' => 'sch', 'ъ' => '', 'ы' => 'y', 'ь' => '',
            'э' => 'e', 'ю' => 'yu', 'я' => 'ya',
            'А' => 'A', 'Б' => 'B', 'В' => 'V', 'Г' => 'G', 'Д' => 'D',
            'Е' => 'E', 'Ё' => 'Yo', 'Ж' => 'Zh', 'З' => 'Z', 'И' => 'I',
            'Й' => 'Y', 'К' => 'K', 'Л' => 'L', 'М' => 'M', 'Н' => 'N',
            'О' => 'O', 'П' => 'P', 'Р' => 'R', 'С' => 'S', 'Т' => 'T',
            'У' => 'U', 'Ф' => 'F', 'Х' => 'H', 'Ц' => 'Ts', 'Ч' => 'Ch',
            'Ш' => 'Sh', 'Щ' => 'Sch', 'Ъ' => '', 'Ы' => 'Y', 'Ь' => '',
            'Э' => 'E', 'Ю' => 'Yu', 'Я' => 'Ya',
        ];
        
        $text = strtr($text, $translit);
        
        // Преобразуем в нижний регистр
        $text = mb_strtolower($text, 'UTF-8');
        
        // Удаляем спецсимволы, оставляем только буквы, цифры, пробелы и дефисы
        $text = preg_replace('/[^\w\s-]/u', '', $text);
        
        // Заменяем пробелы и подчеркивания на дефисы
        $text = preg_replace('/[\s_-]+/', '-', $text);
        
        // Удаляем дефисы в начале и конце
        $text = trim($text, '-');
        
        // Добавляем случайные 2 цифры в конце для уникальности
        $randomDigits = str_pad(rand(10, 99), 2, '0', STR_PAD_LEFT);
        $text = $text . '-' . $randomDigits;
        
        return $text;
    }
    
    /**
     * Нормализует link (извлекает slug из полного URL или пути)
     */
    private function normalizeLink($link, $title, $excludeId = null)
    {
        // Если title пустой, возвращаем пустую строку
        if (empty($title) || !is_string($title)) {
            return '';
        }
        
        // Если link пустой или содержит полный URL, генерируем slug из title
        if (empty($link) || filter_var($link, FILTER_VALIDATE_URL)) {
            $slug = $this->generateSlug($title);
            
            // Если slug пустой, возвращаем пустую строку
            if (empty($slug)) {
                return '';
            }
            
            // Проверяем уникальность slug (если совпадает, генерируем новый с другими случайными цифрами)
            $baseSlug = $slug;
            $maxAttempts = 10; // Максимум 10 попыток
            $attempt = 0;
            $query = Advertisement::where('link', $baseSlug);
            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            }
            while ($query->exists() && $attempt < $maxAttempts) {
                // Генерируем новый slug с другими случайными цифрами
                $slugWithoutDigits = preg_replace('/-\d{2}$/', '', $slug); // Убираем последние 2 цифры
                $baseSlug = $slugWithoutDigits . '-' . str_pad(rand(10, 99), 2, '0', STR_PAD_LEFT);
                $attempt++;
                $query = Advertisement::where('link', $baseSlug);
                if ($excludeId) {
                    $query->where('id', '!=', $excludeId);
                }
            }
            // Если все попытки исчерпаны, добавляем счетчик как fallback
            if ($attempt >= $maxAttempts && $query->exists()) {
                $counter = 1;
                $baseSlug = $slug . '-' . $counter;
                $query = Advertisement::where('link', $baseSlug);
                if ($excludeId) {
                    $query->where('id', '!=', $excludeId);
                }
                while ($query->exists()) {
                    $baseSlug = $slug . '-' . $counter;
                    $counter++;
                    $query = Advertisement::where('link', $baseSlug);
                    if ($excludeId) {
                        $query->where('id', '!=', $excludeId);
                    }
                }
            }
            
            return $baseSlug;
        }
        
        // Если link указан как путь (/marketplace/slug), извлекаем только slug
        $link = preg_replace('#^/marketplace/#', '', $link);
        $link = preg_replace('#^https?://[^/]+/marketplace/#', '', $link);
        $link = trim($link, '/');
        
            // Если после очистки link пустой, генерируем из title
            if (empty($link)) {
                $slug = $this->generateSlug($title);
                // Проверяем уникальность slug (если совпадает, генерируем новый с другими случайными цифрами)
                $baseSlug = $slug;
                $maxAttempts = 10; // Максимум 10 попыток
                $attempt = 0;
                $query = Advertisement::where('link', $baseSlug);
                if ($excludeId) {
                    $query->where('id', '!=', $excludeId);
                }
                while ($query->exists() && $attempt < $maxAttempts) {
                    // Генерируем новый slug с другими случайными цифрами
                    $slugWithoutDigits = preg_replace('/-\d{2}$/', '', $slug); // Убираем последние 2 цифры
                    $baseSlug = $slugWithoutDigits . '-' . str_pad(rand(10, 99), 2, '0', STR_PAD_LEFT);
                    $attempt++;
                    $query = Advertisement::where('link', $baseSlug);
                    if ($excludeId) {
                        $query->where('id', '!=', $excludeId);
                    }
                }
                // Если все попытки исчерпаны, добавляем счетчик как fallback
                if ($attempt >= $maxAttempts && $query->exists()) {
                    $counter = 1;
                    $baseSlug = $slug . '-' . $counter;
                    $query = Advertisement::where('link', $baseSlug);
                    if ($excludeId) {
                        $query->where('id', '!=', $excludeId);
                    }
                    while ($query->exists()) {
                        $baseSlug = $slug . '-' . $counter;
                        $counter++;
                        $query = Advertisement::where('link', $baseSlug);
                        if ($excludeId) {
                            $query->where('id', '!=', $excludeId);
                        }
                    }
                }
                return $baseSlug;
            }
        
        return $link;
    }
    
    /**
     * Get business profile.
     * Берем данные только из таблицы companies.
     */
    public function getProfile(Request $request)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }

            $company = Company::find($companyId);

            if (!$company) {
                return response()->json([
                    'message' => 'Company not found',
                ], 404);
            }

            // Берем данные только из компании
            return response()->json([
                'data' => [
                    'name' => $company->name ?? '',
                    'description' => $company->description ?? '',
                    'address' => $company->address ?? '',
                    'phone' => $company->phone ?? '',
                    'email' => $company->email ?? '',
                    'website' => $company->website ?? '',
                    'slug' => $company->slug ?? null,
                    'city' => $company->city ?? null,
                    'state' => $company->state ?? null,
                    'onboarding_completed' => (bool) ($company->onboarding_completed ?? false),
                    'onboarding_completed_at' => $company->onboarding_completed_at ? $company->onboarding_completed_at->toISOString() : null,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error fetching business profile',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update business profile.
     * Сохраняем только в таблицу companies.
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $companyId = $request->get('current_company_id');
        
        // Если company_id не передан, пытаемся найти компанию пользователя
        if (!$companyId && $user && $user->isBusinessOwner()) {
            $company = $user->ownedCompanies()->first();
            $companyId = $company ? $company->id : null;
        }
        
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'address' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:255',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Если компании нет, создаем её
        if (!$companyId) {
            if (!$user || !$user->isBusinessOwner()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 403);
            }
            
            // Создаем новую компанию с данными из запроса
            $companyData = [
                'owner_id' => $user->id,
                'name' => $request->input('name', ''),
                'description' => $request->input('description'),
                'address' => $request->input('address'),
                'phone' => $request->input('phone'),
                'email' => $request->input('email'),
                'website' => $request->input('website'),
                'city' => $request->input('city'),
                'state' => $request->input('state'),
            ];
            
            // Генерируем slug из названия
            if (!empty($companyData['name'])) {
                $companyData['slug'] = $this->generateSlug($companyData['name']);
            }
            
            // Автоматически активируем компанию при создании
            $companyData['status'] = 'active';
            
            $company = Company::create($companyData);
        } else {
            // Обновляем существующую компанию
            $company = Company::findOrFail($companyId);
            
            $updateData = $request->only([
                'name', 'description', 'address', 'phone', 'email', 'website', 'city', 'state'
            ]);
            
            // Обновляем slug, если изменилось название
            if (isset($updateData['name']) && $updateData['name'] !== $company->name) {
                $updateData['slug'] = $this->generateSlug($updateData['name']);
            }
            
            $company->update($updateData);
        }

        return response()->json([
            'data' => [
                'name' => $company->name ?? '',
                'description' => $company->description ?? '',
                'address' => $company->address ?? '',
                'phone' => $company->phone ?? '',
                'email' => $company->email ?? '',
                'website' => $company->website ?? '',
                'slug' => $company->slug ?? null,
                'city' => $company->city ?? null,
                'state' => $company->state ?? null,
            ]
        ]);
    }

    /**
     * Get business services.
     * Берем услуги из таблицы services, включая услуги из объявлений компании.
     */
    public function getServices(Request $request)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'data' => []
            ]);
        }

        $allServices = collect();

        // 1. Берем услуги напрямую связанные с компанией из таблицы services
        $dbServices = Service::where('company_id', $companyId)
            ->with('category')
            ->orderBy('sort_order')
            ->get()
            ->map(function($service) {
                return [
                    'id' => $service->id,
                    'name' => $service->name,
                    'category' => $service->category->name ?? '',
                    'duration' => $service->duration_minutes ?? 60,
                    'duration_unit' => $service->duration_unit ?? 'hours',
                    'price' => $service->price ?? 0,
                    'status' => 'active',
                ];
            });

        $allServices = $allServices->concat($dbServices);

        // 2. Берем услуги из объявлений компании (из JSON поля services)
        $advertisements = Advertisement::where('company_id', $companyId)
            ->whereIn('type', ['regular', 'marketplace'])
            ->where('is_active', true)
            ->get();

        foreach ($advertisements as $advertisement) {
            $services = is_array($advertisement->services) 
                ? $advertisement->services 
                : (json_decode($advertisement->services, true) ?? []);

            foreach ($services as $service) {
                // Пропускаем услуги, которые уже есть в таблице services
                if (isset($service['id']) && $dbServices->contains('id', $service['id'])) {
                    continue;
                }

                $allServices->push([
                    'id' => $service['id'] ?? null,
                    'name' => $service['name'] ?? '',
                    'category' => $service['category'] ?? '',
                    'duration' => $service['duration'] ?? $service['duration_minutes'] ?? 60,
                    'duration_unit' => $service['duration_unit'] ?? 'hours',
                    'price' => $service['price'] ?? 0,
                    'status' => ($service['is_active'] ?? true) ? 'active' : 'inactive',
                ]);
            }
        }

        return response()->json([
            'data' => $allServices->values()->all()
        ]);
    }

    /**
     * Create service.
     * Сохраняем и в таблицу services, и в объявление типа 'regular'.
     */
    public function createService(Request $request)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'duration_minutes' => 'required|integer|min:1',
            'category_id' => 'nullable|exists:service_categories,id',
            'category' => 'nullable|string|max:255', // Для совместимости с фронтендом
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Создаем услугу в таблице services
        $service = Service::create([
            'company_id' => $companyId,
            'name' => $request->name,
            'description' => $request->description,
            'price' => $request->price,
            'duration_minutes' => $request->duration_minutes ?? $request->duration,
            'duration_unit' => $request->duration_unit ?? 'hours',
            'category_id' => $request->category_id,
        ]);

        // Ищем или создаем объявление типа 'regular'
        $advertisement = Advertisement::where('company_id', $companyId)
            ->where('type', 'regular')
            ->first();

        if (!$advertisement) {
            $company = Company::findOrFail($companyId);
            $advertisement = Advertisement::create([
                'company_id' => $companyId,
                'type' => 'regular',
                'title' => $company->name,
                'description' => $company->description,
                'link' => $company->slug ?? strtolower(str_replace(' ', '-', $company->name)),
                'is_active' => true,
                'status' => 'pending',
                'services' => [],
            ]);
        }

        // Получаем текущие услуги из объявления
        $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
        
        // Добавляем новую услугу
        $newService = [
            'id' => $service->id,
            'name' => $service->name,
            'category' => $request->category ?? '',
            'duration' => $service->duration_minutes ?? 60,
            'price' => $service->price,
            'status' => 'active',
        ];
        
        $services[] = $newService;
        
        // Обновляем объявление
        $advertisement->update([
            'services' => $services,
        ]);

        return response()->json([
            'data' => [
                'id' => $service->id,
                'name' => $service->name,
                'category' => $request->category ?? '',
                'duration' => $service->duration_minutes ?? 60,
                'price' => $service->price,
                'status' => 'active',
            ]
        ], 201);
    }

    /**
     * Update service.
     * Обновляем и в таблице services, и в объявлении типа 'regular'.
     */
    public function updateService(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }
        
        // Ищем услугу, проверяя принадлежность к компании
        // Услуга может быть привязана напрямую через company_id или через объявление
        $service = Service::where(function($query) use ($companyId) {
            $query->where('company_id', $companyId)
                  ->orWhereHas('advertisement', function($q) use ($companyId) {
                      $q->where('company_id', $companyId);
                  });
        })->findOrFail($id);
        
        // Дополнительная проверка: если услуга привязана к объявлению, проверяем что объявление принадлежит компании
        if ($service->advertisement_id) {
            $advertisement = Advertisement::where('id', $service->advertisement_id)
                ->where('company_id', $companyId)
                ->first();
            
            if (!$advertisement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service does not belong to your company',
                ], 403);
            }
        } else {
            // Если услуга не привязана к объявлению, проверяем напрямую company_id
            if ($service->company_id != $companyId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service does not belong to your company',
                ], 403);
            }
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|numeric|min:0',
            'duration_minutes' => 'sometimes|integer|min:1',
            'duration' => 'sometimes|integer|min:1', // Для совместимости
            'category_id' => 'nullable|exists:service_categories,id',
            'category' => 'nullable|string|max:255', // Для совместимости
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Обновляем услугу в таблице
        $updateData = $request->only(['name', 'description', 'price', 'duration_minutes', 'category_id']);
        if ($request->has('duration') && !$request->has('duration_minutes')) {
            $updateData['duration_minutes'] = $request->duration;
        }
        $service->update($updateData);

        // Обновляем услугу в объявлении
        $advertisement = Advertisement::where('company_id', $companyId)
            ->where('type', 'regular')
            ->first();

        if ($advertisement) {
            $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
            
            // Находим и обновляем услугу
            $serviceIndex = array_search($id, array_column($services, 'id'));
            if ($serviceIndex !== false) {
                $services[$serviceIndex] = array_merge($services[$serviceIndex], [
                    'name' => $service->name,
                    'category' => $request->category ?? $services[$serviceIndex]['category'] ?? '',
                    'duration' => $service->duration_minutes ?? 60,
                    'price' => $service->price,
                ]);
                
                $advertisement->update([
                    'services' => $services,
                ]);
            }
        }

        return response()->json([
            'data' => [
                'id' => $service->id,
                'name' => $service->name,
                'category' => $request->category ?? '',
                'duration' => $service->duration_minutes ?? 60,
                'price' => $service->price,
                'status' => 'active',
            ]
        ]);
    }

    /**
     * Delete service.
     * Удаляем услугу из таблицы services.
     */
    public function deleteService(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }
        
        // Ищем услугу, проверяя принадлежность к компании
        // Услуга может быть привязана напрямую через company_id или через объявление
        $service = Service::where(function($query) use ($companyId) {
            $query->where('company_id', $companyId)
                  ->orWhereHas('advertisement', function($q) use ($companyId) {
                      $q->where('company_id', $companyId);
                  });
        })->findOrFail($id);
        
        // Дополнительная проверка: если услуга привязана к объявлению, проверяем что объявление принадлежит компании
        if ($service->advertisement_id) {
            $advertisement = Advertisement::where('id', $service->advertisement_id)
                ->where('company_id', $companyId)
                ->first();
            
            if (!$advertisement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service does not belong to your company',
                ], 403);
            }
        } else {
            // Если услуга не привязана к объявлению, проверяем напрямую company_id
            if ($service->company_id != $companyId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service does not belong to your company',
                ], 403);
            }
        }
        
        $service->delete();

        return response()->json([
            'message' => 'Service deleted',
        ]);
    }

    /**
     * Get schedule settings.
     * Если есть объявление типа 'regular', берем расписание из него, иначе дефолтные значения.
     */
    public function getScheduleSettings(Request $request)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'data' => [
                    'monday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00'],
                    'tuesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00'],
                    'wednesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00'],
                    'thursday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00'],
                    'friday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00'],
                    'saturday' => ['enabled' => false, 'from' => '10:00', 'to' => '16:00'],
                    'sunday' => ['enabled' => false, 'from' => '10:00', 'to' => '16:00'],
                    'breakEnabled' => true,
                    'breakFrom' => '13:00',
                    'breakTo' => '14:00',
                    'blockPastSlots' => true,
                    'minBookingHours' => 2,
                    'maxBookingDays' => 30,
                ]
            ]);
        }
        
        $company = Company::findOrFail($companyId);

        // Ищем объявление типа 'regular'
        $advertisement = Advertisement::where('company_id', $companyId)
            ->where('type', 'regular')
            ->first();

        // Дефолтные настройки
        $defaultSettings = [
            'monday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00'],
            'tuesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00'],
            'wednesday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00'],
            'thursday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00'],
            'friday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00'],
            'saturday' => ['enabled' => false, 'from' => '10:00', 'to' => '16:00'],
            'sunday' => ['enabled' => false, 'from' => '10:00', 'to' => '16:00'],
            'breakEnabled' => true,
            'breakFrom' => '13:00',
            'breakTo' => '14:00',
            'blockPastSlots' => true,
            'minBookingHours' => 2,
            'maxBookingDays' => 30,
        ];

        // Если есть объявление с расписанием, берем его
        if ($advertisement && $advertisement->schedule) {
            $adSchedule = is_array($advertisement->schedule) ? $advertisement->schedule : json_decode($advertisement->schedule, true);
            if (!empty($adSchedule)) {
                // Преобразуем формат расписания из объявления в формат настроек
                $settings = array_merge($defaultSettings, [
                    'monday' => $adSchedule['monday'] ?? $defaultSettings['monday'],
                    'tuesday' => $adSchedule['tuesday'] ?? $defaultSettings['tuesday'],
                    'wednesday' => $adSchedule['wednesday'] ?? $defaultSettings['wednesday'],
                    'thursday' => $adSchedule['thursday'] ?? $defaultSettings['thursday'],
                    'friday' => $adSchedule['friday'] ?? $defaultSettings['friday'],
                    'saturday' => $adSchedule['saturday'] ?? $defaultSettings['saturday'],
                    'sunday' => $adSchedule['sunday'] ?? $defaultSettings['sunday'],
                ]);
                
                return response()->json([
                    'data' => $settings
                ]);
            }
        }

        return response()->json([
            'data' => $defaultSettings
        ]);
    }

    /**
     * Update schedule settings.
     * Сохраняем расписание в объявление типа 'regular'.
     */
    public function updateScheduleSettings(Request $request)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }
        
        $company = Company::findOrFail($companyId);

        $validator = Validator::make($request->all(), [
            'monday' => 'sometimes|array',
            'monday.enabled' => 'sometimes|boolean',
            'monday.from' => 'sometimes|string|regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/',
            'monday.to' => 'sometimes|string|regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/',
            'tuesday' => 'sometimes|array',
            'tuesday.enabled' => 'sometimes|boolean',
            'tuesday.from' => 'sometimes|string|regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/',
            'tuesday.to' => 'sometimes|string|regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/',
            'wednesday' => 'sometimes|array',
            'wednesday.enabled' => 'sometimes|boolean',
            'wednesday.from' => 'sometimes|string|regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/',
            'wednesday.to' => 'sometimes|string|regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/',
            'thursday' => 'sometimes|array',
            'thursday.enabled' => 'sometimes|boolean',
            'thursday.from' => 'sometimes|string|regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/',
            'thursday.to' => 'sometimes|string|regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/',
            'friday' => 'sometimes|array',
            'friday.enabled' => 'sometimes|boolean',
            'friday.from' => 'sometimes|string|regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/',
            'friday.to' => 'sometimes|string|regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/',
            'saturday' => 'sometimes|array',
            'saturday.enabled' => 'sometimes|boolean',
            'saturday.from' => 'sometimes|string|regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/',
            'saturday.to' => 'sometimes|string|regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/',
            'sunday' => 'sometimes|array',
            'sunday.enabled' => 'sometimes|boolean',
            'sunday.from' => 'sometimes|string|regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/',
            'sunday.to' => 'sometimes|string|regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Ищем или создаем объявление типа 'regular'
        $advertisement = Advertisement::where('company_id', $companyId)
            ->where('type', 'regular')
            ->first();

        // Формируем расписание для сохранения
        $schedule = [
            'monday' => $request->input('monday', ['enabled' => true, 'from' => '09:00', 'to' => '18:00']),
            'tuesday' => $request->input('tuesday', ['enabled' => true, 'from' => '09:00', 'to' => '18:00']),
            'wednesday' => $request->input('wednesday', ['enabled' => true, 'from' => '09:00', 'to' => '18:00']),
            'thursday' => $request->input('thursday', ['enabled' => true, 'from' => '09:00', 'to' => '18:00']),
            'friday' => $request->input('friday', ['enabled' => true, 'from' => '09:00', 'to' => '18:00']),
            'saturday' => $request->input('saturday', ['enabled' => false, 'from' => '10:00', 'to' => '16:00']),
            'sunday' => $request->input('sunday', ['enabled' => false, 'from' => '10:00', 'to' => '16:00']),
        ];

        if ($advertisement) {
            // Обновляем расписание в объявлении
            $advertisement->update([
                'schedule' => $schedule,
            ]);
        } else {
            // Создаем новое объявление с расписанием
            $advertisement = Advertisement::create([
                'company_id' => $companyId,
                'type' => 'regular',
                'title' => $company->name,
                'description' => $company->description,
                'link' => $company->slug ?? strtolower(str_replace(' ', '-', $company->name)),
                'schedule' => $schedule,
                'is_active' => true,
                'status' => 'pending',
            ]);
        }

        return response()->json([
            'data' => $request->all()
        ]);
    }

    /**
     * Get team members.
     * Получаем команду из таблицы team_members и из объявлений.
     */
    public function getTeam(Request $request)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'data' => []
            ]);
        }
        
        // Получаем команду из таблицы team_members
        $teamMembersFromDb = TeamMember::where('company_id', $companyId)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
        
        // Создаем массив для хранения всех участников команды
        $teamMembersMap = [];
        
        // Добавляем участников из team_members
        foreach ($teamMembersFromDb as $member) {
            $teamMembersMap[$member->id] = [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email ?? '',
                'phone' => $member->phone ?? '',
                'role' => $member->role ?? '',
                'status' => $member->status ?? 'active',
                'img' => $member->img ?? null,
            ];
        }
        
        // Получаем команду из объявлений
        $advertisements = Advertisement::where('company_id', $companyId)
            ->where('type', 'regular')
            ->whereNotNull('team')
            ->get();
        
        // Извлекаем команду из объявлений
        foreach ($advertisements as $advertisement) {
            $adTeam = is_array($advertisement->team) 
                ? $advertisement->team 
                : (json_decode($advertisement->team, true) ?? []);
            
            if (is_array($adTeam) && !empty($adTeam)) {
                foreach ($adTeam as $member) {
                    if (is_array($member)) {
                        $memberId = $member['id'] ?? null;
                        
                        // Если участник уже есть в team_members, пропускаем (используем данные из БД)
                        if ($memberId && isset($teamMembersMap[$memberId])) {
                            continue;
                        }
                        
                        // Если участник есть в объявлении, но нет в team_members, добавляем его
                        // Используем временный ID, если нет реального ID
                        $tempId = $memberId ?: ('temp_' . md5($member['name'] ?? ''));
                        
                        if (!isset($teamMembersMap[$tempId])) {
                            $teamMembersMap[$tempId] = [
                                'id' => $memberId ?: null,
                                'name' => $member['name'] ?? 'Сотрудник',
                                'email' => $member['email'] ?? $member['description'] ?? '',
                                'phone' => $member['phone'] ?? '',
                                'role' => $member['role'] ?? $member['position'] ?? '',
                                'status' => 'active',
                                'img' => $member['img'] ?? $member['avatar'] ?? null,
                            ];
                        }
                    }
                }
            }
        }
        
        // Преобразуем в массив и сортируем
        $teamMembers = array_values($teamMembersMap);
        usort($teamMembers, function($a, $b) {
            // Сначала участники с реальными ID (из team_members), потом временные
            if (isset($a['id']) && is_numeric($a['id']) && (!isset($b['id']) || !is_numeric($b['id']))) {
                return -1;
            }
            if (isset($b['id']) && is_numeric($b['id']) && (!isset($a['id']) || !is_numeric($a['id']))) {
                return 1;
            }
            // Сортируем по имени
            return strcmp($a['name'] ?? '', $b['name'] ?? '');
        });

        return response()->json([
            'data' => $teamMembers
        ]);
    }

    /**
     * Create team member.
     * Сохраняем в объявление типа 'regular'.
     */
    public function createTeamMember(Request $request)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }
        
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'role' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Создаем нового члена команды в таблице team_members
        $maxSortOrder = TeamMember::where('company_id', $companyId)->max('sort_order') ?? 0;
        $teamMember = TeamMember::create([
            'company_id' => $companyId,
            'name' => $request->name,
            'email' => $request->email ?? null,
            'phone' => $request->phone ?? null,
            'role' => $request->role ?? null,
            'status' => $request->status ?? 'active',
            'img' => $request->img ?? null,
            'sort_order' => $maxSortOrder + 1,
        ]);

        return response()->json([
            'data' => [
                'id' => $teamMember->id,
                'name' => $teamMember->name,
                'email' => $teamMember->email ?? '',
                'phone' => $teamMember->phone ?? '',
                'role' => $teamMember->role ?? '',
                'status' => $teamMember->status,
                'img' => $teamMember->img ?? null,
            ]
        ], 201);
    }

    /**
     * Update team member.
     */
    public function updateTeamMember(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }
        
        // Находим члена команды в таблице team_members
        $teamMember = TeamMember::where('id', $id)
            ->where('company_id', $companyId)
            ->first();
        
        if (!$teamMember) {
            return response()->json([
                'success' => false,
                'message' => 'Team member not found',
            ], 404);
        }
        
        // Обновляем данные
        $teamMember->update([
            'name' => $request->name ?? $teamMember->name,
            'email' => $request->email ?? $teamMember->email,
            'phone' => $request->phone ?? $teamMember->phone,
            'role' => $request->role ?? $teamMember->role,
            'status' => $request->status ?? $teamMember->status,
            'img' => $request->img ?? $teamMember->img,
        ]);

        return response()->json([
            'data' => [
                'id' => $teamMember->id,
                'name' => $teamMember->name,
                'email' => $teamMember->email ?? '',
                'phone' => $teamMember->phone ?? '',
                'role' => $teamMember->role ?? '',
                'status' => $teamMember->status,
                'img' => $teamMember->img ?? null,
            ]
        ]);
    }

    /**
     * Delete team member.
     */
    public function deleteTeamMember(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }
        
        // Находим и удаляем члена команды из таблицы team_members
        $teamMember = TeamMember::where('id', $id)
            ->where('company_id', $companyId)
            ->first();
        
        if (!$teamMember) {
            return response()->json([
                'success' => false,
                'message' => 'Team member not found',
            ], 404);
        }
        
        $teamMember->delete();

        return response()->json([
            'success' => true,
            'message' => 'Team member deleted',
        ]);
    }

    /**
     * Get portfolio items.
     * Если есть объявление типа 'regular', берем портфолио из него.
     */
    public function getPortfolio(Request $request)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'data' => []
            ]);
        }
        
        // Ищем объявление типа 'regular'
        $advertisement = Advertisement::where('company_id', $companyId)
            ->where('type', 'regular')
            ->first();

        // Если есть объявление с портфолио, возвращаем его
        if ($advertisement && $advertisement->portfolio) {
            $adPortfolio = is_array($advertisement->portfolio) ? $advertisement->portfolio : json_decode($advertisement->portfolio, true);
            if (!empty($adPortfolio)) {
                // Преобразуем формат для совместимости
                $formattedPortfolio = array_map(function($item, $index) {
                    return [
                        'id' => $item['id'] ?? $index + 1,
                        'title' => $item['title'] ?? '',
                        'category' => $item['category'] ?? '',
                        'image' => $item['image'] ?? $item['img'] ?? '',
                    ];
                }, $adPortfolio, array_keys($adPortfolio));
                
                return response()->json([
                    'data' => $formattedPortfolio
                ]);
            }
        }

        return response()->json([
            'data' => []
        ]);
    }

    /**
     * Create portfolio item.
     * Сохраняем в объявление типа 'regular'.
     */
    public function createPortfolioItem(Request $request)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }
        
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'category' => 'nullable|string|max:255',
            'image' => 'required|image|max:5120', // 5MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Сохраняем изображение
        $imagePath = $request->file('image')->store('portfolio', 'public');
        $imageUrl = Storage::disk('public')->url($imagePath);

        // Ищем или создаем объявление типа 'regular'
        $advertisement = Advertisement::where('company_id', $companyId)
            ->where('type', 'regular')
            ->first();

        if (!$advertisement) {
            $company = Company::findOrFail($companyId);
            $advertisement = Advertisement::create([
                'company_id' => $companyId,
                'type' => 'regular',
                'title' => $company->name,
                'description' => $company->description,
                'link' => $company->slug ?? strtolower(str_replace(' ', '-', $company->name)),
                'is_active' => true,
                'status' => 'pending',
                'portfolio' => [],
            ]);
        }

        // Получаем текущее портфолио
        $portfolio = is_array($advertisement->portfolio) ? $advertisement->portfolio : (json_decode($advertisement->portfolio, true) ?? []);
        
        // Добавляем новый элемент портфолио
        $newItem = [
            'id' => count($portfolio) + 1,
            'title' => $request->title,
            'category' => $request->category ?? '',
            'image' => $imageUrl,
        ];
        
        $portfolio[] = $newItem;
        
        // Обновляем объявление
        $advertisement->update([
            'portfolio' => $portfolio,
        ]);

        return response()->json([
            'data' => $newItem
        ], 201);
    }

    /**
     * Delete portfolio item.
     */
    public function deletePortfolioItem(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }
        
        // Ищем объявление с командой (приоритет: regular, затем marketplace, затем любое)
        $advertisement = Advertisement::where('company_id', $companyId)
            ->where(function($query) {
                $query->where('type', 'regular')
                      ->orWhere('type', 'marketplace')
                      ->orWhereNull('type');
            })
            ->orderByRaw("CASE WHEN type = 'regular' THEN 1 WHEN type = 'marketplace' THEN 2 ELSE 3 END")
            ->first();
        
        if (!$advertisement) {
            return response()->json([
                'success' => false,
                'message' => 'Advertisement not found',
            ], 404);
        }

        $portfolio = is_array($advertisement->portfolio) ? $advertisement->portfolio : (json_decode($advertisement->portfolio, true) ?? []);
        
        // Удаляем элемент портфолио
        $portfolio = array_filter($portfolio, function($item) use ($id) {
            return ($item['id'] ?? null) != $id;
        });
        
        $advertisement->update([
            'portfolio' => array_values($portfolio),
        ]);

        return response()->json([
            'message' => 'Portfolio item deleted',
        ]);
    }

    /**
     * Get all advertisements for the business.
     */
    public function getAdvertisements(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 401);
            }
            
            // Получаем company_id из request (устанавливается в TenantMiddleware)
            // или из первой компании владельца
            $companyId = $request->input('current_company_id');
            
            if (!$companyId && $user->isBusinessOwner()) {
                $company = $user->ownedCompanies()->first();
                $companyId = $company ? $company->id : null;
            }

            if (!$companyId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }

            $query = Advertisement::where('company_id', $companyId);
        
        // Пагинация
        $page = (int) $request->get('page', 1);
        $pageSize = (int) $request->get('pageSize', 10);
        
        $total = $query->count();
        
        $advertisements = $query->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $pageSize)
            ->take($pageSize)
            ->get()
            ->map(function ($ad) {
                // ВАЖНО: Для всех объявлений (включая рекламные) загружаем услуги из таблицы services
                // Рекламные объявления - это те же обычные, но с дополнительным функционалом
                $servicesData = [];
                
                // Проверяем, есть ли услуги в таблице services
                $dbServices = Service::with('category')
                    ->where('advertisement_id', $ad->id)
                    ->orderBy('sort_order')
                    ->orderBy('name')
                    ->get();
                
                if ($dbServices->count() > 0) {
                    // Загружаем услуги из таблицы services
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
                            'duration_unit' => $service->duration_unit ?? 'hours',
                            'category' => optional($service->category)->name ?? '',
                            'additional_services' => $additionalServices,
                        ];
                    })->toArray();
                } else {
                    // Если нет услуг в БД, используем JSON поле (обратная совместимость)
                    // Но это должно быть временно - услуги должны быть в БД
                    $servicesData = $ad->services ?? [];
                }
                
                return [
                    'id' => $ad->id,
                    'title' => $ad->title,
                    'description' => $ad->description,
                    'type' => $ad->type ?? 'regular', // 'advertisement' или 'regular'
                    'status' => $ad->status ?? 'pending',
                    'is_active' => $ad->is_active ?? true,
                    'image' => $ad->image,
                    'placement' => $ad->placement ?? 'services',
                    'start_date' => $ad->start_date ? ($ad->start_date instanceof \Carbon\Carbon ? $ad->start_date->toIso8601String() : $ad->start_date) : null,
                    'end_date' => $ad->end_date ? ($ad->end_date instanceof \Carbon\Carbon ? $ad->end_date->toIso8601String() : $ad->end_date) : null,
                    'impressions' => $ad->impressions ?? 0,
                    'clicks' => $ad->clicks ?? 0,
                    'created_at' => $ad->created_at ? ($ad->created_at instanceof \Carbon\Carbon ? $ad->created_at->toIso8601String() : $ad->created_at) : null,
                    'updated_at' => $ad->updated_at ? ($ad->updated_at instanceof \Carbon\Carbon ? $ad->updated_at->toIso8601String() : $ad->updated_at) : null,
                    // Дополнительные данные
                    'services' => $servicesData, // Теперь загружаем из таблицы services для marketplace объявлений
                    'team' => $ad->team,
                    'portfolio' => $ad->portfolio,
                    'schedule' => $ad->schedule,
                    'price_from' => $ad->price_from,
                    'price_to' => $ad->price_to,
                    'currency' => $ad->currency ?? 'USD',
                    'city' => $ad->city,
                    'state' => $ad->state,
                    'link' => $ad->link,
                ];
            });

            return response()->json([
                'data' => $advertisements,
                'total' => $total,
                'page' => $page,
                'pageSize' => $pageSize,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getAdvertisements', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error loading advertisements: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single advertisement by ID.
     */
    public function getAdvertisement(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }
        
        // Получаем company_id из request (устанавливается в TenantMiddleware)
        // или из первой компании владельца
        $companyId = $request->input('current_company_id');
        
        if (!$companyId && $user->isBusinessOwner()) {
            $company = $user->ownedCompanies()->first();
            $companyId = $company ? $company->id : null;
        }

        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $advertisement = Advertisement::where('id', $id)
            ->where('company_id', $companyId)
            ->first();

        if (!$advertisement) {
            return response()->json([
                'success' => false,
                'message' => 'Advertisement not found',
            ], 404);
        }

        // ВАЖНО: Для всех объявлений (включая рекламные) загружаем услуги из таблицы services
        // Рекламные объявления - это те же обычные, но с дополнительным функционалом
        $servicesData = [];
        
        // Проверяем, есть ли услуги в таблице services
        $dbServices = Service::where('advertisement_id', $advertisement->id)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
        
        if ($dbServices->count() > 0) {
            // Загружаем услуги из таблицы services
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
                    'duration_unit' => $service->duration_unit ?? 'hours',
                    'category' => $service->category->name ?? '',
                    'additional_services' => $additionalServices,
                ];
                    })->toArray();
        } else {
            // Если нет услуг в БД, используем JSON поле (обратная совместимость)
            // Но это должно быть временно - услуги должны быть в БД
            $servicesData = $advertisement->services ?? [];
        }

        // Преобразуем category_slug в category_id для фронтенда
        $categoryId = null;
        if ($advertisement->category_slug) {
            $category = ServiceCategory::where('slug', $advertisement->category_slug)->first();
            if ($category) {
                $categoryId = $category->id;
            }
        }

        return response()->json([
            'id' => $advertisement->id,
            'title' => $advertisement->title,
            'description' => $advertisement->description,
            'type' => $advertisement->type ?? 'regular',
            'status' => $advertisement->status ?? 'pending',
            'is_active' => $advertisement->is_active ?? true,
            'image' => $advertisement->image,
            'placement' => $advertisement->placement ?? 'services',
            'start_date' => $advertisement->start_date ? $advertisement->start_date->toISOString() : null,
            'end_date' => $advertisement->end_date ? $advertisement->end_date->toISOString() : null,
            'impressions' => $advertisement->impressions ?? 0,
            'clicks' => $advertisement->clicks ?? 0,
            'created_at' => $advertisement->created_at ? $advertisement->created_at->toISOString() : null,
            'updated_at' => $advertisement->updated_at ? $advertisement->updated_at->toISOString() : null,
            // Дополнительные данные
            'services' => $servicesData, // Теперь загружаем из таблицы services для marketplace объявлений
            'team' => $advertisement->team,
            'portfolio' => $advertisement->portfolio,
            'schedule' => $advertisement->schedule,
            'price_from' => $advertisement->price_from,
            'price_to' => $advertisement->price_to,
            'currency' => $advertisement->currency ?? 'USD',
            'city' => $advertisement->city,
            'state' => $advertisement->state,
            'link' => $advertisement->link,
            'category_slug' => $advertisement->category_slug,
            'category_id' => $categoryId,
        ]);
    }

    /**
     * Create a new advertisement for the business.
     */
    public function createAdvertisement(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }
        
        // Получаем company_id из request (устанавливается в TenantMiddleware)
        // или из первой компании владельца
        $companyId = $request->input('current_company_id');
        
        if (!$companyId && $user->isBusinessOwner()) {
            $company = $user->ownedCompanies()->first();
            $companyId = $company ? $company->id : null;
        }

        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:advertisement,regular',
            'image' => 'nullable|string',
            'link' => 'nullable|string',
            'placement' => 'nullable|in:homepage,services,sidebar,banner',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'city' => 'nullable|string',
            'state' => 'nullable|string',
            'priceFrom' => 'nullable|numeric',
            'priceTo' => 'nullable|numeric',
            'currency' => 'nullable|string',
            'category_id' => 'nullable|integer|exists:service_categories,id',
            'services' => 'nullable|array',
            'services.*.service_id' => 'nullable|integer', // Убираем exists проверку, так как новые услуги еще не в БД
            'services.*.id' => 'nullable',
            'services.*.name' => 'nullable|string|max:255',
            'services.*.price' => 'nullable|numeric|min:0',
            'services.*.duration' => 'nullable|numeric|min:0',
            'services.*.duration_unit' => 'nullable|string|in:hours,days',
            'services.*.description' => 'nullable|string',
            'services.*.additional_services' => 'nullable|array',
            'team' => 'nullable|array',
            'portfolio' => 'nullable|array',
            'schedule' => 'nullable|array',
            'slot_step_minutes' => 'nullable|integer|min:15|max:240',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        // ВАЖНО: Проверяем, что в team есть хотя бы один специалист
        $team = $request->input('team', []);
        $teamArray = is_array($team) ? $team : (json_decode($team, true) ?? []);
        
        // Фильтруем пустые элементы и проверяем наличие хотя бы одного валидного специалиста
        $validTeamMembers = array_filter($teamArray, function($member) {
            return !empty($member['name']) || !empty($member['id']);
        });
        
        if (empty($validTeamMembers)) {
            return response()->json([
                'success' => false,
                'message' => 'В объявлении должен быть указан хотя бы один исполнитель (специалист)',
                'errors' => ['team' => ['В объявлении должен быть указан хотя бы один исполнитель (специалист)']],
            ], 422);
        }

        // Проверяем статус компании - автоматически активируем, если pending
        $company = Company::find($companyId);
        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        // Автоматически активируем компанию, если она в статусе pending
        if ($company->status === 'pending') {
            $company->status = 'active';
            $company->save();
            // Перезагружаем модель для получения актуального статуса
            $company->refresh();
        }

        if ($company->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Компания должна быть активирована для создания объявлений. Текущий статус: ' . $company->status,
            ], 403);
        }

        // Обрабатываем услуги: валидируем service_id и проверяем принадлежность к компании
        $services = $request->input('services', []);
        $processedServices = [];
        foreach ($services as $service) {
            $processedService = $service;
            
            // Если указан service_id, проверяем что услуга принадлежит компании
            // Но только если это реальный ID из БД (не временный ID для новых услуг)
            if (isset($service['service_id']) && !empty($service['service_id'])) {
                $serviceIdValue = (int) $service['service_id'];
                // Проверяем, что это реальный ID из БД (не временный ID > 1000000)
                if ($serviceIdValue < 1000000) {
                    $serviceModel = Service::where('id', $serviceIdValue)
                        ->where('company_id', $companyId)
                        ->first();
                    
                    if (!$serviceModel) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Услуга с ID ' . $serviceIdValue . ' не принадлежит выбранной компании',
                            'errors' => ['services' => ['Услуга не принадлежит компании']],
                        ], 422);
                    }
                    
                    // Сохраняем service_id в объекте услуги
                    $processedService['service_id'] = $serviceIdValue;
                } else {
                    // Это временный ID для новой услуги, убираем его
                    unset($processedService['service_id']);
                }
            }
            
            // Обрабатываем локальные дополнительные услуги (если есть)
            if (isset($service['additional_services']) && is_array($service['additional_services'])) {
                // Очищаем временные поля и оставляем только нужные данные
                $processedService['additional_services'] = array_map(function($addService) {
                    return [
                        'id' => $addService['id'] ?? null,
                        'name' => $addService['name'] ?? '',
                        'description' => $addService['description'] ?? null,
                        'price' => isset($addService['price']) ? (float) $addService['price'] : 0,
                        'duration' => isset($addService['duration']) ? (int) $addService['duration'] : null,
                    ];
                }, $service['additional_services']);
            }
            
            $processedServices[] = $processedService;
        }

        // Нормализуем link (генерируем slug из title, если нужно)
        $link = $this->normalizeLink($request->input('link'), $request->input('title'));
        
        // Преобразуем category_id в category_slug
        $categorySlug = null;
        if ($request->has('category_id') && $request->input('category_id')) {
            $category = ServiceCategory::find($request->input('category_id'));
            if ($category) {
                $categorySlug = $category->slug;
            }
        }
        
        $advertisementData = [
            'company_id' => $companyId,
            'title' => $request->input('title'),
            'description' => $request->input('description'),
            'type' => $request->input('type'),
            'image' => $request->input('image'),
            'link' => $link,
            'placement' => $request->input('placement', 'services'),
            'category_slug' => $categorySlug,
            'city' => $request->input('city'),
            'state' => $request->input('state'),
            'price_from' => $request->input('priceFrom'),
            'price_to' => $request->input('priceTo'),
            'currency' => $request->input('currency', 'USD'),
            'services' => $processedServices,
            'team' => $request->input('team', []),
            'portfolio' => $request->input('portfolio', []),
            'schedule' => $request->input('schedule'),
            'slot_step_minutes' => $request->input('slot_step_minutes'), // Шаг слотов для бронирования
            'status' => 'pending', // Все новые объявления требуют модерации
            'is_active' => false, // По умолчанию неактивно до модерации
        ];

        // Даты только для рекламных объявлений
        if ($request->input('type') === 'advertisement') {
            if ($request->has('start_date')) {
                $advertisementData['start_date'] = $request->input('start_date');
            }
            if ($request->has('end_date')) {
                $advertisementData['end_date'] = $request->input('end_date');
            }
        }

        $advertisement = Advertisement::create($advertisementData);

        // Создаем услуги в таблице services для всех типов объявлений
        $serviceIds = [];
        foreach ($processedServices as $serviceData) {
            // Если уже есть service_id (из шаблона), используем его
            if (isset($serviceData['service_id']) && !empty($serviceData['service_id'])) {
                $serviceModel = Service::find($serviceData['service_id']);
                if ($serviceModel) {
                    // Обновляем advertisement_id для существующей услуги
                    $serviceModel->update(['advertisement_id' => $advertisement->id]);
                    $serviceIds[] = $serviceModel->id;
                    continue;
                }
            }
            
            // Создаем новую услугу в БД
            $service = Service::create([
                'company_id' => $companyId,
                'advertisement_id' => $advertisement->id,
                'name' => $serviceData['name'] ?? 'Unknown',
                'description' => $serviceData['description'] ?? null,
                'price' => $serviceData['price'] ?? 0,
                'duration_minutes' => $serviceData['duration'] ?? $serviceData['duration_minutes'] ?? 60,
                'duration_unit' => $serviceData['duration_unit'] ?? 'hours',
                'is_active' => true,
            ]);
            
            $serviceIds[] = $service->id;
        }
        
        // Обновляем JSON поле services с ID из БД
        $advertisement->update([
            'services' => array_map(function($id, $index) use ($processedServices) {
                return array_merge($processedServices[$index] ?? [], ['id' => $id, 'service_id' => $id]);
            }, $serviceIds, array_keys($serviceIds))
        ]);

        return response()->json([
            'id' => $advertisement->id,
            'title' => $advertisement->title,
            'description' => $advertisement->description,
            'type' => $advertisement->type,
            'status' => $advertisement->status,
            'is_active' => $advertisement->is_active,
            'image' => $advertisement->image,
            'placement' => $advertisement->placement,
            'start_date' => $advertisement->start_date ? $advertisement->start_date->toISOString() : null,
            'end_date' => $advertisement->end_date ? $advertisement->end_date->toISOString() : null,
            'created_at' => $advertisement->created_at->toISOString(),
        ], 201);
    }

    /**
     * Update an advertisement.
     */
    public function updateAdvertisement(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }
        
        // Получаем company_id из request (устанавливается в TenantMiddleware)
        // или из первой компании владельца
        $companyId = $request->input('current_company_id');
        
        if (!$companyId && $user->isBusinessOwner()) {
            $company = $user->ownedCompanies()->first();
            $companyId = $company ? $company->id : null;
        }

        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $advertisement = Advertisement::where('id', $id)
            ->where('company_id', $companyId)
            ->first();

        if (!$advertisement) {
            return response()->json([
                'success' => false,
                'message' => 'Advertisement not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'type' => 'sometimes|in:advertisement,regular',
            'image' => 'nullable|string',
            'link' => 'nullable|string',
            'placement' => 'nullable|in:homepage,services,sidebar,banner',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'city' => 'nullable|string',
            'state' => 'nullable|string',
            'priceFrom' => 'nullable|numeric',
            'priceTo' => 'nullable|numeric',
            'currency' => 'nullable|string',
            'category_id' => 'nullable|integer|exists:service_categories,id',
            'services' => 'nullable|array',
            'services.*.service_id' => 'nullable|integer|exists:services,id',
            'team' => 'nullable|array',
            'portfolio' => 'nullable|array',
            'schedule' => 'nullable|array',
            'slot_step_minutes' => 'nullable|integer|min:15|max:240',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        // ВАЖНО: Проверяем, что в team есть хотя бы один специалист
        // Если team передается в запросе, проверяем его
        if ($request->has('team')) {
            $team = $request->input('team', []);
            $teamArray = is_array($team) ? $team : (json_decode($team, true) ?? []);
            
            // Фильтруем пустые элементы и проверяем наличие хотя бы одного валидного специалиста
            $validTeamMembers = array_filter($teamArray, function($member) {
                return !empty($member['name']) || !empty($member['id']);
            });
            
            if (empty($validTeamMembers)) {
                return response()->json([
                    'success' => false,
                    'message' => 'В объявлении должен быть указан хотя бы один исполнитель (специалист)',
                    'errors' => ['team' => ['В объявлении должен быть указан хотя бы один исполнитель (специалист)']],
                ], 422);
            }
        } else {
            // Если team не передается в запросе, проверяем существующий team в объявлении
            $existingTeam = is_array($advertisement->team) ? $advertisement->team : (json_decode($advertisement->team, true) ?? []);
            $validTeamMembers = array_filter($existingTeam, function($member) {
                if (is_array($member)) {
                    return !empty($member['name']) || !empty($member['id']);
                }
                return false;
            });
            
            // Если в существующем объявлении нет команды, это ошибка только если мы обновляем другие поля
            // Но если мы обновляем только services (например, добавляем дополнительные услуги), не требуем команду
            if (empty($validTeamMembers) && $request->hasAny(['title', 'description', 'type', 'image', 'link', 'placement', 'city', 'state', 'priceFrom', 'priceTo', 'currency', 'schedule', 'slot_step_minutes'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'В объявлении должен быть указан хотя бы один исполнитель (специалист)',
                    'errors' => ['team' => ['В объявлении должен быть указан хотя бы один исполнитель (специалист)']],
                ], 422);
            }
        }

        // Нормализуем link (генерируем slug из title, если нужно)
        // Если title изменился или link пустой/содержит полный URL, генерируем новый slug
        $title = $request->has('title') ? $request->input('title') : $advertisement->title;
        $link = $request->input('link');
        
        // Всегда нормализуем link при обновлении
        // Если передан новый link, нормализуем его
        // Если link не передан, но текущий содержит полный URL или пустой, генерируем из title
        if ($request->has('link') && !empty($request->input('link'))) {
            // Если передан link, нормализуем его (извлекаем slug из полного URL или пути)
            $link = $this->normalizeLink($request->input('link'), $title, $advertisement->id);
        } elseif (empty($advertisement->link) || filter_var($advertisement->link, FILTER_VALIDATE_URL)) {
            // Если текущий link пустой или содержит полный URL, генерируем из title
            $link = $this->normalizeLink(null, $title, $advertisement->id);
        } else {
            // Если текущий link уже нормализован (только slug), оставляем его
            // Но проверяем, что он не содержит пути или URL
            $currentLink = $advertisement->link;
            if (strpos($currentLink, '/') !== false || strpos($currentLink, 'http') !== false) {
                // Если содержит путь или URL, нормализуем
                $link = $this->normalizeLink($currentLink, $title, $advertisement->id);
            } else {
                // Оставляем существующий нормализованный link
                $link = $currentLink;
            }
        }
        
        $updateData = [];

        if ($request->has('title')) {
            $updateData['title'] = $request->input('title');
        }
        if ($request->has('description')) {
            $updateData['description'] = $request->input('description');
        }
        if ($request->has('type')) {
            $updateData['type'] = $request->input('type');
        }
        if ($request->has('image')) {
            $updateData['image'] = $request->input('image');
        }
        // Всегда нормализуем link
        $updateData['link'] = $link;
        if ($request->has('placement')) {
            $updateData['placement'] = $request->input('placement');
        }
        if ($request->has('city')) {
            $updateData['city'] = $request->input('city');
        }
        if ($request->has('state')) {
            $updateData['state'] = $request->input('state');
        }
        // Обрабатываем category_id - преобразуем в category_slug
        if ($request->has('category_id')) {
            if ($request->input('category_id')) {
                $category = ServiceCategory::find($request->input('category_id'));
                if ($category) {
                    $updateData['category_slug'] = $category->slug;
                } else {
                    $updateData['category_slug'] = null;
                }
            } else {
                $updateData['category_slug'] = null;
            }
        }
        if ($request->has('priceFrom')) {
            $updateData['price_from'] = $request->input('priceFrom');
        }
        if ($request->has('priceTo')) {
            $updateData['price_to'] = $request->input('priceTo');
        }
        if ($request->has('currency')) {
            $updateData['currency'] = $request->input('currency');
        }
        if ($request->has('services')) {
            // Обрабатываем услуги: валидируем service_id и проверяем принадлежность к компании
            $services = $request->input('services', []);
            $processedServices = [];
            foreach ($services as $service) {
                $processedService = $service;
                
                // Если указан service_id, проверяем что услуга принадлежит компании
                if (isset($service['service_id']) && !empty($service['service_id'])) {
                    $serviceModel = Service::where('id', $service['service_id'])
                        ->where('company_id', $companyId)
                        ->first();
                    
                    if (!$serviceModel) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Услуга с ID ' . $service['service_id'] . ' не принадлежит выбранной компании',
                            'errors' => ['services' => ['Услуга не принадлежит компании']],
                        ], 422);
                    }
                    
                    // Сохраняем service_id в объекте услуги
                    $processedService['service_id'] = (int) $service['service_id'];
                }
                
                // Обрабатываем локальные дополнительные услуги (если есть)
                if (isset($service['additional_services']) && is_array($service['additional_services'])) {
                    // Очищаем временные поля и оставляем только нужные данные
                    $processedService['additional_services'] = array_map(function($addService) {
                        return [
                            'id' => $addService['id'] ?? null,
                            'name' => $addService['name'] ?? '',
                            'description' => $addService['description'] ?? null,
                            'price' => isset($addService['price']) ? (float) $addService['price'] : 0,
                            'duration' => isset($addService['duration']) ? (int) $addService['duration'] : null,
                        ];
                    }, $service['additional_services']);
                }
                
                $processedServices[] = $processedService;
            }
            
            $updateData['services'] = $processedServices;
        }
        if ($request->has('team')) {
            $updateData['team'] = $request->input('team');
        }
        // Портфолио всегда обновляется, если передано в запросе (даже если пустое)
        if ($request->has('portfolio')) {
            $portfolio = $request->input('portfolio');
            // Если portfolio передан как null, сохраняем как пустой массив
            // Если передан как массив, сохраняем как есть
            $updateData['portfolio'] = $portfolio === null ? [] : (is_array($portfolio) ? $portfolio : []);
            
            // Логируем для отладки (только в dev режиме)
            if (config('app.debug')) {
                \Log::debug('Updating portfolio', [
                    'has_portfolio' => $request->has('portfolio'),
                    'portfolio_type' => gettype($portfolio),
                    'portfolio_count' => is_array($portfolio) ? count($portfolio) : 0,
                    'portfolio' => $portfolio,
                ]);
            }
        } else {
            // Если портфолио не передано, но мы обновляем объявление, 
            // оставляем существующее портфолио (не трогаем его)
            // Это позволяет обновлять другие поля без изменения портфолио
        }
        if ($request->has('schedule')) {
            $updateData['schedule'] = $request->input('schedule');
        }
        if ($request->has('slot_step_minutes')) {
            $updateData['slot_step_minutes'] = $request->input('slot_step_minutes');
        }

        // Даты только для рекламных объявлений
        if ($request->input('type', $advertisement->type) === 'advertisement') {
            if ($request->has('start_date')) {
                $updateData['start_date'] = $request->input('start_date');
            }
            if ($request->has('end_date')) {
                $updateData['end_date'] = $request->input('end_date');
            }
        } else {
            // Для обычных объявлений убираем даты
            $updateData['start_date'] = null;
            $updateData['end_date'] = null;
        }

        // При изменении статус сбрасывается на pending для модерации
        if (!empty($updateData)) {
            $updateData['status'] = 'pending';
            $updateData['is_active'] = false;
        }

        $advertisement->update($updateData);
        
        // Синхронизируем услуги в таблице services при обновлении
        if ($request->has('services')) {
            $existingServiceIds = Service::where('advertisement_id', $advertisement->id)
                ->pluck('id')
                ->toArray();
            
            $newServiceIds = [];
            foreach ($processedServices as $serviceData) {
                // Проверяем, есть ли уже такая услуга по ID из JSON или service_id
                $jsonServiceId = $serviceData['id'] ?? null;
                $serviceIdFromData = $serviceData['service_id'] ?? null;
                
                // Сначала проверяем по ID из JSON (если услуга уже в БД для этого объявления)
                if ($jsonServiceId && in_array($jsonServiceId, $existingServiceIds)) {
                    // Обновляем существующую услугу из объявления
                    $serviceModel = Service::find($jsonServiceId);
                    if ($serviceModel && ($serviceModel->advertisement_id == $advertisement->id || $serviceModel->company_id == $companyId)) {
                        $serviceModel->update([
                            'name' => $serviceData['name'] ?? $serviceModel->name,
                            'description' => $serviceData['description'] ?? $serviceModel->description,
                            'price' => $serviceData['price'] ?? $serviceModel->price,
                            'duration_minutes' => $serviceData['duration'] ?? $serviceData['duration_minutes'] ?? $serviceModel->duration_minutes,
                            'duration_unit' => $serviceData['duration_unit'] ?? $serviceModel->duration_unit ?? 'hours',
                            'advertisement_id' => $advertisement->id, // Убеждаемся, что привязана к объявлению
                        ]);
                        $newServiceIds[] = $serviceModel->id;
                        continue;
                    }
                }
                
                // Если указан service_id (из шаблона), проверяем принадлежность к компании
                if ($serviceIdFromData && !empty($serviceIdFromData)) {
                    $serviceModel = Service::where('id', $serviceIdFromData)
                        ->where(function($query) use ($companyId, $advertisement) {
                            $query->where('company_id', $companyId)
                                  ->orWhere(function($q) use ($advertisement) {
                                      $q->where('advertisement_id', $advertisement->id);
                                  });
                        })
                        ->first();
                    
                    if ($serviceModel) {
                        // Обновляем существующую услугу (из шаблона или объявления)
                        $serviceModel->update([
                            'advertisement_id' => $advertisement->id,
                            'name' => $serviceData['name'] ?? $serviceModel->name,
                            'description' => $serviceData['description'] ?? $serviceModel->description,
                            'price' => $serviceData['price'] ?? $serviceModel->price,
                            'duration_minutes' => $serviceData['duration'] ?? $serviceData['duration_minutes'] ?? $serviceModel->duration_minutes,
                            'duration_unit' => $serviceData['duration_unit'] ?? $serviceModel->duration_unit ?? 'hours',
                        ]);
                        $newServiceIds[] = $serviceModel->id;
                        continue;
                    }
                }
                
                // Создаем новую услугу в БД
                $service = Service::create([
                    'company_id' => $companyId,
                    'advertisement_id' => $advertisement->id,
                    'name' => $serviceData['name'] ?? 'Unknown',
                    'description' => $serviceData['description'] ?? null,
                    'price' => $serviceData['price'] ?? 0,
                    'duration_minutes' => $serviceData['duration'] ?? $serviceData['duration_minutes'] ?? 60,
                    'duration_unit' => $serviceData['duration_unit'] ?? 'hours',
                    'is_active' => true,
                ]);
                
                $newServiceIds[] = $service->id;
            }
            
            // Удаляем услуги, которых больше нет в объявлении
            $servicesToDelete = array_diff($existingServiceIds, $newServiceIds);
            if (!empty($servicesToDelete)) {
                Service::whereIn('id', $servicesToDelete)
                    ->where('advertisement_id', $advertisement->id)
                    ->delete();
            }
            
            // Обновляем JSON поле services с ID из БД
            $advertisement->update([
                'services' => array_map(function($id, $index) use ($processedServices) {
                    return array_merge($processedServices[$index] ?? [], ['id' => $id, 'service_id' => $id]);
                }, $newServiceIds, array_keys($newServiceIds))
            ]);
        }

        return response()->json([
            'id' => $advertisement->id,
            'title' => $advertisement->title,
            'description' => $advertisement->description,
            'type' => $advertisement->type,
            'status' => $advertisement->status,
            'is_active' => $advertisement->is_active,
            'image' => $advertisement->image,
            'placement' => $advertisement->placement,
            'start_date' => $advertisement->start_date ? $advertisement->start_date->toISOString() : null,
            'end_date' => $advertisement->end_date ? $advertisement->end_date->toISOString() : null,
            'updated_at' => $advertisement->updated_at->toISOString(),
        ]);
    }

    /**
     * Delete an advertisement.
     */
    public function deleteAdvertisement(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }
        
        // Получаем company_id из request (устанавливается в TenantMiddleware)
        // или из первой компании владельца
        $companyId = $request->input('current_company_id');
        
        if (!$companyId && $user->isBusinessOwner()) {
            $company = $user->ownedCompanies()->first();
            $companyId = $company ? $company->id : null;
        }

        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $advertisement = Advertisement::where('id', $id)
            ->where('company_id', $companyId)
            ->first();

        if (!$advertisement) {
            return response()->json([
                'success' => false,
                'message' => 'Advertisement not found',
            ], 404);
        }

        $advertisement->delete();

        return response()->json([
            'message' => 'Advertisement deleted',
        ]);
    }

    /**
     * Upload advertisement image.
     */
    public function uploadAdvertisementImage(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Проверяем, что файл действительно загружен
            if (!$request->hasFile('image')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Файл не был загружен',
                ], 400);
            }

            $file = $request->file('image');
            
            // Проверяем размер файла (в килобайтах)
            $fileSizeKB = $file->getSize() / 1024;
            if ($fileSizeKB > 5120) {
                return response()->json([
                    'success' => false,
                    'message' => 'Размер файла превышает 5MB',
                ], 422);
            }

            // Сохраняем файл в storage/app/public/advertisements
            $path = $file->store('advertisements', 'public');
            
            if (!$path) {
                \Log::error('Failed to store image file', [
                    'originalName' => $file->getClientOriginalName(),
                    'size' => $file->getSize(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Не удалось сохранить файл',
                ], 500);
            }
            
            // Получаем относительный путь к файлу
            // Storage::url() возвращает относительный путь вида /storage/advertisements/file.jpg
            $relativeUrl = Storage::disk('public')->url($path);
            
            // Используем APP_URL из конфигурации Laravel вместо Origin
            // Это гарантирует правильный URL на всех устройствах
            if (str_starts_with($relativeUrl, 'http://') || str_starts_with($relativeUrl, 'https://')) {
                // Если Storage::url() уже вернул полный URL (маловероятно), используем как есть
                $url = $relativeUrl;
            } else {
                // Используем APP_URL из конфигурации
                $baseUrl = rtrim(config('app.url'), '/');
                $url = $baseUrl . $relativeUrl;
            }

            // Логируем для отладки (только в dev режиме)
            if (config('app.debug')) {
                \Log::debug('Image upload', [
                    'path' => $path,
                    'relativeUrl' => $relativeUrl,
                    'baseUrl' => config('app.url'),
                    'finalUrl' => $url,
                    'fileSize' => $fileSizeKB . ' KB',
                ]);
            }

            return response()->json([
                'success' => true,
                'url' => $url,
                'path' => $path,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error uploading advertisement image', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при загрузке изображения: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Complete onboarding for the business.
     */
    public function completeOnboarding(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }
        
        // Получаем company_id из request (устанавливается в TenantMiddleware)
        // или из первой компании владельца
        $companyId = $request->input('current_company_id');
        
        if (!$companyId && $user->isBusinessOwner()) {
            $company = $user->ownedCompanies()->first();
            $companyId = $company ? $company->id : null;
        }

        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $company = Company::find($companyId);
        
        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        // Отмечаем онбординг как завершенный
        $company->onboarding_completed = true;
        $company->onboarding_completed_at = now();
        $company->save();

        return response()->json([
            'success' => true,
            'message' => 'Onboarding completed successfully',
            'data' => [
                'onboarding_completed' => $company->onboarding_completed,
                'onboarding_completed_at' => $company->onboarding_completed_at,
            ],
        ]);
    }

}


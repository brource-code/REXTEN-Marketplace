<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Company;
use App\Models\DiscountTier;
use App\Models\Order;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\DiscountCalculationService;
use App\Helpers\DatabaseHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class ClientsController extends Controller
{
    /**
     * Create a new client.
     */
    public function store(Request $request)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'email' => [
                    'nullable', // Email необязателен
                    'email',
                    'max:255',
                    // Убираем проверку уникальности - клиенты разделяются по тенантам
                ],
                'phone' => 'nullable|string|max:40',
                'status' => 'sometimes|in:regular,permanent,vip',
            ], [
                'name.required' => 'Имя обязательно для заполнения',
            ]);
        } catch (ValidationException $e) {
            Log::error('ClientsController: Validation error', [
                'errors' => $e->errors(),
                'request' => $request->all(),
            ]);
            throw $e;
        }

        try {
            // Создаем клиента с любыми данными (конфиденциальность)
            // Если email уже существует, генерируем уникальный вариант для User
            // Оригинальный email будет использоваться в бронированиях через client_email
            
            $requestedEmail = $request->email;
            $email = $requestedEmail;
            
            // Если email указан, проверяем, не занят ли он
            if (!empty($email)) {
                // Проверяем существование email (включая удаленных, так как unique индекс работает для всех)
                $emailExists = User::where('email', $email)->exists();
                
                Log::info('ClientsController: Checking email existence', [
                    'requested_email' => $requestedEmail,
                    'email_exists' => $emailExists,
                ]);
                
                if ($emailExists) {
                    // Если email уже занят, генерируем уникальный вариант
                    // Оригинальный email будет использоваться в бронированиях через client_email
                    Log::info('ClientsController: Email exists, generating unique variant', [
                        'original_email' => $requestedEmail,
                    ]);
                    
                    do {
                        $email = 'client_' . $companyId . '_' . time() . '_' . uniqid() . '@local.local';
                        $exists = User::where('email', $email)->exists();
                    } while ($exists);
                    
                    Log::info('ClientsController: Generated unique email', [
                        'new_email' => $email,
                    ]);
                }
            } else {
                // Если email не указан, генерируем уникальный placeholder
                do {
                    $email = 'client_' . $companyId . '_' . time() . '_' . uniqid() . '@local.local';
                    $exists = User::where('email', $email)->exists();
                } while ($exists);
            }
            
            // Создаем нового пользователя (клиента) с уникальным email
            Log::info('ClientsController: Creating user', [
                'email' => $email,
                'requested_email' => $requestedEmail,
            ]);
            
            $user = User::create([
                'email' => $email, // Используем уникальный email
                'password' => Hash::make(uniqid()), // Генерируем случайный пароль
                'role' => 'CLIENT', // Роль должна быть в верхнем регистре
                'is_active' => true,
                'client_status' => $request->status ?? 'regular',
            ]);

            // Разбиваем имя на имя и фамилию
            $nameParts = explode(' ', trim($request->name), 2);

            // Создаем профиль пользователя
            $user->profile()->create([
                'first_name' => $nameParts[0] ?? 'Клиент',
                'last_name' => $nameParts[1] ?? '', // Если фамилии нет, оставляем пустым
                'phone' => $request->phone ?? null,
                'address' => $request->address ?? null,
            ]);

            // Связываем клиента с компанией
            DB::table('company_clients')->insertOrIgnore([
                'company_id' => $companyId,
                'user_id' => $user->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            $user->refresh();
            $user->load('profile');
        } catch (\Exception $e) {
            Log::error('ClientsController: Database error when creating client', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Нарушение ограничений базы данных',
                'error' => $e->getMessage(),
            ], 422);
        }

        // Формируем полное имя, убирая лишние пробелы
        $fullName = $user->profile 
            ? trim($user->profile->first_name . ' ' . ($user->profile->last_name ?? ''))
            : 'N/A';
        
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $fullName,
                'email' => strpos($user->email, '@local.local') !== false ? null : $user->email, // Не показываем placeholder email
                'phone' => $user->profile->phone ?? null,
                'address' => $user->profile->address ?? null,
                'status' => $user->client_status ?? 'regular',
            ],
        ], 201);
    }

    /**
     * Get business clients.
     */
    public function index(Request $request)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        // Получаем клиентов компании из таблицы company_clients или через bookings
        $clientIdsFromTable = DB::table('company_clients')
            ->where('company_id', $companyId)
            ->pluck('user_id');
        
        $clientIdsFromBookings = Booking::where('company_id', $companyId)
            ->whereNotNull('user_id')
            ->distinct()
            ->pluck('user_id');
        
        // Объединяем оба списка и убираем дубликаты
        $clientIds = $clientIdsFromTable->merge($clientIdsFromBookings)->unique();

        $query = User::whereIn('id', $clientIds)
            ->where('role', 'CLIENT')
            ->with('profile');

        // Поиск по имени, телефону или email (исключаем placeholder email)
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where(function ($emailQuery) use ($search) {
                    DatabaseHelper::whereLike($emailQuery, 'email', "%{$search}%");
                    $emailQuery->whereRaw("email NOT LIKE '%@local.local'");
                })
                    ->orWhereHas('profile', function ($profileQuery) use ($search) {
                        DatabaseHelper::whereLike($profileQuery, 'first_name', "%{$search}%");
                        DatabaseHelper::whereLike($profileQuery, 'last_name', "%{$search}%", 'or');
                        DatabaseHelper::whereLike($profileQuery, 'phone', "%{$search}%", 'or');
                    });
            });
        }

        // Фильтрация по статусу клиента
        if ($request->has('status') && $request->status) {
            $status = $request->status;
            $query->where('client_status', $status);
        }

        // Получаем общее количество для пагинации
        $total = $query->count();

        // Пагинация
        $page = (int) $request->get('page', 1);
        $pageSize = (int) $request->get('pageSize', 10);
        $skip = ($page - 1) * $pageSize;

        $clients = $query->skip($skip)->take($pageSize)->get();

        $data = $clients->map(function ($client) use ($companyId) {
            $totalBookings = Booking::where('company_id', $companyId)
                ->where('user_id', $client->id)
                ->count();

            // Считаем потраченную сумму из завершенных бронирований (как на странице просмотра)
            $bookings = Booking::where('company_id', $companyId)
                ->where('user_id', $client->id)
                ->where('status', 'completed')
                ->get();
            
            $totalSpentFromBookings = $bookings->sum(function ($booking) {
                return (float) ($booking->total_price ?? $booking->price ?? 0);
            });

            // Также учитываем оплаченные заказы
            $totalSpentFromOrders = Order::where('company_id', $companyId)
                ->where('user_id', $client->id)
                ->where('payment_status', 'paid')
                ->sum('total');

            $totalSpent = (float) $totalSpentFromBookings + (float) $totalSpentFromOrders;

            $lastVisitBooking = Booking::where('company_id', $companyId)
                ->where('user_id', $client->id)
                ->latest('created_at')
                ->first();
            
            $lastVisit = $lastVisitBooking ? $lastVisitBooking->created_at : null;

            return [
                'id' => $client->id,
                'name' => $client->profile ? trim($client->profile->first_name . ' ' . ($client->profile->last_name ?? '')) : 'N/A',
                'email' => strpos($client->email ?? '', '@local.local') !== false ? null : ($client->email ?? null),
                'phone' => $client->profile->phone ?? null,
                'address' => $client->profile->address ?? null,
                'city' => $client->profile->city ?? null,
                'state' => $client->profile->state ?? null,
                'zip_code' => $client->profile->zip_code ?? null,
                'img' => $client->profile->avatar ?? null,
                'totalBookings' => $totalBookings,
                'totalSpent' => $totalSpent,
                'lastVisit' => $lastVisit ? $lastVisit->toISOString() : null,
                'status' => $client->client_status ?? 'regular',
            ];
        });

        return response()->json([
            'data' => $data,
            'total' => $total,
        ]);
    }

    /**
     * Get client details.
     */
    public function show(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $client = User::with('profile')->findOrFail($id);

        if (!$this->clientBelongsToCompany((int) $companyId, $id)) {
            return response()->json([
                'message' => 'Client not found',
            ], 404);
        }

        // Получаем все бронирования для расчета сводки
        $allBookings = Booking::where('company_id', $companyId)
            ->where('user_id', $id)
            ->with(['service', 'specialist'])
            ->get();

        // Фильтры для бронирований
        $bookingsQuery = Booking::where('company_id', $companyId)
            ->where('user_id', $id)
            ->with(['service', 'specialist', 'additionalServices', 'reviews', 'location', 'discountTier', 'promoCode']);

        // Фильтр по статусу
        if ($request->has('status') && $request->status) {
            $bookingsQuery->where('status', $request->status);
        }

        // Фильтр по дате (от)
        if ($request->has('date_from') && $request->date_from) {
            $bookingsQuery->where('booking_date', '>=', $request->date_from);
        }

        // Фильтр по дате (до)
        if ($request->has('date_to') && $request->date_to) {
            $bookingsQuery->where('booking_date', '<=', $request->date_to);
        }

        // Сортировка
        $sortBy = $request->get('sort_by', 'booking_date');
        $sortOrder = $request->get('sort_order', 'desc');
        
        if ($sortBy === 'price') {
            $bookingsQuery->orderBy('total_price', $sortOrder);
        } else {
            $bookingsQuery->orderBy('booking_date', $sortOrder);
        }

        $bookings = $bookingsQuery->get();

        // Расчет сводки
        $totalBookings = $allBookings->count();
        $completedBookings = $allBookings->where('status', 'completed');
        $cancelledBookings = $allBookings->where('status', 'cancelled');
        $completedCount = $completedBookings->count();

        // Первое бронирование по дате (любой статус) — «Первый визит» в календаре
        $firstBooking = $allBookings->sortBy('booking_date')->first();

        // Последний завершённый визит (по дате услуги, не будущая запись без факта визита)
        $lastCompletedBooking = $completedBookings->sortByDesc('booking_date')->first();

        // Общая сумма потраченная
        $totalSpent = $completedBookings->sum(function ($booking) {
            return (float) ($booking->total_price ?? $booking->price ?? 0);
        });

        // Средний чек
        $averageCheck = $completedCount > 0 ? $totalSpent / $completedCount : 0;

        // Доля завершённых от всех бронирований компании (числитель — только completed)
        $conversionRate = $totalBookings > 0 ? ($completedCount / $totalBookings) * 100 : 0;
        
        // Любимая услуга
        $serviceCounts = $allBookings->where('status', 'completed')
            ->groupBy('service_id')
            ->map->count()
            ->sortDesc();
        $favoriteServiceId = $serviceCounts->keys()->first();
        $favoriteBooking = $favoriteServiceId ? $allBookings->firstWhere('service_id', $favoriteServiceId) : null;
        $favoriteService = $favoriteBooking && $favoriteBooking->service ? $favoriteBooking->service : null;
        
        // Любимый специалист
        $specialistCounts = $allBookings->where('status', 'completed')
            ->whereNotNull('specialist_id')
            ->groupBy('specialist_id')
            ->map->count()
            ->sortDesc();
        $favoriteSpecialistId = $specialistCounts->keys()->first();
        $favoriteSpecialistBooking = $favoriteSpecialistId ? $allBookings->firstWhere('specialist_id', $favoriteSpecialistId) : null;
        $favoriteSpecialist = $favoriteSpecialistBooking && $favoriteSpecialistBooking->specialist ? $favoriteSpecialistBooking->specialist : null;
        
        // Частота визитов: завершённые визиты в месяц между первым и последним завершённым визитом
        $visitFrequency = 0;
        $firstCompleted = $completedBookings->sortBy('booking_date')->first();
        $lastCompleted = $completedBookings->sortByDesc('booking_date')->first();
        if ($completedCount > 0 && $firstCompleted && $lastCompleted && $firstCompleted->booking_date && $lastCompleted->booking_date) {
            $firstDate = \Carbon\Carbon::parse($firstCompleted->booking_date);
            $lastDate = \Carbon\Carbon::parse($lastCompleted->booking_date);
            $monthsDiff = $firstDate->diffInMonths($lastDate);
            if ($monthsDiff > 0) {
                $visitFrequency = round($completedCount / $monthsDiff, 1);
            } elseif ($monthsDiff === 0) {
                $visitFrequency = (float) $completedCount;
            }
        }

        // Формируем сводку
        $summary = [
            'firstVisit' => ($firstBooking && $firstBooking->booking_date) ? ($firstBooking->booking_date instanceof \Carbon\Carbon ? $firstBooking->booking_date->toISOString() : $firstBooking->booking_date) : null,
            'lastVisit' => ($lastCompletedBooking && $lastCompletedBooking->booking_date) ? ($lastCompletedBooking->booking_date instanceof \Carbon\Carbon ? $lastCompletedBooking->booking_date->toISOString() : $lastCompletedBooking->booking_date) : null,
            'totalBookings' => $totalBookings,
            'completedBookings' => $completedCount,
            'cancelledBookings' => $cancelledBookings->count(),
            'totalSpent' => round($totalSpent, 2),
            'averageCheck' => round($averageCheck, 2),
            'conversionRate' => round($conversionRate, 1),
            'favoriteService' => $favoriteService ? [
                'id' => $favoriteService->id,
                'name' => $favoriteService->name,
            ] : null,
            'favoriteSpecialist' => $favoriteSpecialist ? [
                'id' => $favoriteSpecialist->id,
                'name' => $favoriteSpecialist->name ?? 'N/A',
            ] : null,
            'visitFrequency' => $visitFrequency,
        ];

        $company = Company::find($companyId);
        $loyalty = null;
        if ($company) {
            $discountService = app(DiscountCalculationService::class);
            $rule = $company->loyalty_booking_count_rule ?? 'completed';
            $count = $discountService->countLoyaltyBookings((int) $id, (int) $companyId, $rule, null);
            $currentTier = $discountService->resolveTierForCount((int) $companyId, $count);
            $nextTier = DiscountTier::query()
                ->where('company_id', $companyId)
                ->active()
                ->where('min_bookings', '>', $count)
                ->orderBy('min_bookings')
                ->first();
            $bookingsToNext = null;
            if ($nextTier) {
                $bookingsToNext = max(0, (int) $nextTier->min_bookings - $count);
            }
            $tiersConfigured = DiscountTier::query()
                ->where('company_id', $companyId)
                ->active()
                ->exists();
            $loyalty = [
                'loyalty_bookings_count' => $count,
                'loyalty_rule' => $rule,
                'tiers_configured' => $tiersConfigured,
                'current_tier' => $currentTier ? [
                    'id' => $currentTier->id,
                    'name' => $currentTier->name,
                    'min_bookings' => $currentTier->min_bookings,
                    'max_bookings' => $currentTier->max_bookings,
                    'discount_type' => $currentTier->discount_type,
                    'discount_value' => (float) $currentTier->discount_value,
                ] : null,
                'next_tier' => $nextTier ? [
                    'id' => $nextTier->id,
                    'name' => $nextTier->name,
                    'min_bookings' => $nextTier->min_bookings,
                    'discount_type' => $nextTier->discount_type,
                    'discount_value' => (float) $nextTier->discount_value,
                ] : null,
                'bookings_to_next_tier' => $bookingsToNext,
            ];
        }

        // Форматируем бронирования с отзывами
        $formattedBookings = $bookings->map(function ($booking) {
            $review = $booking->reviews->first();
            $specialistName = $booking->specialist ? ($booking->specialist->name ?? null) : null;

            return [
                'id' => $booking->id,
                'service' => $booking->service ? [
                    'id' => $booking->service->id,
                    'name' => $booking->service->name,
                ] : null,
                'specialist' => $booking->specialist ? [
                    'id' => $booking->specialist->id,
                    'name' => $specialistName,
                ] : null,
                'booking_date' => $booking->booking_date ? ($booking->booking_date instanceof \Carbon\Carbon ? $booking->booking_date->toISOString() : $booking->booking_date) : null,
                'booking_time' => $booking->booking_time,
                'duration_minutes' => $booking->duration_minutes,
                'price' => (float) ($booking->price ?? 0),
                'total_price' => (float) ($booking->total_price ?? $booking->price ?? 0),
                'status' => $booking->status,
                'notes' => $booking->notes,
                'client_notes' => $booking->client_notes,
                'execution_type' => $booking->execution_type ?? 'onsite',
                'location' => $booking->location ? [
                    'address_line1' => $booking->location->address_line1,
                    'address_line2' => $booking->location->address_line2,
                    'city' => $booking->location->city,
                    'state' => $booking->location->state,
                    'zip' => $booking->location->zip,
                    'notes' => $booking->location->notes,
                ] : null,
                'additional_services' => $booking->additionalServices->map(function ($service) {
                    return [
                        'id' => $service->id,
                        'name' => $service->name,
                        'pivot' => [
                            'quantity' => $service->pivot->quantity ?? 1,
                            'price' => (float) ($service->pivot->price ?? $service->price ?? 0),
                        ],
                        'price' => (float) ($service->price ?? 0),
                        'quantity' => $service->pivot->quantity ?? 1,
                    ];
                }),
                'review' => $review ? [
                    'id' => $review->id,
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                    'created_at' => $review->created_at ? ($review->created_at instanceof \Carbon\Carbon ? $review->created_at->toISOString() : $review->created_at) : null,
                ] : null,
                'created_at' => $booking->created_at ? ($booking->created_at instanceof \Carbon\Carbon ? $booking->created_at->toISOString() : $booking->created_at) : null,
                'currency' => ($booking->advertisement && $booking->advertisement->currency) ? $booking->advertisement->currency : 'USD',
                'discount_amount' => (float) ($booking->discount_amount ?? 0),
                'discount_source' => $booking->discount_source,
                'discount_tier' => $booking->discountTier ? [
                    'id' => $booking->discountTier->id,
                    'name' => $booking->discountTier->name,
                    'discount_type' => $booking->discountTier->discount_type,
                    'discount_value' => (float) $booking->discountTier->discount_value,
                ] : null,
                'promo_code' => $booking->promoCode ? [
                    'id' => $booking->promoCode->id,
                    'code' => $booking->promoCode->code,
                ] : null,
            ];
        });

        // Получаем заметки клиента
        $notes = [];
        if (Schema::hasTable('client_notes')) {
            $notes = DB::table('client_notes')
                ->where('client_id', $id)
                ->where('company_id', $companyId)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($note) {
                    return [
                        'id' => $note->id,
                        'note' => $note->note,
                        'createdAt' => $note->created_at,
                    ];
                })
                ->toArray();
        }

        return response()->json([
            'client' => [
                'id' => $client->id,
                'name' => $client->profile ? trim($client->profile->first_name . ' ' . ($client->profile->last_name ?? '')) : 'N/A',
                'email' => strpos($client->email ?? '', '@local.local') !== false ? null : ($client->email ?? null),
                'phone' => $client->profile->phone ?? null,
                'address' => $client->profile->address ?? null,
                'avatar' => $client->profile->avatar ?? null,
                'status' => $client->client_status ?? 'regular',
            ],
            'summary' => $summary,
            'bookings' => $formattedBookings,
            'notes' => $notes,
            'loyalty' => $loyalty,
        ]);
    }

    /**
     * Update client status.
     */
    public function updateStatus(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $request->validate([
            'status' => 'required|in:regular,permanent,vip',
        ]);

        $client = User::findOrFail($id);

        if (!$this->clientBelongsToCompany((int) $companyId, $id)) {
            return response()->json([
                'message' => 'Client not found',
            ], 404);
        }

        $client->client_status = $request->status;
        $client->save();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $client->id,
                'status' => $client->client_status,
            ],
        ]);
    }

    /**
     * Update client data.
     */
    public function update(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        // Валидация с проверкой на placeholder email (nullable: клиент может прислать null; string не допускает null без nullable)
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'name' => 'sometimes|nullable|string|max:255',
            'email' => [
                'sometimes',
                'nullable',
                function ($attribute, $value, $fail) {
                    // Пропускаем placeholder emails
                    if (empty($value) || strpos($value, '@local.local') !== false) {
                        return;
                    }
                    // Проверяем валидность только для реальных email
                    if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        $fail('The email field must be a valid email address.');
                    }
                },
                'max:255',
            ],
            'phone' => 'sometimes|nullable|string|max:40',
            'address' => 'sometimes|nullable|string|max:2000',
            'status' => 'sometimes|nullable|in:regular,permanent,vip',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $client = User::with('profile')->findOrFail($id);

        if (!$this->clientBelongsToCompany((int) $companyId, $id)) {
            return response()->json([
                'message' => 'Client not found',
            ], 404);
        }

        // Update email if provided (только если это не placeholder)
        if ($request->has('email') && !empty($request->email) && strpos($request->email, '@local.local') === false) {
            $client->email = $request->email;
        }

        // Update status if provided
        if ($request->has('status')) {
            $client->client_status = $request->status;
        }

        $client->save();

        // Update profile data if provided
        if ($client->profile) {
            if ($request->has('name')) {
                $nameParts = explode(' ', $request->name, 2);
                $client->profile->first_name = $nameParts[0] ?? '';
                $client->profile->last_name = $nameParts[1] ?? '';
            }
            if ($request->has('phone')) {
                $client->profile->phone = $request->phone;
            }
            if ($request->has('address')) {
                $client->profile->address = $request->address;
            }
            $client->profile->save();
        } else {
            // Create profile if it doesn't exist
            if ($request->has('name') || $request->has('phone') || $request->has('address')) {
                $nameParts = explode(' ', $request->name ?? '', 2);
                $client->profile()->create([
                    'first_name' => $nameParts[0] ?? '',
                    'last_name' => $nameParts[1] ?? '',
                    'phone' => $request->phone ?? null,
                    'address' => $request->address ?? null,
                ]);
            }
        }

        $client->refresh();
        $client->load('profile');

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $client->id,
                'name' => $client->profile ? trim($client->profile->first_name . ' ' . ($client->profile->last_name ?? '')) : 'N/A',
                'email' => strpos($client->email ?? '', '@local.local') !== false ? null : ($client->email ?? null),
                'phone' => $client->profile->phone ?? null,
                'address' => $client->profile->address ?? null,
            ],
        ]);
    }

    /**
     * Add note to client.
     */
    public function addNote(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $request->validate([
            'note' => 'required|string|max:1000',
        ]);

        $client = User::findOrFail($id);

        if (!$this->clientBelongsToCompany((int) $companyId, $id)) {
            return response()->json([
                'message' => 'Client not found',
            ], 404);
        }

        // Проверяем существование таблицы client_notes
        if (!Schema::hasTable('client_notes')) {
            return response()->json([
                'success' => false,
                'message' => 'Notes table not found. Please run migrations.',
            ], 500);
        }

        $noteId = DB::table('client_notes')->insertGetId([
            'client_id' => $id,
            'company_id' => $companyId,
            'note' => $request->note,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $note = DB::table('client_notes')->where('id', $noteId)->first();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $note->id,
                'note' => $note->note,
                'createdAt' => $note->created_at,
            ],
        ]);
    }

    /**
     * Загрузка аватара клиента (профиль пользователя).
     */
    public function uploadAvatar(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');

        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $client = User::with('profile')->findOrFail($id);

        if (!$this->clientBelongsToCompany((int) $companyId, $id)) {
            return response()->json([
                'message' => 'Client not found',
            ], 404);
        }

        $profile = $client->profile;
        if (!$profile) {
            $profile = UserProfile::create([
                'user_id' => $client->id,
                'first_name' => '',
                'last_name' => '',
            ]);
        }

        if ($profile->avatar) {
            Storage::disk('public')->delete($profile->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $profile->update(['avatar' => $path]);

        $avatarPath = Storage::disk('public')->url($path);
        if (str_starts_with($avatarPath, 'http://') || str_starts_with($avatarPath, 'https://')) {
            $parsedUrl = parse_url($avatarPath);
            $avatarUrl = $parsedUrl['path'] ?? $avatarPath;
        } else {
            $avatarUrl = $avatarPath;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'avatar' => $avatarUrl,
            ],
        ]);
    }

    /**
     * Delete client from business.
     */
    public function destroy(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $client = User::find($id);
        
        if (!$client) {
            return response()->json([
                'success' => false,
                'message' => 'Client not found',
            ], 404);
        }

        if (!$this->clientBelongsToCompany((int) $companyId, $id)) {
            return response()->json([
                'success' => false,
                'message' => 'Client not found in this company',
            ], 404);
        }

        try {
            DB::beginTransaction();

            // Remove from company_clients table
            DB::table('company_clients')
                ->where('company_id', $companyId)
                ->where('user_id', $id)
                ->delete();

            // Delete client notes for this company
            if (Schema::hasTable('client_notes')) {
                DB::table('client_notes')
                    ->where('company_id', $companyId)
                    ->where('client_id', $id)
                    ->delete();
            }

            // Check if client belongs to other companies
            $otherCompanies = DB::table('company_clients')
                ->where('user_id', $id)
                ->exists();
            
            $otherBookings = Booking::where('user_id', $id)
                ->where('company_id', '!=', $companyId)
                ->exists();

            // If client has no other associations and has placeholder email, soft delete
            if (!$otherCompanies && !$otherBookings) {
                // Check if email is a placeholder (local generated email)
                if (strpos($client->email, '@local.local') !== false) {
                    $client->delete(); // Soft delete if using SoftDeletes trait
                    Log::info('ClientsController: Soft deleted orphan client', [
                        'client_id' => $id,
                        'company_id' => $companyId,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Client removed successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('ClientsController: Error deleting client', [
                'error' => $e->getMessage(),
                'client_id' => $id,
                'company_id' => $companyId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error deleting client',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Связь клиента с компанией: company_clients, бронирования (в т.ч. soft-deleted) или заказы.
     */
    private function clientBelongsToCompany(int $companyId, int|string $userId): bool
    {
        if (DB::table('company_clients')
            ->where('company_id', $companyId)
            ->where('user_id', $userId)
            ->exists()) {
            return true;
        }

        if (Booking::withTrashed()
            ->where('company_id', $companyId)
            ->where('user_id', $userId)
            ->exists()) {
            return true;
        }

        return Order::where('company_id', $companyId)
            ->where('user_id', $userId)
            ->exists();
    }
}


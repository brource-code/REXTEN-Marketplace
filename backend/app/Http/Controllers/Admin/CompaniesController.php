<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Advertisement;
use App\Models\Order;
use App\Models\Booking;
use App\Models\Service;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\CompanyUser;
use App\Models\CompanyRole;
use App\Helpers\DatabaseHelper;
use App\Services\ActivityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class CompaniesController extends Controller
{
    /**
     * Get all companies.
     */
    public function index(Request $request)
    {
        $query = Company::with('owner.profile');

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Search by name, email, or phone
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'name', "%{$search}%");
                DatabaseHelper::whereLike($q, 'email', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'phone', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'slug', "%{$search}%", 'or');
            });
        }

        // Get total count before pagination
        $total = $query->count();

        // Pagination
        $page = $request->get('page', 1);
        $pageSize = $request->get('pageSize', 10);
        $skip = ($page - 1) * $pageSize;

        $companies = $query->orderBy('created_at', 'desc')
                          ->skip($skip)
                          ->take($pageSize)
                          ->get();

        $data = $companies->map(function ($company) {
            // Получаем имя владельца
            $ownerName = 'N/A';
            if ($company->owner) {
                if ($company->owner->profile) {
                    $firstName = $company->owner->profile->first_name ?? '';
                    $lastName = $company->owner->profile->last_name ?? '';
                    $ownerName = trim($firstName . ' ' . $lastName) ?: $company->owner->email;
                } else {
                    $ownerName = $company->owner->email ?? 'N/A';
                }
            }
            
            // Рассчитываем выручку (оплаченные заказы + завершенные бронирования без заказов)
            $revenue = 0;
            if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'payment_status') && Schema::hasColumn('orders', 'total')) {
                $orderRevenue = Order::where('company_id', $company->id)
                    ->where('payment_status', 'paid')
                    ->sum('total') ?? 0;
                $revenue = (float) $orderRevenue;
            }
            
            // Добавляем доходы от завершенных бронирований без заказов
            if (Schema::hasTable('bookings') && Schema::hasColumn('bookings', 'status') && Schema::hasColumn('bookings', 'price')) {
                $bookingRevenue = Booking::where('company_id', $company->id)
                    ->where('status', 'completed')
                    ->whereDoesntHave('order')
                    ->sum('price') ?? 0;
                $revenue += (float) $bookingRevenue;
            }
            
            // Подсчитываем количество бронирований
            $bookingsCount = 0;
            if (Schema::hasTable('bookings')) {
                $bookingsCount = Booking::where('company_id', $company->id)->count();
            }
            
            return [
                'id' => $company->id,
                'name' => $company->name ?? 'N/A',
                'slug' => $company->slug ?? '',
                'owner' => $ownerName,
                'email' => $company->email ?? ($company->owner ? $company->owner->email : ''),
                'phone' => $company->phone ?? '',
                'category' => $company->category ?? '',
                'status' => $company->status ?? 'pending',
                'subscription' => $company->subscription_plan ?? null,
                'revenue' => $revenue,
                'bookings' => $bookingsCount,
                'createdAt' => $company->created_at ? $company->created_at->toISOString() : now()->toISOString(),
            ];
        });

        return response()->json([
            'data' => $data,
            'total' => $total,
        ]);
    }

    /**
     * Get company details.
     */
    public function show($id)
    {
        $company = Company::with(['owner.profile', 'services', 'bookings', 'reviews'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $company,
        ]);
    }

    /**
     * Create company.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'owner_id' => 'required|exists:users,id',
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:companies',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $company = Company::create($request->all());

        return response()->json([
            'success' => true,
            'data' => $company,
        ], 201);
    }

    /**
     * Update company.
     */
    public function update(Request $request, $id)
    {
        $company = Company::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255|unique:companies,slug,' . $id,
            'description' => 'nullable|string',
            'status' => 'sometimes|in:pending,active,suspended,rejected',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $company->update($request->only(['name', 'slug', 'description', 'status']));

        return response()->json([
            'success' => true,
            'data' => $company,
        ]);
    }

    /**
     * Delete company.
     */
    public function destroy($id)
    {
        $company = Company::findOrFail($id);
        $company->delete();

        return response()->json([
            'message' => 'Company deleted',
        ]);
    }

    /**
     * Approve company.
     */
    public function approve($id)
    {
        $company = Company::findOrFail($id);
        $company->update(['status' => 'active']);
        try {
            ActivityService::logCompanyApproved($company->fresh());
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Activity log approve: '.$e->getMessage());
        }

        return response()->json([
            'message' => 'Company approved',
        ]);
    }

    /**
     * Reject company.
     */
    public function reject($id)
    {
        $company = Company::findOrFail($id);
        $company->update(['status' => 'rejected']);
        try {
            ActivityService::logCompanyRejected($company->fresh());
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Activity log reject: '.$e->getMessage());
        }

        return response()->json([
            'message' => 'Company rejected',
        ]);
    }

    /**
     * Block company.
     */
    public function block($id)
    {
        $company = Company::findOrFail($id);
        $company->update(['status' => 'suspended']);
        try {
            ActivityService::logCompanyBlocked($company->fresh());
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Activity log block company: '.$e->getMessage());
        }

        return response()->json([
            'message' => 'Company blocked',
        ]);
    }

    /**
     * Get company statistics.
     */
    public function stats($id)
    {
        try {
            $company = Company::with(['bookings', 'reviews'])->findOrFail($id);
            $companyId = $company->id;

            $now = now();
            $startOfWeek = $now->copy()->startOfWeek();
            $startOfMonth = $now->copy()->startOfMonth();
            $startOfYear = $now->copy()->startOfYear();
            $todayStr = $now->format('Y-m-d');
            $weekStartStr = $startOfWeek->format('Y-m-d');
            $monthStartStr = $startOfMonth->format('Y-m-d');
            $yearStartStr = $startOfYear->format('Y-m-d');
            $bookingAmount = DB::raw('COALESCE(total_price, price)');

            // Выручка — как в бизнес-дашборде: заказы по оплате, брони completed по дате услуги (booking_date)
            $totalRevenue = 0;
            if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'payment_status') && Schema::hasColumn('orders', 'total')) {
                $orderRevenue = Order::where('company_id', $companyId)
                    ->where('payment_status', 'paid')
                    ->sum('total');
                $totalRevenue = $orderRevenue ? (float) $orderRevenue : 0;
            }

            if (Schema::hasTable('bookings') && Schema::hasColumn('bookings', 'status')) {
                $completedBookingsRevenue = (float) (Booking::where('company_id', $companyId)
                    ->where('status', 'completed')
                    ->whereDoesntHave('order')
                    ->sum($bookingAmount) ?? 0);
                $totalRevenue += $completedBookingsRevenue;
            }

            $thisWeekRevenue = 0;
            if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'payment_status')) {
                $thisWeekRevenue += (float) (Order::where('company_id', $companyId)
                    ->where('payment_status', 'paid')
                    ->where('created_at', '>=', $startOfWeek)
                    ->sum('total') ?? 0);
            }
            if (Schema::hasTable('bookings')) {
                $thisWeekRevenue += (float) (Booking::where('company_id', $companyId)
                    ->where('status', 'completed')
                    ->whereDoesntHave('order')
                    ->whereDate('booking_date', '>=', $weekStartStr)
                    ->whereDate('booking_date', '<=', $todayStr)
                    ->sum($bookingAmount) ?? 0);
            }

            $thisMonthRevenue = 0;
            if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'payment_status')) {
                $thisMonthRevenue += (float) (Order::where('company_id', $companyId)
                    ->where('payment_status', 'paid')
                    ->where('created_at', '>=', $startOfMonth)
                    ->sum('total') ?? 0);
            }
            if (Schema::hasTable('bookings')) {
                $thisMonthRevenue += (float) (Booking::where('company_id', $companyId)
                    ->where('status', 'completed')
                    ->whereDoesntHave('order')
                    ->whereDate('booking_date', '>=', $monthStartStr)
                    ->whereDate('booking_date', '<=', $todayStr)
                    ->sum($bookingAmount) ?? 0);
            }

            $thisYearRevenue = 0;
            if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'payment_status')) {
                $thisYearRevenue += (float) (Order::where('company_id', $companyId)
                    ->where('payment_status', 'paid')
                    ->where('created_at', '>=', $startOfYear)
                    ->sum('total') ?? 0);
            }
            if (Schema::hasTable('bookings')) {
                $thisYearRevenue += (float) (Booking::where('company_id', $companyId)
                    ->where('status', 'completed')
                    ->whereDoesntHave('order')
                    ->whereDate('booking_date', '>=', $yearStartStr)
                    ->whereDate('booking_date', '<=', $todayStr)
                    ->sum($bookingAmount) ?? 0);
            }

            $revenue = [
                'thisWeek' => $thisWeekRevenue,
                'thisMonth' => $thisMonthRevenue,
                'thisYear' => $thisYearRevenue,
                'total' => $totalRevenue,
            ];

            // Бронирования
            $bookings = $company->bookings ?? collect([]);
            $bookingsStats = [
                'thisWeek' => $bookings->where('created_at', '>=', $startOfWeek)->count(),
                'thisMonth' => $bookings->where('created_at', '>=', $startOfMonth)->count(),
                'thisYear' => $bookings->where('created_at', '>=', $startOfYear)->count(),
                'total' => $bookings->count(),
            ];

            // Клиенты (уникальные пользователи из бронирований)
            $uniqueClients = $bookings->pluck('user_id')->unique();
            $activeClients = $bookings->where('created_at', '>=', $startOfMonth)->pluck('user_id')->unique();
            $newClients = $bookings->where('created_at', '>=', $startOfMonth)->pluck('user_id')->unique();
            
            $clientsStats = [
                'total' => $uniqueClients->count(),
                'active' => $activeClients->count(),
                'new' => $newClients->count(),
            ];

            // Рейтинг (средний из отзывов)
            $reviews = $company->reviews ?? collect([]);
            $rating = $reviews->count() > 0 
                ? round($reviews->avg('rating'), 1) 
                : 0;

            return response()->json([
                'success' => true,
                'data' => [
                    'revenue' => $revenue,
                    'bookings' => $bookingsStats,
                    'clients' => $clientsStats,
                    'rating' => $rating,
                ],
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to fetch company stats', [
                'company_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch company stats',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get company chart data.
     */
    public function chart($id, Request $request)
    {
        try {
            $company = Company::findOrFail($id);
            $companyId = $company->id;
            $period = $request->get('period', 'thisWeek');

            $now = now();
            $data = [];
            $categories = [];

            $bookingSum = DB::raw('COALESCE(total_price, price)');

            if ($period === 'thisWeek') {
                $startDate = $now->copy()->startOfWeek();
                for ($i = 0; $i < 7; $i++) {
                    $date = $startDate->copy()->addDays($i);
                    $dayStart = $date->copy()->startOfDay();
                    $dayEnd = $date->copy()->endOfDay();
                    $dayFormatted = $date->format('Y-m-d');

                    $orderAmount = Order::where('company_id', $companyId)
                        ->where('payment_status', 'paid')
                        ->whereBetween('created_at', [$dayStart, $dayEnd])
                        ->sum('total') ?? 0;

                    $bookingsAmount = Booking::where('company_id', $companyId)
                        ->where('status', 'completed')
                        ->whereDoesntHave('order')
                        ->whereDate('booking_date', $dayFormatted)
                        ->sum($bookingSum) ?? 0;

                    $data[] = (float) $orderAmount + (float) $bookingsAmount;
                    $categories[] = $date->format('D');
                }
            } elseif ($period === 'thisMonth') {
                $startDate = $now->copy()->startOfMonth();
                $endDate = $now->copy()->endOfMonth();
                $daysInMonth = $endDate->day;

                for ($i = 1; $i <= $daysInMonth; $i += 5) {
                    $periodStart = $startDate->copy()->addDays($i - 1)->startOfDay();
                    $periodEnd = $startDate->copy()->addDays(min($i + 4, $daysInMonth) - 1)->endOfDay();
                    $periodStartDate = $periodStart->format('Y-m-d');
                    $periodEndDate = $periodEnd->format('Y-m-d');

                    $orderAmount = Order::where('company_id', $companyId)
                        ->where('payment_status', 'paid')
                        ->whereBetween('created_at', [$periodStart, $periodEnd])
                        ->sum('total') ?? 0;

                    $bookingsAmount = Booking::where('company_id', $companyId)
                        ->where('status', 'completed')
                        ->whereDoesntHave('order')
                        ->whereBetween('booking_date', [$periodStartDate, $periodEndDate])
                        ->sum($bookingSum) ?? 0;

                    $data[] = (float) $orderAmount + (float) $bookingsAmount;
                    $categories[] = $periodStart->format('d');
                }
            } elseif ($period === 'thisYear') {
                for ($i = 1; $i <= 12; $i++) {
                    $monthStart = $now->copy()->month($i)->startOfMonth();
                    $monthEnd = $now->copy()->month($i)->endOfMonth();
                    $monthStartDate = $monthStart->format('Y-m-d');
                    $monthEndDate = $monthEnd->format('Y-m-d');

                    $orderAmount = Order::where('company_id', $companyId)
                        ->where('payment_status', 'paid')
                        ->whereBetween('created_at', [$monthStart, $monthEnd])
                        ->sum('total') ?? 0;

                    $bookingAmount = Booking::where('company_id', $companyId)
                        ->where('status', 'completed')
                        ->whereDoesntHave('order')
                        ->whereBetween('booking_date', [$monthStartDate, $monthEndDate])
                        ->sum($bookingSum) ?? 0;

                    $data[] = (float) $orderAmount + (float) $bookingAmount;
                    $categories[] = $monthStart->format('M');
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'series' => [
                        [
                            'name' => 'Выручка',
                            'data' => $data,
                        ],
                    ],
                    'date' => $categories,
                    'categories' => $categories,
                ],
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to fetch company chart data', [
                'company_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch chart data',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get company team members.
     */
    public function getTeam($id)
    {
        $company = Company::findOrFail($id);
        
        // Ищем объявление типа 'regular' для этой компании
        $advertisement = Advertisement::where('company_id', $company->id)
            ->where('type', 'regular')
            ->first();

        // Если есть объявление с командой, возвращаем её
        if ($advertisement && $advertisement->team) {
            $adTeam = is_array($advertisement->team) ? $advertisement->team : json_decode($advertisement->team, true);
            if (!empty($adTeam)) {
                // Преобразуем формат для совместимости
                $formattedTeam = array_map(function($member, $index) {
                    return [
                        'id' => $member['id'] ?? $index + 1,
                        'name' => $member['name'] ?? '',
                        'email' => $member['email'] ?? '',
                        'phone' => $member['phone'] ?? '',
                        'role' => $member['role'] ?? '',
                        'status' => $member['status'] ?? 'active',
                        'img' => $member['img'] ?? $member['image'] ?? $member['avatar'] ?? null,
                    ];
                }, $adTeam, array_keys($adTeam));
                
                return response()->json([
                    'data' => $formattedTeam
                ]);
            }
        }

        return response()->json([
            'data' => []
        ]);
    }

    /**
     * Get company services.
     */
    public function getServices($id)
    {
        $company = Company::findOrFail($id);
        
        $services = Service::where('company_id', $company->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function ($service) {
                return [
                    'id' => $service->id,
                    'name' => $service->name,
                    'description' => $service->description,
                    'price' => (float) $service->price,
                    'duration_minutes' => $service->duration_minutes ?? 60,
                    'duration' => $service->duration_minutes ?? 60,
                    'category' => $service->category?->name ?? '',
                ];
            });

        return response()->json([
            'data' => $services
        ]);
    }

    /**
     * Get company users with roles.
     */
    public function getUsers($id)
    {
        $company = Company::with('owner.profile')->findOrFail($id);
        
        $users = [];
        
        // Добавляем владельца
        if ($company->owner) {
            $owner = $company->owner;
            $users[] = [
                'id' => $owner->id,
                'email' => $owner->email,
                'name' => $this->getUserName($owner),
                'first_name' => $owner->profile?->first_name ?? '',
                'last_name' => $owner->profile?->last_name ?? '',
                'role' => 'owner',
                'role_id' => null,
                'role_name' => 'Владелец',
                'status' => $owner->is_blocked ? 'blocked' : 'active',
                'avatar' => $owner->profile?->avatar,
                'phone' => $owner->profile?->phone,
                'last_login' => $owner->last_login_at?->toISOString(),
                'created_at' => $owner->created_at?->toISOString(),
            ];
        }
        
        // Добавляем сотрудников компании
        $companyUsers = \App\Models\CompanyUser::with(['user.profile', 'role'])
            ->where('company_id', $company->id)
            ->where('is_active', true)
            ->get();
        
        foreach ($companyUsers as $companyUser) {
            $user = $companyUser->user;
            if (!$user || $user->id === $company->owner_id) {
                continue; // Пропускаем владельца, он уже добавлен
            }
            
            $users[] = [
                'id' => $user->id,
                'email' => $user->email,
                'name' => $this->getUserName($user),
                'first_name' => $user->profile?->first_name ?? '',
                'last_name' => $user->profile?->last_name ?? '',
                'role' => $companyUser->role?->slug ?? 'staff',
                'role_id' => $companyUser->role_id,
                'role_name' => $companyUser->role?->name ?? 'Сотрудник',
                'status' => $user->is_blocked ? 'blocked' : 'active',
                'avatar' => $user->profile?->avatar,
                'phone' => $user->profile?->phone,
                'last_login' => $user->last_login_at?->toISOString(),
                'created_at' => $companyUser->created_at?->toISOString(),
            ];
        }

        return response()->json([
            'data' => $users,
            'total' => count($users),
        ]);
    }

    /**
     * Get user name from profile.
     */
    private function getUserName($user): string
    {
        if ($user->profile) {
            $firstName = $user->profile->first_name ?? '';
            $lastName = $user->profile->last_name ?? '';
            $name = trim($firstName . ' ' . $lastName);
            if ($name) {
                return $name;
            }
        }
        return $user->email;
    }

    /**
     * Роли компании (системные + свои).
     */
    public function getCompanyRoles($id)
    {
        Company::findOrFail($id);
        $roles = CompanyRole::where(function ($q) use ($id) {
            $q->where('company_id', $id)->orWhereNull('company_id');
        })->orderBy('name')->get(['id', 'name', 'slug', 'company_id']);

        return response()->json(['data' => $roles]);
    }

    /**
     * Обновить участника компании (профиль, роль сотрудника, блокировка).
     */
    public function updateCompanyUser(Request $request, $companyId, $userId)
    {
        $company = Company::findOrFail($companyId);
        $userId = (int) $userId;
        $companyUser = null;

        if ((int) $company->owner_id === $userId) {
            // владелец
        } else {
            $companyUser = CompanyUser::where('company_id', $companyId)->where('user_id', $userId)->first();
            if (! $companyUser) {
                return response()->json(['message' => 'User is not a member of this company'], 404);
            }
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|nullable|string|max:255',
            'last_name' => 'sometimes|nullable|string|max:255',
            'phone' => 'sometimes|nullable|string|max:30',
            'is_blocked' => 'sometimes|boolean',
            'role_id' => 'sometimes|nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $user = User::with('profile')->findOrFail($userId);
        $oldBlocked = $user->is_blocked;

        if ($request->has('is_blocked')) {
            if ((int) $company->owner_id === $userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot block company owner',
                ], 422);
            }
            $user->is_blocked = $request->boolean('is_blocked');
            $user->save();
            try {
                if ($user->is_blocked && ! $oldBlocked) {
                    ActivityService::logUserBlocked($user->fresh(), null, (int) $companyId);
                } elseif (! $user->is_blocked && $oldBlocked) {
                    ActivityService::logUserUnblocked($user->fresh(), null, (int) $companyId);
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Activity user block: '.$e->getMessage());
            }
        }

        if ($request->filled('role_id') && $companyUser) {
            $roleId = (int) $request->role_id;
            $roleOk = CompanyRole::where('id', $roleId)
                ->where(function ($q) use ($companyId) {
                    $q->where('company_id', $companyId)->orWhereNull('company_id');
                })->exists();
            if (! $roleOk) {
                return response()->json(['success' => false, 'message' => 'Invalid role'], 422);
            }
            $companyUser->role_id = $roleId;
            $companyUser->save();
        }

        $profile = UserProfile::firstOrNew(['user_id' => $userId]);
        $profileDirty = false;
        if ($request->has('first_name')) {
            $profile->first_name = $request->input('first_name') ?? '';
            $profileDirty = true;
        }
        if ($request->has('last_name')) {
            $profile->last_name = $request->input('last_name') ?? '';
            $profileDirty = true;
        }
        if ($request->has('phone')) {
            $profile->phone = $request->input('phone');
            $profileDirty = true;
        }
        if ($profileDirty) {
            $profile->user_id = $userId;
            $profile->save();
        }

        $user->load('profile');
        if ($companyUser) {
            $companyUser->refresh();
        }

        $roleSlug = 'owner';
        $roleName = 'Владелец';
        if ($companyUser) {
            $companyUser->load('role');
            $roleSlug = $companyUser->role?->slug ?? 'staff';
            $roleName = $companyUser->role?->name ?? 'Сотрудник';
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'email' => $user->email,
                'name' => $this->getUserName($user),
                'role' => $roleSlug,
                'role_name' => $roleName,
                'role_id' => $companyUser?->role_id,
                'status' => $user->is_blocked ? 'blocked' : 'active',
                'avatar' => $user->profile?->avatar,
                'phone' => $user->profile?->phone,
                'last_login' => $user->last_login_at?->toISOString(),
                'created_at' => $companyUser?->created_at?->toISOString() ?? $user->created_at?->toISOString(),
            ],
        ]);
    }
}


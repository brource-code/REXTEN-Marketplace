<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Advertisement;
use App\Models\Order;
use App\Models\Booking;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;

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
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
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

            // Выручка - учитываем как оплаченные заказы, так и завершенные бронирования без заказов
            $connection = \Illuminate\Support\Facades\DB::connection()->getDriverName();
            
            // Общая выручка
            $totalRevenue = 0;
            if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'payment_status') && Schema::hasColumn('orders', 'total')) {
                $orderRevenue = Order::where('company_id', $companyId)
                    ->where('payment_status', 'paid')
                    ->sum('total');
                $totalRevenue = $orderRevenue ? (float) $orderRevenue : 0;
            }
            
            // Добавляем доходы от завершенных бронирований без заказов
            if (Schema::hasTable('bookings') && Schema::hasColumn('bookings', 'status') && Schema::hasColumn('bookings', 'price')) {
                $completedBookingsRevenue = Booking::where('company_id', $companyId)
                    ->where('status', 'completed')
                    ->whereDoesntHave('order')
                    ->sum('price');
                $completedBookingsRevenue = $completedBookingsRevenue ? (float) $completedBookingsRevenue : 0;
                $totalRevenue += $completedBookingsRevenue;
            }

            // Выручка за неделю
            $thisWeekRevenue = 0;
            if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'payment_status')) {
                $thisWeekOrderRevenue = Order::where('company_id', $companyId)
                    ->where('payment_status', 'paid')
                    ->where('created_at', '>=', $startOfWeek)
                    ->sum('total');
                $thisWeekRevenue = $thisWeekOrderRevenue ? (float) $thisWeekOrderRevenue : 0;
            }
            if (Schema::hasTable('bookings')) {
                $thisWeekBookingRevenue = Booking::where('company_id', $companyId)
                    ->where('status', 'completed')
                    ->whereDoesntHave('order')
                    ->where('created_at', '>=', $startOfWeek)
                    ->sum('price');
                $thisWeekBookingRevenue = $thisWeekBookingRevenue ? (float) $thisWeekBookingRevenue : 0;
                $thisWeekRevenue += $thisWeekBookingRevenue;
            }

            // Выручка за месяц
            $thisMonthRevenue = 0;
            if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'payment_status')) {
                $thisMonthOrderRevenue = Order::where('company_id', $companyId)
                    ->where('payment_status', 'paid')
                    ->where('created_at', '>=', $startOfMonth)
                    ->sum('total');
                $thisMonthRevenue = $thisMonthOrderRevenue ? (float) $thisMonthOrderRevenue : 0;
            }
            if (Schema::hasTable('bookings')) {
                $thisMonthBookingRevenue = Booking::where('company_id', $companyId)
                    ->where('status', 'completed')
                    ->whereDoesntHave('order')
                    ->where('created_at', '>=', $startOfMonth)
                    ->sum('price');
                $thisMonthBookingRevenue = $thisMonthBookingRevenue ? (float) $thisMonthBookingRevenue : 0;
                $thisMonthRevenue += $thisMonthBookingRevenue;
            }

            // Выручка за год
            $thisYearRevenue = 0;
            if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'payment_status')) {
                $thisYearOrderRevenue = Order::where('company_id', $companyId)
                    ->where('payment_status', 'paid')
                    ->where('created_at', '>=', $startOfYear)
                    ->sum('total');
                $thisYearRevenue = $thisYearOrderRevenue ? (float) $thisYearOrderRevenue : 0;
            }
            if (Schema::hasTable('bookings')) {
                $thisYearBookingRevenue = Booking::where('company_id', $companyId)
                    ->where('status', 'completed')
                    ->whereDoesntHave('order')
                    ->where('created_at', '>=', $startOfYear)
                    ->sum('price');
                $thisYearBookingRevenue = $thisYearBookingRevenue ? (float) $thisYearBookingRevenue : 0;
                $thisYearRevenue += $thisYearBookingRevenue;
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
            $connection = \Illuminate\Support\Facades\DB::connection()->getDriverName();

            $now = now();
            $data = [];
            $categories = [];

            if ($period === 'thisWeek') {
                // Данные за последние 7 дней
                $startDate = $now->copy()->startOfWeek();
                for ($i = 0; $i < 7; $i++) {
                    $date = $startDate->copy()->addDays($i);
                    $dayStart = $date->copy()->startOfDay();
                    $dayEnd = $date->copy()->endOfDay();
                    
                    // Доходы из заказов
                    $orderAmount = Order::where('company_id', $companyId)
                        ->where('payment_status', 'paid')
                        ->whereBetween('created_at', [$dayStart, $dayEnd])
                        ->sum('total') ?? 0;
                    
                    // Доходы из завершенных бронирований без заказов
                    $bookingAmount = Booking::where('company_id', $companyId)
                        ->where('status', 'completed')
                        ->whereDoesntHave('order')
                        ->whereBetween('created_at', [$dayStart, $dayEnd])
                        ->sum('price') ?? 0;
                    
                    $data[] = (float) $orderAmount + (float) $bookingAmount;
                    $categories[] = $date->format('D');
                }
            } elseif ($period === 'thisMonth') {
                // Данные за текущий месяц по дням
                $startDate = $now->copy()->startOfMonth();
                $endDate = $now->copy()->endOfMonth();
                $daysInMonth = $endDate->day;
                
                for ($i = 1; $i <= $daysInMonth; $i += 5) {
                    $date = $startDate->copy()->addDays($i - 1);
                    $dayStart = $date->copy()->startOfDay();
                    $dayEnd = $date->copy()->endOfDay();
                    
                    // Доходы из заказов
                    $orderAmount = Order::where('company_id', $companyId)
                        ->where('payment_status', 'paid')
                        ->whereBetween('created_at', [$dayStart, $dayEnd])
                        ->sum('total') ?? 0;
                    
                    // Доходы из завершенных бронирований без заказов
                    $bookingAmount = Booking::where('company_id', $companyId)
                        ->where('status', 'completed')
                        ->whereDoesntHave('order')
                        ->whereBetween('created_at', [$dayStart, $dayEnd])
                        ->sum('price') ?? 0;
                    
                    $data[] = (float) $orderAmount + (float) $bookingAmount;
                    $categories[] = $date->format('d');
                }
            } elseif ($period === 'thisYear') {
                // Данные за текущий год по месяцам
                for ($i = 1; $i <= 12; $i++) {
                    $monthStart = $now->copy()->month($i)->startOfMonth();
                    $monthEnd = $now->copy()->month($i)->endOfMonth();
                    
                    // Доходы из заказов
                    if ($connection === 'sqlite') {
                        $orderAmount = Order::where('company_id', $companyId)
                            ->where('payment_status', 'paid')
                            ->whereRaw("strftime('%m', created_at) = ?", [str_pad($i, 2, '0', STR_PAD_LEFT)])
                            ->whereRaw("strftime('%Y', created_at) = ?", [$now->year])
                            ->sum('total') ?? 0;
                        
                        $bookingAmount = Booking::where('company_id', $companyId)
                            ->where('status', 'completed')
                            ->whereDoesntHave('order')
                            ->whereRaw("strftime('%m', created_at) = ?", [str_pad($i, 2, '0', STR_PAD_LEFT)])
                            ->whereRaw("strftime('%Y', created_at) = ?", [$now->year])
                            ->sum('price') ?? 0;
                    } else {
                        $orderAmount = Order::where('company_id', $companyId)
                            ->where('payment_status', 'paid')
                            ->whereBetween('created_at', [$monthStart, $monthEnd])
                            ->sum('total') ?? 0;
                        
                        $bookingAmount = Booking::where('company_id', $companyId)
                            ->where('status', 'completed')
                            ->whereDoesntHave('order')
                            ->whereBetween('created_at', [$monthStart, $monthEnd])
                            ->sum('price') ?? 0;
                    }
                    
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
}


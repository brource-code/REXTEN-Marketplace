<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use App\Models\Order;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    /**
     * Get platform statistics.
     */
    public function stats()
    {
        try {
            // Total companies
            $totalCompanies = Company::where('status', 'active')->count();

            // Total users
            $totalUsers = User::where('is_active', true)->count();

            // Total revenue - учитываем как оплаченные заказы, так и завершенные бронирования без заказов
            $totalRevenue = 0;
            if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'payment_status') && Schema::hasColumn('orders', 'total')) {
                $totalRevenue = Order::where('payment_status', 'paid')->sum('total') ?? 0;
            }
            
            // Добавляем доходы от завершенных бронирований, которые не имеют заказа
            if (Schema::hasTable('bookings') && Schema::hasColumn('bookings', 'status') && Schema::hasColumn('bookings', 'price')) {
                $completedBookingsRevenue = Booking::where('status', 'completed')
                    ->whereDoesntHave('order')
                    ->sum('price') ?? 0;
                $totalRevenue = (float) $totalRevenue + (float) $completedBookingsRevenue;
            }

            // Active bookings - проверяем существование таблицы и колонок
            $activeBookings = 0;
            if (Schema::hasTable('bookings')) {
                if (Schema::hasColumn('bookings', 'status') && Schema::hasColumn('bookings', 'booking_date')) {
                    $activeBookings = Booking::whereIn('status', ['pending', 'confirmed'])
                        ->where('booking_date', '>=', now())
                        ->count();
                }
            }

            // Revenue by period (last 6 months) - учитываем как оплаченные заказы, так и завершенные бронирования
            $revenueByPeriod = [];
            if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'payment_status') && Schema::hasColumn('orders', 'total')) {
                $connection = DB::connection()->getDriverName();
                
                // Получаем доходы из заказов
                if ($connection === 'sqlite') {
                    $orderRevenue = Order::where('payment_status', 'paid')
                        ->where('created_at', '>=', now()->subMonths(6))
                        ->select(
                            DB::raw('strftime("%Y-%m", created_at) as period'),
                            DB::raw('SUM(total) as amount')
                        )
                        ->groupBy('period')
                        ->get()
                        ->keyBy('period');
                } else {
                    $orderRevenue = Order::where('payment_status', 'paid')
                        ->where('created_at', '>=', now()->subMonths(6))
                        ->select(
                            DB::raw('DATE_FORMAT(created_at, "%Y-%m") as period'),
                            DB::raw('SUM(total) as amount')
                        )
                        ->groupBy('period')
                        ->get()
                        ->keyBy('period');
                }
                
                // Получаем доходы из завершенных бронирований без заказов
                if (Schema::hasTable('bookings') && Schema::hasColumn('bookings', 'status') && Schema::hasColumn('bookings', 'price')) {
                    if ($connection === 'sqlite') {
                        $bookingRevenue = Booking::where('status', 'completed')
                            ->whereDoesntHave('order')
                            ->where('created_at', '>=', now()->subMonths(6))
                            ->select(
                                DB::raw('strftime("%Y-%m", created_at) as period'),
                                DB::raw('SUM(price) as amount')
                            )
                            ->groupBy('period')
                            ->get()
                            ->keyBy('period');
                    } else {
                        $bookingRevenue = Booking::where('status', 'completed')
                            ->whereDoesntHave('order')
                            ->where('created_at', '>=', now()->subMonths(6))
                            ->select(
                                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as period'),
                                DB::raw('SUM(price) as amount')
                            )
                            ->groupBy('period')
                            ->get()
                            ->keyBy('period');
                    }
                    
                    // Объединяем доходы из заказов и бронирований
                    $allPeriods = $orderRevenue->keys()->merge($bookingRevenue->keys())->unique();
                    $revenueByPeriod = $allPeriods->map(function ($period) use ($orderRevenue, $bookingRevenue) {
                        $orderAmount = (float) ($orderRevenue->get($period)->amount ?? 0);
                        $bookingAmount = (float) ($bookingRevenue->get($period)->amount ?? 0);
                        return [
                            'period' => $period,
                            'amount' => $orderAmount + $bookingAmount,
                        ];
                    })->sortBy('period')->values()->toArray();
                } else {
                    $revenueByPeriod = $orderRevenue->map(function ($item) {
                        return [
                            'period' => $item->period,
                            'amount' => (float) $item->amount,
                        ];
                    })->values()->toArray();
                }
            }

            // Рассчитываем статистику по периодам
            $now = now();
            $startOfWeek = $now->copy()->startOfWeek();
            $startOfMonth = $now->copy()->startOfMonth();
            $startOfYear = $now->copy()->startOfYear();

            // Выручка по периодам
            $revenueThisWeek = 0;
            $revenueThisMonth = 0;
            $revenueThisYear = 0;

            // Выручка за неделю
            $weekOrderRevenue = 0;
            $weekBookingRevenue = 0;
            if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'payment_status')) {
                $weekOrderRevenue = Order::where('payment_status', 'paid')
                    ->where('created_at', '>=', $startOfWeek)
                    ->sum('total');
                $weekOrderRevenue = $weekOrderRevenue ? (float) $weekOrderRevenue : 0;
            }
            if (Schema::hasTable('bookings') && Schema::hasColumn('bookings', 'status')) {
                $weekBookingRevenue = Booking::where('status', 'completed')
                    ->whereDoesntHave('order')
                    ->where('created_at', '>=', $startOfWeek)
                    ->sum('price');
                $weekBookingRevenue = $weekBookingRevenue ? (float) $weekBookingRevenue : 0;
            }
            $revenueThisWeek = $weekOrderRevenue + $weekBookingRevenue;

            // Выручка за месяц
            $monthOrderRevenue = 0;
            $monthBookingRevenue = 0;
            if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'payment_status')) {
                $monthOrderRevenue = Order::where('payment_status', 'paid')
                    ->where('created_at', '>=', $startOfMonth)
                    ->sum('total');
                $monthOrderRevenue = $monthOrderRevenue ? (float) $monthOrderRevenue : 0;
            }
            if (Schema::hasTable('bookings') && Schema::hasColumn('bookings', 'status')) {
                $monthBookingRevenue = Booking::where('status', 'completed')
                    ->whereDoesntHave('order')
                    ->where('created_at', '>=', $startOfMonth)
                    ->sum('price');
                $monthBookingRevenue = $monthBookingRevenue ? (float) $monthBookingRevenue : 0;
            }
            $revenueThisMonth = $monthOrderRevenue + $monthBookingRevenue;

            // Выручка за год
            $yearOrderRevenue = 0;
            $yearBookingRevenue = 0;
            if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'payment_status')) {
                $yearOrderRevenue = Order::where('payment_status', 'paid')
                    ->where('created_at', '>=', $startOfYear)
                    ->sum('total');
                $yearOrderRevenue = $yearOrderRevenue ? (float) $yearOrderRevenue : 0;
            }
            if (Schema::hasTable('bookings') && Schema::hasColumn('bookings', 'status')) {
                $yearBookingRevenue = Booking::where('status', 'completed')
                    ->whereDoesntHave('order')
                    ->where('created_at', '>=', $startOfYear)
                    ->sum('price');
                $yearBookingRevenue = $yearBookingRevenue ? (float) $yearBookingRevenue : 0;
            }
            $revenueThisYear = $yearOrderRevenue + $yearBookingRevenue;

            // Бизнесы по периодам
            $businessesThisWeek = Company::where('status', 'active')
                ->where('created_at', '>=', $startOfWeek)
                ->count();
            $businessesThisMonth = Company::where('status', 'active')
                ->where('created_at', '>=', $startOfMonth)
                ->count();
            $businessesThisYear = Company::where('status', 'active')
                ->where('created_at', '>=', $startOfYear)
                ->count();

            // Пользователи по периодам
            $usersThisWeek = User::where('is_active', true)
                ->where('created_at', '>=', $startOfWeek)
                ->count();
            $usersThisMonth = User::where('is_active', true)
                ->where('created_at', '>=', $startOfMonth)
                ->count();
            $usersThisYear = User::where('is_active', true)
                ->where('created_at', '>=', $startOfYear)
                ->count();

            return response()->json([
                'totalCompanies' => $totalCompanies,
                'totalUsers' => $totalUsers,
                'totalRevenue' => (float) $totalRevenue,
                'activeBookings' => $activeBookings,
                'revenueByPeriod' => $revenueByPeriod,
                // Данные по периодам
                'revenue' => [
                    'thisWeek' => $revenueThisWeek,
                    'thisMonth' => $revenueThisMonth,
                    'thisYear' => $revenueThisYear,
                ],
                'businesses' => [
                    'thisWeek' => $businessesThisWeek,
                    'thisMonth' => $businessesThisMonth,
                    'thisYear' => $businessesThisYear,
                ],
                'users' => [
                    'thisWeek' => $usersThisWeek,
                    'thisMonth' => $usersThisMonth,
                    'thisYear' => $usersThisYear,
                ],
            ]);
        } catch (\Exception $e) {
            // Логируем ошибку только если logger настроен
            try {
                if (config('logging.default')) {
                    \Illuminate\Support\Facades\Log::error('Dashboard stats error: ' . $e->getMessage());
                }
            } catch (\Exception $logError) {
                // Игнорируем ошибки логирования
            }
            
            return response()->json([
                'message' => 'Failed to fetch platform statistics',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get chart data for dashboard.
     */
    public function chart(Request $request)
    {
        try {
            $category = $request->get('category', 'revenue');
            $period = $request->get('period', 'thisMonth');
            $connection = DB::connection()->getDriverName();

            $now = now();
            $data = [];
            $categories = [];

            if ($category === 'revenue') {
                if ($period === 'thisWeek') {
                    // Данные за последние 7 дней - учитываем как оплаченные заказы, так и завершенные бронирования
                    $startDate = $now->copy()->startOfWeek();
                    for ($i = 0; $i < 7; $i++) {
                        $date = $startDate->copy()->addDays($i);
                        $dayStart = $date->copy()->startOfDay();
                        $dayEnd = $date->copy()->endOfDay();
                        
                        // Доходы из заказов
                        $orderAmount = Order::where('payment_status', 'paid')
                            ->whereBetween('created_at', [$dayStart, $dayEnd])
                            ->sum('total') ?? 0;
                        
                        // Доходы из завершенных бронирований без заказов
                        $bookingAmount = Booking::where('status', 'completed')
                            ->whereDoesntHave('order')
                            ->whereBetween('created_at', [$dayStart, $dayEnd])
                            ->sum('price') ?? 0;
                        
                        $data[] = (float) $orderAmount + (float) $bookingAmount;
                        $categories[] = $date->format('D');
                    }
                } elseif ($period === 'thisMonth') {
                    // Данные за текущий месяц по дням - учитываем как оплаченные заказы, так и завершенные бронирования
                    $startDate = $now->copy()->startOfMonth();
                    $endDate = $now->copy()->endOfMonth();
                    $daysInMonth = $endDate->day;
                    
                    // Берем каждые 5 дней для оптимизации, но суммируем данные за весь период
                    for ($i = 1; $i <= $daysInMonth; $i += 5) {
                        $periodStart = $startDate->copy()->addDays($i - 1)->startOfDay();
                        $periodEnd = $startDate->copy()->addDays(min($i + 4, $daysInMonth) - 1)->endOfDay();
                        
                        // Доходы из заказов
                        $orderAmount = Order::where('payment_status', 'paid')
                            ->whereBetween('created_at', [$periodStart, $periodEnd])
                            ->sum('total') ?? 0;
                        
                        // Доходы из завершенных бронирований без заказов
                        $bookingAmount = Booking::where('status', 'completed')
                            ->whereDoesntHave('order')
                            ->whereBetween('created_at', [$periodStart, $periodEnd])
                            ->sum('price') ?? 0;
                        
                        $data[] = (float) $orderAmount + (float) $bookingAmount;
                        $categories[] = $periodStart->format('d');
                    }
                } elseif ($period === 'thisYear') {
                    // Данные за текущий год по месяцам - учитываем как оплаченные заказы, так и завершенные бронирования
                    for ($i = 1; $i <= 12; $i++) {
                        $monthStart = $now->copy()->month($i)->startOfMonth();
                        $monthEnd = $now->copy()->month($i)->endOfMonth();
                        
                        // Доходы из заказов
                        if ($connection === 'sqlite') {
                            $orderAmount = Order::where('payment_status', 'paid')
                                ->whereRaw("strftime('%m', created_at) = ?", [str_pad($i, 2, '0', STR_PAD_LEFT)])
                                ->whereRaw("strftime('%Y', created_at) = ?", [$now->year])
                                ->sum('total') ?? 0;
                            
                            $bookingAmount = Booking::where('status', 'completed')
                                ->whereDoesntHave('order')
                                ->whereRaw("strftime('%m', created_at) = ?", [str_pad($i, 2, '0', STR_PAD_LEFT)])
                                ->whereRaw("strftime('%Y', created_at) = ?", [$now->year])
                                ->sum('price') ?? 0;
                        } else {
                            $orderAmount = Order::where('payment_status', 'paid')
                                ->whereBetween('created_at', [$monthStart, $monthEnd])
                                ->sum('total') ?? 0;
                            
                            $bookingAmount = Booking::where('status', 'completed')
                                ->whereDoesntHave('order')
                                ->whereBetween('created_at', [$monthStart, $monthEnd])
                                ->sum('price') ?? 0;
                        }
                        
                        $data[] = (float) $orderAmount + (float) $bookingAmount;
                        $categories[] = $monthStart->format('M');
                    }
                }
            } elseif ($category === 'businesses') {
                if ($period === 'thisWeek') {
                    $startDate = $now->copy()->startOfWeek();
                    for ($i = 0; $i < 7; $i++) {
                        $date = $startDate->copy()->addDays($i);
                        $dayStart = $date->copy()->startOfDay();
                        $dayEnd = $date->copy()->endOfDay();
                        
                        $count = Company::where('status', 'active')
                            ->whereBetween('created_at', [$dayStart, $dayEnd])
                            ->count();
                        
                        $data[] = $count;
                        $categories[] = $date->format('D');
                    }
                } elseif ($period === 'thisMonth') {
                    $startDate = $now->copy()->startOfMonth();
                    $endDate = $now->copy()->endOfMonth();
                    $daysInMonth = $endDate->day;
                    
                    for ($i = 1; $i <= $daysInMonth; $i += 5) {
                        $date = $startDate->copy()->addDays($i - 1);
                        $dayStart = $date->copy()->startOfDay();
                        $dayEnd = $date->copy()->endOfDay();
                        
                        $count = Company::where('status', 'active')
                            ->whereBetween('created_at', [$dayStart, $dayEnd])
                            ->count();
                        
                        $data[] = $count;
                        $categories[] = $date->format('d');
                    }
                } elseif ($period === 'thisYear') {
                    for ($i = 1; $i <= 12; $i++) {
                        $monthStart = $now->copy()->month($i)->startOfMonth();
                        $monthEnd = $now->copy()->month($i)->endOfMonth();
                        
                        if ($connection === 'sqlite') {
                            $count = Company::where('status', 'active')
                                ->whereRaw("strftime('%m', created_at) = ?", [str_pad($i, 2, '0', STR_PAD_LEFT)])
                                ->whereRaw("strftime('%Y', created_at) = ?", [$now->year])
                                ->count();
                        } else {
                            $count = Company::where('status', 'active')
                                ->whereBetween('created_at', [$monthStart, $monthEnd])
                                ->count();
                        }
                        
                        $data[] = $count;
                        $categories[] = $monthStart->format('M');
                    }
                }
            } elseif ($category === 'users') {
                if ($period === 'thisWeek') {
                    $startDate = $now->copy()->startOfWeek();
                    for ($i = 0; $i < 7; $i++) {
                        $date = $startDate->copy()->addDays($i);
                        $dayStart = $date->copy()->startOfDay();
                        $dayEnd = $date->copy()->endOfDay();
                        
                        $count = User::where('is_active', true)
                            ->whereBetween('created_at', [$dayStart, $dayEnd])
                            ->count();
                        
                        $data[] = $count;
                        $categories[] = $date->format('D');
                    }
                } elseif ($period === 'thisMonth') {
                    $startDate = $now->copy()->startOfMonth();
                    $endDate = $now->copy()->endOfMonth();
                    $daysInMonth = $endDate->day;
                    
                    for ($i = 1; $i <= $daysInMonth; $i += 5) {
                        $date = $startDate->copy()->addDays($i - 1);
                        $dayStart = $date->copy()->startOfDay();
                        $dayEnd = $date->copy()->endOfDay();
                        
                        $count = User::where('is_active', true)
                            ->whereBetween('created_at', [$dayStart, $dayEnd])
                            ->count();
                        
                        $data[] = $count;
                        $categories[] = $date->format('d');
                    }
                } elseif ($period === 'thisYear') {
                    for ($i = 1; $i <= 12; $i++) {
                        $monthStart = $now->copy()->month($i)->startOfMonth();
                        $monthEnd = $now->copy()->month($i)->endOfMonth();
                        
                        if ($connection === 'sqlite') {
                            $count = User::where('is_active', true)
                                ->whereRaw("strftime('%m', created_at) = ?", [str_pad($i, 2, '0', STR_PAD_LEFT)])
                                ->whereRaw("strftime('%Y', created_at) = ?", [$now->year])
                                ->count();
                        } else {
                            $count = User::where('is_active', true)
                                ->whereBetween('created_at', [$monthStart, $monthEnd])
                                ->count();
                        }
                        
                        $data[] = $count;
                        $categories[] = $monthStart->format('M');
                    }
                }
            }

            $categoryLabels = [
                'revenue' => 'Выручка',
                'businesses' => 'Бизнесы',
                'users' => 'Пользователи',
            ];

            \Log::info('Admin Chart Data', [
                'category' => $category,
                'period' => $period,
                'data' => $data,
                'categories' => $categories,
            ]);

            return response()->json([
                'series' => [
                    [
                        'name' => $categoryLabels[$category] ?? $category,
                        'data' => $data,
                    ],
                ],
                'date' => $categories,
                'categories' => $categories,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error fetching chart data',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get recent activity for dashboard.
     */
    public function recentActivity()
    {
        try {
            $activities = [];
            $limit = 10;

            // Получаем последние регистрации компаний
            $recentCompanies = Company::where('status', 'active')
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get();

            foreach ($recentCompanies as $company) {
                $activities[] = [
                    'id' => 'company_' . $company->id,
                    'type' => 'business_registered',
                    'title' => 'Новая компания зарегистрирована',
                    'description' => $company->name . ' зарегистрирована на платформе',
                    'time' => $company->created_at->diffForHumans(),
                    'status' => 'approved',
                    'created_at' => $company->created_at->timestamp,
                ];
            }

            // Получаем последние регистрации пользователей
            $recentUsers = User::where('is_active', true)
                ->where('role', '!=', 'SUPERADMIN')
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get();

            foreach ($recentUsers as $user) {
                $activities[] = [
                    'id' => 'user_' . $user->id,
                    'type' => 'user_registered',
                    'title' => 'Новый пользователь зарегистрирован',
                    'description' => 'Пользователь ' . ($user->name ?? $user->email) . ' зарегистрирован',
                    'time' => $user->created_at->diffForHumans(),
                    'status' => 'approved',
                    'created_at' => $user->created_at->timestamp,
                ];
            }

            // Получаем последние оплаченные заказы
            if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'payment_status')) {
                $recentOrders = Order::where('payment_status', 'paid')
                    ->orderBy('created_at', 'desc')
                    ->limit($limit)
                    ->with('company:id,name')
                    ->get();

                foreach ($recentOrders as $order) {
                    $activities[] = [
                        'id' => 'order_' . $order->id,
                        'type' => 'payment_received',
                        'title' => 'Получен платеж',
                        'description' => 'Платеж на сумму $' . number_format($order->total, 2) . ' от ' . ($order->company->name ?? 'компании'),
                        'time' => $order->created_at->diffForHumans(),
                        'status' => 'completed',
                        'created_at' => $order->created_at->timestamp,
                    ];
                }
            }

            // Сортируем по времени создания (новые первыми) и ограничиваем
            usort($activities, function ($a, $b) {
                return $b['created_at'] <=> $a['created_at'];
            });

            // Удаляем временное поле created_at перед отправкой
            $activities = array_map(function ($activity) {
                unset($activity['created_at']);
                return $activity;
            }, array_slice($activities, 0, $limit));

            return response()->json($activities);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error fetching recent activity',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}


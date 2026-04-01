<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Order;
use App\Models\User;
use App\Models\Advertisement;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    /**
     * Get business statistics.
     */
    public function stats(Request $request)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            // Если company_id не передан через middleware, пытаемся получить из пользователя
            if (!$companyId) {
                $user = auth('api')->user();
                if ($user && $user->isBusinessOwner()) {
                    $company = $user->ownedCompanies()->first();
                    if ($company) {
                        $companyId = $company->id;
                    }
                }
            }
            
            if (!$companyId) {
                Log::error('Business Dashboard Stats: Company ID not found', [
                    'user_id' => auth('api')->id(),
                    'request_data' => $request->all(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }
            
            Log::info('Business Dashboard Stats: Processing', [
                'company_id' => $companyId,
            ]);

            // Total bookings
            $totalBookings = Booking::where('company_id', $companyId)->count();

            // Total revenue - только завершенные бронирования (completed)
            $totalRevenue = Booking::where('company_id', $companyId)
                ->where('status', 'completed')
                ->sum(DB::raw('COALESCE(total_price, price)'));
            $totalRevenue = $totalRevenue ? (float) $totalRevenue : 0;

            // Revenue in work - активные бронирования (new, pending, confirmed) - все кроме завершенных и отмененных
            $revenueInWork = Booking::where('company_id', $companyId)
                ->whereIn('status', ['new', 'pending', 'confirmed'])
                ->sum(DB::raw('COALESCE(total_price, price)'));
            $revenueInWork = $revenueInWork ? (float) $revenueInWork : 0;

            // Active clients
            $activeClients = Booking::where('company_id', $companyId)
                ->distinct('user_id')
                ->count('user_id');

            // Upcoming bookings
            $upcomingBookings = Booking::where('company_id', $companyId)
                ->where('booking_date', '>=', now()->startOfDay())
                ->whereIn('status', ['new', 'pending', 'confirmed']) // Включаем статус 'new'
                ->count();

            // Active advertisements
            $activeAdvertisements = Advertisement::where('company_id', $companyId)
                ->where('is_active', true)
                ->where('status', 'approved')
                ->count();

            // Revenue by period (last 6 months) - учитываем как оплаченные заказы, так и завершенные бронирования
            $connection = DB::connection()->getDriverName();
            
            // Получаем доходы из заказов
            if ($connection === 'sqlite') {
                $orderRevenue = Order::where('company_id', $companyId)
                    ->where('payment_status', 'paid')
                    ->where('created_at', '>=', now()->subMonths(6))
                    ->select(
                        DB::raw('strftime("%Y-%m", created_at) as period'),
                        DB::raw('SUM(total) as amount')
                    )
                    ->groupBy('period')
                    ->get()
                    ->keyBy('period');
            } else {
                $orderRevenue = Order::where('company_id', $companyId)
                    ->where('payment_status', 'paid')
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
            // Используем total_price вместо price, чтобы учесть дополнительные услуги
            if ($connection === 'sqlite') {
                $bookingRevenue = Booking::where('company_id', $companyId)
                    ->where('status', 'completed')
                    ->whereDoesntHave('order')
                    ->where('created_at', '>=', now()->subMonths(6))
                    ->select(
                        DB::raw('strftime("%Y-%m", created_at) as period'),
                        DB::raw('SUM(COALESCE(total_price, price)) as amount')
                    )
                    ->groupBy('period')
                    ->get()
                    ->keyBy('period');
            } else {
                $bookingRevenue = Booking::where('company_id', $companyId)
                    ->where('status', 'completed')
                    ->whereDoesntHave('order')
                    ->where('created_at', '>=', now()->subMonths(6))
                    ->select(
                        DB::raw('DATE_FORMAT(created_at, "%Y-%m") as period'),
                        DB::raw('SUM(COALESCE(total_price, price)) as amount')
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
            })->sortBy('period')->values();

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
            $weekOrderRevenue = Order::where('company_id', $companyId)
                ->where('payment_status', 'paid')
                ->where('created_at', '>=', $startOfWeek)
                ->sum('total');
            $weekOrderRevenue = $weekOrderRevenue ? (float) $weekOrderRevenue : 0;
            $weekBookingRevenue = Booking::where('company_id', $companyId)
                ->where('status', 'completed')
                ->whereDoesntHave('order')
                ->where('created_at', '>=', $startOfWeek)
                ->sum(DB::raw('COALESCE(total_price, price)'));
            $weekBookingRevenue = $weekBookingRevenue ? (float) $weekBookingRevenue : 0;
            $revenueThisWeek = $weekOrderRevenue + $weekBookingRevenue;

            // Выручка за месяц
            $monthOrderRevenue = Order::where('company_id', $companyId)
                ->where('payment_status', 'paid')
                ->where('created_at', '>=', $startOfMonth)
                ->sum('total');
            $monthOrderRevenue = $monthOrderRevenue ? (float) $monthOrderRevenue : 0;
            $monthBookingRevenue = Booking::where('company_id', $companyId)
                ->where('status', 'completed')
                ->whereDoesntHave('order')
                ->where('created_at', '>=', $startOfMonth)
                ->sum(DB::raw('COALESCE(total_price, price)'));
            $monthBookingRevenue = $monthBookingRevenue ? (float) $monthBookingRevenue : 0;
            $revenueThisMonth = $monthOrderRevenue + $monthBookingRevenue;

            // Выручка за год
            $yearOrderRevenue = Order::where('company_id', $companyId)
                ->where('payment_status', 'paid')
                ->where('created_at', '>=', $startOfYear)
                ->sum('total');
            $yearOrderRevenue = $yearOrderRevenue ? (float) $yearOrderRevenue : 0;
            $yearBookingRevenue = Booking::where('company_id', $companyId)
                ->where('status', 'completed')
                ->whereDoesntHave('order')
                ->where('created_at', '>=', $startOfYear)
                ->sum(DB::raw('COALESCE(total_price, price)'));
            $yearBookingRevenue = $yearBookingRevenue ? (float) $yearBookingRevenue : 0;
            $revenueThisYear = $yearOrderRevenue + $yearBookingRevenue;

            // Бронирования по периодам
            $bookingsThisWeek = Booking::where('company_id', $companyId)
                ->where('created_at', '>=', $startOfWeek)
                ->count();
            $bookingsThisMonth = Booking::where('company_id', $companyId)
                ->where('created_at', '>=', $startOfMonth)
                ->count();
            $bookingsThisYear = Booking::where('company_id', $companyId)
                ->where('created_at', '>=', $startOfYear)
                ->count();

            // Клиенты по периодам
            $clientsThisWeek = Booking::where('company_id', $companyId)
                ->where('created_at', '>=', $startOfWeek)
                ->distinct('user_id')
                ->count('user_id');
            $clientsThisMonth = Booking::where('company_id', $companyId)
                ->where('created_at', '>=', $startOfMonth)
                ->distinct('user_id')
                ->count('user_id');
            $clientsThisYear = Booking::where('company_id', $companyId)
                ->where('created_at', '>=', $startOfYear)
                ->distinct('user_id')
                ->count('user_id');

            $response = [
                'totalBookings' => $totalBookings,
                'totalRevenue' => (float) $totalRevenue,
                'revenueInWork' => (float) $revenueInWork,
                'activeClients' => $activeClients,
                'upcomingBookings' => $upcomingBookings,
                'activeAdvertisements' => $activeAdvertisements,
                'revenueByPeriod' => $revenueByPeriod,
                // Данные по периодам
                'revenue' => [
                    'thisWeek' => $revenueThisWeek,
                    'thisMonth' => $revenueThisMonth,
                    'thisYear' => $revenueThisYear,
                ],
                'bookings' => [
                    'thisWeek' => $bookingsThisWeek,
                    'thisMonth' => $bookingsThisMonth,
                    'thisYear' => $bookingsThisYear,
                ],
                'clients' => [
                    'thisWeek' => $clientsThisWeek,
                    'thisMonth' => $clientsThisMonth,
                    'thisYear' => $clientsThisYear,
                ],
            ];
            
            return response()->json($response);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error fetching dashboard stats',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get recent bookings.
     */
    public function recentBookings(Request $request)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                return response()->json([
                    'message' => 'Company not found',
                ], 404);
            }

            $limit = (int) $request->get('limit', 5);

            $bookings = Booking::where('company_id', $companyId)
                ->whereNotNull('booking_date')
                ->whereIn('status', ['new', 'pending', 'confirmed', 'completed', 'cancelled']) // Включаем все статусы
                ->with(['service:id,name', 'user.profile'])
                ->orderBy('booking_date', 'desc')
                ->orderBy('booking_time', 'desc')
                ->limit($limit)
                ->get();

            $data = $bookings->map(function ($booking) {
                // Получаем имя из профиля, если есть, иначе из user.name, иначе из client_name, иначе 'Unknown'
                $customerName = 'Unknown';
                
                if ($booking->user) {
                    // Сначала пытаемся получить имя из профиля
                    if ($booking->user->profile) {
                        $firstName = $booking->user->profile->first_name ?? '';
                        $lastName = $booking->user->profile->last_name ?? '';
                        $fullName = trim($firstName . ' ' . $lastName);
                        if (!empty($fullName)) {
                            $customerName = $fullName;
                        }
                    }
                    
                    // Если имя из профиля не получилось, используем user.name
                    if ($customerName === 'Unknown' && !empty($booking->user->name)) {
                        $customerName = $booking->user->name;
                    }
                }
                
                // Если все еще Unknown, используем client_name из бронирования
                if ($customerName === 'Unknown' && !empty($booking->client_name)) {
                    $customerName = $booking->client_name;
                }
                
                // Получаем имя услуги из объявления, если есть advertisement_id
                $serviceName = 'Service';
                if ($booking->advertisement_id) {
                    $advertisement = \App\Models\Advertisement::find($booking->advertisement_id);
                    if ($advertisement && $advertisement->services) {
                        $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                        $serviceData = collect($services)->first(function ($s) use ($booking) {
                            return isset($s['id']) && (string)$s['id'] === (string)$booking->service_id;
                        });
                        if ($serviceData && isset($serviceData['name'])) {
                            $serviceName = $serviceData['name'];
                        }
                    }
                }
                
                // Если не нашли в объявлении, используем из таблицы services
                if ($serviceName === 'Service' && $booking->service) {
                    $serviceName = $booking->service->name;
                }
                
                return [
                    'id' => (string) $booking->id,
                    'date' => $booking->booking_date ? $booking->booking_date->format('Y-m-d') : '',
                    'time' => $booking->booking_time ?? '00:00:00',
                    'customer' => $customerName,
                    'service' => $serviceName,
                    // Используем total_price вместо price, чтобы учесть дополнительные услуги
                    'amount' => (float) ($booking->total_price ?? $booking->price ?? 0),
                    'status' => $booking->status ?? 'new', // Используем 'new' как дефолт вместо 'pending'
                ];
            });

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error fetching recent bookings',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get chart data for dashboard.
     */
    public function chart(Request $request)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                return response()->json([
                    'message' => 'Company not found',
                ], 404);
            }

            $category = $request->get('category', 'revenue');
            $period = $request->get('period', 'thisMonth');
            $connection = DB::connection()->getDriverName();

            $now = now();
            $data = [];
            $categories = [];

            if ($category === 'revenue') {
                if ($period === 'thisWeek') {
                    // Данные за последние 7 дней
                    $startDate = $now->copy()->startOfWeek();
                    for ($i = 0; $i < 7; $i++) {
                        $date = $startDate->copy()->addDays($i);
                        $dayStart = $date->copy()->startOfDay();
                        $dayEnd = $date->copy()->endOfDay();
                        
                        $amount = Order::where('company_id', $companyId)
                            ->where('payment_status', 'paid')
                            ->whereBetween('created_at', [$dayStart, $dayEnd])
                            ->sum('total') ?? 0;
                        
                        // Добавляем доходы от завершенных бронирований без заказов
                        // Используем total_price вместо price, чтобы учесть дополнительные услуги
                        $bookingsAmount = Booking::where('company_id', $companyId)
                            ->where('status', 'completed')
                            ->whereDoesntHave('order')
                            ->whereBetween('created_at', [$dayStart, $dayEnd])
                            ->sum(DB::raw('COALESCE(total_price, price)')) ?? 0;
                        
                        $data[] = (float) $amount + (float) $bookingsAmount;
                        $categories[] = $date->format('D');
                    }
                } elseif ($period === 'thisMonth') {
                    // Данные за текущий месяц по дням
                    $startDate = $now->copy()->startOfMonth();
                    $endDate = $now->copy()->endOfMonth();
                    $daysInMonth = $endDate->day;
                    
                    // Берем каждые 5 дней для оптимизации, но суммируем данные за весь период
                    for ($i = 1; $i <= $daysInMonth; $i += 5) {
                        $periodStart = $startDate->copy()->addDays($i - 1)->startOfDay();
                        $periodEnd = $startDate->copy()->addDays(min($i + 4, $daysInMonth) - 1)->endOfDay();
                        
                        $amount = Order::where('company_id', $companyId)
                            ->where('payment_status', 'paid')
                            ->whereBetween('created_at', [$periodStart, $periodEnd])
                            ->sum('total') ?? 0;
                        
                        // Добавляем доходы от завершенных бронирований без заказов
                        // Используем total_price вместо price, чтобы учесть дополнительные услуги
                        $bookingsAmount = Booking::where('company_id', $companyId)
                            ->where('status', 'completed')
                            ->whereDoesntHave('order')
                            ->whereBetween('created_at', [$periodStart, $periodEnd])
                            ->sum(DB::raw('COALESCE(total_price, price)')) ?? 0;
                        
                        $data[] = (float) $amount + (float) $bookingsAmount;
                        $categories[] = $periodStart->format('d');
                    }
                } elseif ($period === 'thisYear') {
                    // Данные за текущий год по месяцам - учитываем как оплаченные заказы, так и завершенные бронирования
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
                                ->sum(DB::raw('COALESCE(total_price, price)')) ?? 0;
                        } else {
                            $orderAmount = Order::where('company_id', $companyId)
                                ->where('payment_status', 'paid')
                                ->whereBetween('created_at', [$monthStart, $monthEnd])
                                ->sum('total') ?? 0;
                            
                            $bookingAmount = Booking::where('company_id', $companyId)
                                ->where('status', 'completed')
                                ->whereDoesntHave('order')
                                ->whereBetween('created_at', [$monthStart, $monthEnd])
                                ->sum(DB::raw('COALESCE(total_price, price)')) ?? 0;
                        }
                        
                        $data[] = (float) $orderAmount + (float) $bookingAmount;
                        $categories[] = $monthStart->format('M');
                    }
                }
            } elseif ($category === 'bookings') {
                if ($period === 'thisWeek') {
                    $startDate = $now->copy()->startOfWeek();
                    for ($i = 0; $i < 7; $i++) {
                        $date = $startDate->copy()->addDays($i);
                        $dayStart = $date->copy()->startOfDay();
                        $dayEnd = $date->copy()->endOfDay();
                        
                        $count = Booking::where('company_id', $companyId)
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
                        
                        $count = Booking::where('company_id', $companyId)
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
                            $count = Booking::where('company_id', $companyId)
                                ->whereRaw("strftime('%m', created_at) = ?", [str_pad($i, 2, '0', STR_PAD_LEFT)])
                                ->whereRaw("strftime('%Y', created_at) = ?", [$now->year])
                                ->count();
                        } else {
                            $count = Booking::where('company_id', $companyId)
                                ->whereBetween('created_at', [$monthStart, $monthEnd])
                                ->count();
                        }
                        
                        $data[] = $count;
                        $categories[] = $monthStart->format('M');
                    }
                }
            } elseif ($category === 'clients') {
                if ($period === 'thisWeek') {
                    $startDate = $now->copy()->startOfWeek();
                    for ($i = 0; $i < 7; $i++) {
                        $date = $startDate->copy()->addDays($i);
                        $dayStart = $date->copy()->startOfDay();
                        $dayEnd = $date->copy()->endOfDay();
                        
                        $count = Booking::where('company_id', $companyId)
                            ->whereBetween('created_at', [$dayStart, $dayEnd])
                            ->distinct('user_id')
                            ->count('user_id');
                        
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
                        
                        $count = Booking::where('company_id', $companyId)
                            ->whereBetween('created_at', [$dayStart, $dayEnd])
                            ->distinct('user_id')
                            ->count('user_id');
                        
                        $data[] = $count;
                        $categories[] = $date->format('d');
                    }
                } elseif ($period === 'thisYear') {
                    for ($i = 1; $i <= 12; $i++) {
                        $monthStart = $now->copy()->month($i)->startOfMonth();
                        $monthEnd = $now->copy()->month($i)->endOfMonth();
                        
                        if ($connection === 'sqlite') {
                            $count = Booking::where('company_id', $companyId)
                                ->whereRaw("strftime('%m', created_at) = ?", [str_pad($i, 2, '0', STR_PAD_LEFT)])
                                ->whereRaw("strftime('%Y', created_at) = ?", [$now->year])
                                ->distinct('user_id')
                                ->count('user_id');
                        } else {
                            $count = Booking::where('company_id', $companyId)
                                ->whereBetween('created_at', [$monthStart, $monthEnd])
                                ->distinct('user_id')
                                ->count('user_id');
                        }
                        
                        $data[] = $count;
                        $categories[] = $monthStart->format('M');
                    }
                }
            }

            $categoryLabels = [
                'revenue' => 'Доходы',
                'bookings' => 'Бронирования',
                'clients' => 'Новые клиенты',
            ];

            \Log::info('Business Chart Data', [
                'company_id' => $companyId,
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
}


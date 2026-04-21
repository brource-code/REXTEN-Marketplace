<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Service;
use App\Models\User;
use App\Models\Advertisement;
use App\Helpers\DatabaseHelper;
use App\Services\BusinessMetricsService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
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

            $payload = Cache::remember('dashboard.stats.' . $companyId, 60, function () use ($companyId) {
            $company = Company::query()->find($companyId);
            $monthlyBookingsGoal = $company?->dashboard_monthly_bookings_goal;

            // Total bookings
            $totalBookings = Booking::where('company_id', $companyId)->withoutPendingPayment()->count();

            // Общая выручка — сумма по завершённым бронированиям
            $totalRevenue = BusinessMetricsService::totalRecognizedRevenue($companyId);

            // Revenue in work - активные бронирования (new, pending, confirmed) - все кроме завершенных и отмененных
            $revenueInWork = Booking::where('company_id', $companyId)->withoutPendingPayment()
                ->whereIn('status', ['new', 'pending', 'confirmed'])
                ->sum(DB::raw('COALESCE(total_price, price)'));
            $revenueInWork = $revenueInWork ? (float) $revenueInWork : 0;

            // Просроченные бронирования (активные, но с датой в прошлом)
            // Используем whereDate для сравнения только даты, без времени
            $today = now()->startOfDay()->format('Y-m-d');
            $overdueBookingsCount = Booking::where('company_id', $companyId)->withoutPendingPayment()
                ->whereDate('booking_date', '<', $today)
                ->whereIn('status', ['new', 'pending', 'confirmed'])
                ->count();
            $overdueBookingsRevenue = Booking::where('company_id', $companyId)->withoutPendingPayment()
                ->whereDate('booking_date', '<', $today)
                ->whereIn('status', ['new', 'pending', 'confirmed'])
                ->sum(DB::raw('COALESCE(total_price, price)'));
            $overdueBookingsRevenue = $overdueBookingsRevenue ? (float) $overdueBookingsRevenue : 0;

            // Активные клиенты (уникальные user_id с бронированиями)
            $activeClients = BusinessMetricsService::countDistinctRegisteredClients($companyId);

            // Upcoming bookings
            $upcomingBookings = Booking::where('company_id', $companyId)->withoutPendingPayment()
                ->where('booking_date', '>=', now()->startOfDay())
                ->whereIn('status', ['new', 'pending', 'confirmed']) // Включаем статус 'new'
                ->count();

            // Active advertisements
            $activeAdvertisements = Advertisement::where('company_id', $companyId)
                ->where('is_active', true)
                ->where('status', 'approved')
                ->count();

            // Revenue by period (last 6 months) — завершённые брони по дате услуги
            $dateFormatSql = DatabaseHelper::dateFormatYearMonth('booking_date');
            $revenueByPeriod = Booking::where('company_id', $companyId)->withoutPendingPayment()
                ->where('status', 'completed')
                ->where('booking_date', '>=', now()->subMonths(6)->startOfDay())
                ->select(
                    DB::raw("{$dateFormatSql} as period"),
                    DB::raw('SUM(COALESCE(total_price, price)) as amount')
                )
                ->groupBy(DB::raw($dateFormatSql))
                ->orderBy('period')
                ->get()
                ->map(fn ($row) => [
                    'period' => $row->period,
                    'amount' => (float) $row->amount,
                ])
                ->values();

            // Рассчитываем статистику по периодам
            // Используем те же периоды, что и в отчётах для согласованности
            $now = now();
            // ISO-неделя с понедельника — как dayjs.isoWeek и подписи на фронте
            $startOfWeek = $now->copy()->startOfWeek(Carbon::MONDAY);
            $startOfMonth = $now->copy()->startOfMonth(); // Начало месяца
            $startOfYear = $now->copy()->startOfYear(); // Начало года
            $today = $now->format('Y-m-d');
            $weekStart = $startOfWeek->format('Y-m-d');
            $monthStart = $startOfMonth->format('Y-m-d');
            $yearStart = $startOfYear->format('Y-m-d');

            // Выручка за период — завершённые брони по дате услуги (booking_date)
            $revenueThisWeek = (float) (Booking::where('company_id', $companyId)->withoutPendingPayment()
                ->where('status', 'completed')
                ->whereDate('booking_date', '>=', $weekStart)
                ->whereDate('booking_date', '<=', $today)
                ->sum(DB::raw('COALESCE(total_price, price)')) ?? 0);

            $revenueThisMonth = (float) (Booking::where('company_id', $companyId)->withoutPendingPayment()
                ->where('status', 'completed')
                ->whereDate('booking_date', '>=', $monthStart)
                ->whereDate('booking_date', '<=', $today)
                ->sum(DB::raw('COALESCE(total_price, price)')) ?? 0);

            $revenueThisYear = (float) (Booking::where('company_id', $companyId)->withoutPendingPayment()
                ->where('status', 'completed')
                ->whereDate('booking_date', '>=', $yearStart)
                ->whereDate('booking_date', '<=', $today)
                ->sum(DB::raw('COALESCE(total_price, price)')) ?? 0);

            // Бронирования по периодам — без cancelled (согласованно с выручкой)
            $bookingsThisWeek = Booking::where('company_id', $companyId)->withoutPendingPayment()
                ->where('status', '!=', 'cancelled')
                ->whereDate('booking_date', '>=', $weekStart)
                ->whereDate('booking_date', '<=', $today)
                ->count();
            $bookingsThisMonth = Booking::where('company_id', $companyId)->withoutPendingPayment()
                ->where('status', '!=', 'cancelled')
                ->whereDate('booking_date', '>=', $monthStart)
                ->whereDate('booking_date', '<=', $today)
                ->count();
            $bookingsThisYear = Booking::where('company_id', $companyId)->withoutPendingPayment()
                ->where('status', '!=', 'cancelled')
                ->whereDate('booking_date', '>=', $yearStart)
                ->whereDate('booking_date', '<=', $today)
                ->count();

            // Клиенты по периодам (уникальные user_id за интервал по дате услуги)
            $clientsThisWeek = BusinessMetricsService::countDistinctRegisteredClients($companyId, $weekStart, $today);
            $clientsThisMonth = BusinessMetricsService::countDistinctRegisteredClients($companyId, $monthStart, $today);
            $clientsThisYear = BusinessMetricsService::countDistinctRegisteredClients($companyId, $yearStart, $today);

            // Сравнение с прошлым периодом той же длины (по booking_date)
            $todayStart = $now->copy()->startOfDay();

            $dayCountWeek = (int) $startOfWeek->diffInDays($todayStart) + 1;
            $prevWeekStart = $startOfWeek->copy()->subWeek();
            $prevWeekEnd = $prevWeekStart->copy()->addDays($dayCountWeek - 1);
            $pwFrom = $prevWeekStart->format('Y-m-d');
            $pwTo = $prevWeekEnd->format('Y-m-d');
            $revPrevWeek = $this->completedBookingRevenueBetween($companyId, $pwFrom, $pwTo);
            $bookPrevWeek = $this->bookingsCountBetween($companyId, $pwFrom, $pwTo);
            $cliPrevWeek = BusinessMetricsService::countDistinctRegisteredClients($companyId, $pwFrom, $pwTo);

            $dayCountMonth = (int) $startOfMonth->diffInDays($todayStart) + 1;
            $prevMonthStart = $startOfMonth->copy()->subMonth()->startOfMonth();
            $prevMonthEnd = $prevMonthStart->copy()->addDays($dayCountMonth - 1);
            if ($prevMonthEnd->gt($prevMonthStart->copy()->endOfMonth())) {
                $prevMonthEnd = $prevMonthStart->copy()->endOfMonth();
            }
            $pmFrom = $prevMonthStart->format('Y-m-d');
            $pmTo = $prevMonthEnd->format('Y-m-d');
            $revPrevMonth = $this->completedBookingRevenueBetween($companyId, $pmFrom, $pmTo);
            $bookPrevMonth = $this->bookingsCountBetween($companyId, $pmFrom, $pmTo);
            $cliPrevMonth = BusinessMetricsService::countDistinctRegisteredClients($companyId, $pmFrom, $pmTo);

            $dayCountYear = (int) $startOfYear->diffInDays($todayStart) + 1;
            $prevYearStart = $startOfYear->copy()->subYear();
            $prevYearEnd = $prevYearStart->copy()->addDays($dayCountYear - 1);
            if ($prevYearEnd->gt($prevYearStart->copy()->endOfYear())) {
                $prevYearEnd = $prevYearStart->copy()->endOfYear();
            }
            $pyFrom = $prevYearStart->format('Y-m-d');
            $pyTo = $prevYearEnd->format('Y-m-d');
            $revPrevYear = $this->completedBookingRevenueBetween($companyId, $pyFrom, $pyTo);
            $bookPrevYear = $this->bookingsCountBetween($companyId, $pyFrom, $pyTo);
            $cliPrevYear = BusinessMetricsService::countDistinctRegisteredClients($companyId, $pyFrom, $pyTo);

            $response = [
                'totalBookings' => $totalBookings,
                'totalRevenue' => (float) $totalRevenue,
                'revenueInWork' => (float) $revenueInWork,
                'overdueBookings' => [
                    'count' => $overdueBookingsCount,
                    'revenue' => (float) $overdueBookingsRevenue,
                ],
                'activeClients' => $activeClients,
                'upcomingBookings' => $upcomingBookings,
                'activeAdvertisements' => $activeAdvertisements,
                'revenueByPeriod' => $revenueByPeriod,
                // Данные по периодам + % к прошлому периоду той же длины
                'revenue' => [
                    'thisWeek' => [
                        'value' => $revenueThisWeek,
                        'growShrink' => $this->pctChange($revPrevWeek, $revenueThisWeek),
                    ],
                    'thisMonth' => [
                        'value' => $revenueThisMonth,
                        'growShrink' => $this->pctChange($revPrevMonth, $revenueThisMonth),
                    ],
                    'thisYear' => [
                        'value' => $revenueThisYear,
                        'growShrink' => $this->pctChange($revPrevYear, $revenueThisYear),
                    ],
                ],
                'bookings' => [
                    'thisWeek' => [
                        'value' => $bookingsThisWeek,
                        'growShrink' => $this->pctChange((float) $bookPrevWeek, (float) $bookingsThisWeek),
                    ],
                    'thisMonth' => [
                        'value' => $bookingsThisMonth,
                        'growShrink' => $this->pctChange((float) $bookPrevMonth, (float) $bookingsThisMonth),
                    ],
                    'thisYear' => [
                        'value' => $bookingsThisYear,
                        'growShrink' => $this->pctChange((float) $bookPrevYear, (float) $bookingsThisYear),
                    ],
                ],
                'clients' => [
                    'thisWeek' => [
                        'value' => $clientsThisWeek,
                        'growShrink' => $this->pctChange((float) $cliPrevWeek, (float) $clientsThisWeek),
                    ],
                    'thisMonth' => [
                        'value' => $clientsThisMonth,
                        'growShrink' => $this->pctChange((float) $cliPrevMonth, (float) $clientsThisMonth),
                    ],
                    'thisYear' => [
                        'value' => $clientsThisYear,
                        'growShrink' => $this->pctChange((float) $cliPrevYear, (float) $clientsThisYear),
                    ],
                ],
                'bookingsGoal' => [
                    'thisWeek' => $this->buildBookingsGoalEntry(
                        $bookingsThisWeek,
                        $bookPrevWeek,
                        $monthlyBookingsGoal,
                        'thisWeek',
                    ),
                    'thisMonth' => $this->buildBookingsGoalEntry(
                        $bookingsThisMonth,
                        $bookPrevMonth,
                        $monthlyBookingsGoal,
                        'thisMonth',
                    ),
                    'thisYear' => $this->buildBookingsGoalEntry(
                        $bookingsThisYear,
                        $bookPrevYear,
                        $monthlyBookingsGoal,
                        'thisYear',
                    ),
                ],
                'topServices' => [
                    'thisWeek' => $this->topBookedServices(
                        $companyId,
                        $weekStart,
                        $today,
                        $pwFrom,
                        $pwTo,
                    ),
                    'thisMonth' => $this->topBookedServices(
                        $companyId,
                        $monthStart,
                        $today,
                        $pmFrom,
                        $pmTo,
                    ),
                    'thisYear' => $this->topBookedServices(
                        $companyId,
                        $yearStart,
                        $today,
                        $pyFrom,
                        $pyTo,
                    ),
                ],
            ];

            return $response;
            });

            return response()->json($payload);
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

            $bookings = Booking::where('company_id', $companyId)->withoutPendingPayment()
                ->whereNotNull('booking_date')
                ->whereIn('status', ['new', 'pending', 'confirmed', 'completed', 'cancelled']) // Включаем все статусы
                ->with(['service:id,name', 'user.profile', 'specialist:id,name'])
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
                    'service_id' => $booking->service_id,
                    'title' => $booking->title,
                    'event_type' => $booking->event_type ?? 'booking',
                    'specialist_name' => $booking->specialist?->name,
                    // Используем total_price вместо price, чтобы учесть дополнительные услуги
                    'amount' => (float) ($booking->total_price ?? $booking->price ?? 0),
                    'status' => $booking->status ?? 'new', // Используем 'new' как дефолт вместо 'pending'
                    'payment_status' => $booking->payment_status ?? 'unpaid',
                    'execution_type' => $booking->execution_type ?? 'onsite',
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

            $cacheKey = 'dashboard.chart.' . $companyId . '.' . md5($category . '|' . $period);

            $payload = Cache::remember($cacheKey, 60, function () use ($companyId, $category, $period) {
            $now = now();
            $todayStr = $now->format('Y-m-d');
            $currentMonthNum = (int) $now->format('n');
            $data = [];
            $categories = [];

            if ($category === 'revenue') {
                if ($period === 'thisWeek') {
                    $startDate = $now->copy()->startOfWeek(Carbon::MONDAY);
                    for ($i = 0; $i < 7; $i++) {
                        $date = $startDate->copy()->addDays($i);
                        $dayFormatted = $date->format('Y-m-d');
                        if ($dayFormatted > $todayStr) {
                            $data[] = 0.0;
                            $categories[] = $date->format('D');
                            continue;
                        }

                        $bookingsAmount = Booking::where('company_id', $companyId)->withoutPendingPayment()
                            ->where('status', 'completed')
                            ->whereDate('booking_date', $dayFormatted)
                            ->sum(DB::raw('COALESCE(total_price, price)')) ?? 0;

                        $data[] = (float) $bookingsAmount;
                        $categories[] = $date->format('D');
                    }
                } elseif ($period === 'thisMonth') {
                    $startDate = $now->copy()->startOfMonth();
                    $daysInMonth = $now->copy()->endOfMonth()->day;

                    for ($i = 1; $i <= $daysInMonth; $i += 5) {
                        $periodStart = $startDate->copy()->addDays($i - 1);
                        $periodEnd = $startDate->copy()->addDays(min($i + 4, $daysInMonth) - 1);
                        $periodStartDate = $periodStart->format('Y-m-d');
                        $periodEndDate = $periodEnd->format('Y-m-d');

                        if ($periodStartDate > $todayStr) {
                            $data[] = 0.0;
                            $categories[] = $periodStart->format('d');
                            continue;
                        }
                        if ($periodEndDate > $todayStr) {
                            $periodEndDate = $todayStr;
                        }

                        $bookingsAmount = Booking::where('company_id', $companyId)->withoutPendingPayment()
                            ->where('status', 'completed')
                            ->whereBetween('booking_date', [$periodStartDate, $periodEndDate])
                            ->sum(DB::raw('COALESCE(total_price, price)')) ?? 0;

                        $data[] = (float) $bookingsAmount;
                        $categories[] = $periodStart->format('d');
                    }
                } elseif ($period === 'thisYear') {
                    for ($i = 1; $i <= 12; $i++) {
                        if ($i > $currentMonthNum) {
                            $data[] = 0.0;
                            $categories[] = $now->copy()->month($i)->format('M');
                            continue;
                        }
                        $monthStartDate = $now->copy()->month($i)->startOfMonth()->format('Y-m-d');
                        $monthEndDate = $i === $currentMonthNum
                            ? $todayStr
                            : $now->copy()->month($i)->endOfMonth()->format('Y-m-d');

                        $bookingAmount = Booking::where('company_id', $companyId)->withoutPendingPayment()
                            ->where('status', 'completed')
                            ->whereBetween('booking_date', [$monthStartDate, $monthEndDate])
                            ->sum(DB::raw('COALESCE(total_price, price)')) ?? 0;

                        $data[] = (float) $bookingAmount;
                        $categories[] = $now->copy()->month($i)->format('M');
                    }
                }
            } elseif ($category === 'bookings') {
                if ($period === 'thisWeek') {
                    $startDate = $now->copy()->startOfWeek(Carbon::MONDAY);
                    for ($i = 0; $i < 7; $i++) {
                        $date = $startDate->copy()->addDays($i);
                        $dayStart = $date->copy()->startOfDay()->format('Y-m-d');
                        if ($dayStart > $todayStr) {
                            $data[] = 0;
                            $categories[] = $date->format('D');
                            continue;
                        }
                        $dayEnd = $date->copy()->endOfDay()->format('Y-m-d');

                        $count = Booking::where('company_id', $companyId)->withoutPendingPayment()
                            ->where('status', '!=', 'cancelled')
                            ->whereBetween('booking_date', [$dayStart, $dayEnd])
                            ->count();

                        $data[] = $count;
                        $categories[] = $date->format('D');
                    }
                } elseif ($period === 'thisMonth') {
                    $startDate = $now->copy()->startOfMonth();
                    $daysInMonth = $now->copy()->endOfMonth()->day;

                    for ($i = 1; $i <= $daysInMonth; $i += 5) {
                        $periodStartDate = $startDate->copy()->addDays($i - 1)->format('Y-m-d');
                        $periodEndDate = $startDate->copy()->addDays(min($i + 4, $daysInMonth) - 1)->format('Y-m-d');

                        if ($periodStartDate > $todayStr) {
                            $data[] = 0;
                            $categories[] = $startDate->copy()->addDays($i - 1)->format('d');
                            continue;
                        }
                        $periodEndCapped = $periodEndDate > $todayStr ? $todayStr : $periodEndDate;

                        $count = Booking::where('company_id', $companyId)->withoutPendingPayment()
                            ->where('status', '!=', 'cancelled')
                            ->whereBetween('booking_date', [$periodStartDate, $periodEndCapped])
                            ->count();

                        $data[] = $count;
                        $categories[] = $startDate->copy()->addDays($i - 1)->format('d');
                    }
                } elseif ($period === 'thisYear') {
                    for ($i = 1; $i <= 12; $i++) {
                        if ($i > $currentMonthNum) {
                            $data[] = 0;
                            $categories[] = $now->copy()->month($i)->format('M');
                            continue;
                        }
                        $monthStart = $now->copy()->month($i)->startOfMonth()->format('Y-m-d');
                        $monthEnd = $i === $currentMonthNum
                            ? $todayStr
                            : $now->copy()->month($i)->endOfMonth()->format('Y-m-d');

                        $count = Booking::where('company_id', $companyId)->withoutPendingPayment()
                            ->where('status', '!=', 'cancelled')
                            ->whereBetween('booking_date', [$monthStart, $monthEnd])
                            ->count();

                        $data[] = $count;
                        $categories[] = $now->copy()->month($i)->format('M');
                    }
                }
            } elseif ($category === 'clients') {
                if ($period === 'thisWeek') {
                    $startDate = $now->copy()->startOfWeek(Carbon::MONDAY);
                    for ($i = 0; $i < 7; $i++) {
                        $date = $startDate->copy()->addDays($i);
                        $dayStart = $date->copy()->startOfDay()->format('Y-m-d');
                        if ($dayStart > $todayStr) {
                            $data[] = 0;
                            $categories[] = $date->format('D');
                            continue;
                        }
                        $dayEnd = $date->copy()->endOfDay()->format('Y-m-d');

                        $count = BusinessMetricsService::countDistinctRegisteredClients($companyId, $dayStart, $dayEnd);

                        $data[] = $count;
                        $categories[] = $date->format('D');
                    }
                } elseif ($period === 'thisMonth') {
                    $startDate = $now->copy()->startOfMonth();
                    $daysInMonth = $now->copy()->endOfMonth()->day;

                    for ($i = 1; $i <= $daysInMonth; $i += 5) {
                        $periodStart = $startDate->copy()->addDays($i - 1)->format('Y-m-d');
                        $periodEnd = $startDate->copy()->addDays(min($i + 4, $daysInMonth) - 1)->format('Y-m-d');

                        if ($periodStart > $todayStr) {
                            $data[] = 0;
                            $categories[] = $startDate->copy()->addDays($i - 1)->format('d');
                            continue;
                        }
                        $periodEndCapped = $periodEnd > $todayStr ? $todayStr : $periodEnd;

                        $count = BusinessMetricsService::countDistinctRegisteredClients($companyId, $periodStart, $periodEndCapped);

                        $data[] = $count;
                        $categories[] = $startDate->copy()->addDays($i - 1)->format('d');
                    }
                } elseif ($period === 'thisYear') {
                    for ($i = 1; $i <= 12; $i++) {
                        if ($i > $currentMonthNum) {
                            $data[] = 0;
                            $categories[] = $now->copy()->month($i)->format('M');
                            continue;
                        }
                        $monthStart = $now->copy()->month($i)->startOfMonth()->format('Y-m-d');
                        $monthEnd = $i === $currentMonthNum
                            ? $todayStr
                            : $now->copy()->month($i)->endOfMonth()->format('Y-m-d');

                        $count = BusinessMetricsService::countDistinctRegisteredClients($companyId, $monthStart, $monthEnd);

                        $data[] = $count;
                        $categories[] = $now->copy()->month($i)->format('M');
                    }
                }
            }

            $categoryLabels = [
                'revenue' => 'Доходы',
                'bookings' => 'Бронирования',
                'clients' => 'Новые клиенты',
            ];

            return [
                'series' => [
                    [
                        'name' => $categoryLabels[$category] ?? $category,
                        'data' => $data,
                    ],
                ],
                'date' => $categories,
                'categories' => $categories,
            ];
            });

            return response()->json($payload);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error fetching chart data',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * @return array{current: int, target: int, percent: int}
     */
    private function buildBookingsGoalEntry(int $current, int $prev, ?int $monthlyGoal, string $period): array
    {
        $target = $this->resolveBookingsTarget($monthlyGoal, $period, $prev);
        $percent = $target > 0 ? (int) min(100, round(($current / $target) * 100)) : 0;

        return [
            'current' => $current,
            'target' => $target,
            'percent' => $percent,
        ];
    }

    private function resolveBookingsTarget(?int $monthlyGoal, string $period, int $prevBookings): int
    {
        if ($monthlyGoal !== null && $monthlyGoal > 0) {
            return match ($period) {
                'thisWeek' => max(1, (int) ceil($monthlyGoal / 4)),
                'thisMonth' => $monthlyGoal,
                'thisYear' => max(1, (int) ($monthlyGoal * 12)),
                default => max(1, $monthlyGoal),
            };
        }

        $floor = match ($period) {
            'thisWeek' => 8,
            'thisMonth' => 10,
            'thisYear' => 100,
            default => 10,
        };

        if ($prevBookings <= 0) {
            return $floor;
        }

        $mult = $period === 'thisYear' ? 1.1 : 1.15;

        return max($floor, (int) ceil($prevBookings * $mult));
    }

    /**
     * @return array<int, array{serviceId: int, name: string, image: string|null, count: int, growShrink: float}>
     */
    private function topBookedServices(
        int $companyId,
        string $from,
        string $to,
        string $prevFrom,
        string $prevTo,
        int $limit = 6,
    ): array {
        $current = Booking::where('company_id', $companyId)->withoutPendingPayment()
            ->where('status', '!=', 'cancelled')
            ->whereDate('booking_date', '>=', $from)
            ->whereDate('booking_date', '<=', $to)
            ->whereNotNull('service_id')
            ->selectRaw('service_id, COUNT(*) as c')
            ->groupBy('service_id')
            ->orderByDesc('c')
            ->limit($limit)
            ->get();

        if ($current->isEmpty()) {
            return [];
        }

        $ids = $current->pluck('service_id')->map(fn ($id) => (int) $id)->all();

        $prevMap = Booking::where('company_id', $companyId)->withoutPendingPayment()
            ->where('status', '!=', 'cancelled')
            ->whereDate('booking_date', '>=', $prevFrom)
            ->whereDate('booking_date', '<=', $prevTo)
            ->whereIn('service_id', $ids)
            ->selectRaw('service_id, COUNT(*) as c')
            ->groupBy('service_id')
            ->pluck('c', 'service_id');

        $services = Service::whereIn('id', $ids)->get()->keyBy('id');

        $out = [];
        foreach ($current as $row) {
            $sid = (int) $row->service_id;
            $cur = (int) $row->c;
            $prev = (int) ($prevMap[$sid] ?? 0);
            $svc = $services->get($sid);
            $out[] = [
                'serviceId' => $sid,
                'name' => $svc ? (string) $svc->name : ('#' . $sid),
                'image' => $svc && $svc->image ? (string) $svc->image : null,
                'count' => $cur,
                'growShrink' => $this->pctChange((float) $prev, (float) $cur),
            ];
        }

        return $out;
    }

    private function pctChange(float $prev, float $cur): float
    {
        if ($prev <= 0 && $cur <= 0) {
            return 0.0;
        }
        if ($prev <= 0) {
            return $cur > 0 ? 100.0 : 0.0;
        }

        return round((($cur - $prev) / $prev) * 100, 1);
    }

    private function completedBookingRevenueBetween(int $companyId, string $from, string $to): float
    {
        return (float) (Booking::where('company_id', $companyId)->withoutPendingPayment()
            ->where('status', 'completed')
            ->whereDate('booking_date', '>=', $from)
            ->whereDate('booking_date', '<=', $to)
            ->sum(DB::raw('COALESCE(total_price, price)')) ?? 0);
    }

    private function bookingsCountBetween(int $companyId, string $from, string $to): int
    {
        return (int) Booking::where('company_id', $companyId)->withoutPendingPayment()
            ->where('status', '!=', 'cancelled')
            ->whereDate('booking_date', '>=', $from)
            ->whereDate('booking_date', '<=', $to)
            ->count();
    }
}


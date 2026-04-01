<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Order;
use App\Models\Service;
use App\Models\TeamMember;
use App\Models\Advertisement;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReportsController extends Controller
{
    /**
     * Get overview statistics.
     */
    public function index(Request $request)
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
                Log::error('Reports Overview: Company ID not found', [
                    'user_id' => auth('api')->id(),
                    'request_data' => $request->all(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }

            $filters = $this->getFilters($request);
            
            // Для сравнения с дашбордом: если фильтры не указаны, используем ту же логику, что и в дашборде
            // В дашборде: Booking::where('company_id', $companyId)->count()
            if (!$filters['date_from'] && !$filters['date_to'] && !$filters['specialist_id'] && !$filters['service_id'] && !$filters['status']) {
                // Без фильтров - считаем как в дашборде
                $query = Booking::where('company_id', $companyId);
            } else {
                $query = $this->getBaseQuery($companyId, $filters);
            }

            // Total bookings
            $totalBookings = (clone $query)->count();

            // Completed bookings
            $completedBookings = (clone $query)
                ->where('status', 'completed')
                ->count();

            // Cancelled bookings
            $cancelledBookings = (clone $query)
                ->where('status', 'cancelled')
                ->count();

            // Active bookings (new, pending, confirmed)
            $activeBookings = (clone $query)
                ->whereIn('status', ['new', 'pending', 'confirmed'])
                ->count();

            // Total revenue - только завершенные бронирования (completed)
            $totalRevenue = (clone $query)
                ->where('status', 'completed')
                ->sum(DB::raw('COALESCE(total_price, price)'));
            $totalRevenue = $totalRevenue ? (float) $totalRevenue : 0;

            // Revenue in work - активные бронирования (new, pending, confirmed) - все кроме завершенных и отмененных
            $revenueInWork = (clone $query)
                ->whereIn('status', ['new', 'pending', 'confirmed'])
                ->sum(DB::raw('COALESCE(total_price, price)'));
            $revenueInWork = $revenueInWork ? (float) $revenueInWork : 0;

            // Average check
            $averageCheck = $completedBookings > 0 
                ? round($totalRevenue / $completedBookings, 2) 
                : 0;

            // Unique clients (including unregistered via client_name)
            $connection = DB::connection()->getDriverName();
            $uniqueClientsQuery = (clone $query);
            
            if ($connection === 'sqlite') {
                $uniqueClients = $uniqueClientsQuery
                    ->select(DB::raw('COUNT(DISTINCT COALESCE(user_id, "unregistered_" || client_name)) as count'))
                    ->value('count') ?? 0;
            } else {
                $uniqueClients = $uniqueClientsQuery
                    ->select(DB::raw('COUNT(DISTINCT COALESCE(user_id, CONCAT("unregistered_", client_name))) as count'))
                    ->value('count') ?? 0;
            }

            // Active specialists (with bookings in period)
            $activeSpecialists = (clone $query)
                ->whereNotNull('specialist_id')
                ->select('specialist_id')
                ->distinct()
                ->count('specialist_id');

            return response()->json([
                'success' => true,
                'data' => [
                    'totalBookings' => $totalBookings,
                    'completedBookings' => $completedBookings,
                    'cancelledBookings' => $cancelledBookings,
                    'activeBookings' => $activeBookings,
                    'totalRevenue' => $totalRevenue,
                    'revenueInWork' => $revenueInWork,
                    'averageCheck' => $averageCheck,
                    'uniqueClients' => $uniqueClients,
                    'activeSpecialists' => $activeSpecialists,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Reports Overview Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch overview statistics',
            ], 500);
        }
    }

    /**
     * Get bookings report.
     */
    public function bookings(Request $request)
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
                Log::error('Bookings Report: Company ID not found', [
                    'user_id' => auth('api')->id(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }

            $filters = $this->getFilters($request);
            $query = $this->getBaseQuery($companyId, $filters);

            // Distribution by status
            $byStatus = (clone $query)
                ->select('bookings.status', DB::raw('COUNT(*) as count'))
                ->groupBy('bookings.status')
                ->get()
                ->map(function ($item) {
                    return [
                        'status' => $item->status,
                        'count' => (int) $item->count,
                    ];
                });

            // Distribution by period
            $connection = DB::connection()->getDriverName();
            $byPeriod = (clone $query)
                ->select(
                    $connection === 'sqlite' 
                        ? DB::raw('strftime("%Y-%m-%d", bookings.booking_date) as period')
                        : DB::raw('DATE_FORMAT(bookings.booking_date, "%Y-%m-%d") as period'),
                    DB::raw('COUNT(*) as count')
                )
                ->groupBy('period')
                ->orderBy('period')
                ->get()
                ->map(function ($item) {
                    return [
                        'period' => $item->period,
                        'count' => (int) $item->count,
                    ];
                });

            // Top services
            $topServices = (clone $query)
                ->join('services', 'bookings.service_id', '=', 'services.id')
                ->select(
                    'services.id as serviceId',
                    'services.name as serviceName',
                    DB::raw('COUNT(*) as count')
                )
                ->groupBy('services.id', 'services.name')
                ->orderBy('count', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($item) {
                    return [
                        'serviceId' => (int) $item->serviceId,
                        'serviceName' => $item->serviceName,
                        'count' => (int) $item->count,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'byStatus' => $byStatus,
                    'byPeriod' => $byPeriod,
                    'topServices' => $topServices,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Bookings Report Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch bookings report',
            ], 500);
        }
    }

    /**
     * Get clients report.
     */
    public function clients(Request $request)
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
                Log::error('Clients Report: Company ID not found', [
                    'user_id' => auth('api')->id(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }

            $filters = $this->getFilters($request);
            $query = $this->getBaseQuery($companyId, $filters);

            // Top clients by bookings
            // Get raw data first, then format names in PHP to avoid SQL complexity
            $topByBookingsRaw = (clone $query)
                ->select(
                    'bookings.user_id',
                    'bookings.client_name',
                    'user_profiles.first_name',
                    'user_profiles.last_name',
                    DB::raw('COUNT(*) as bookings')
                )
                ->leftJoin('users', 'bookings.user_id', '=', 'users.id')
                ->leftJoin('user_profiles', 'users.id', '=', 'user_profiles.user_id')
                ->groupBy('bookings.user_id', 'bookings.client_name', 'user_profiles.first_name', 'user_profiles.last_name')
                ->orderBy('bookings', 'desc')
                ->limit(10)
                ->get();
            
            $topByBookings = $topByBookingsRaw->map(function ($item) {
                // Format name: use profile name if available, otherwise use client_name
                $clientName = 'Гость';
                if ($item->first_name || $item->last_name) {
                    $firstName = trim($item->first_name ?? '');
                    $lastName = trim($item->last_name ?? '');
                    $clientName = trim($firstName . ' ' . $lastName) ?: 'Гость';
                } elseif ($item->client_name) {
                    $clientName = $item->client_name;
                }
                
                return [
                    'clientId' => $item->user_id,
                    'clientName' => $clientName,
                    'bookings' => (int) $item->bookings,
                ];
            });

            // Top clients by revenue
            // Get raw data first, then format names in PHP to avoid SQL complexity
            $topByRevenueRaw = (clone $query)
                ->select(
                    'bookings.user_id',
                    'bookings.client_name',
                    'user_profiles.first_name',
                    'user_profiles.last_name',
                    DB::raw('SUM(COALESCE(total_price, price)) as revenue')
                )
                ->leftJoin('users', 'bookings.user_id', '=', 'users.id')
                ->leftJoin('user_profiles', 'users.id', '=', 'user_profiles.user_id')
                ->where('status', 'completed')
                ->groupBy('bookings.user_id', 'bookings.client_name', 'user_profiles.first_name', 'user_profiles.last_name')
                ->orderBy('revenue', 'desc')
                ->limit(10)
                ->get();
            
            $topByRevenue = $topByRevenueRaw->map(function ($item) {
                // Format name: use profile name if available, otherwise use client_name
                $clientName = 'Гость';
                if ($item->first_name || $item->last_name) {
                    $firstName = trim($item->first_name ?? '');
                    $lastName = trim($item->last_name ?? '');
                    $clientName = trim($firstName . ' ' . $lastName) ?: 'Гость';
                } elseif ($item->client_name) {
                    $clientName = $item->client_name;
                }
                
                return [
                    'clientId' => $item->user_id,
                    'clientName' => $clientName,
                    'revenue' => (float) $item->revenue,
                ];
            });

            // New clients by period
            $connection = DB::connection()->getDriverName();
            $newClientsQuery = (clone $query);
            
            if ($connection === 'sqlite') {
                $newClients = $newClientsQuery
                    ->select(
                        DB::raw('strftime("%Y-%m", created_at) as period'),
                        DB::raw('COUNT(DISTINCT COALESCE(user_id, "unregistered_" || client_name)) as count')
                    )
                    ->groupBy('period')
                    ->orderBy('period')
                    ->get()
                    ->map(function ($item) {
                        return [
                            'period' => $item->period,
                            'count' => (int) $item->count,
                        ];
                    });
            } else {
                $newClients = $newClientsQuery
                    ->select(
                        DB::raw('DATE_FORMAT(created_at, "%Y-%m") as period'),
                        DB::raw('COUNT(DISTINCT COALESCE(user_id, CONCAT("unregistered_", client_name))) as count')
                    )
                    ->groupBy('period')
                    ->orderBy('period')
                    ->get()
                    ->map(function ($item) {
                        return [
                            'period' => $item->period,
                            'count' => (int) $item->count,
                        ];
                    });
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'topByBookings' => $topByBookings,
                    'topByRevenue' => $topByRevenue,
                    'newClients' => $newClients,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Clients Report Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch clients report',
            ], 500);
        }
    }

    /**
     * Get revenue report.
     */
    public function revenue(Request $request)
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
                Log::error('Revenue Report: Company ID not found', [
                    'user_id' => auth('api')->id(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }

            $filters = $this->getFilters($request);
            $connection = DB::connection()->getDriverName();

            // Revenue by period (from bookings without orders + paid orders)
            $query = $this->getBaseQuery($companyId, $filters);
            
            // Revenue from completed bookings without orders
            $byPeriodBookings = (clone $query)
                ->where('bookings.status', 'completed')
                ->whereDoesntHave('order')
                ->select(
                    $connection === 'sqlite'
                        ? DB::raw('strftime("%Y-%m-%d", bookings.booking_date) as period')
                        : DB::raw('DATE_FORMAT(bookings.booking_date, "%Y-%m-%d") as period'),
                    DB::raw('SUM(COALESCE(bookings.total_price, bookings.price)) as revenue')
                )
                ->groupBy('period')
                ->get()
                ->keyBy('period');
            
            // Revenue from paid orders (using booking_date from related booking)
            $byPeriodOrders = Order::where('orders.company_id', $companyId)
                ->where('orders.payment_status', 'paid')
                ->join('bookings', 'orders.booking_id', '=', 'bookings.id')
                ->when($filters['date_from'], function ($q) use ($filters) {
                    $q->where('bookings.booking_date', '>=', $filters['date_from']);
                })
                ->when($filters['date_to'], function ($q) use ($filters) {
                    $q->where('bookings.booking_date', '<=', $filters['date_to']);
                })
                ->select(
                    $connection === 'sqlite'
                        ? DB::raw('strftime("%Y-%m-%d", bookings.booking_date) as period')
                        : DB::raw('DATE_FORMAT(bookings.booking_date, "%Y-%m-%d") as period'),
                    DB::raw('SUM(orders.total) as revenue')
                )
                ->groupBy('period')
                ->get()
                ->keyBy('period');
            
            // Merge bookings and orders revenue by period
            $allPeriods = $byPeriodBookings->keys()->merge($byPeriodOrders->keys())->unique()->sort();
            $byPeriod = $allPeriods->map(function ($period) use ($byPeriodBookings, $byPeriodOrders) {
                $bookingRevenue = (float) ($byPeriodBookings->get($period)->revenue ?? 0);
                $orderRevenue = (float) ($byPeriodOrders->get($period)->revenue ?? 0);
                return [
                    'period' => $period,
                    'revenue' => $bookingRevenue + $orderRevenue,
                ];
            })->values();

            // Revenue by service (from bookings without orders + paid orders)
            // Revenue from completed bookings without orders
            $byServiceBookings = (clone $query)
                ->where('bookings.status', 'completed')
                ->whereDoesntHave('order')
                ->join('services', 'bookings.service_id', '=', 'services.id')
                ->select(
                    'services.id as serviceId',
                    'services.name as serviceName',
                    DB::raw('SUM(COALESCE(bookings.total_price, bookings.price)) as revenue')
                )
                ->groupBy('services.id', 'services.name')
                ->get()
                ->keyBy('serviceId');
            
            // Revenue from paid orders
            $byServiceOrders = Order::where('orders.company_id', $companyId)
                ->where('orders.payment_status', 'paid')
                ->join('bookings', 'orders.booking_id', '=', 'bookings.id')
                ->join('services', 'bookings.service_id', '=', 'services.id')
                ->when($filters['date_from'], function ($q) use ($filters) {
                    $q->where('bookings.booking_date', '>=', $filters['date_from']);
                })
                ->when($filters['date_to'], function ($q) use ($filters) {
                    $q->where('bookings.booking_date', '<=', $filters['date_to']);
                })
                ->select(
                    'services.id as serviceId',
                    'services.name as serviceName',
                    DB::raw('SUM(orders.total) as revenue')
                )
                ->groupBy('services.id', 'services.name')
                ->get()
                ->keyBy('serviceId');
            
            // Merge bookings and orders revenue by service
            $allServices = $byServiceBookings->keys()->merge($byServiceOrders->keys())->unique();
            $byService = $allServices->map(function ($serviceId) use ($byServiceBookings, $byServiceOrders) {
                $bookingRevenue = (float) ($byServiceBookings->get($serviceId)->revenue ?? 0);
                $orderRevenue = (float) ($byServiceOrders->get($serviceId)->revenue ?? 0);
                $serviceName = $byServiceBookings->get($serviceId)->serviceName ?? $byServiceOrders->get($serviceId)->serviceName;
                return [
                    'serviceId' => (int) $serviceId,
                    'serviceName' => $serviceName,
                    'revenue' => $bookingRevenue + $orderRevenue,
                ];
            })
            ->sortByDesc('revenue')
            ->take(10)
            ->values();

            // Revenue by specialist (from bookings without orders + paid orders)
            // Revenue from completed bookings without orders
            $bySpecialistBookingsRaw = (clone $query)
                ->where('bookings.status', 'completed')
                ->whereDoesntHave('order')
                ->whereNotNull('bookings.specialist_id')
                ->select(
                    'bookings.specialist_id as specialistId',
                    'specialist_profiles.first_name',
                    'specialist_profiles.last_name',
                    DB::raw('SUM(COALESCE(bookings.total_price, bookings.price)) as revenue')
                )
                ->leftJoin('users as specialists', 'bookings.specialist_id', '=', 'specialists.id')
                ->leftJoin('user_profiles as specialist_profiles', 'specialists.id', '=', 'specialist_profiles.user_id')
                ->groupBy('bookings.specialist_id', 'specialist_profiles.first_name', 'specialist_profiles.last_name')
                ->get();
            
            $bySpecialistBookings = $bySpecialistBookingsRaw->map(function ($item) use ($companyId) {
                // Сначала пытаемся найти специалиста в команде объявления
                $specialistName = $this->getSpecialistName($item->specialistId, $companyId);
                
                // Если не нашли в команде, используем имя из профиля
                if ($specialistName === 'N/A') {
                    if ($item->first_name || $item->last_name) {
                        $firstName = trim($item->first_name ?? '');
                        $lastName = trim($item->last_name ?? '');
                        $specialistName = trim($firstName . ' ' . $lastName) ?: 'N/A';
                    }
                }
                
                return [
                    'specialistId' => (int) $item->specialistId,
                    'specialistName' => $specialistName,
                    'revenue' => (float) $item->revenue,
                ];
            })->keyBy('specialistId');
            
            // Revenue from paid orders
            $bySpecialistOrdersRaw = Order::where('orders.company_id', $companyId)
                ->where('orders.payment_status', 'paid')
                ->join('bookings', 'orders.booking_id', '=', 'bookings.id')
                ->whereNotNull('bookings.specialist_id')
                ->when($filters['date_from'], function ($q) use ($filters) {
                    $q->where('bookings.booking_date', '>=', $filters['date_from']);
                })
                ->when($filters['date_to'], function ($q) use ($filters) {
                    $q->where('bookings.booking_date', '<=', $filters['date_to']);
                })
                ->select(
                    'bookings.specialist_id as specialistId',
                    'specialist_profiles.first_name',
                    'specialist_profiles.last_name',
                    DB::raw('SUM(orders.total) as revenue')
                )
                ->leftJoin('users as specialists', 'bookings.specialist_id', '=', 'specialists.id')
                ->leftJoin('user_profiles as specialist_profiles', 'specialists.id', '=', 'specialist_profiles.user_id')
                ->groupBy('bookings.specialist_id', 'specialist_profiles.first_name', 'specialist_profiles.last_name')
                ->get();
            
            $bySpecialistOrders = $bySpecialistOrdersRaw->map(function ($item) use ($companyId) {
                // Сначала пытаемся найти специалиста в команде объявления
                $specialistName = $this->getSpecialistName($item->specialistId, $companyId);
                
                // Если не нашли в команде, используем имя из профиля
                if ($specialistName === 'N/A') {
                    if ($item->first_name || $item->last_name) {
                        $firstName = trim($item->first_name ?? '');
                        $lastName = trim($item->last_name ?? '');
                        $specialistName = trim($firstName . ' ' . $lastName) ?: 'N/A';
                    }
                }
                
                return [
                    'specialistId' => (int) $item->specialistId,
                    'specialistName' => $specialistName,
                    'revenue' => (float) $item->revenue,
                ];
            })->keyBy('specialistId');
            
            // Merge bookings and orders revenue by specialist
            $allSpecialists = $bySpecialistBookings->keys()->merge($bySpecialistOrders->keys())->unique();
            $bySpecialist = $allSpecialists->map(function ($specialistId) use ($bySpecialistBookings, $bySpecialistOrders) {
                $bookingRevenue = (float) ($bySpecialistBookings->get($specialistId)->revenue ?? 0);
                $orderRevenue = (float) ($bySpecialistOrders->get($specialistId)->revenue ?? 0);
                $specialistName = $bySpecialistBookings->get($specialistId)->specialistName ?? $bySpecialistOrders->get($specialistId)->specialistName ?? 'N/A';
                return [
                    'specialistId' => (int) $specialistId,
                    'specialistName' => $specialistName,
                    'revenue' => $bookingRevenue + $orderRevenue,
                ];
            })
            ->sortByDesc('revenue')
            ->take(10)
            ->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'byPeriod' => $byPeriod,
                    'byService' => $byService,
                    'bySpecialist' => $bySpecialist,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Revenue Report Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch revenue report',
            ], 500);
        }
    }

    /**
     * Get specialists report.
     */
    public function specialists(Request $request)
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
                Log::error('Specialists Report: Company ID not found', [
                    'user_id' => auth('api')->id(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }

            $filters = $this->getFilters($request);
            $query = $this->getBaseQuery($companyId, $filters);

            // Получаем все бронирования с загрузкой объявлений для определения специалистов
            $bookings = (clone $query)
                ->whereNotNull('specialist_id')
                ->with('advertisement:id,team,company_id')
                ->get();
            
            // Собираем уникальных специалистов из бронирований
            // Используем ту же логику, что и в ScheduleController
            $specialistIds = collect();
            $specialistMap = []; // Маппинг specialist_id => name
            
            foreach ($bookings as $booking) {
                if (!$booking->specialist_id) continue;
                
                $specialistId = $booking->specialist_id;
                
                // Если уже обработали этого специалиста, пропускаем
                if (isset($specialistMap[$specialistId])) continue;
                
                // Используем ту же логику, что и в ScheduleController
                $specialistData = $this->getSpecialistFromBooking($booking);
                
                if ($specialistData) {
                    $specialistIds->push($specialistId);
                    $specialistMap[$specialistId] = $specialistData['name'];
                } else {
                    // Fallback: если не нашли в команде, все равно добавляем
                    $specialistIds->push($specialistId);
                    $specialistMap[$specialistId] = 'N/A';
                }
            }
            
            $specialistIds = $specialistIds->unique()->values();

            // Get specialists from team_members
            $teamMemberSpecialists = TeamMember::where('company_id', $companyId)
                ->pluck('name', 'id')
                ->map(function ($name, $id) {
                    return [
                        'id' => $id,
                        'name' => $name,
                        'source' => 'team_member',
                    ];
                });

            // Get specialists from advertisements team
            $adSpecialists = Advertisement::where('company_id', $companyId)
                ->whereNotNull('team')
                ->get()
                ->flatMap(function ($ad) {
                    $team = is_array($ad->team) ? $ad->team : json_decode($ad->team, true);
                    if (!is_array($team)) return collect();
                    return collect($team)->map(function ($member) {
                        return [
                            'id' => $member['id'] ?? null,
                            'name' => $member['name'] ?? 'N/A',
                            'source' => 'advertisement',
                        ];
                    });
                })
                ->unique('id')
                ->filter(function ($item) {
                    return !empty($item['id']);
                });

            // Build specialists report
            $specialists = collect();
            
            // Add specialists from bookings
            foreach ($specialistIds as $specialistId) {
                // Используем имя из маппинга, если есть
                $name = $specialistMap[$specialistId] ?? 'N/A';
                
                // Если не нашли в маппинге, пытаемся найти через getSpecialistName
                if ($name === 'N/A') {
                    $name = $this->getSpecialistName($specialistId, $companyId);
                    
                    // Если все еще не нашли, ищем в users
                    if ($name === 'N/A') {
                        $specialist = User::with('profile')->find($specialistId);
                        if ($specialist && $specialist->profile) {
                            $firstName = trim($specialist->profile->first_name ?? '');
                            $lastName = trim($specialist->profile->last_name ?? '');
                            $name = trim($firstName . ' ' . $lastName) ?: 'N/A';
                        }
                    }
                }

                $specialistQuery = (clone $query)->where('specialist_id', $specialistId);
                
                $bookingsCount = (clone $specialistQuery)->count();
                $revenue = (clone $specialistQuery)
                    ->where('status', 'completed')
                    ->sum(DB::raw('COALESCE(total_price, price)'));
                $cancellations = (clone $specialistQuery)
                    ->where('status', 'cancelled')
                    ->count();
                $completed = (clone $specialistQuery)
                    ->where('status', 'completed')
                    ->count();
                $active = (clone $specialistQuery)
                    ->whereIn('status', ['new', 'pending', 'confirmed'])
                    ->count();
                $averageCheck = $completed > 0 ? round($revenue / $completed, 2) : 0;

                // Get clients for this specialist
                // Get raw data first, then format names in PHP to avoid SQL complexity
                $clientsRaw = (clone $specialistQuery)
                    ->select(
                        'bookings.user_id',
                        'bookings.client_name',
                        'user_profiles.first_name',
                        'user_profiles.last_name',
                        DB::raw('COUNT(*) as bookings')
                    )
                    ->leftJoin('users', 'bookings.user_id', '=', 'users.id')
                    ->leftJoin('user_profiles', 'users.id', '=', 'user_profiles.user_id')
                    ->groupBy('bookings.user_id', 'bookings.client_name', 'user_profiles.first_name', 'user_profiles.last_name')
                    ->get();
                
                $clients = $clientsRaw->map(function ($item) {
                    // Format name: use profile name if available, otherwise use client_name
                    $clientName = 'Гость';
                    if ($item->first_name || $item->last_name) {
                        $firstName = trim($item->first_name ?? '');
                        $lastName = trim($item->last_name ?? '');
                        $clientName = trim($firstName . ' ' . $lastName) ?: 'Гость';
                    } elseif ($item->client_name) {
                        $clientName = $item->client_name;
                    }
                    
                    return [
                        'id' => $item->user_id,
                        'name' => $clientName,
                        'bookings' => (int) $item->bookings,
                    ];
                });

                $specialists->push([
                    'id' => $specialistId,
                    'name' => $name,
                    'bookingsCount' => $bookingsCount,
                    'revenue' => (float) $revenue,
                    'cancellations' => $cancellations,
                    'completed' => $completed,
                    'active' => $active,
                    'averageCheck' => $averageCheck,
                    'clients' => $clients,
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $specialists->values(),
            ]);
        } catch (\Exception $e) {
            Log::error('Specialists Report Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch specialists report',
            ], 500);
        }
    }

    /**
     * Export report to Excel/CSV.
     */
    public function export(Request $request, $type)
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
                Log::error('Export Report: Company ID not found', [
                    'user_id' => auth('api')->id(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }

            $reportType = $request->input('report_type', 'overview');
            $filters = $this->getFilters($request);

            $data = [];
            $filename = '';

            switch ($reportType) {
                case 'overview':
                    $overview = $this->index($request);
                    $overviewData = json_decode($overview->getContent(), true)['data'] ?? [];
                    $data = [
                        ['Metric', 'Value'],
                        ['Total Bookings', $overviewData['totalBookings'] ?? 0],
                        ['Completed Bookings', $overviewData['completedBookings'] ?? 0],
                        ['Cancelled Bookings', $overviewData['cancelledBookings'] ?? 0],
                        ['Active Bookings', $overviewData['activeBookings'] ?? 0],
                        ['Total Revenue', '$' . number_format($overviewData['totalRevenue'] ?? 0, 2)],
                        ['Average Check', '$' . number_format($overviewData['averageCheck'] ?? 0, 2)],
                        ['Unique Clients', $overviewData['uniqueClients'] ?? 0],
                        ['Active Specialists', $overviewData['activeSpecialists'] ?? 0],
                    ];
                    $filename = 'overview_report';
                    break;

                case 'bookings':
                    $bookings = $this->bookings($request);
                    $bookingsData = json_decode($bookings->getContent(), true)['data'] ?? [];
                    $data = [
                        ['Status', 'Count'],
                    ];
                    foreach ($bookingsData['byStatus'] ?? [] as $item) {
                        $data[] = [$item['status'], $item['count']];
                    }
                    $data[] = [];
                    $data[] = ['Period', 'Count'];
                    foreach ($bookingsData['byPeriod'] ?? [] as $item) {
                        $data[] = [$item['period'], $item['count']];
                    }
                    $data[] = [];
                    $data[] = ['Service', 'Count'];
                    foreach ($bookingsData['topServices'] ?? [] as $item) {
                        $data[] = [$item['serviceName'], $item['count']];
                    }
                    $filename = 'bookings_report';
                    break;

                case 'clients':
                    $clients = $this->clients($request);
                    $clientsData = json_decode($clients->getContent(), true)['data'] ?? [];
                    $data = [
                        ['Client', 'Bookings'],
                    ];
                    foreach ($clientsData['topByBookings'] ?? [] as $item) {
                        $data[] = [$item['clientName'], $item['bookings']];
                    }
                    $data[] = [];
                    $data[] = ['Client', 'Revenue'];
                    foreach ($clientsData['topByRevenue'] ?? [] as $item) {
                        $data[] = [$item['clientName'], '$' . number_format($item['revenue'], 2)];
                    }
                    $filename = 'clients_report';
                    break;

                case 'revenue':
                    $revenue = $this->revenue($request);
                    $revenueData = json_decode($revenue->getContent(), true)['data'] ?? [];
                    $data = [
                        ['Period', 'Revenue'],
                    ];
                    foreach ($revenueData['byPeriod'] ?? [] as $item) {
                        $data[] = [$item['period'], '$' . number_format($item['revenue'], 2)];
                    }
                    $data[] = [];
                    $data[] = ['Service', 'Revenue'];
                    foreach ($revenueData['byService'] ?? [] as $item) {
                        $data[] = [$item['serviceName'], '$' . number_format($item['revenue'], 2)];
                    }
                    $data[] = [];
                    $data[] = ['Specialist', 'Revenue'];
                    foreach ($revenueData['bySpecialist'] ?? [] as $item) {
                        $data[] = [$item['specialistName'], '$' . number_format($item['revenue'], 2)];
                    }
                    $filename = 'revenue_report';
                    break;

                case 'specialists':
                    $specialists = $this->specialists($request);
                    $specialistsData = json_decode($specialists->getContent(), true)['data'] ?? [];
                    $data = [
                        ['Specialist', 'Bookings', 'Revenue', 'Cancellations', 'Completed', 'Active', 'Average Check'],
                    ];
                    foreach ($specialistsData ?? [] as $item) {
                        $data[] = [
                            $item['name'],
                            $item['bookingsCount'],
                            '$' . number_format($item['revenue'], 2),
                            $item['cancellations'],
                            $item['completed'],
                            $item['active'],
                            '$' . number_format($item['averageCheck'], 2),
                        ];
                    }
                    $filename = 'specialists_report';
                    break;

                default:
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid report type',
                    ], 400);
            }

            if ($type === 'csv') {
                $csv = $this->arrayToCsv($data);
                $filename .= '_' . date('Y-m-d') . '.csv';
                
                return response($csv, 200, [
                    'Content-Type' => 'text/csv; charset=UTF-8',
                    'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                ]);
            } else {
                // For Excel, return JSON for now (can be extended with maatwebsite/excel later)
                return response()->json([
                    'success' => false,
                    'message' => 'Excel export requires maatwebsite/excel package. Please use CSV export.',
                ], 501);
            }
        } catch (\Exception $e) {
            Log::error('Export Report Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to export report',
            ], 500);
        }
    }

    /**
     * Convert array to CSV string.
     */
    private function arrayToCsv(array $data): string
    {
        $output = fopen('php://temp', 'r+');
        
        foreach ($data as $row) {
            fputcsv($output, $row);
        }
        
        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);
        
        // Add BOM for UTF-8 to ensure Excel opens it correctly
        return "\xEF\xBB\xBF" . $csv;
    }

    /**
     * Get specialist from booking (same logic as ScheduleController).
     */
    private function getSpecialistFromBooking($booking)
    {
        if (!$booking->specialist_id) {
            return null;
        }

        // Если есть объявление, ищем специалиста в его команде
        if ($booking->advertisement_id) {
            $advertisement = $booking->advertisement ?? Advertisement::find($booking->advertisement_id);
            if ($advertisement && $advertisement->team) {
                $team = is_array($advertisement->team) ? $advertisement->team : (json_decode($advertisement->team, true) ?? []);
                
                // Ищем специалиста по ID в команде
                $specialist = collect($team)->first(function ($member) use ($booking) {
                    $memberId = $member['id'] ?? null;
                    return $memberId !== null && (string)$memberId === (string)$booking->specialist_id;
                });
                
                if ($specialist) {
                    return [
                        'id' => $specialist['id'] ?? $booking->specialist_id,
                        'name' => $specialist['name'] ?? 'Не указано',
                    ];
                }
            }
        }

        // Если объявления нет, ищем в любом объявлении компании
        $advertisement = Advertisement::where('company_id', $booking->company_id)
            ->where('type', 'regular')
            ->where('is_active', true)
            ->where('status', 'approved')
            ->first();
            
        if ($advertisement && $advertisement->team) {
            $team = is_array($advertisement->team) ? $advertisement->team : (json_decode($advertisement->team, true) ?? []);
            
            $specialist = collect($team)->first(function ($member) use ($booking) {
                $memberId = $member['id'] ?? null;
                return $memberId !== null && (string)$memberId === (string)$booking->specialist_id;
            });
            
            if ($specialist) {
                return [
                    'id' => $specialist['id'] ?? $booking->specialist_id,
                    'name' => $specialist['name'] ?? 'Не указано',
                ];
            }
        }

        return null;
    }

    /**
     * Get specialist name from advertisement team or user profile.
     */
    private function getSpecialistName($specialistId, $companyId)
    {
        // Ищем специалиста в команде объявлений компании
        $advertisements = Advertisement::where('company_id', $companyId)
            ->whereNotNull('team')
            ->get();
        
        foreach ($advertisements as $ad) {
            $team = is_array($ad->team) ? $ad->team : (json_decode($ad->team, true) ?? []);
            if (!is_array($team)) continue;
            
            $teamMember = collect($team)->first(function ($member) use ($specialistId) {
                $memberId = $member['id'] ?? null;
                return $memberId !== null && (
                    (string)$memberId === (string)$specialistId ||
                    (int)$memberId === (int)$specialistId
                );
            });
            
            if ($teamMember && isset($teamMember['name'])) {
                return $teamMember['name'];
            }
        }
        
        // Ищем в team_members
        $teamMember = TeamMember::where('company_id', $companyId)
            ->where('id', $specialistId)
            ->first();
        
        if ($teamMember && $teamMember->name) {
            return $teamMember->name;
        }
        
        return 'N/A';
    }

    /**
     * Get base query with filters.
     */
    private function getBaseQuery($companyId, $filters)
    {
        $query = Booking::where('bookings.company_id', $companyId);

        if ($filters['date_from']) {
            $query->where('bookings.booking_date', '>=', $filters['date_from']);
        }

        if ($filters['date_to']) {
            $query->where('bookings.booking_date', '<=', $filters['date_to']);
        }

        if ($filters['specialist_id']) {
            $query->where('bookings.specialist_id', $filters['specialist_id']);
        }

        if ($filters['service_id']) {
            $query->where('bookings.service_id', $filters['service_id']);
        }

        if ($filters['status']) {
            if (is_array($filters['status'])) {
                $query->whereIn('bookings.status', $filters['status']);
            } else {
                $query->where('bookings.status', $filters['status']);
            }
        }

        return $query;
    }

    /**
     * Get filters from request.
     */
    private function getFilters(Request $request)
    {
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        // Не устанавливаем фильтры по умолчанию - если не указаны, показываем все данные
        // Это позволяет сравнивать с дашбордом, где показываются все данные

        return [
            'date_from' => $dateFrom ?: null,
            'date_to' => $dateTo ?: null,
            'specialist_id' => $request->input('specialist_id'),
            'service_id' => $request->input('service_id'),
            'status' => $request->input('status'),
        ];
    }
}


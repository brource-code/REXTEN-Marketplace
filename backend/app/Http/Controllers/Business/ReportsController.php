<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Order;
use App\Models\Service;
use App\Models\TeamMember;
use App\Models\Advertisement;
use App\Models\User;
use App\Models\SalaryCalculation;
use App\Services\SalaryCalculationService;
use App\Services\BusinessMetricsService;
use App\Helpers\DatabaseHelper;
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

            // Без фильтров — та же формула, что на дашборде (заказы + брони без order)
            $noReportFilters = ! $filters['date_from'] && ! $filters['date_to'] && ! $filters['specialist_id'] && ! $filters['service_id'] && ! $filters['status'];
            if ($noReportFilters) {
                $totalRevenue = BusinessMetricsService::totalRecognizedRevenue($companyId);
            } else {
                $totalRevenue = (clone $query)
                    ->where('status', 'completed')
                    ->sum(DB::raw('COALESCE(total_price, price)'));
                $totalRevenue = $totalRevenue ? (float) $totalRevenue : 0;
            }

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
            $uniqueClientsQuery = (clone $query);
            $countDistinctSql = DatabaseHelper::countDistinctClients('user_id', 'client_name', 'count');
            $uniqueClients = $uniqueClientsQuery
                ->select(DB::raw($countDistinctSql))
                ->value('count') ?? 0;

            // Active specialists - считаем всех активных специалистов из team_members
            // Это основной источник данных о специалистах
            $activeSpecialists = TeamMember::where('company_id', $companyId)
                ->where('status', 'active')
                ->count();

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
            $dateFormatSql = DatabaseHelper::dateFormatYearMonthDay('bookings.booking_date');
            $byPeriod = (clone $query)
                ->select(
                    DB::raw("{$dateFormatSql} as period"),
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
            $newClientsQuery = (clone $query);
            $dateFormatSql = DatabaseHelper::dateFormatYearMonth('created_at');
            $countDistinctSql = DatabaseHelper::countDistinctClients('user_id', 'client_name', 'count');
            
            $newClients = $newClientsQuery
                ->select(
                    DB::raw("{$dateFormatSql} as period"),
                    DB::raw($countDistinctSql)
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
            $dateFormatSql = DatabaseHelper::dateFormatYearMonthDay('bookings.booking_date');

            // Revenue by period (from bookings without orders + paid orders)
            $query = $this->getBaseQuery($companyId, $filters);
            
            // Revenue from completed bookings without orders
            $byPeriodBookings = (clone $query)
                ->where('bookings.status', 'completed')
                ->whereDoesntHave('order')
                ->select(
                    DB::raw("{$dateFormatSql} as period"),
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
                    DB::raw("{$dateFormatSql} as period"),
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
            
            // Получаем список активных специалистов из team_members
            $validSpecialistIds = TeamMember::where('company_id', $companyId)
                ->where('status', 'active')
                ->pluck('id')
                ->toArray();
            
            // Merge bookings and orders revenue by specialist
            // Фильтруем только тех специалистов, которые есть в team_members
            $allSpecialists = $bySpecialistBookings->keys()
                ->merge($bySpecialistOrders->keys())
                ->unique()
                ->filter(function ($specialistId) use ($validSpecialistIds) {
                    return in_array($specialistId, $validSpecialistIds);
                });
            
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

            // Получаем ТОЛЬКО специалистов из team_members (основной источник)
            // Не используем старые данные из объявлений или бронирований
            $teamMembers = TeamMember::where('company_id', $companyId)
                ->where('status', 'active')
                ->get();
            
            // Получаем все ID текущих специалистов для фильтрации
            $currentSpecialistIds = $teamMembers->pluck('id')->toArray();
            
            // Build specialists report - только для специалистов из team_members
            $specialists = collect();
            
            foreach ($teamMembers as $teamMember) {
                $specialistId = $teamMember->id;
                $name = $teamMember->name;

                // Ищем бронирования для этого специалиста
                // Используем точное совпадение specialist_id с текущим ID специалиста
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
     * Get salary report.
     */
    public function salary(Request $request)
    {
        try {
            $companyId = $request->get('current_company_id');
            
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
                Log::error('Salary Report: Company ID not found', [
                    'user_id' => auth('api')->id(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                ], 404);
            }

            $filters = $this->getFilters($request);
            
            // Используем ТОЛЬКО фильтры из запроса, без автоматического определения периода
            $periodStart = $filters['date_from'];
            $periodEnd = $filters['date_to'];
            
            // ВСЕГДА рассчитываем зарплату на лету на основе завершенных бронирований за выбранный период
            // Это гарантирует, что данные соответствуют выбранным фильтрам и используют те же данные, что и другие отчеты
            if ($periodStart && $periodEnd) {
                Log::info('Salary Report: No saved calculations found, calculating on the fly', [
                    'company_id' => $companyId,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                ]);
                
                $salaryService = app(SalaryCalculationService::class);
                
                // Рассчитываем зарплату на лету БЕЗ сохранения в БД
                // Получаем всех специалистов с завершенными бронированиями за период
                $specialists = TeamMember::where('company_id', $companyId)
                    ->where('status', 'active')
                    ->get();
                
                // Получаем всех специалистов с завершенными бронированиями за период
                $specialistsWithBookings = Booking::where('company_id', $companyId)
                    ->where('status', 'completed')
                    ->whereNotNull('specialist_id')
                    ->whereDate('booking_date', '>=', $periodStart)
                    ->whereDate('booking_date', '<=', $periodEnd)
                    ->select('specialist_id', DB::raw('COUNT(*) as bookings_count'), DB::raw('SUM(COALESCE(duration_minutes, 60)) as total_minutes'))
                    ->groupBy('specialist_id')
                    ->get();
                
                // Группируем по специалистам
                $bySpecialistData = [];
                $totalSalaryCalculated = 0;
                $calculations = [];
                
                // Обрабатываем всех специалистов с бронированиями
                foreach ($specialistsWithBookings as $specBooking) {
                    $specialistId = $specBooking->specialist_id;
                    $specialist = TeamMember::find($specialistId);
                    
                    if (!$specialist) {
                        continue;
                    }
                    
                    $bookings = $salaryService->getBookingsForPeriod($companyId, $periodStart, $periodEnd, $specialistId);
                    $settings = $salaryService->getActiveSettingsForPeriod($specialistId, $periodStart, $periodEnd);
                    
                    // Проверяем наличие настроек зарплаты
                    $hasSalarySettings = !$settings->isEmpty();
                    
                    // Получаем информацию о настройках для отображения
                    $salarySettingsInfo = null;
                    if ($hasSalarySettings) {
                        $activeSetting = $settings->first();
                        $salarySettingsInfo = [
                            'payment_type' => $activeSetting->payment_type,
                            'percent_rate' => $activeSetting->percent_rate ? (float) $activeSetting->percent_rate : null,
                            'fixed_amount' => $activeSetting->fixed_amount ? (float) $activeSetting->fixed_amount : null,
                            'hourly_rate' => $activeSetting->hourly_rate ? (float) $activeSetting->hourly_rate : null,
                        ];
                    }
                    
                    // Инициализируем данные специалиста
                    $bySpecialistData[$specialistId] = [
                        'specialist_id' => $specialistId,
                        'specialist_name' => $specialist->name ?? 'Неизвестно',
                        'total_salary' => 0,
                        'total_bookings' => (int) $specBooking->bookings_count,
                        'total_hours' => round(($specBooking->total_minutes ?? 0) / 60, 2),
                        'has_salary_settings' => $hasSalarySettings,
                        'salary_settings' => $salarySettingsInfo,
                    ];
                    
                    // Если есть настройки, рассчитываем зарплату
                    if ($hasSalarySettings && !$bookings->isEmpty()) {
                        $calculation = $salaryService->calculateForTeamMemberWithoutSave($specialistId, $companyId, $bookings, $settings, $periodStart, $periodEnd);
                        
                        if ($calculation) {
                            $bySpecialistData[$specialistId]['total_salary'] = $calculation->total_salary;
                            $bySpecialistData[$specialistId]['total_bookings'] = $calculation->total_bookings;
                            $bySpecialistData[$specialistId]['total_hours'] = $calculation->total_hours;
                            $totalSalaryCalculated += $calculation->total_salary;
                            $calculations[] = $calculation;
                        }
                    }
                    // Если нет настроек, зарплата остается 0 и has_salary_settings = false
                }
                
                $bySpecialist = collect($bySpecialistData)->values()->toArray();
                $totalSalary = $totalSalaryCalculated;
                $totalCalculations = count($calculations);
                
                Log::info('Salary Report: Calculated data', [
                    'bySpecialistData_keys' => array_keys($bySpecialistData),
                    'bySpecialist' => $bySpecialist,
                    'bySpecialist_count' => count($bySpecialist),
                    'totalSalary' => $totalSalary,
                    'calculations_count' => $totalCalculations,
                ]);
                
                // Правильный подсчет уникальных специалистов
                $specialistIdsFromCalculations = array_keys($bySpecialistData);
                $totalSpecialists = TeamMember::where('company_id', $companyId)
                    ->where('status', 'active')
                    ->whereIn('id', $specialistIdsFromCalculations)
                    ->count();
                
                if (empty($specialistIdsFromCalculations)) {
                    $totalSpecialists = TeamMember::where('company_id', $companyId)
                        ->where('status', 'active')
                        ->count();
                }
                
                $averageSalary = $totalSpecialists > 0 ? round($totalSalary / $totalSpecialists, 2) : 0;
                
                // ЗП по периодам (группируем по месяцам)
                $byPeriod = collect($calculations)
                    ->groupBy(function ($calc) {
                        return $calc->period_start->format('Y-m');
                    })
                    ->map(function ($group, $month) {
                        return [
                            'period_start' => $group->first()->period_start->format('Y-m-d'),
                            'period_end' => $group->last()->period_end->format('Y-m-d'),
                            'total_salary' => (float) $group->sum('total_salary'),
                            'calculations_count' => $group->count(),
                        ];
                    })
                    ->values()
                    ->toArray();
                // Считаем бронирования без специалиста
                $bookingsWithoutSpecialist = Booking::where('company_id', $companyId)
                    ->where('status', 'completed')
                    ->whereNull('specialist_id')
                    ->whereDate('booking_date', '>=', $periodStart)
                    ->whereDate('booking_date', '<=', $periodEnd)
                    ->selectRaw('COUNT(*) as count, SUM(COALESCE(total_price, price, 0)) as total_revenue')
                    ->first();
                
                $unassignedBookingsCount = (int) ($bookingsWithoutSpecialist->count ?? 0);
                $unassignedBookingsRevenue = (float) ($bookingsWithoutSpecialist->total_revenue ?? 0);
            } else {
                // Если период не указан, возвращаем пустые данные
                // Пользователь должен выбрать период для отображения отчета
                $bySpecialist = [];
                $totalSalary = 0;
                $totalCalculations = 0;
                $totalSpecialists = 0;
                $averageSalary = 0;
                $byPeriod = [];
                $unassignedBookingsCount = 0;
                $unassignedBookingsRevenue = 0;
            }

            // Убеждаемся, что bySpecialist и byPeriod - массивы
            $bySpecialistArray = is_array($bySpecialist) ? $bySpecialist : (is_object($bySpecialist) ? $bySpecialist->toArray() : []);
            $byPeriodArray = is_array($byPeriod) ? $byPeriod : (is_object($byPeriod) ? $byPeriod->toArray() : []);
            
            Log::info('Salary Report: Final response', [
                'totalSalary' => $totalSalary,
                'bySpecialist_count' => count($bySpecialistArray),
                'bySpecialist' => $bySpecialistArray,
            ]);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'totalSalary' => (float) $totalSalary,
                    'totalCalculations' => $totalCalculations,
                    'totalSpecialists' => $totalSpecialists,
                    'averageSalary' => $averageSalary,
                    'bySpecialist' => $bySpecialistArray,
                    'byPeriod' => $byPeriodArray,
                    'unassignedBookings' => [
                        'count' => $unassignedBookingsCount,
                        'revenue' => $unassignedBookingsRevenue,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Salary Report Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch salary report',
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

                case 'salary':
                    $salary = $this->salary($request);
                    $salaryData = json_decode($salary->getContent(), true)['data'] ?? [];
                    $data = [
                        ['Период начало', 'Период конец', 'Сотрудник', 'Бронирований', 'Часов', 'Базовая сумма', 'Процентная сумма', 'Итого ЗП'],
                    ];
                    // Используем SalaryController для получения детальных данных
                    $salaryController = app(\App\Http\Controllers\Business\SalaryController::class);
                    $calculationsResponse = $salaryController->index($request);
                    $calculationsData = json_decode($calculationsResponse->getContent(), true)['data'] ?? [];
                    foreach ($calculationsData as $calc) {
                        $data[] = [
                            $calc['period_start'] ?? '',
                            $calc['period_end'] ?? '',
                            $calc['specialist_name'] ?? 'Неизвестно',
                            $calc['total_bookings'] ?? 0,
                            number_format($calc['total_hours'] ?? 0, 2),
                            '$' . number_format($calc['base_amount'] ?? 0, 2),
                            '$' . number_format($calc['percent_amount'] ?? 0, 2),
                            '$' . number_format($calc['total_salary'] ?? 0, 2),
                        ];
                    }
                    $filename = 'salary_report';
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

        // Ищем ТОЛЬКО в team_members (основной источник)
        // Не используем старые данные из объявлений
        $specialist = TeamMember::where('id', $booking->specialist_id)
            ->where('company_id', $booking->company_id)
            ->where('status', 'active')
            ->first();
        
        if ($specialist) {
            return [
                'id' => $specialist->id,
                'name' => $specialist->name ?? 'Не указано',
            ];
        }

        // Если не найден в team_members, возвращаем null
        // Не используем fallback на старые данные
        return null;
    }

    /**
     * Get specialist name from team_members only.
     */
    private function getSpecialistName($specialistId, $companyId)
    {
        // Ищем ТОЛЬКО в team_members (основной источник)
        // Не используем старые данные из объявлений
        $specialist = TeamMember::where('company_id', $companyId)
            ->where('id', $specialistId)
            ->where('status', 'active')
            ->first();
        
        if ($specialist && $specialist->name) {
            return $specialist->name;
        }
        
        // Если не найден в team_members, возвращаем 'N/A'
        // Не используем fallback на старые данные
        
        return 'N/A';
    }

    /**
     * Get base query with filters.
     */
    private function getBaseQuery($companyId, $filters)
    {
        $query = Booking::where('bookings.company_id', $companyId);

        if ($filters['date_from']) {
            $query->whereDate('bookings.booking_date', '>=', $filters['date_from']);
        }

        if ($filters['date_to']) {
            $query->whereDate('bookings.booking_date', '<=', $filters['date_to']);
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


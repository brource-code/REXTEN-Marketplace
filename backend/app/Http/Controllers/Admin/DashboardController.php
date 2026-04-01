<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Advertisement;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Order;
use App\Models\Review;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    public function stats()
    {
        $now = now();

        $companiesTotal = Company::query()->count();
        $companiesByStatus = Company::query()
            ->selectRaw('status, COUNT(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status')
            ->toArray();

        $usersTotal = User::query()->count();
        $usersByRole = User::query()
            ->selectRaw('role, COUNT(*) as c')
            ->groupBy('role')
            ->pluck('c', 'role')
            ->toArray();

        $todayStart = $now->copy()->startOfDay();
        $todayEnd = $now->copy()->endOfDay();
        $yesterdayStart = $now->copy()->subDay()->startOfDay();
        $yesterdayEnd = $now->copy()->subDay()->endOfDay();

        $bookingsToday = Booking::query()
            ->where(function ($q) use ($todayStart, $todayEnd) {
                $q->whereBetween('booking_date', [$todayStart, $todayEnd])
                    ->orWhere(function ($q2) use ($todayStart, $todayEnd) {
                        $q2->whereNull('booking_date')
                            ->whereBetween('created_at', [$todayStart, $todayEnd]);
                    });
            })
            ->count();

        $bookingsYesterday = Booking::query()
            ->where(function ($q) use ($yesterdayStart, $yesterdayEnd) {
                $q->whereBetween('booking_date', [$yesterdayStart, $yesterdayEnd])
                    ->orWhere(function ($q2) use ($yesterdayStart, $yesterdayEnd) {
                        $q2->whereNull('booking_date')
                            ->whereBetween('created_at', [$yesterdayStart, $yesterdayEnd]);
                    });
            })
            ->count();

        $revenueThisMonth = 0.0;
        $revenueLastMonth = 0.0;
        if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'total') && Schema::hasColumn('orders', 'payment_status')) {
            $revenueThisMonth = (float) Order::query()
                ->where('payment_status', 'paid')
                ->whereBetween('paid_at', [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()])
                ->sum('total');
            if ($revenueThisMonth === 0.0) {
                $revenueThisMonth = (float) Order::query()
                    ->where('payment_status', 'paid')
                    ->whereBetween('created_at', [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()])
                    ->sum('total');
            }
            $lastMonthStart = $now->copy()->subMonth()->startOfMonth();
            $lastMonthEnd = $now->copy()->subMonth()->endOfMonth();
            $revenueLastMonth = (float) Order::query()
                ->where('payment_status', 'paid')
                ->whereBetween('paid_at', [$lastMonthStart, $lastMonthEnd])
                ->sum('total');
            if ($revenueLastMonth === 0.0) {
                $revenueLastMonth = (float) Order::query()
                    ->where('payment_status', 'paid')
                    ->whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])
                    ->sum('total');
            }
        }

        $adsMarketplaceActive = Advertisement::query()
            ->where(function ($q) {
                $q->whereIn('type', [Advertisement::TYPE_MARKETPLACE, Advertisement::TYPE_REGULAR])
                    ->orWhereNull('type');
            })
            ->where('is_active', true)
            ->where(function ($q) {
                $q->where('status', 'approved')->orWhereNull('status');
            })
            ->count();

        $adsPromoActive = Advertisement::query()
            ->whereIn('type', [Advertisement::TYPE_AD, Advertisement::TYPE_ADVERTISEMENT])
            ->where('is_active', true)
            ->where('status', 'approved')
            ->count();

        $adsPending = 0;
        if (Schema::hasColumn('advertisements', 'status')) {
            $adsPending = (int) Advertisement::query()->where('status', 'pending')->count();
        }

        $avgRating = round((float) Review::query()->where('is_visible', true)->avg('rating'), 2);

        $pendingCompanies = Company::query()
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'name', 'slug', 'created_at']);

        $pendingAds = Advertisement::query()
            ->when(
                Schema::hasColumn('advertisements', 'status'),
                fn ($q) => $q->where('status', 'pending'),
                fn ($q) => $q->whereRaw('1 = 0')
            )
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'title', 'company_id', 'type', 'created_at']);

        $pendingAds->load('company:id,name');

        $lowReviews = Review::query()
            ->where('rating', '<=', 2)
            ->where(function ($q) {
                $q->whereNull('response')->orWhere('response', '');
            })
            ->where('is_visible', true)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'rating', 'company_id', 'created_at']);

        $lowReviews->load('company:id,name');

        $topCompanies = self::buildTopCompanies($now);

        $topCategories = collect();
        if (Schema::hasTable('services') && Schema::hasColumn('services', 'category_id')) {
            $topCategories = Service::query()
                ->selectRaw('category_id, COUNT(*) as cnt')
                ->whereNotNull('category_id')
                ->groupBy('category_id')
                ->orderByDesc('cnt')
                ->limit(5)
                ->get();
            $catIds = $topCategories->pluck('category_id');
            $catNames = ServiceCategory::query()->whereIn('id', $catIds)->pluck('name', 'id');
            $topCategories = $topCategories->map(fn ($row) => [
                'id' => $row->category_id,
                'name' => $catNames[$row->category_id] ?? ('#' . $row->category_id),
                'services_count' => (int) $row->cnt,
            ]);
        }

        return response()->json([
            'data' => [
                'companies' => [
                    'total' => $companiesTotal,
                    'pending' => (int) ($companiesByStatus['pending'] ?? 0),
                    'active' => (int) ($companiesByStatus['active'] ?? 0),
                    'suspended' => (int) ($companiesByStatus['suspended'] ?? 0),
                    'rejected' => (int) ($companiesByStatus['rejected'] ?? 0),
                ],
                'users' => [
                    'total' => $usersTotal,
                    'client' => (int) ($usersByRole['CLIENT'] ?? 0),
                    'business_owner' => (int) ($usersByRole['BUSINESS_OWNER'] ?? 0),
                    'superadmin' => (int) ($usersByRole['SUPERADMIN'] ?? 0),
                ],
                'bookings' => [
                    'today' => $bookingsToday,
                    'yesterday' => $bookingsYesterday,
                ],
                'revenue' => [
                    'this_month' => round($revenueThisMonth, 2),
                    'last_month' => round($revenueLastMonth, 2),
                ],
                'advertisements' => [
                    'marketplace_active' => $adsMarketplaceActive,
                    'promo_active' => $adsPromoActive,
                    'pending_moderation' => $adsPending,
                ],
                'average_rating' => $avgRating,
                'pending_companies' => $pendingCompanies->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'slug' => $c->slug,
                    'created_at' => $c->created_at?->toISOString(),
                ]),
                'pending_advertisements' => $pendingAds->map(fn ($a) => [
                    'id' => $a->id,
                    'title' => $a->title,
                    'company_name' => $a->company?->name,
                    'type' => $a->type,
                    'created_at' => $a->created_at?->toISOString(),
                ]),
                'low_rating_reviews' => $lowReviews->map(fn ($r) => [
                    'id' => $r->id,
                    'rating' => $r->rating,
                    'company_name' => $r->company?->name,
                    'created_at' => $r->created_at?->toISOString(),
                ]),
                'top_companies_by_revenue' => $topCompanies->values(),
                'top_categories' => $topCategories->values(),
            ],
        ]);
    }

    public function chart(Request $request)
    {
        $days = (int) $request->get('days', 14);
        $days = min(max($days, 7), 90);

        $end = now()->endOfDay();
        $start = now()->copy()->subDays($days - 1)->startOfDay();

        $dateKeys = [];
        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            $dateKeys[] = $d->format('Y-m-d');
        }

        $fillSeries = function (array $map) use ($dateKeys) {
            return array_map(fn ($k) => (int) ($map[$k] ?? 0), $dateKeys);
        };

        $companiesMap = Company::query()
            ->where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd')
            ->toArray();

        $usersMap = User::query()
            ->where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd')
            ->toArray();

        $bookingsMap = Booking::query()
            ->where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd')
            ->toArray();

        $revenueMap = [];
        if (Schema::hasTable('orders')) {
            $revenueMap = Order::query()
                ->where('payment_status', 'paid')
                ->where(function ($q) use ($start) {
                    $q->where('paid_at', '>=', $start)
                        ->orWhere(function ($q2) use ($start) {
                            $q2->whereNull('paid_at')->where('created_at', '>=', $start);
                        });
                })
                ->selectRaw('DATE(COALESCE(paid_at, created_at)) as d, SUM(total) as s')
                ->groupBy('d')
                ->pluck('s', 'd')
                ->map(fn ($v) => round((float) $v, 2))
                ->toArray();
        }

        return response()->json([
            'data' => [
                'date' => $dateKeys,
                'series' => [
                    ['name' => 'companies', 'data' => $fillSeries($companiesMap)],
                    ['name' => 'users', 'data' => $fillSeries($usersMap)],
                    ['name' => 'bookings', 'data' => $fillSeries($bookingsMap)],
                    ['name' => 'revenue', 'data' => $fillSeries($revenueMap)],
                ],
            ],
        ]);
    }

    public function recentActivity()
    {
        $timeline = [];

        $logs = ActivityLog::with('user.profile')
            ->orderByDesc('created_at')
            ->limit(25)
            ->get();

        foreach ($logs as $log) {
            $userName = null;
            if ($log->user) {
                $p = $log->user->profile;
                $userName = $p
                    ? trim(($p->first_name ?? '') . ' ' . ($p->last_name ?? '')) ?: $log->user->email
                    : $log->user->email;
            }
            $timeline[] = [
                'ts' => $log->created_at->timestamp,
                'row' => [
                    'id' => $log->id,
                    'user' => $log->user ? [
                        'id' => $log->user->id,
                        'name' => $userName,
                        'email' => $log->user->email,
                    ] : null,
                    'action' => $log->action,
                    'entity_type' => $log->entity_type,
                    'entity_name' => $log->entity_name,
                    'description' => $log->description,
                    'created_at' => $log->created_at->toISOString(),
                    'activity_key' => null,
                    'activity_meta' => null,
                ],
            ];
        }

        foreach (User::query()->orderByDesc('created_at')->limit(20)->get(['id', 'email', 'role', 'created_at']) as $u) {
            $timeline[] = [
                'ts' => $u->created_at->timestamp,
                'row' => [
                    'id' => 'syn-user-' . $u->id,
                    'user' => [
                        'id' => $u->id,
                        'name' => $u->email,
                        'email' => $u->email,
                    ],
                    'action' => null,
                    'entity_type' => 'User',
                    'entity_name' => null,
                    'description' => null,
                    'created_at' => $u->created_at->toISOString(),
                    'activity_key' => 'new_user',
                    'activity_meta' => [
                        'email' => $u->email,
                        'role' => $u->role,
                    ],
                ],
            ];
        }

        foreach (Company::query()->orderByDesc('created_at')->limit(20)->get(['id', 'name', 'created_at']) as $c) {
            $timeline[] = [
                'ts' => $c->created_at->timestamp,
                'row' => [
                    'id' => 'syn-company-' . $c->id,
                    'user' => null,
                    'action' => null,
                    'entity_type' => 'Company',
                    'entity_name' => $c->name,
                    'description' => null,
                    'created_at' => $c->created_at->toISOString(),
                    'activity_key' => 'new_company',
                    'activity_meta' => ['name' => $c->name],
                ],
            ];
        }

        foreach (Booking::query()->with('company:id,name')->orderByDesc('created_at')->limit(20)->get(['id', 'company_id', 'created_at', 'client_name', 'status']) as $b) {
            $companyName = $b->company?->name ?? '';
            $timeline[] = [
                'ts' => $b->created_at->timestamp,
                'row' => [
                    'id' => 'syn-booking-' . $b->id,
                    'user' => null,
                    'action' => null,
                    'entity_type' => 'Booking',
                    'entity_name' => (string) $b->id,
                    'description' => null,
                    'created_at' => $b->created_at->toISOString(),
                    'activity_key' => 'new_booking',
                    'activity_meta' => [
                        'id' => $b->id,
                        'company' => $companyName,
                        'client' => $b->client_name ?? '',
                        'status' => $b->status ?? '',
                    ],
                ],
            ];
        }

        usort($timeline, fn ($a, $b) => $b['ts'] <=> $a['ts']);

        $seen = [];
        $data = [];
        foreach ($timeline as $item) {
            $key = $item['row']['id'];
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $data[] = $item['row'];
            if (count($data) >= 12) {
                break;
            }
        }

        return response()->json(['data' => $data]);
    }

    public function kpi(Request $request)
    {
        $period = $request->get('period', 'week');
        $days = $period === 'month' ? 30 : 7;

        $curStart = now()->copy()->subDays($days - 1)->startOfDay();
        $prevStart = $curStart->copy()->subDays($days);
        $prevEnd = $curStart->copy()->subSecond();

        $countRange = function ($model, $column = 'created_at') use ($curStart, $prevStart, $prevEnd) {
            $cur = $model::query()->where($column, '>=', $curStart)->count();
            $prev = $model::query()->whereBetween($column, [$prevStart, $prevEnd])->count();

            return ['current' => $cur, 'previous' => $prev, 'change_percent' => self::pctChange($prev, $cur)];
        };

        $revenueCur = 0.0;
        $revenuePrev = 0.0;
        if (Schema::hasTable('orders')) {
            $revenueCur = (float) Order::query()
                ->where('payment_status', 'paid')
                ->where(function ($q) use ($curStart) {
                    $q->where('paid_at', '>=', $curStart)
                        ->orWhere(function ($q2) use ($curStart) {
                            $q2->whereNull('paid_at')->where('created_at', '>=', $curStart);
                        });
                })
                ->sum('total');
            $revenuePrev = (float) Order::query()
                ->where('payment_status', 'paid')
                ->where(function ($q) use ($prevStart, $prevEnd) {
                    $q->whereBetween('paid_at', [$prevStart, $prevEnd])
                        ->orWhere(function ($q2) use ($prevStart, $prevEnd) {
                            $q2->whereNull('paid_at')->whereBetween('created_at', [$prevStart, $prevEnd]);
                        });
                })
                ->sum('total');
        }

        return response()->json([
            'data' => [
                'period_days' => $days,
                'new_companies' => $countRange(Company::class),
                'new_users' => $countRange(User::class),
                'new_bookings' => $countRange(Booking::class),
                'revenue' => [
                    'current' => round($revenueCur, 2),
                    'previous' => round($revenuePrev, 2),
                    'change_percent' => self::pctChange($revenuePrev, $revenueCur),
                ],
            ],
        ]);
    }

    public function trends(Request $request)
    {
        return $this->kpi($request);
    }

    private static function pctChange(float $prev, float $cur): ?float
    {
        if ($prev <= 0 && $cur <= 0) {
            return null;
        }
        if ($prev <= 0) {
            return 100.0;
        }

        return round((($cur - $prev) / $prev) * 100, 1);
    }

    /**
     * Топ компаний: сначала оплаченные заказы (окна 90д → всё время), затем выручка по завершённым бронированиям, затем число бронирований.
     */
    private static function buildTopCompanies(\DateTimeInterface $now): \Illuminate\Support\Collection
    {
        if (! Schema::hasTable('orders') || ! Schema::hasColumn('orders', 'company_id')) {
            return self::topCompaniesFromBookings($now);
        }

        $mapRows = function ($rows): array {
            $companyIds = $rows->pluck('company_id')->filter();
            $names = Company::query()->whereIn('id', $companyIds)->pluck('name', 'id');

            return $rows->map(fn ($row) => [
                'id' => $row->company_id,
                'name' => $names[$row->company_id] ?? ('#' . $row->company_id),
                'revenue' => round((float) $row->revenue_sum, 2),
                'orders' => (int) $row->order_count,
            ])->values()->all();
        };

        $paidQuery = function ($since = null) {
            $q = Order::query()
                ->whereNotNull('company_id')
                ->where('payment_status', 'paid');
            if ($since) {
                $q->where(function ($q2) use ($since) {
                    $q2->where('paid_at', '>=', $since)->orWhere(function ($q3) use ($since) {
                        $q3->whereNull('paid_at')->where('created_at', '>=', $since);
                    });
                });
            }

            return $q->selectRaw('company_id, SUM(total) as revenue_sum, COUNT(*) as order_count')
                ->groupBy('company_id')
                ->orderByDesc('revenue_sum')
                ->limit(5)
                ->get();
        };

        $rows = $paidQuery($now->copy()->subDays(90));
        if ($rows->isEmpty()) {
            $rows = $paidQuery(null);
        }
        if ($rows->isNotEmpty()) {
            return collect($mapRows($rows));
        }

        return self::topCompaniesFromBookings($now);
    }

    private static function topCompaniesFromBookings(\DateTimeInterface $now): \Illuminate\Support\Collection
    {
        if (! Schema::hasTable('bookings') || ! Schema::hasColumn('bookings', 'company_id')) {
            return collect();
        }

        $priceExpr = 'COALESCE(NULLIF(total_price, 0), price, 0)';
        $since = $now->copy()->subDays(365);

        $rows = Booking::query()
            ->whereNotNull('company_id')
            ->where('status', 'completed')
            ->where('created_at', '>=', $since)
            ->selectRaw("company_id, SUM({$priceExpr}) as revenue_sum, COUNT(*) as order_count")
            ->groupBy('company_id')
            ->orderByDesc('revenue_sum')
            ->limit(5)
            ->get();

        if ($rows->isEmpty()) {
            $rows = Booking::query()
                ->whereNotNull('company_id')
                ->where('status', 'completed')
                ->selectRaw("company_id, SUM({$priceExpr}) as revenue_sum, COUNT(*) as order_count")
                ->groupBy('company_id')
                ->orderByDesc('revenue_sum')
                ->limit(5)
                ->get();
        }

        if ($rows->isEmpty()) {
            $rows = Booking::query()
                ->whereNotNull('company_id')
                ->selectRaw('company_id, SUM(COALESCE(total_price, price, 0)) as revenue_sum, COUNT(*) as order_count')
                ->groupBy('company_id')
                ->orderByDesc('order_count')
                ->limit(5)
                ->get();
        }

        $companyIds = $rows->pluck('company_id')->filter();
        $names = Company::query()->whereIn('id', $companyIds)->pluck('name', 'id');

        return $rows->map(fn ($row) => [
            'id' => $row->company_id,
            'name' => $names[$row->company_id] ?? ('#' . $row->company_id),
            'revenue' => round((float) $row->revenue_sum, 2),
            'orders' => (int) $row->order_count,
        ])->values();
    }
}

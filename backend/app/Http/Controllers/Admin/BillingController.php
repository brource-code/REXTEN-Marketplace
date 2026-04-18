<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Payment;
use App\Services\StripeAdminTransactionEnricherService;
use App\Services\StripeBillingAggregatorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BillingController extends Controller
{
    public function __construct(
        private StripeBillingAggregatorService $stripeBilling,
        private StripeAdminTransactionEnricherService $stripeTxnEnricher,
    ) {}

    public function overview(Request $request)
    {
        if (! $this->stripeBilling->isConfigured()) {
            return response()->json([
                'stripe_configured' => false,
                'revenue_this_month' => 0,
                'revenue_last_month' => 0,
                'revenue_growth_pct' => null,
                'revenue_ad_this_month' => 0,
                'revenue_subscription_this_month' => 0,
                'revenue_other_this_month' => 0,
                'transactions_this_month' => 0,
                'avg_check_this_month' => 0,
                'transactions_today' => 0,
                'amount_today' => 0,
                'open_checkouts' => 0,
                'open_checkouts_amount' => 0,
            ]);
        }

        try {
            $now = now();
            $startThis = $now->copy()->startOfMonth()->timestamp;
            $endThis = $now->copy()->endOfDay()->timestamp;
            $startLast = $now->copy()->subMonthNoOverflow()->startOfMonth()->timestamp;
            $endLast = $now->copy()->subMonthNoOverflow()->endOfMonth()->timestamp;
            $startToday = $now->copy()->startOfDay()->timestamp;

            $thisMonth = $this->stripeBilling->collectPaidSessions($startThis, $endThis, 5000);
            $lastMonth = $this->stripeBilling->collectPaidSessions($startLast, $endLast, 5000);

            $revThis = array_sum(array_column($thisMonth, 'amount'));
            $revLast = array_sum(array_column($lastMonth, 'amount'));
            $growth = $revLast > 0
                ? round((($revThis - $revLast) / $revLast) * 1000) / 10
                : ($revThis > 0 ? 100 : null);

            $adThis = 0;
            $subThis = 0;
            $otherThis = 0;
            foreach ($thisMonth as $row) {
                if ($row['type'] === 'advertisement') {
                    $adThis += $row['amount'];
                } elseif ($row['type'] === 'subscription') {
                    $subThis += $row['amount'];
                } else {
                    $otherThis += $row['amount'];
                }
            }

            $todayAmt = 0;
            $todayCnt = 0;
            foreach ($thisMonth as $row) {
                if ($row['created'] >= $startToday) {
                    $todayAmt += $row['amount'];
                    $todayCnt++;
                }
            }

            $open = $this->stripeBilling->collectOpenSessions(14, 300);
            $openAmt = array_sum(array_column($open, 'amount'));

            $cnt = count($thisMonth);

            return response()->json([
                'stripe_configured' => true,
                'revenue_this_month' => round($revThis, 2),
                'revenue_last_month' => round($revLast, 2),
                'revenue_growth_pct' => $growth,
                'revenue_ad_this_month' => round($adThis, 2),
                'revenue_subscription_this_month' => round($subThis, 2),
                'revenue_other_this_month' => round($otherThis, 2),
                'transactions_this_month' => $cnt,
                'avg_check_this_month' => $cnt > 0 ? round($revThis / $cnt, 2) : 0,
                'transactions_today' => $todayCnt,
                'amount_today' => round($todayAmt, 2),
                'open_checkouts' => count($open),
                'open_checkouts_amount' => round($openAmt, 2),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'billing_overview_failed',
                'message' => $e->getMessage(),
            ], 502);
        }
    }

    public function revenueChart(Request $request)
    {
        $days = (int) $request->input('days', 14);
        $days = in_array($days, [7, 14, 30, 90], true) ? $days : 14;

        if (! $this->stripeBilling->isConfigured()) {
            return response()->json([
                'stripe_configured' => false,
                'date' => [],
                'series' => [
                    ['name' => 'total', 'data' => []],
                    ['name' => 'advertisement', 'data' => []],
                    ['name' => 'subscription', 'data' => []],
                ],
            ]);
        }

        try {
            $end = now()->endOfDay()->timestamp;
            $start = now()->subDays($days - 1)->startOfDay()->timestamp;
            $rows = $this->stripeBilling->collectPaidSessions($start, $end, 8000);

            $dates = [];
            $t = now()->subDays($days - 1)->startOfDay();
            for ($i = 0; $i < $days; $i++) {
                $dates[] = $t->format('Y-m-d');
                $t->addDay();
            }

            $bucketTotal = array_fill_keys($dates, 0.0);
            $bucketAd = array_fill_keys($dates, 0.0);
            $bucketSub = array_fill_keys($dates, 0.0);

            foreach ($rows as $row) {
                $d = $row['date'] ?? '';
                if (! isset($bucketTotal[$d])) {
                    continue;
                }
                $a = (float) $row['amount'];
                $bucketTotal[$d] += $a;
                if ($row['type'] === 'advertisement') {
                    $bucketAd[$d] += $a;
                } elseif ($row['type'] === 'subscription') {
                    $bucketSub[$d] += $a;
                }
            }

            return response()->json([
                'stripe_configured' => true,
                'date' => $dates,
                'series' => [
                    ['name' => 'total', 'data' => array_values($bucketTotal)],
                    ['name' => 'advertisement', 'data' => array_values($bucketAd)],
                    ['name' => 'subscription', 'data' => array_values($bucketSub)],
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'billing_chart_failed',
                'message' => $e->getMessage(),
            ], 502);
        }
    }

    public function revenueStructure(Request $request)
    {
        if (! $this->stripeBilling->isConfigured()) {
            return response()->json([
                'stripe_configured' => false,
                'advertisement' => 0,
                'subscription' => 0,
                'other' => 0,
                'total' => 0,
            ]);
        }

        try {
            $start = now()->startOfMonth()->timestamp;
            $end = now()->endOfDay()->timestamp;
            $rows = $this->stripeBilling->collectPaidSessions($start, $end, 5000);

            $ad = 0;
            $sub = 0;
            $other = 0;
            foreach ($rows as $row) {
                if ($row['type'] === 'advertisement') {
                    $ad += $row['amount'];
                } elseif ($row['type'] === 'subscription') {
                    $sub += $row['amount'];
                } else {
                    $other += $row['amount'];
                }
            }
            $total = $ad + $sub + $other;

            return response()->json([
                'stripe_configured' => true,
                'advertisement' => round($ad, 2),
                'subscription' => round($sub, 2),
                'other' => round($other, 2),
                'total' => round($total, 2),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'billing_structure_failed',
                'message' => $e->getMessage(),
            ], 502);
        }
    }

    public function transactions(Request $request)
    {
        $type = $request->input('type', 'all');
        $companyId = $request->input('company_id');
        $page = max(1, (int) $request->input('page', 1));
        $pageSize = min(50, max(5, (int) $request->input('pageSize', 15)));

        if (! $this->stripeBilling->isConfigured()) {
            return response()->json([
                'stripe_configured' => false,
                'data' => [],
                'total' => 0,
                'page' => $page,
                'pageSize' => $pageSize,
            ]);
        }

        try {
            $start = now()->subDays(365)->startOfDay()->timestamp;
            $end = now()->endOfDay()->timestamp;
            $rows = $this->stripeBilling->collectPaidSessions($start, $end, 4000);

            usort($rows, fn ($a, $b) => ($b['created'] ?? 0) <=> ($a['created'] ?? 0));

            $filtered = array_values(array_filter($rows, function ($r) use ($type, $companyId) {
                if ($type !== 'all' && ($r['type'] ?? '') !== $type) {
                    return false;
                }
                if ($companyId !== null && $companyId !== '' && (int) $companyId !== (int) ($r['company_id'] ?? 0)) {
                    return false;
                }

                return true;
            }));

            $companyIds = array_unique(array_filter(array_column($filtered, 'company_id')));
            $companies = Company::whereIn('id', $companyIds)->get()->keyBy('id');

            $total = count($filtered);
            $offset = ($page - 1) * $pageSize;
            $slice = array_slice($filtered, $offset, $pageSize);

            $includeStripe = $request->boolean('include_stripe', false);

            $data = array_map(function ($r) use ($companies, $includeStripe) {
                $cid = $r['company_id'] ?? null;
                $cname = $cid && $companies->has($cid) ? $companies->get($cid)->name : null;

                $row = [
                    'id' => $r['id'],
                    'type' => $r['type'],
                    'amount' => round((float) $r['amount'], 2),
                    'currency' => $r['currency'],
                    'status' => $r['status'],
                    'description' => $r['description'],
                    'created' => $r['created_at'],
                    'company_id' => $cid,
                    'company_name' => $cname,
                    'advertisement_id' => $r['advertisement_id'],
                    'package_id' => $r['package_id'],
                ];

                if ($includeStripe && $this->stripeTxnEnricher->isConfigured() && ! empty($r['id'])) {
                    $row['stripe'] = $this->stripeTxnEnricher->snapshotCheckoutSession($r['id']);
                }

                return $row;
            }, $slice);

            return response()->json([
                'stripe_configured' => true,
                'data' => $data,
                'total' => $total,
                'page' => $page,
                'pageSize' => $pageSize,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'billing_transactions_failed',
                'message' => $e->getMessage(),
            ], 502);
        }
    }

    /**
     * Снимок Checkout Session + PaymentIntent из Stripe по id сессии (ленивая загрузка для модалки).
     */
    public function transactionStripe(Request $request)
    {
        $sessionId = $request->query('session_id');
        if (! is_string($sessionId) || $sessionId === '') {
            return response()->json(['error' => 'session_id_required'], 422);
        }

        if (! $this->stripeTxnEnricher->isConfigured()) {
            return response()->json(['error' => 'stripe_not_configured'], 400);
        }

        $stripe = $this->stripeTxnEnricher->snapshotCheckoutSession($sessionId);

        return response()->json([
            'session_id' => $sessionId,
            'stripe' => $stripe,
        ]);
    }

    public function revenueByCompany(Request $request)
    {
        $limit = min(50, max(5, (int) $request->input('limit', 10)));

        if (! $this->stripeBilling->isConfigured()) {
            return response()->json(['stripe_configured' => false, 'companies' => []]);
        }

        try {
            $start = now()->startOfMonth()->timestamp;
            $end = now()->endOfDay()->timestamp;
            $rows = $this->stripeBilling->collectPaidSessions($start, $end, 5000);

            $byCompany = [];
            foreach ($rows as $row) {
                $cid = $row['company_id'] ?? null;
                if (! $cid) {
                    continue;
                }
                if (! isset($byCompany[$cid])) {
                    $byCompany[$cid] = ['amount' => 0.0, 'count' => 0];
                }
                $byCompany[$cid]['amount'] += (float) $row['amount'];
                $byCompany[$cid]['count']++;
            }

            uasort($byCompany, fn ($a, $b) => $b['amount'] <=> $a['amount']);
            $topIds = array_slice(array_keys($byCompany), 0, $limit, true);
            $companies = Company::whereIn('id', $topIds)->get()->keyBy('id');

            $list = [];
            foreach ($topIds as $cid) {
                $c = $companies->get($cid);
                $list[] = [
                    'company_id' => (int) $cid,
                    'company_name' => $c ? $c->name : "#{$cid}",
                    'total_amount' => round($byCompany[$cid]['amount'], 2),
                    'transaction_count' => $byCompany[$cid]['count'],
                ];
            }

            return response()->json([
                'stripe_configured' => true,
                'companies' => $list,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'billing_revenue_by_company_failed',
                'message' => $e->getMessage(),
            ], 502);
        }
    }

    public function adSpend(Request $request)
    {
        if (! $this->stripeBilling->isConfigured()) {
            return response()->json([
                'stripe_configured' => false,
                'this_month' => 0,
                'last_month' => 0,
                'by_package' => [],
                'transactions_count' => 0,
            ]);
        }

        try {
            $now = now();
            $t0 = $now->copy()->startOfMonth()->timestamp;
            $t1 = $now->copy()->endOfDay()->timestamp;
            $l0 = $now->copy()->subMonthNoOverflow()->startOfMonth()->timestamp;
            $l1 = $now->copy()->subMonthNoOverflow()->endOfMonth()->timestamp;

            $thisRows = $this->stripeBilling->collectPaidSessions($t0, $t1, 5000);
            $lastRows = $this->stripeBilling->collectPaidSessions($l0, $l1, 5000);

            $sumThis = 0;
            $sumLast = 0;
            $byPkg = [];
            $cnt = 0;

            foreach ($thisRows as $row) {
                if ($row['type'] !== 'advertisement') {
                    continue;
                }
                $sumThis += $row['amount'];
                $cnt++;
                $p = $row['package_id'] ?? 'unknown';
                $byPkg[$p] = ($byPkg[$p] ?? 0) + $row['amount'];
            }
            foreach ($lastRows as $row) {
                if ($row['type'] === 'advertisement') {
                    $sumLast += $row['amount'];
                }
            }

            $pkgOut = [];
            foreach ($byPkg as $k => $v) {
                $pkgOut[] = ['package_id' => $k, 'amount' => round($v, 2)];
            }
            usort($pkgOut, fn ($a, $b) => $b['amount'] <=> $a['amount']);

            return response()->json([
                'stripe_configured' => true,
                'this_month' => round($sumThis, 2),
                'last_month' => round($sumLast, 2),
                'by_package' => $pkgOut,
                'transactions_count' => $cnt,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'billing_ad_spend_failed',
                'message' => $e->getMessage(),
            ], 502);
        }
    }

    public function campaigns(Request $request)
    {
        $limit = min(30, max(5, (int) $request->input('limit', 15)));

        if (! $this->stripeBilling->isConfigured()) {
            return response()->json(['stripe_configured' => false, 'items' => []]);
        }

        try {
            $start = now()->subDays(90)->startOfDay()->timestamp;
            $end = now()->endOfDay()->timestamp;
            $rows = $this->stripeBilling->collectPaidSessions($start, $end, 2000);
            usort($rows, fn ($a, $b) => ($b['created'] ?? 0) <=> ($a['created'] ?? 0));

            $adRows = [];
            foreach ($rows as $row) {
                if ($row['type'] === 'advertisement') {
                    $adRows[] = $row;
                }
            }
            $campCompanyIds = array_unique(array_filter(array_column($adRows, 'company_id')));
            $campCompanies = Company::whereIn('id', $campCompanyIds)->get()->keyBy('id');

            $items = [];
            foreach ($adRows as $row) {
                $cid = $row['company_id'];
                $cname = $cid && $campCompanies->has($cid)
                    ? $campCompanies->get($cid)->name
                    : ($cid ? "#{$cid}" : '—');
                $items[] = [
                    'description' => $row['description'],
                    'amount' => round((float) $row['amount'], 2),
                    'currency' => $row['currency'],
                    'created' => $row['created_at'],
                    'company_name' => $cname,
                    'package_id' => $row['package_id'],
                ];
                if (count($items) >= $limit) {
                    break;
                }
            }


            return response()->json([
                'stripe_configured' => true,
                'items' => $items,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'billing_campaigns_failed',
                'message' => $e->getMessage(),
            ], 502);
        }
    }

    public function forecast(Request $request)
    {
        if (! $this->stripeBilling->isConfigured()) {
            return response()->json([
                'stripe_configured' => false,
                'projected_month' => 0,
                'last_7_days_total' => 0,
                'daily_avg' => 0,
            ]);
        }

        try {
            $start = now()->subDays(6)->startOfDay()->timestamp;
            $end = now()->endOfDay()->timestamp;
            $rows = $this->stripeBilling->collectPaidSessions($start, $end, 3000);
            $total = array_sum(array_column($rows, 'amount'));
            $daily = $total / 7;
            $projected = $daily * 30;

            return response()->json([
                'stripe_configured' => true,
                'last_7_days_total' => round($total, 2),
                'daily_avg' => round($daily, 2),
                'projected_month' => round($projected, 2),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'billing_forecast_failed',
                'message' => $e->getMessage(),
            ], 502);
        }
    }

    public function export(Request $request): StreamedResponse|\Illuminate\Http\JsonResponse
    {
        if (! $this->stripeBilling->isConfigured()) {
            return response()->json(['error' => 'stripe_not_configured'], 400);
        }

        $from = $request->input('from');
        $to = $request->input('to');
        if (! $from || ! $to) {
            return response()->json(['error' => 'from_and_to_required'], 422);
        }

        try {
            $startTs = strtotime($from.' 00:00:00');
            $endTs = strtotime($to.' 23:59:59');
            if ($startTs === false || $endTs === false || $startTs > $endTs) {
                return response()->json(['error' => 'invalid_date_range'], 422);
            }
            $maxSpan = 93 * 86400;
            if ($endTs - $startTs > $maxSpan) {
                return response()->json(['error' => 'range_max_93_days'], 422);
            }

            $rows = $this->stripeBilling->collectPaidSessions($startTs, $endTs, 10000);
            usort($rows, fn ($a, $b) => ($b['created'] ?? 0) <=> ($a['created'] ?? 0));

            $companyIds = array_unique(array_filter(array_column($rows, 'company_id')));
            $companies = Company::whereIn('id', $companyIds)->get()->keyBy('id');

            $filename = 'billing-export-'.date('Y-m-d').'.csv';

            return Response::streamDownload(function () use ($rows, $companies) {
                $out = fopen('php://output', 'w');
                fputcsv($out, ['date', 'type', 'amount', 'currency', 'company_id', 'company_name', 'description', 'session_id']);
                foreach ($rows as $r) {
                    $cid = $r['company_id'] ?? '';
                    $cname = $cid && $companies->has($cid) ? $companies->get($cid)->name : '';
                    fputcsv($out, [
                        $r['created_at'] ?? '',
                        $r['type'] ?? '',
                        $r['amount'] ?? '',
                        $r['currency'] ?? '',
                        $cid,
                        $cname,
                        $r['description'] ?? '',
                        $r['id'] ?? '',
                    ]);
                }
                fclose($out);
            }, $filename, [
                'Content-Type' => 'text/csv; charset=UTF-8',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'export_failed',
                'message' => $e->getMessage(),
            ], 502);
        }
    }

    /**
     * Stripe Connect: overview of Connect accounts and payments.
     */
    public function connectOverview(Request $request)
    {
        $totalCompanies = Company::count();
        $connectedCompanies = Company::whereNotNull('stripe_account_id')->count();
        $activeCompanies = Company::where('stripe_account_status', 'active')->count();
        $pendingCompanies = Company::where('stripe_account_status', 'pending')->count();
        $restrictedCompanies = Company::where('stripe_account_status', 'restricted')->count();
        $disabledCompanies = Company::where('stripe_account_status', 'disabled')->count();
        $disputeCompanies = Company::where('has_active_dispute', true)->count();

        $now = now();
        $startThisMonth = $now->copy()->startOfMonth();
        $startLastMonth = $now->copy()->subMonthNoOverflow()->startOfMonth();
        $endLastMonth = $now->copy()->subMonthNoOverflow()->endOfMonth();

        $paymentsThisMonth = Payment::where('created_at', '>=', $startThisMonth)
            ->whereIn('status', [Payment::STATUS_SUCCEEDED, Payment::STATUS_PARTIALLY_REFUNDED])
            ->count();
        $revenueThisMonth = Payment::where('created_at', '>=', $startThisMonth)
            ->whereIn('status', [Payment::STATUS_SUCCEEDED, Payment::STATUS_PARTIALLY_REFUNDED])
            ->sum('amount') / 100;
        $feesThisMonth = Payment::where('created_at', '>=', $startThisMonth)
            ->whereIn('status', [Payment::STATUS_SUCCEEDED, Payment::STATUS_PARTIALLY_REFUNDED])
            ->sum('application_fee') / 100;

        $paymentsLastMonth = Payment::whereBetween('created_at', [$startLastMonth, $endLastMonth])
            ->whereIn('status', [Payment::STATUS_SUCCEEDED, Payment::STATUS_PARTIALLY_REFUNDED])
            ->count();
        $revenueLastMonth = Payment::whereBetween('created_at', [$startLastMonth, $endLastMonth])
            ->whereIn('status', [Payment::STATUS_SUCCEEDED, Payment::STATUS_PARTIALLY_REFUNDED])
            ->sum('amount') / 100;

        $pendingCaptures = Payment::where('capture_status', Payment::CAPTURE_PENDING)->count();
        $pendingCapturesAmount = Payment::where('capture_status', Payment::CAPTURE_PENDING)->sum('amount') / 100;

        $refundedThisMonth = Payment::where('created_at', '>=', $startThisMonth)
            ->where('refunded_amount', '>', 0)
            ->sum('refunded_amount') / 100;

        $disputedThisMonth = Payment::where('created_at', '>=', $startThisMonth)
            ->where('status', Payment::STATUS_DISPUTED)
            ->count();

        $revenueGrowth = $revenueLastMonth > 0
            ? round((($revenueThisMonth - $revenueLastMonth) / $revenueLastMonth) * 100, 1)
            : ($revenueThisMonth > 0 ? 100 : null);

        return response()->json([
            'total_companies' => $totalCompanies,
            'connected_companies' => $connectedCompanies,
            'active_companies' => $activeCompanies,
            'pending_companies' => $pendingCompanies,
            'restricted_companies' => $restrictedCompanies,
            'disabled_companies' => $disabledCompanies,
            'dispute_companies' => $disputeCompanies,
            'payments_this_month' => $paymentsThisMonth,
            'payments_last_month' => $paymentsLastMonth,
            'revenue_this_month' => round($revenueThisMonth, 2),
            'revenue_last_month' => round($revenueLastMonth, 2),
            'revenue_growth_pct' => $revenueGrowth,
            'fees_this_month' => round($feesThisMonth, 2),
            'pending_captures' => $pendingCaptures,
            'pending_captures_amount' => round($pendingCapturesAmount, 2),
            'refunded_this_month' => round($refundedThisMonth, 2),
            'disputed_this_month' => $disputedThisMonth,
        ]);
    }

    /**
     * Stripe Connect: list of Connect accounts with statuses.
     */
    public function connectAccounts(Request $request)
    {
        $status = $request->input('status', 'all');
        $search = $request->input('search', '');
        $page = max(1, (int) $request->input('page', 1));
        $pageSize = min(50, max(5, (int) $request->input('pageSize', 15)));

        $query = Company::whereNotNull('stripe_account_id');

        if ($status !== 'all') {
            if ($status === 'dispute') {
                $query->where('has_active_dispute', true);
            } else {
                $query->where('stripe_account_status', $status);
            }
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('stripe_account_id', 'ilike', "%{$search}%");
            });
        }

        $total = $query->count();
        $companies = $query->orderByDesc('stripe_onboarding_completed_at')
            ->offset(($page - 1) * $pageSize)
            ->limit($pageSize)
            ->get();

        $companyIds = $companies->pluck('id')->toArray();

        $paymentStats = Payment::whereIn('company_id', $companyIds)
            ->whereIn('status', [Payment::STATUS_SUCCEEDED, Payment::STATUS_PARTIALLY_REFUNDED])
            ->selectRaw('company_id, COUNT(*) as payment_count, SUM(amount) as total_amount, SUM(application_fee) as total_fees')
            ->groupBy('company_id')
            ->get()
            ->keyBy('company_id');

        $data = $companies->map(function ($company) use ($paymentStats) {
            $stats = $paymentStats->get($company->id);
            return [
                'id' => $company->id,
                'name' => $company->name,
                'stripe_account_id' => $company->stripe_account_id,
                'stripe_account_status' => $company->stripe_account_status,
                'stripe_payouts_enabled' => $company->stripe_payouts_enabled,
                'stripe_charges_enabled' => $company->stripe_charges_enabled,
                'stripe_onboarding_completed_at' => $company->stripe_onboarding_completed_at?->toISOString(),
                'stripe_disabled_reason' => $company->stripe_disabled_reason,
                'has_active_dispute' => $company->has_active_dispute,
                'payment_count' => $stats ? (int) $stats->payment_count : 0,
                'total_amount' => $stats ? round($stats->total_amount / 100, 2) : 0,
                'total_fees' => $stats ? round($stats->total_fees / 100, 2) : 0,
            ];
        });

        return response()->json([
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }

    /**
     * Stripe Connect: list of booking payments.
     */
    public function connectPayments(Request $request)
    {
        $status = $request->input('status', 'all');
        $companyId = $request->input('company_id');
        $page = max(1, (int) $request->input('page', 1));
        $pageSize = min(50, max(5, (int) $request->input('pageSize', 15)));

        $query = Payment::with(['company', 'booking', 'user']);

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        $total = $query->count();
        $payments = $query->orderByDesc('created_at')
            ->offset(($page - 1) * $pageSize)
            ->limit($pageSize)
            ->get();

        $includeStripe = $request->boolean('include_stripe', false);

        $data = $payments->map(function ($payment) use ($includeStripe) {
            $row = [
                'id' => $payment->id,
                'stripe_payment_intent_id' => $payment->stripe_payment_intent_id,
                'stripe_charge_id' => $payment->stripe_charge_id,
                'stripe_account_id' => $payment->company?->stripe_account_id,
                'company_id' => $payment->company_id,
                'company_name' => $payment->company?->name,
                'booking_id' => $payment->booking_id,
                'user_id' => $payment->user_id,
                'user_name' => $payment->user?->email,
                'amount' => round($payment->amount / 100, 2),
                'application_fee' => round($payment->application_fee / 100, 2),
                'currency' => $payment->currency,
                'status' => $payment->status,
                'capture_status' => $payment->capture_status,
                'refunded_amount' => round($payment->refunded_amount / 100, 2),
                'refund_reason' => $payment->refund_reason,
                'refund_initiated_by' => $payment->refund_initiated_by,
                'disputed_at' => $payment->disputed_at?->toISOString(),
                'captured_at' => $payment->captured_at?->toISOString(),
                'created_at' => $payment->created_at->toISOString(),
            ];

            if ($includeStripe && $this->stripeTxnEnricher->isConfigured() && $payment->stripe_payment_intent_id) {
                $row['stripe'] = $this->stripeTxnEnricher->snapshotPaymentIntent($payment->stripe_payment_intent_id);
            }

            return $row;
        });

        return response()->json([
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }

    /**
     * Stripe Connect: полный снимок PaymentIntent из Stripe по локальному платежу.
     */
    public function connectPaymentStripe(Payment $payment)
    {
        if (! $this->stripeTxnEnricher->isConfigured()) {
            return response()->json(['error' => 'stripe_not_configured'], 400);
        }

        if (! $payment->stripe_payment_intent_id) {
            // 200 + error в теле — не «валидация», чтобы клиент не логировал 422 и модалка показала текст
            return response()->json([
                'payment_id' => $payment->id,
                'stripe' => [
                    'error_code' => 'no_payment_intent',
                    'error' => 'no_payment_intent',
                ],
            ]);
        }

        $stripe = $this->stripeTxnEnricher->snapshotPaymentIntent($payment->stripe_payment_intent_id);

        return response()->json([
            'payment_id' => $payment->id,
            'stripe' => $stripe,
        ]);
    }

    /**
     * Stripe Connect: revenue chart by day.
     */
    public function connectRevenueChart(Request $request)
    {
        $days = (int) $request->input('days', 14);
        $days = in_array($days, [7, 14, 30, 90], true) ? $days : 14;

        $startDate = now()->subDays($days - 1)->startOfDay();

        $payments = Payment::where('created_at', '>=', $startDate)
            ->whereIn('status', [Payment::STATUS_SUCCEEDED, Payment::STATUS_PARTIALLY_REFUNDED])
            ->selectRaw('DATE(created_at) as date, SUM(amount) as total_amount, SUM(application_fee) as total_fees')
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy(DB::raw('DATE(created_at)'))
            ->get()
            ->keyBy('date');

        $dates = [];
        $amounts = [];
        $fees = [];
        $current = $startDate->copy();

        for ($i = 0; $i < $days; $i++) {
            $dateStr = $current->format('Y-m-d');
            $dates[] = $dateStr;
            $dayData = $payments->get($dateStr);
            $amounts[] = $dayData ? round($dayData->total_amount / 100, 2) : 0;
            $fees[] = $dayData ? round($dayData->total_fees / 100, 2) : 0;
            $current->addDay();
        }

        return response()->json([
            'date' => $dates,
            'series' => [
                ['name' => 'revenue', 'data' => $amounts],
                ['name' => 'fees', 'data' => $fees],
            ],
        ]);
    }
}

<?php

namespace App\Console\Commands;

use App\Helpers\DatabaseHelper;
use App\Http\Controllers\Business\ReportsController;
use App\Models\Booking;
use App\Models\User;
use App\Services\BusinessMetricsService;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Сверка метрик отчётов бизнеса с «эталонными» SQL-агрегатами по бронированиям.
 */
class VerifyBusinessReportsCommand extends Command
{
    protected $signature = 'business:verify-reports 
                            {email : Email владельца (BUSINESS_OWNER), например demo@rexten.pro}';

    protected $description = 'Проверить согласованность отчётов бизнеса (обзор, брони, выручка, специалисты, клиенты)';

    private function assertFloat(string $label, float $a, float $b, float $eps = 0.02): bool
    {
        if (abs($a - $b) > $eps) {
            $this->error("{$label}: ожидалось {$a}, получено {$b} (|Δ|=" . abs($a - $b) . ')');

            return false;
        }
        $this->line("  OK {$label}: {$b}");

        return true;
    }

    private function assertInt(string $label, int $a, int $b): bool
    {
        if ($a !== $b) {
            $this->error("{$label}: ожидалось {$a}, получено {$b}");

            return false;
        }
        $this->line("  OK {$label}: {$b}");

        return true;
    }

    public function handle(): int
    {
        $email = (string) $this->argument('email');
        $user = User::where('email', $email)->first();
        if (! $user) {
            $this->error("Пользователь не найден: {$email}");

            return self::FAILURE;
        }
        $company = $user->ownedCompanies()->first();
        if (! $company) {
            $this->error('У пользователя нет компании.');

            return self::FAILURE;
        }
        $cid = (int) $company->id;

        $minRaw = Booking::where('company_id', $cid)->min('booking_date');
        $maxRaw = Booking::where('company_id', $cid)->max('booking_date');
        if ($minRaw === null) {
            $this->warn('Нет бронирований — нечего сверять.');

            return self::SUCCESS;
        }
        $min = is_string($minRaw) ? substr($minRaw, 0, 10) : $minRaw->format('Y-m-d');
        $max = is_string($maxRaw) ? substr($maxRaw, 0, 10) : $maxRaw->format('Y-m-d');

        $this->info("Компания ID={$cid}, период броней в БД: {$min} .. {$max}");

        $controller = app(ReportsController::class);

        $req = Request::create('/internal', 'GET', [
            'date_from' => $min,
            'date_to' => $max,
        ]);
        $req->merge(['current_company_id' => $cid]);

        $ov = json_decode($controller->index($req)->getContent(), true)['data'];
        $rev = json_decode($controller->revenue($req)->getContent(), true)['data'];
        $bk = json_decode($controller->bookings($req)->getContent(), true)['data'];
        $sp = json_decode($controller->specialists($req)->getContent(), true)['data'];
        $cl = json_decode($controller->clients($req)->getContent(), true)['data'];

        $rawCompleted = (float) Booking::where('bookings.company_id', $cid)
            ->whereDate('bookings.booking_date', '>=', $min)
            ->whereDate('bookings.booking_date', '<=', $max)
            ->where('bookings.status', 'completed')
            ->sum(DB::raw('COALESCE(bookings.total_price, bookings.price)'));

        $metricsSvc = BusinessMetricsService::recognizedRevenue($cid, $min, $max, null, null, null);

        $sumPeriod = (float) collect($rev['byPeriod'])->sum('revenue');
        $sumServiceAll = (float) Booking::where('bookings.company_id', $cid)
            ->whereDate('bookings.booking_date', '>=', $min)
            ->whereDate('bookings.booking_date', '<=', $max)
            ->where('bookings.status', 'completed')
            ->join('services', 'bookings.service_id', '=', 'services.id')
            ->sum(DB::raw('COALESCE(bookings.total_price, bookings.price)'));

        $sumSpec = (float) collect($sp)->sum('revenue');
        $unassigned = (float) Booking::where('bookings.company_id', $cid)
            ->whereDate('bookings.booking_date', '>=', $min)
            ->whereDate('bookings.booking_date', '<=', $max)
            ->where('bookings.status', 'completed')
            ->whereNull('bookings.specialist_id')
            ->sum(DB::raw('COALESCE(bookings.total_price, bookings.price)'));

        $cntStatus = (int) collect($bk['byStatus'])->sum('count');
        $sumPeriodBk = (int) collect($bk['byPeriod'])->sum('count');

        $sql = DatabaseHelper::countDistinctClients('bookings.user_id', 'bookings.client_name', 'cnt');
        $distinct = (int) Booking::where('bookings.company_id', $cid)
            ->whereDate('bookings.booking_date', '>=', $min)
            ->whereDate('bookings.booking_date', '<=', $max)
            ->selectRaw($sql)
            ->value('cnt');

        $completedStatus = (int) (collect($bk['byStatus'])->firstWhere('status', 'completed')['count'] ?? 0);

        $ok = true;
        $this->info('Сверка за выбранный период (min..max броней):');
        $ok = $this->assertFloat('raw completed revenue = overview.totalRevenue', $rawCompleted, (float) $ov['totalRevenue']) && $ok;
        $ok = $this->assertFloat('BusinessMetricsService = overview.totalRevenue', $metricsSvc, (float) $ov['totalRevenue']) && $ok;
        $ok = $this->assertFloat('sum(revenue byPeriod) = overview', $rawCompleted, $sumPeriod) && $ok;
        $ok = $this->assertFloat('sum(all services) = overview', $rawCompleted, $sumServiceAll) && $ok;
        $ok = $this->assertFloat('sum(specialists revenue)+unassigned = overview', $rawCompleted, $sumSpec + $unassigned) && $ok;
        $ok = $this->assertInt('sum(byStatus count) = totalBookings', $cntStatus, (int) $ov['totalBookings']) && $ok;
        $ok = $this->assertInt('sum(byPeriod booking counts) = totalBookings', $sumPeriodBk, (int) $ov['totalBookings']) && $ok;
        $ok = $this->assertInt('completed in byStatus = overview.completedBookings', $completedStatus, (int) $ov['completedBookings']) && $ok;
        $ok = $this->assertInt('uniqueClients = COUNT DISTINCT (SQL)', $distinct, (int) $ov['uniqueClients']) && $ok;

        $expAvg = $ov['completedBookings'] > 0
            ? round($rawCompleted / (int) $ov['completedBookings'], 2)
            : 0.0;
        $ok = $this->assertFloat('averageCheck', $expAvg, (float) $ov['averageCheck']) && $ok;

        foreach ($sp as $row) {
            $exp = $row['completed'] > 0 ? round($row['revenue'] / $row['completed'], 2) : 0.0;
            if (abs($exp - $row['averageCheck']) > 0.02) {
                $this->error("Специалист {$row['name']}: averageCheck не сходится (ожид. {$exp}, в отчёте {$row['averageCheck']})");
                $ok = false;
            }
        }
        if ($ok) {
            $this->line('  OK specialist averageCheck для каждой строки');
        }

        // Клиенты: сумма топ-10 по выручке не обязана равняться total — только проверка что не превышает
        $topRev = (float) collect($cl['topByRevenue'])->sum('revenue');
        if ($topRev - $rawCompleted > 0.02) {
            $this->error("topByRevenue сумма ({$topRev}) > total revenue ({$rawCompleted}) — невозможно");
            $ok = false;
        } else {
            $this->line('  OK topByRevenue sum <= total revenue');
        }

        $reqAll = Request::create('/internal', 'GET', []);
        $reqAll->merge(['current_company_id' => $cid]);
        $ovAll = json_decode($controller->index($reqAll)->getContent(), true)['data'];
        $rawAll = (float) Booking::where('bookings.company_id', $cid)
            ->where('bookings.status', 'completed')
            ->sum(DB::raw('COALESCE(bookings.total_price, bookings.price)'));
        $this->info('Сверка обзора без фильтров дат (все брони компании):');
        $ok = $this->assertFloat('overview без фильтров = all-time completed sum', $rawAll, (float) $ovAll['totalRevenue']) && $ok;
        $ok = $this->assertInt('totalBookings без фильтров', (int) Booking::where('company_id', $cid)->count(), (int) $ovAll['totalBookings']) && $ok;

        if ($ok) {
            $this->info('Все проверки пройдены.');

            return self::SUCCESS;
        }
        $this->error('Есть расхождения — см. выше.');

        return self::FAILURE;
    }
}

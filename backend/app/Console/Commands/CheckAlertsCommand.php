<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Alert;
use App\Models\Company;
use App\Models\Advertisement;
use App\Models\Booking;
use App\Enums\AlertType;
use App\Enums\AlertSeverity;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CheckAlertsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'alerts:check';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check platform metrics and create alerts if needed';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking platform metrics for alerts...');

        $alertsCreated = 0;

        // 1. Check for inactive businesses (30+ days without bookings)
        $alertsCreated += $this->checkInactiveBusinesses();

        // 2. Check for pending moderation (3+ advertisements waiting)
        $alertsCreated += $this->checkPendingModeration();

        // 3. Check for low platform activity (significant drop in bookings)
        $alertsCreated += $this->checkConversionDrop();

        $this->info("Alerts check completed. Created {$alertsCreated} new alerts.");

        return 0;
    }

    /**
     * Check for inactive businesses.
     */
    private function checkInactiveBusinesses()
    {
        $thirtyDaysAgo = Carbon::now()->subDays(30);

        $inactiveCount = Company::where('status', 'active')
            ->whereDoesntHave('bookings', function ($query) use ($thirtyDaysAgo) {
                $query->where('booking_date', '>=', $thirtyDaysAgo);
            })
            ->count();

        if ($inactiveCount >= 5) {
            // Check if alert already exists today
            $existingAlert = Alert::where('type', AlertType::INACTIVE_BUSINESSES->value)
                ->where('is_resolved', false)
                ->whereDate('created_at', Carbon::today())
                ->first();

            if (!$existingAlert) {
                Alert::create([
                    'type' => AlertType::INACTIVE_BUSINESSES->value,
                    'severity' => AlertSeverity::WARNING->value,
                    'title' => 'Неактивные бизнесы',
                    'description' => "{$inactiveCount} бизнесов не имели бронирований за последние 30 дней",
                    'source' => 'cron',
                ]);

                $this->warn("Created alert: {$inactiveCount} inactive businesses");
                return 1;
            }
        }

        return 0;
    }

    /**
     * Check for pending moderation.
     */
    private function checkPendingModeration()
    {
        $pendingCount = Advertisement::where('status', 'pending')->count();

        if ($pendingCount >= 3) {
            // Check if alert already exists today
            $existingAlert = Alert::where('type', AlertType::PENDING_MODERATION->value)
                ->where('is_resolved', false)
                ->whereDate('created_at', Carbon::today())
                ->first();

            if (!$existingAlert) {
                Alert::create([
                    'type' => AlertType::PENDING_MODERATION->value,
                    'severity' => AlertSeverity::INFO->value,
                    'title' => 'Ожидают модерации',
                    'description' => "{$pendingCount} объявлений ожидают модерации",
                    'source' => 'cron',
                ]);

                $this->info("Created alert: {$pendingCount} pending advertisements");
                return 1;
            }
        }

        return 0;
    }

    /**
     * Check for conversion drop.
     */
    private function checkConversionDrop()
    {
        // Compare last 7 days with previous 7 days
        $lastWeekStart = Carbon::now()->subDays(7);
        $lastWeekEnd = Carbon::now();
        $previousWeekStart = Carbon::now()->subDays(14);
        $previousWeekEnd = Carbon::now()->subDays(7);

        $lastWeekBookings = Booking::whereBetween('booking_date', [$lastWeekStart, $lastWeekEnd])
            ->where('status', '!=', 'cancelled')
            ->count();

        $previousWeekBookings = Booking::whereBetween('booking_date', [$previousWeekStart, $previousWeekEnd])
            ->where('status', '!=', 'cancelled')
            ->count();

        if ($previousWeekBookings > 0) {
            $changePercentage = (($lastWeekBookings - $previousWeekBookings) / $previousWeekBookings) * 100;

            if ($changePercentage < -10) {
                // Check if alert already exists today
                $existingAlert = Alert::where('type', AlertType::CONVERSION_DROP->value)
                    ->where('is_resolved', false)
                    ->whereDate('created_at', Carbon::today())
                    ->first();

                if (!$existingAlert) {
                    Alert::create([
                        'type' => AlertType::CONVERSION_DROP->value,
                        'severity' => AlertSeverity::CRITICAL->value,
                        'title' => 'Падение конверсии',
                        'description' => "Количество бронирований упало на " . abs(round($changePercentage, 1)) . "% за последнюю неделю",
                        'source' => 'cron',
                    ]);

                    $this->error("Created alert: Conversion dropped by " . abs(round($changePercentage, 1)) . "%");
                    return 1;
                }
            }
        }

        return 0;
    }
}

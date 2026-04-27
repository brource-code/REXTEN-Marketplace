<?php

namespace App\Console;

use App\Services\EmailOtpService;
use App\Services\PlatformBackupService;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected function schedule(Schedule $schedule): void
    {
        // $schedule->command('inspire')->hourly();
        
        // Check alerts every 15 minutes
        $schedule->command('alerts:check')->everyFifteenMinutes();

        $schedule->call(function () {
            app(PlatformBackupService::class)->releaseStaleBackups();
        })->everyTenMinutes();

        if (config('backups.schedule_enabled') && app(PlatformBackupService::class)->isS3Ready()) {
            $schedule->command('platform:backup --scheduled')->twiceDaily(6, 18);
        }

        // Подписки: даунгрейд по scheduled_plan и переход на free после окончания периода
        $schedule->command('subscription:finalize-expired')->hourly();

        // Триал: письма за 3 и за 1 календарный день до окончания (без оформленной Stripe-подписки)
        $schedule->command('subscription:send-trial-reminders')->hourly();

        // Stripe: expire uncaptured payment holds
        $schedule->command('stripe:expire-holds')->hourly();

        // Cancel bookings with pending_payment older than 30 minutes
        $schedule->command('booking:cancel-unpaid')->everyMinute();

        $schedule->call(function () {
            app(EmailOtpService::class)->deleteExpired();
        })->hourly();
    }

    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}


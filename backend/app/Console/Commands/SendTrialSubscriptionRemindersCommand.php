<?php

namespace App\Console\Commands;

use App\Services\TrialSubscriptionReminderService;
use Illuminate\Console\Command;

class SendTrialSubscriptionRemindersCommand extends Command
{
    protected $signature = 'subscription:send-trial-reminders';

    protected $description = 'Send trial ending emails (3 days and 1 day before, calendar)';

    public function handle(): int
    {
        $n = TrialSubscriptionReminderService::sendDueReminders();
        $this->info("Trial reminder emails sent: {$n}.");

        return self::SUCCESS;
    }
}

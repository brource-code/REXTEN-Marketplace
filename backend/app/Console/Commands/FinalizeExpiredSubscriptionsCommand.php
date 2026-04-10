<?php

namespace App\Console\Commands;

use App\Services\SubscriptionLifecycleService;
use Illuminate\Console\Command;

class FinalizeExpiredSubscriptionsCommand extends Command
{
    protected $signature = 'subscription:finalize-expired';

    protected $description = 'Apply scheduled downgrades and cancel-to-free when billing period ended';

    public function handle(): int
    {
        $count = SubscriptionLifecycleService::finalizeExpiredForAll();
        $this->info("Processed subscription transitions (companies touched: {$count}).");

        return self::SUCCESS;
    }
}

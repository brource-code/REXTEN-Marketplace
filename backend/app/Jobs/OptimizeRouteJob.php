<?php

namespace App\Jobs;

use App\Services\Routing\RouteOrchestrator;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class OptimizeRouteJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        public string $routeId,
    ) {
    }

    public function handle(RouteOrchestrator $orchestrator): void
    {
        $orchestrator->optimizeAndPersistFromJob($this->routeId);
    }
}

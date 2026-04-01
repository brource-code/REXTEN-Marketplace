<?php

namespace App\Services;

use App\Models\PlatformBackup;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Очередь бэкапа (файл в Services из‑за ограничений записи в app/Jobs на части окружений).
 */
class PlatformBackupQueuedJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 7200;

    public int $tries = 1;

    public function __construct(public int $platformBackupId)
    {
        $this->onQueue('backups');
    }

    public function handle(PlatformBackupService $service): void
    {
        $record = PlatformBackup::query()->find($this->platformBackupId);
        if ($record === null) {
            return;
        }

        if (! in_array($record->status, ['queued', 'processing'], true)) {
            return;
        }

        $service->processRecord($record);
    }
}

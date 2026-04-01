<?php

namespace App\Console\Commands;

use App\Services\PlatformBackupService;
use Illuminate\Console\Command;

class BackupPlatformCommand extends Command
{
    protected $signature = 'platform:backup {--scheduled : Пометить как автоматический (cron)}';

    protected $description = 'Создать полный архив бэкапа (код, БД, Docker-образы)';

    public function handle(PlatformBackupService $service): int
    {
        $this->info('Создание бэкапа...');

        $trigger = $this->option('scheduled') ? 'scheduled' : 'manual';

        try {
            $record = $service->enqueue($trigger);
            $this->info('В очереди: '.$record->filename.' (id '.$record->id.', статус '.$record->status.')');
        } catch (\RuntimeException $e) {
            $this->warn($e->getMessage());

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}

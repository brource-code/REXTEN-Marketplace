<?php

namespace App\Console\Commands;

use App\Services\PlatformBackupService;
use Illuminate\Console\Command;

class BackupTestS3Command extends Command
{
    protected $signature = 'platform:backup-test-s3
                            {--keep : Не удалять тестовый объект из S3 после проверки}';

    protected $description = 'Проверка S3 тем же способом, что и загрузка бэкапа (stream → put → exists → размер)';

    public function handle(PlatformBackupService $service): int
    {
        try {
            $result = $service->selfTestS3UploadSameMechanismAsBackup(! $this->option('keep'));
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info('OK: загрузка прошла тем же механизмом, что и полный бэкап.');
        $this->line('Bucket: '.($result['bucket'] ?? '(null)'));
        $this->line('Key:    '.$result['key']);
        $this->line('Размер: local='.$result['local_size'].' remote='.$result['remote_size'].' байт');
        if ($result['deleted_test_object']) {
            $this->comment('Тестовый объект в S3 удалён (повторите с --keep, чтобы оставить для просмотра в консоли).');
        } else {
            $this->warn('Тестовый объект оставлен в bucket — проверьте его в S3 по ключу выше.');
        }

        return self::SUCCESS;
    }
}

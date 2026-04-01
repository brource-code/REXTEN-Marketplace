<?php

namespace App\Services;

use App\Models\PlatformBackup;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

class PlatformBackupService
{
    /**
     * Проверка: бэкапы только в S3, без постоянного локального хранения.
     */
    public function isS3Ready(): bool
    {
        if (! config('backups.s3_enabled')) {
            return false;
        }

        if (! config('backups.s3_bucket')) {
            return false;
        }

        $key = config('filesystems.disks.s3_backup.key');
        $secret = config('filesystems.disks.s3_backup.secret');

        return ! empty($key) && ! empty($secret);
    }

    /**
     * @throws \RuntimeException
     */
    public function assertS3Configured(): void
    {
        if (! $this->isS3Ready()) {
            throw new \RuntimeException(
                'Бэкапы хранятся только в AWS S3. Укажите BACKUP_S3_ENABLED=true, BACKUP_S3_BUCKET и AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (см. docs/BACKUP_S3.md).'
            );
        }
    }

    /**
     * Снять блокировку с «зависших» бэкапов (воркер не работал, джоба упала и т.д.).
     */
    public function releaseStaleBackups(): void
    {
        $queuedMin = max(5, (int) config('backups.stale_queued_after_minutes', 30));
        $procMin = max(10, (int) config('backups.stale_processing_after_minutes', 180));

        $msgQueued = 'Не обработано воркером очереди. Проверьте контейнер rexten_queue, QUEUE_CONNECTION=database и таблицу jobs.';

        $msgProcessing = 'Прервано: слишком долгое выполнение или сбой воркера.';

        PlatformBackup::query()
            ->where('status', 'queued')
            ->where('created_at', '<', now()->subMinutes($queuedMin))
            ->update([
                'status' => 'failed',
                'error_message' => $msgQueued,
            ]);

        PlatformBackup::query()
            ->where('status', 'processing')
            ->where('updated_at', '<', now()->subMinutes($procMin))
            ->update([
                'status' => 'failed',
                'error_message' => $msgProcessing,
            ]);
    }

    /**
     * Поставить бэкап в очередь (не блокирует HTTP / schedule).
     *
     * @throws \RuntimeException если уже идёт другой бэкап или S3 не настроен
     */
    public function enqueue(string $trigger = 'manual'): PlatformBackup
    {
        $this->assertS3Configured();
        $this->releaseStaleBackups();

        if (PlatformBackup::query()->whereIn('status', ['queued', 'processing'])->exists()) {
            throw new \RuntimeException('Уже выполняется другой бэкап. Дождитесь завершения.');
        }

        $slug = 'rexten-backup-'.now()->format('Y-m-d-His');
        $filename = $slug.'.tar.gz';

        $record = PlatformBackup::create([
            'filename' => $filename,
            'disk_path' => null,
            'status' => 'queued',
            'trigger' => $trigger,
            'local_ok' => false,
            's3_ok' => false,
            'meta' => null,
        ]);

        PlatformBackupQueuedJob::dispatch($record->id);

        return $record->fresh();
    }

    /**
     * Выполнение бэкапа (вызывается из очереди).
     */
    public function processRecord(PlatformBackup $record): void
    {
        $slug = preg_replace('/\.tar\.gz$/', '', $record->filename);
        $filename = $record->filename;
        $workDir = storage_path('app/backups/work/'.$slug);
        $stagingDir = $workDir.'/'.$slug;
        $finalPath = $workDir.'/'.$filename;

        $record->update(['status' => 'processing']);

        try {
            @mkdir(storage_path('app/backups/work'), 0755, true);
            if (! is_dir(dirname($finalPath))) {
                mkdir(dirname($finalPath), 0755, true);
            }
            mkdir($stagingDir, 0755, true);

            $meta = [
                'created_at' => now()->toIso8601String(),
                'database' => config('database.default'),
                'project_root' => config('backups.project_root'),
                'docker_images_included' => false,
                'docker_images' => [],
                'storage' => 's3',
            ];

            $this->dumpDatabase($stagingDir.'/data');
            $this->copyConfigs($stagingDir.'/config');
            $this->archiveProjectTar($stagingDir.'/project.tar.gz');
            $this->copyRestoreScript($stagingDir);

            $dockerCfg = config('backups.docker_enabled') && $this->dockerAvailable();
            if ($dockerCfg) {
                $images = $this->resolveDockerImages();
                $meta['docker_images'] = $images;
                if (count($images) > 0) {
                    $this->dockerSave($stagingDir.'/docker-images.tar', $images);
                    $meta['docker_images_included'] = true;
                }
            }

            file_put_contents(
                $stagingDir.'/manifest.json',
                json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            );

            $this->tarCompress($stagingDir, $finalPath);

            $size = file_exists($finalPath) ? (int) filesize($finalPath) : 0;

            $key = $this->uploadToS3Required($record, $finalPath);

            @unlink($finalPath);

            $record->update([
                'size_bytes' => $size,
                'status' => 'completed',
                'local_ok' => false,
                's3_ok' => true,
                's3_key' => $key,
                'disk_path' => null,
                'error_message' => null,
                'meta' => $meta,
            ]);

            $this->pruneOldS3Backups();
        } catch (\Throwable $e) {
            Log::error('Platform backup failed', ['exception' => $e]);
            $record->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            if (file_exists($finalPath)) {
                @unlink($finalPath);
            }
        } finally {
            if (is_dir($workDir)) {
                $this->rrmdir($workDir);
            }
        }
    }

    /**
     * Тот же механизм, что и у полного бэкапа: fopen → put(stream) → fclose → exists → сравнение размеров.
     *
     * @throws \RuntimeException
     */
    public function uploadLocalFileViaS3BackupDisk(string $key, string $localPath): void
    {
        $this->assertS3Configured();

        $stream = fopen($localPath, 'r');
        if ($stream === false) {
            throw new \RuntimeException('Не удалось открыть локальный файл для загрузки в S3: '.$localPath);
        }

        try {
            $ok = Storage::disk('s3_backup')->put($key, $stream, [
                'visibility' => 'private',
            ]);
            if ($ok === false) {
                throw new \RuntimeException('S3 PutObject вернул false. Проверьте AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY и регион bucket.');
            }
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        $disk = Storage::disk('s3_backup');
        if (! $disk->exists($key)) {
            throw new \RuntimeException(
                'S3: после загрузки объект не найден (exists=false). Проверьте bucket, регион и права IAM. Ключ: '.$key
            );
        }
        $remoteSize = $disk->size($key);
        $localSize = file_exists($localPath) ? (int) filesize($localPath) : 0;
        if ($localSize > 0 && $remoteSize !== $localSize) {
            try {
                $disk->delete($key);
            } catch (\Throwable $e) {
                Log::warning('S3: удаление частичной загрузки не удалось', ['key' => $key, 'error' => $e->getMessage()]);
            }
            throw new \RuntimeException(
                'S3: размер объекта не совпадает с локальным файлом (возможно обрыв загрузки). local='.$localSize.' remote='.$remoteSize
            );
        }

        Log::info('S3 upload verified (backup mechanism)', [
            'key' => $key,
            'bytes' => $remoteSize,
            'bucket' => config('backups.s3_bucket'),
        ]);
    }

    /**
     * Самопроверка: маленький файл тем же путём, что и архив бэкапа.
     *
     * @return array{bucket: string|null, key: string, local_size: int, remote_size: int, deleted_test_object: bool}
     */
    public function selfTestS3UploadSameMechanismAsBackup(bool $deleteObjectAfter = true): array
    {
        $this->assertS3Configured();

        $filename = 'selftest-'.now()->format('Y-m-d-His').'-'.bin2hex(random_bytes(4)).'.txt';
        $dir = storage_path('app/backups/work/_s3_selftest');
        @mkdir($dir, 0755, true);
        $localPath = $dir.'/'.$filename;

        $payload = "rexten S3 self-test (same as backup upload)\n".now()->toIso8601String()."\n";
        if (file_put_contents($localPath, $payload) === false) {
            throw new \RuntimeException('Не удалось записать тестовый файл: '.$localPath);
        }

        $key = trim(config('backups.s3_prefix'), '/').'/'.$filename;
        $localSize = (int) filesize($localPath);

        try {
            $this->uploadLocalFileViaS3BackupDisk($key, $localPath);
            $remoteSize = Storage::disk('s3_backup')->size($key);

            $deleted = false;
            if ($deleteObjectAfter) {
                Storage::disk('s3_backup')->delete($key);
                $deleted = true;
            }

            return [
                'bucket' => config('backups.s3_bucket'),
                'key' => $key,
                'local_size' => $localSize,
                'remote_size' => $remoteSize,
                'deleted_test_object' => $deleted,
            ];
        } finally {
            @unlink($localPath);
            if (is_dir($dir)) {
                @rmdir($dir);
            }
        }
    }

    /**
     * Загрузка в S3 обязательна; при ошибке — исключение.
     */
    protected function uploadToS3Required(PlatformBackup $record, string $localPath): string
    {
        $key = trim(config('backups.s3_prefix'), '/').'/'.$record->filename;
        $this->uploadLocalFileViaS3BackupDisk($key, $localPath);

        return $key;
    }

    /**
     * Удаляет старые объекты в S3 и записи в БД сверх лимита.
     */
    protected function pruneOldS3Backups(): void
    {
        $keep = (int) config('backups.s3_keep_backups', 30);
        if ($keep <= 0) {
            return;
        }

        $old = PlatformBackup::query()
            ->where('status', 'completed')
            ->where('s3_ok', true)
            ->orderByDesc('created_at')
            ->skip($keep)
            ->take(500)
            ->get();

        foreach ($old as $row) {
            if ($row->s3_key) {
                try {
                    Storage::disk('s3_backup')->delete($row->s3_key);
                } catch (\Throwable $e) {
                    Log::warning('S3 prune delete failed', ['key' => $row->s3_key, 'error' => $e->getMessage()]);
                }
            }
            $row->delete();
        }
    }

    protected function dumpDatabase(string $dataDir): void
    {
        mkdir($dataDir, 0755, true);

        $connection = config('database.default');
        if ($connection !== 'pgsql') {
            throw new \RuntimeException('Бэкап поддерживает только PostgreSQL (pgsql). Сейчас: '.$connection);
        }

        $host = config('database.connections.pgsql.host');
        $port = (int) config('database.connections.pgsql.port');
        $database = config('database.connections.pgsql.database');
        $username = config('database.connections.pgsql.username');
        $password = env('DB_PASSWORD', '');

        $outFile = $dataDir.'/db.sql.gz';

        $inner = sprintf(
            'PGPASSWORD=%s pg_dump -h %s -p %d -U %s -d %s --no-owner --no-acl | gzip -c > %s',
            escapeshellarg((string) $password),
            escapeshellarg($host),
            $port,
            escapeshellarg($username),
            escapeshellarg($database),
            escapeshellarg($outFile)
        );
        $process = Process::fromShellCommandline(sprintf('bash -lc %s', escapeshellarg($inner)));
        $process->setTimeout(3600);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new \RuntimeException('pg_dump: '.$process->getErrorOutput().$process->getOutput());
        }

        if (! file_exists($outFile) || filesize($outFile) < 10) {
            throw new \RuntimeException('Файл дампа БД пустой или не создан.');
        }
    }

    protected function copyConfigs(string $configDir): void
    {
        mkdir($configDir, 0755, true);

        $root = rtrim(config('backups.project_root'), '/');

        $backendEnv = $root.'/backend/.env';
        if (is_readable($backendEnv)) {
            copy($backendEnv, $configDir.'/backend.env');
        }

        $frontendEnv = $root.'/frontend/.env.local';
        if (is_readable($frontendEnv)) {
            copy($frontendEnv, $configDir.'/frontend.env.local');
        }
    }

    protected function archiveProjectTar(string $tarOut): void
    {
        $root = rtrim(config('backups.project_root'), '/');

        if (! is_dir($root)) {
            throw new \RuntimeException(
                'Корень проекта не найден: '.$root.'. Проверьте volume в docker-compose (BACKUP_PROJECT_ROOT).'
            );
        }

        $excludes = config('backups.project_exclude', []);
        $excludeArgs = '';
        foreach ($excludes as $pattern) {
            $excludeArgs .= ' --exclude='.escapeshellarg($pattern);
        }

        $cmd = sprintf(
            'tar -czf %s -C %s %s .',
            escapeshellarg($tarOut),
            escapeshellarg($root),
            $excludeArgs
        );

        $process = Process::fromShellCommandline($cmd);
        $process->setTimeout(3600);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new \RuntimeException('tar project: '.$process->getErrorOutput().$process->getOutput());
        }
    }

    protected function copyRestoreScript(string $stagingDir): void
    {
        $stub = resource_path('stubs/platform-restore.sh');
        if (! is_readable($stub)) {
            throw new \RuntimeException('Нет ресурса platform-restore.sh');
        }
        copy($stub, $stagingDir.'/RESTORE.sh');
        chmod($stagingDir.'/RESTORE.sh', 0755);
    }

    protected function dockerAvailable(): bool
    {
        if (! is_readable('/var/run/docker.sock')) {
            return false;
        }
        $p = Process::fromShellCommandline('docker version --format "{{.Server.Version}}"');
        $p->run();

        return $p->isSuccessful();
    }

    /**
     * @return string[]
     */
    protected function resolveDockerImages(): array
    {
        $configured = config('backups.docker_images', []);
        $configured = array_values(array_filter($configured, function ($img) {
            return is_string($img) && $img !== '';
        }));

        if (count($configured) > 0) {
            return $configured;
        }

        return $this->discoverDockerImagesFromProjectContainers();
    }

    /**
     * Образы из запущенных контейнеров проекта (имена содержат префикс, напр. rexten).
     *
     * @return string[]
     */
    protected function discoverDockerImagesFromProjectContainers(): array
    {
        $prefix = (string) config('backups.docker_ps_name_filter', 'rexten');
        if ($prefix === '') {
            return [];
        }

        $process = new Process([
            'docker', 'ps', '-a',
            '--filter', 'name='.$prefix,
            '--format', '{{.Image}}',
        ]);
        $process->setTimeout(120);
        $process->run();

        if (! $process->isSuccessful()) {
            Log::warning('Docker image discovery failed', [
                'error' => $process->getErrorOutput().$process->getOutput(),
            ]);

            return [];
        }

        $lines = array_filter(array_map('trim', explode("\n", trim($process->getOutput()))));
        $unique = array_unique($lines);

        return array_values(array_filter($unique, function ($img) {
            return $img !== '' && stripos($img, '<none>') === false;
        }));
    }

    /**
     * @param  string[]  $images
     */
    protected function dockerSave(string $outTar, array $images): void
    {
        if ($images === []) {
            return;
        }

        $escaped = array_map('escapeshellarg', $images);
        $cmd = 'docker save -o '.escapeshellarg($outTar).' '.implode(' ', $escaped);

        $process = Process::fromShellCommandline($cmd);
        $process->setTimeout(7200);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new \RuntimeException('docker save: '.$process->getErrorOutput().$process->getOutput());
        }

        if (! file_exists($outTar) || filesize($outTar) < 100) {
            throw new \RuntimeException('docker save: файл образов слишком мал или не создан.');
        }
    }

    protected function tarCompress(string $stagingDir, string $finalPath): void
    {
        $parent = dirname($stagingDir);
        $folderName = basename($stagingDir);

        $cmd = sprintf(
            'tar -czf %s -C %s %s',
            escapeshellarg($finalPath),
            escapeshellarg($parent),
            escapeshellarg($folderName)
        );

        $process = Process::fromShellCommandline($cmd);
        $process->setTimeout(7200);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new \RuntimeException('tar final: '.$process->getErrorOutput().$process->getOutput());
        }
    }

    protected function rrmdir(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }
        $items = scandir($dir);
        if ($items === false) {
            return;
        }
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $p = $dir.'/'.$item;
            if (is_dir($p)) {
                $this->rrmdir($p);
            } else {
                @unlink($p);
            }
        }
        @rmdir($dir);
    }
}

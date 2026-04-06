<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformBackup;
use App\Services\PlatformBackupService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

class BackupsController extends Controller
{
    public function index(Request $request, PlatformBackupService $backupService)
    {
        $backupService->releaseStaleBackups();

        $rows = PlatformBackup::query()
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(function (PlatformBackup $b) {
                return [
                    'id' => $b->id,
                    'filename' => $b->filename,
                    'sizeBytes' => (int) $b->size_bytes,
                    'status' => $b->status,
                    'trigger' => $b->trigger,
                    's3Ok' => (bool) $b->s3_ok,
                    's3Key' => $b->s3_key,
                    'errorMessage' => $b->error_message,
                    'meta' => $b->meta,
                    'createdAt' => $b->created_at?->toIso8601String(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $rows,
            'config' => [
                'projectRoot' => config('backups.project_root'),
                'dockerEnabled' => (bool) config('backups.docker_enabled'),
                'dockerImages' => config('backups.docker_images'),
                's3Enabled' => (bool) config('backups.s3_enabled'),
                's3Configured' => $backupService->isS3Ready(),
                's3Bucket' => config('backups.s3_bucket'),
                's3KeepBackups' => (int) config('backups.s3_keep_backups', 30),
            ],
        ]);
    }

    public function store(Request $request, PlatformBackupService $service)
    {
        try {
            $record = $service->enqueue('manual');

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $record->id,
                    'filename' => $record->filename,
                    'sizeBytes' => (int) $record->size_bytes,
                    'status' => $record->status,
                    's3Ok' => (bool) $record->s3_ok,
                    'meta' => $record->meta,
                ],
            ]);
        } catch (\RuntimeException $e) {
            $msg = $e->getMessage();
            $code = str_contains($msg, 'Уже выполняется') ? 409 : 503;

            return response()->json([
                'success' => false,
                'message' => $msg,
            ], $code);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Сборка и скачивание «лёгкого» архива исходников для партнёров (scripts/make-partner-archive.sh).
     */
    public function partnerExport()
    {
        @set_time_limit(600);
        @ini_set('max_execution_time', '600');

        $root = rtrim((string) config('backups.project_root'), '/');
        $script = $root.'/scripts/make-partner-archive.sh';

        if (! is_file($script)) {
            return response()->json([
                'success' => false,
                'message' => 'Partner archive script not found at '.$script,
            ], 404);
        }

        // Важно: выходной .tar.gz нельзя писать внутрь каталога, который tar упаковывает —
        // иначе «file changed as we read it». Пишем в системный temp (обычно /tmp), вне project_root.
        $tmpDir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR);
        foreach (glob($tmpDir.'/rexten-partner-*.tar.gz') ?: [] as $old) {
            if (is_file($old) && (time() - filemtime($old)) > 86400) {
                @unlink($old);
            }
        }

        $filename = 'rexten-source-partners-'.now()->format('Y-m-d-His').'.tar.gz';
        $outPath = $tmpDir.'/rexten-partner-'.bin2hex(random_bytes(8)).'.tar.gz';

        $process = new Process(['/bin/bash', $script, $outPath], null, null, null, 600.0);
        $process->run();

        if (! $process->isSuccessful()) {
            $err = trim($process->getErrorOutput() ?: $process->getOutput() ?: 'Archive build failed');

            return response()->json([
                'success' => false,
                'message' => $err,
            ], 500);
        }

        if (! is_file($outPath) || filesize($outPath) < 1) {
            return response()->json([
                'success' => false,
                'message' => 'Archive file was not created or is empty.',
            ], 500);
        }

        return response()->download($outPath, $filename)->deleteFileAfterSend(true);
    }

    /**
     * Временная ссылка на скачивание объекта из S3 (presigned URL).
     */
    public function downloadUrl(Request $request, int $id)
    {
        $backupService = app(PlatformBackupService::class);
        if (! $backupService->isS3Ready()) {
            return response()->json([
                'success' => false,
                'message' => 'S3 не настроен для бэкапов.',
            ], 503);
        }

        $row = PlatformBackup::find($id);
        if (! $row || $row->status !== 'completed' || ! $row->s3_ok || ! $row->s3_key) {
            return response()->json(['success' => false, 'message' => 'Бэкап не найден или ещё не загружен в S3'], 404);
        }

        try {
            $url = Storage::disk('s3_backup')->temporaryUrl(
                $row->s3_key,
                now()->addMinutes(60),
                [
                    'ResponseContentDisposition' => 'attachment; filename="'.$row->filename.'"',
                ]
            );
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось сформировать ссылку: '.$e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'url' => $url,
                'filename' => $row->filename,
                'expiresInMinutes' => 60,
            ],
        ]);
    }

    public function destroy(int $id)
    {
        $row = PlatformBackup::find($id);
        if (! $row) {
            return response()->json(['success' => false, 'message' => 'Не найдено'], 404);
        }

        if ($row->s3_key && config('backups.s3_bucket')) {
            try {
                Storage::disk('s3_backup')->delete($row->s3_key);
            } catch (\Throwable $e) {
                // ignore
            }
        }

        $row->delete();

        return response()->json(['success' => true]);
    }
}

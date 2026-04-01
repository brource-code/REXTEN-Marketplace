<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class HealthController extends Controller
{
    /**
     * Get platform health status.
     */
    public function status()
    {
        try {
            $databaseStatus = 'healthy';
            $databaseMessage = 'Подключение к БД в порядке';
            try {
                DB::connection()->getPdo();
            } catch (\Exception $e) {
                $databaseStatus = 'unhealthy';
                $databaseMessage = 'Нет подключения к базе данных';
            }

            $cacheStatus = 'healthy';
            $cacheMessage = 'Кэш приложения отвечает';
            try {
                Cache::get('health_check_test');
            } catch (\Exception $e) {
                $cacheStatus = 'unhealthy';
                $cacheMessage = 'Ошибка драйвера кэша';
            }

            $unresolvedAlerts = Alert::where('is_resolved', false)->count();
            $criticalAlerts = Alert::where('is_resolved', false)->where('severity', 'critical')->count();

            $uptimeSeconds = null;
            if (file_exists('/proc/uptime') && is_readable('/proc/uptime')) {
                $uptimeRaw = trim((string) file_get_contents('/proc/uptime'));
                $parts = explode(' ', $uptimeRaw);
                $uptimeSeconds = isset($parts[0]) ? (int) floor((float) $parts[0]) : null;
            }

            $diskTotal = @disk_total_space(base_path());
            $diskFree = @disk_free_space(base_path());
            $diskUsed = ($diskTotal !== false && $diskFree !== false) ? max(0, $diskTotal - $diskFree) : null;
            $diskUsedPercent = ($diskTotal && $diskUsed !== null) ? round(($diskUsed / $diskTotal) * 100, 2) : null;

            $memory = $this->readLinuxMemory();
            $loadAvg = function_exists('sys_getloadavg') ? sys_getloadavg() : null;

            $phpMemoryMb = round(memory_get_usage(true) / 1024 / 1024, 2);
            $phpPeakMb = round(memory_get_peak_usage(true) / 1024 / 1024, 2);

            $overallStatus = 'healthy';
            $overallHint = 'База данных и кэш доступны, критических инцидентов нет.';

            if ($databaseStatus !== 'healthy' || $cacheStatus !== 'healthy') {
                $overallStatus = 'unhealthy';
                $overallHint = 'Критическая ошибка: база данных или кэш недоступны.';
            } elseif ($criticalAlerts > 0) {
                $overallStatus = 'degraded';
                $overallHint = 'Есть нерешённые алерты с уровнем critical — проверьте журнал алертов.';
            } elseif ($diskUsedPercent !== null && $diskUsedPercent >= 90) {
                $overallStatus = 'degraded';
                $overallHint = 'Диск заполнен более чем на 90% — освободите место.';
            } elseif ($memory && isset($memory['used_percent']) && $memory['used_percent'] >= 92) {
                $overallStatus = 'degraded';
                $overallHint = 'Высокая загрузка оперативной памяти на хосте (по /proc/meminfo).';
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'overall_status' => $overallStatus,
                    'overall_hint' => $overallHint,
                    'systems' => [
                        'database' => [
                            'status' => $databaseStatus,
                            'message' => $databaseMessage,
                        ],
                        'cache' => [
                            'status' => $cacheStatus,
                            'message' => $cacheMessage,
                        ],
                    ],
                    'alerts' => [
                        'unresolved_count' => $unresolvedAlerts,
                        'critical_count' => $criticalAlerts,
                    ],
                    'server' => [
                        'php_version' => PHP_VERSION,
                        'laravel_version' => app()->version(),
                        'app_env' => config('app.env'),
                        'app_debug' => (bool) config('app.debug'),
                        'timezone' => config('app.timezone'),
                        'hostname' => gethostname() ?: null,
                        'uptime_seconds' => $uptimeSeconds,
                        'uptime_note' => 'Считывается из /proc/uptime (хост или контейнер PHP, не отдельный процесс приложения).',
                        'load_average' => $loadAvg !== false && is_array($loadAvg)
                            ? [
                                '1m' => round((float) $loadAvg[0], 2),
                                '5m' => round((float) ($loadAvg[1] ?? 0), 2),
                                '15m' => round((float) ($loadAvg[2] ?? 0), 2),
                            ]
                            : null,
                        'memory_usage_mb' => $phpMemoryMb,
                        'memory_peak_mb' => $phpPeakMb,
                        'memory_note' => 'memory_usage_mb / memory_peak_mb — память текущего PHP-процесса (полезно для запроса).',
                        'host_memory_total_bytes' => $memory['total_bytes'] ?? null,
                        'host_memory_available_bytes' => $memory['available_bytes'] ?? null,
                        'host_memory_used_bytes' => $memory['used_bytes'] ?? null,
                        'host_memory_used_percent' => $memory['used_percent'] ?? null,
                        'host_memory_note' => $memory ? 'ОЗУ хоста по /proc/meminfo (Linux).' : 'Нет данных /proc/meminfo (не Linux или нет доступа).',
                        'disk_total_bytes' => $diskTotal !== false ? $diskTotal : null,
                        'disk_used_bytes' => $diskUsed,
                        'disk_free_bytes' => $diskFree !== false ? $diskFree : null,
                        'disk_used_percent' => $diskUsedPercent,
                        'disk_note' => 'Диск — том, где лежит проект (base_path), обычно корень ФС в контейнере.',
                    ],
                    'checked_at' => now()->toIso8601String(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch health status',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function readLinuxMemory(): ?array
    {
        $path = '/proc/meminfo';
        if (! is_readable($path)) {
            return null;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return null;
        }

        $data = [];
        foreach ($lines as $line) {
            if (preg_match('/^(\w+):\s+(\d+)\s+kB$/', $line, $m)) {
                $data[$m[1]] = (int) $m[2] * 1024;
            }
        }

        if (! isset($data['MemTotal'])) {
            return null;
        }

        $total = $data['MemTotal'];
        $available = $data['MemAvailable'] ?? $data['MemFree'] ?? null;
        $used = $available !== null ? max(0, $total - $available) : null;

        return [
            'total_bytes' => $total,
            'available_bytes' => $available,
            'used_bytes' => $used,
            'used_percent' => ($used !== null && $total > 0) ? round(($used / $total) * 100, 2) : null,
        ];
    }

    public function alerts(Request $request)
    {
        $query = Alert::query();

        if ($request->has('is_resolved')) {
            $query->where('is_resolved', $request->boolean('is_resolved'));
        }

        if ($request->has('severity') && $request->severity) {
            $query->where('severity', $request->severity);
        }

        if ($request->has('type') && $request->type) {
            $query->where('type', $request->type);
        }

        $total = $query->count();

        $page = $request->get('page', 1);
        $pageSize = $request->get('pageSize', 20);
        $skip = ($page - 1) * $pageSize;

        $alerts = $query->orderBy('created_at', 'desc')
            ->skip($skip)
            ->take($pageSize)
            ->get();

        $data = $alerts->map(function ($alert) {
            return [
                'id' => $alert->id,
                'type' => $alert->type,
                'severity' => $alert->severity,
                'title' => $alert->title,
                'description' => $alert->description,
                'source' => $alert->source,
                'is_resolved' => $alert->is_resolved,
                'resolved_at' => $alert->resolved_at ? $alert->resolved_at->toISOString() : null,
                'created_at' => $alert->created_at->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }

    public function resolveAlert($id)
    {
        $alert = Alert::findOrFail($id);

        $alert->update([
            'is_resolved' => true,
            'resolved_at' => now(),
            'resolved_by' => auth()->id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Alert resolved successfully',
            'data' => [
                'id' => $alert->id,
                'is_resolved' => $alert->is_resolved,
                'resolved_at' => $alert->resolved_at->toISOString(),
            ],
        ]);
    }
}

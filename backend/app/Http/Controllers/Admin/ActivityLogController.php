<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Booking;
use App\Helpers\DatabaseHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ActivityLogController extends Controller
{
    /**
     * Get all activity logs with filters and pagination.
     */
    public function index(Request $request)
    {
        $query = ActivityLog::with(['user.profile', 'company']);

        // Filter by user
        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by company
        if ($request->has('company_id') && $request->company_id) {
            $query->where('company_id', $request->company_id);
        }

        // Filter by segment
        if ($request->has('segment') && $request->segment) {
            $query->where('segment', $request->segment);
        }

        // Filter by category
        if ($request->has('category') && $request->category) {
            $query->where('category', $request->category);
        }

        // Filter by action
        if ($request->has('action') && $request->action) {
            $query->where('action', $request->action);
        }

        // Filter by entity type
        if ($request->has('entity_type') && $request->entity_type) {
            $query->where('entity_type', $request->entity_type);
        }

        // Filter by entity ID
        if ($request->has('entity_id') && $request->entity_id) {
            $query->where('entity_id', $request->entity_id);
        }

        // Filter by date range
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Search by description or entity name
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'description', "%{$search}%");
                DatabaseHelper::whereLike($q, 'entity_name', "%{$search}%", 'or');
            });
        }

        // Get total count before pagination
        $total = $query->count();

        // Pagination
        $page = $request->get('page', 1);
        $pageSize = $request->get('pageSize', 10);
        $skip = ($page - 1) * $pageSize;

        $logs = $query->orderBy('created_at', 'desc')
            ->skip($skip)
            ->take($pageSize)
            ->get();

        $data = $logs->map(function ($log) {
            return $this->formatLog($log);
        });

        return response()->json([
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }

    /**
     * Get activity logs for a specific company.
     */
    public function companyActivity(Request $request, $companyId)
    {
        $bookingIds = Booking::where('company_id', $companyId)->pluck('id');

        $query = ActivityLog::with(['user.profile'])
            ->where(function ($q) use ($companyId, $bookingIds) {
                $q->where('company_id', (int) $companyId);
                $q->orWhere(function ($q2) use ($companyId) {
                    $q2->whereIn('entity_type', ['Company', 'App\\Models\\Company'])
                        ->where('entity_id', (int) $companyId);
                });
                if ($bookingIds->isNotEmpty()) {
                    $q->orWhere(function ($q2) use ($bookingIds) {
                        $q2->whereIn('entity_type', ['Booking', 'App\\Models\\Booking'])
                            ->whereIn('entity_id', $bookingIds);
                    });
                }
            });

        // Filter by category
        if ($request->has('category') && $request->category) {
            $query->where('category', $request->category);
        }

        // Filter by action
        if ($request->has('action') && $request->action) {
            $query->where('action', $request->action);
        }

        // Filter by date range
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Get total count before pagination
        $total = $query->count();

        // Pagination
        $page = $request->get('page', 1);
        $pageSize = $request->get('pageSize', 10);
        $skip = ($page - 1) * $pageSize;

        $logs = $query->orderBy('created_at', 'desc')
            ->skip($skip)
            ->take($pageSize)
            ->get();

        $data = $logs->map(function ($log) {
            return $this->formatLog($log);
        });

        return response()->json([
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }

    /**
     * Get activity statistics (counts by segment, category, etc.)
     */
    public function stats(Request $request)
    {
        // Статистика по сегментам
        $bySegment = ActivityLog::select('segment', DB::raw('count(*) as count'))
            ->groupBy('segment')
            ->get()
            ->pluck('count', 'segment')
            ->toArray();

        // Статистика по категориям
        $byCategory = ActivityLog::select('category', DB::raw('count(*) as count'))
            ->whereNotNull('category')
            ->groupBy('category')
            ->get()
            ->pluck('count', 'category')
            ->toArray();

        // Статистика по действиям
        $byAction = ActivityLog::select('action', DB::raw('count(*) as count'))
            ->groupBy('action')
            ->get()
            ->pluck('count', 'action')
            ->toArray();

        // Активность за последние 7 дней
        $last7Days = ActivityLog::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('count(*) as count')
            )
            ->where('created_at', '>=', now()->subDays(7))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'count' => $item->count,
                ];
            });

        // Общее количество
        $total = ActivityLog::count();

        // Сегодня
        $today = ActivityLog::whereDate('created_at', now()->toDateString())->count();

        return response()->json([
            'total' => $total,
            'today' => $today,
            'by_segment' => $bySegment,
            'by_category' => $byCategory,
            'by_action' => $byAction,
            'last_7_days' => $last7Days,
        ]);
    }

    /**
     * Format log entry for response.
     */
    private function formatLog(ActivityLog $log): array
    {
        $userName = null;
        if ($log->user) {
            if ($log->user->profile) {
                $firstName = $log->user->profile->first_name ?? '';
                $lastName = $log->user->profile->last_name ?? '';
                $userName = trim($firstName . ' ' . $lastName) ?: $log->user->email;
            } else {
                $userName = $log->user->email;
            }
        }

        return [
            'id' => $log->id,
            'user' => $log->user ? [
                'id' => $log->user->id,
                'name' => $userName,
                'email' => $log->user->email,
                'role' => $log->user->role,
            ] : null,
            'company' => $log->company ? [
                'id' => $log->company->id,
                'name' => $log->company->name,
            ] : null,
            'action' => $log->action,
            'segment' => $log->segment,
            'category' => $log->category,
            'entity_type' => $log->entity_type,
            'entity_id' => $log->entity_id,
            'entity_name' => $log->entity_name,
            'old_values' => $log->old_values,
            'new_values' => $log->new_values,
            'ip_address' => $log->ip_address,
            'user_agent' => $log->user_agent,
            'description' => $log->description,
            'metadata' => $log->metadata,
            'created_at' => $log->created_at->toISOString(),
        ];
    }

    /**
     * Get activity log details by ID.
     */
    public function show($id)
    {
        $log = ActivityLog::with('user.profile')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $log->id,
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->profile->first_name . ' ' . $log->user->profile->last_name ?? $log->user->email,
                    'email' => $log->user->email,
                ] : null,
                'action' => $log->action,
                'entity_type' => $log->entity_type,
                'entity_id' => $log->entity_id,
                'entity_name' => $log->entity_name,
                'old_values' => $log->old_values,
                'new_values' => $log->new_values,
                'ip_address' => $log->ip_address,
                'user_agent' => $log->user_agent,
                'description' => $log->description,
                'created_at' => $log->created_at->toISOString(),
                'updated_at' => $log->updated_at->toISOString(),
            ],
        ]);
    }

    /**
     * Export activity logs to CSV.
     */
    public function export(Request $request)
    {
        $query = ActivityLog::with('user.profile');

        // Apply same filters as index
        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('action') && $request->action) {
            $query->where('action', $request->action);
        }

        if ($request->has('entity_type') && $request->entity_type) {
            $query->where('entity_type', $request->entity_type);
        }

        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->orderBy('created_at', 'desc')->get();

        $filename = 'activity_logs_' . date('Y-m-d_His') . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($logs) {
            $file = fopen('php://output', 'w');
            
            // CSV headers
            fputcsv($file, [
                'ID',
                'Дата',
                'Пользователь',
                'Email',
                'Действие',
                'Тип сущности',
                'ID сущности',
                'Название сущности',
                'Описание',
                'IP адрес',
                'User Agent',
            ]);

            // CSV rows
            foreach ($logs as $log) {
                $userName = $log->user 
                    ? ($log->user->profile->first_name . ' ' . $log->user->profile->last_name ?? $log->user->email)
                    : 'System';
                $userEmail = $log->user ? $log->user->email : '';

                fputcsv($file, [
                    $log->id,
                    $log->created_at->format('Y-m-d H:i:s'),
                    $userName,
                    $userEmail,
                    $log->action,
                    $log->entity_type,
                    $log->entity_id ?? '',
                    $log->entity_name ?? '',
                    $log->description ?? '',
                    $log->ip_address ?? '',
                    $log->user_agent ?? '',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}

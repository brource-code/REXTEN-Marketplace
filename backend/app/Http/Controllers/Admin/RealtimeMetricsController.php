<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Company;
use App\Models\User;
use App\Models\UserPresenceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class RealtimeMetricsController extends Controller
{
    private function onlineThresholdSeconds(): int
    {
        $v = (int) config('presence.online_threshold_seconds', 180);

        return $v >= 30 && $v <= 900 ? $v : 180;
    }

    public function index(): JsonResponse
    {
        $threshold = now()->subSeconds($this->onlineThresholdSeconds());

        $onlineSessionsCount = UserPresenceSession::query()
            ->where('last_seen_at', '>=', $threshold)
            ->count();

        $onlineUsersCount = UserPresenceSession::query()
            ->where('last_seen_at', '>=', $threshold)
            ->distinct()
            ->count('user_id');

        $onlineByRole = UserPresenceSession::query()
            ->join('users', 'users.id', '=', 'user_presence_sessions.user_id')
            ->where('user_presence_sessions.last_seen_at', '>=', $threshold)
            ->select('users.role', DB::raw('COUNT(DISTINCT user_presence_sessions.user_id) as c'))
            ->groupBy('users.role')
            ->pluck('c', 'role')
            ->toArray();

        $recentSessions = UserPresenceSession::query()
            ->with(['user:id,email,role'])
            ->where('last_seen_at', '>=', $threshold)
            ->orderByDesc('last_seen_at')
            ->limit(40)
            ->get()
            ->map(function (UserPresenceSession $row) {
                $u = $row->user;

                return [
                    'user_id' => $row->user_id,
                    'email' => $u?->email,
                    'role' => $u?->role,
                    'last_seen_at' => $row->last_seen_at?->toIso8601String(),
                    'client_session_id_short' => substr($row->client_session_id, 0, 8).'…',
                    'user_agent_short' => $row->user_agent
                        ? substr($row->user_agent, 0, 80).(strlen($row->user_agent) > 80 ? '…' : '')
                        : null,
                    'ip_address' => $row->ip_address,
                ];
            });

        $now = now();
        $todayStart = $now->copy()->startOfDay();
        $todayEnd = $now->copy()->endOfDay();

        $bookingsToday = 0;
        if (Schema::hasTable('bookings')) {
            $bookingsToday = Booking::query()
                ->where(function ($q) use ($todayStart, $todayEnd) {
                    $q->whereBetween('booking_date', [$todayStart, $todayEnd])
                        ->orWhere(function ($q2) use ($todayStart, $todayEnd) {
                            $q2->whereNull('booking_date')
                                ->whereBetween('created_at', [$todayStart, $todayEnd]);
                        });
                })
                ->count();
        }

        $newUsersToday = User::query()
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        $companiesTotal = Company::query()->count();
        $usersTotal = User::query()->count();

        return response()->json([
            'data' => [
                'online_threshold_seconds' => $this->onlineThresholdSeconds(),
                'online_users_count' => $onlineUsersCount,
                'online_sessions_count' => $onlineSessionsCount,
                'online_by_role' => $onlineByRole,
                'recent_sessions' => $recentSessions,
                'bookings_today' => $bookingsToday,
                'new_users_today' => $newUsersToday,
                'users_total' => $usersTotal,
                'companies_total' => $companiesTotal,
                'server_time' => $now->toIso8601String(),
            ],
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\UserPresenceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UserPresenceController extends Controller
{
    /**
     * Пульс активности: одна строка на пару (user + client_session_id).
     * Клиент шлёт тот же client_session_id (UUID в localStorage), пока открыта вкладка.
     */
    public function heartbeat(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $clientSessionId = $request->input('client_session_id');
        if (! is_string($clientSessionId) || $clientSessionId === '') {
            $clientSessionId = (string) Str::uuid();
        }
        if (strlen($clientSessionId) > 64) {
            $clientSessionId = substr($clientSessionId, 0, 64);
        }

        $ua = $request->userAgent();
        $userAgent = is_string($ua) ? substr($ua, 0, 512) : null;

        UserPresenceSession::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'client_session_id' => $clientSessionId,
            ],
            [
                'last_seen_at' => now(),
                'user_agent' => $userAgent,
                'ip_address' => $request->ip(),
            ]
        );

        // Удаляем совсем старые записи (раз в запрос, без отдельного крона)
        $cutoff = now()->subDays(14);
        UserPresenceSession::query()->where('last_seen_at', '<', $cutoff)->delete();

        return response()->json([
            'client_session_id' => $clientSessionId,
            'ok' => true,
        ]);
    }
}

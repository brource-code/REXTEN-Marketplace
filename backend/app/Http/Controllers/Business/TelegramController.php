<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Подключение/отключение Telegram-бота на уровне ТЕКУЩЕГО пользователя
 * (владелец компании или сотрудник). Привязка через deep-link
 * https://t.me/<bot>?start=<token>; после `/start` бот сам сохранит chat_id.
 */
class TelegramController extends Controller
{
    private const TOKEN_TTL_MINUTES = 30;

    public function status(Request $request)
    {
        $user = auth('api')->user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        return response()->json([
            'success' => true,
            'data' => $this->payload($user),
        ]);
    }

    public function connect(Request $request)
    {
        $user = auth('api')->user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $botUsername = (string) (config('services.telegram_business.bot_username') ?? '');
        $botToken = (string) (config('services.telegram_business.bot_token') ?? '');
        if ($botUsername === '' || $botToken === '') {
            return response()->json([
                'success' => false,
                'message' => 'Telegram bot is not configured on the server',
                'data' => $this->payload($user),
            ], 503);
        }

        do {
            $token = Str::lower(Str::random(24));
            $exists = User::query()->where('telegram_link_token', $token)->exists();
        } while ($exists);

        $expiresAt = Carbon::now()->addMinutes(self::TOKEN_TTL_MINUTES);

        $user->telegram_link_token = $token;
        $user->telegram_link_token_expires_at = $expiresAt;
        $user->save();

        $deepLink = 'https://t.me/'.ltrim($botUsername, '@').'?start='.$token;

        return response()->json([
            'success' => true,
            'data' => array_merge($this->payload($user->fresh()), [
                'deepLink' => $deepLink,
                'botUsername' => ltrim($botUsername, '@'),
                'tokenExpiresAt' => $expiresAt->toIso8601String(),
            ]),
        ]);
    }

    public function disconnect(Request $request)
    {
        $user = auth('api')->user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $user->telegram_chat_id = null;
        $user->telegram_username = null;
        $user->telegram_linked_at = null;
        $user->telegram_link_token = null;
        $user->telegram_link_token_expires_at = null;
        $user->save();

        return response()->json([
            'success' => true,
            'data' => $this->payload($user->fresh()),
        ]);
    }

    private function payload(User $user): array
    {
        $botUsername = (string) (config('services.telegram_business.bot_username') ?? '');
        $configured = $botUsername !== '' && (string) (config('services.telegram_business.bot_token') ?? '') !== '';

        return [
            'connected' => ! empty($user->telegram_chat_id),
            'username' => $user->telegram_username,
            'linkedAt' => $user->telegram_linked_at?->toIso8601String(),
            'botUsername' => $botUsername !== '' ? ltrim($botUsername, '@') : null,
            'botConfigured' => $configured,
        ];
    }
}

<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Уведомления клиенту маркетплейса в Telegram (тот же бизнес-бот, что и у владельцев — chat_id в users).
 */
final class TelegramClientNotifier
{
    public static function notifyIfEnabled(User $user, string $title, string $body, string $actionPath = '/booking'): void
    {
        $profile = $user->profile;
        $telegramOn = $profile ? (bool) ($profile->notification_telegram ?? false) : false;
        if (! $telegramOn) {
            return;
        }

        $chatId = $user->telegram_chat_id ?? null;
        if ($chatId === null || $chatId === '') {
            return;
        }

        $botToken = (string) (config('services.telegram_business.bot_token') ?? '');
        if ($botToken === '') {
            Log::info('TelegramClientNotifier: bot token not configured, skip', [
                'user_id' => $user->id,
            ]);

            return;
        }

        $base = rtrim((string) config('app.frontend_url'), '/');
        $actionUrl = $base === '' ? $actionPath : $base.$actionPath;
        $text = self::formatHtml($title, $body);

        self::sendMessage($botToken, (string) $chatId, $text, $actionUrl);
    }

    private static function sendMessage(string $botToken, string $chatId, string $text, ?string $actionUrl): void
    {
        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true,
        ];

        if ($actionUrl) {
            $payload['reply_markup'] = json_encode([
                'inline_keyboard' => [[[
                    'text' => 'Открыть в REXTEN',
                    'url' => $actionUrl,
                ]]],
            ], JSON_UNESCAPED_UNICODE);
        }

        try {
            $response = Http::timeout(7)
                ->post("https://api.telegram.org/bot{$botToken}/sendMessage", $payload);

            if (! $response->successful()) {
                Log::warning('TelegramClientNotifier: Telegram API error', [
                    'chat_id' => $chatId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('TelegramClientNotifier: failed to send message', [
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private static function formatHtml(string $title, string $body): string
    {
        $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $safeBody = htmlspecialchars($body, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return "<b>{$safeTitle}</b>\n\n{$safeBody}";
    }
}

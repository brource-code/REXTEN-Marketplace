<?php

namespace App\Services;

use App\Models\Company;
use App\Models\CompanyUser;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Рассылка уведомлений компании через бизнес-бота Telegram.
 *
 * Получатели: владелец компании + все активные сотрудники (company_users.is_active),
 * у чьей роли есть permission `receive_notifications`. У получателя должен быть
 * привязан личный chat_id (users.telegram_chat_id).
 *
 * Отправка реально идёт только если:
 * - в компании включён тумблер notification_telegram_enabled,
 * - категория события (новые брони / отмены / платежи / отзывы) тоже включена,
 * - настроен бизнес-бот (services.telegram_business.bot_token).
 */
class TelegramBusinessNotifier
{
    /**
     * Отправить уведомление компании по событию.
     *
     * @param  string  $event  одна из BusinessOwnerNotificationPreferences::EVENT_*
     * @param  string  $title  заголовок (одна строка)
     * @param  string  $body   тело сообщения (можно многострочное)
     * @param  string|null  $actionPath  относительный путь, превратится в кнопку «Открыть»
     */
    public static function notifyCompany(
        Company $company,
        string $event,
        string $title,
        string $body,
        ?string $actionPath = '/business/schedule'
    ): void {
        if (! (bool) ($company->notification_telegram_enabled ?? false)) {
            return;
        }
        if (! self::categoryEnabled($company, $event)) {
            return;
        }

        $botToken = (string) (config('services.telegram_business.bot_token') ?? '');
        if ($botToken === '') {
            Log::info('TelegramBusinessNotifier: bot token not configured, skip', [
                'company_id' => $company->id,
                'event' => $event,
            ]);

            return;
        }

        $recipients = self::resolveRecipients($company);
        if ($recipients->isEmpty()) {
            return;
        }

        $base = rtrim((string) config('app.frontend_url'), '/');
        $actionUrl = $actionPath ? ($base === '' ? $actionPath : $base.$actionPath) : null;
        $text = self::formatHtml($title, $body);

        foreach ($recipients as $user) {
            self::sendMessage($botToken, (string) $user->telegram_chat_id, $text, $actionUrl);
        }
    }

    /**
     * Отправить произвольный текст конкретному chat_id (используется webhook'ом для ответов).
     */
    public static function sendRaw(string $chatId, string $text): void
    {
        $botToken = (string) (config('services.telegram_business.bot_token') ?? '');
        if ($botToken === '' || $chatId === '') {
            return;
        }
        self::sendMessage($botToken, $chatId, $text, null);
    }

    private static function categoryEnabled(Company $company, string $event): bool
    {
        return match ($event) {
            BusinessOwnerNotificationPreferences::EVENT_NEW_BOOKING => (bool) ($company->notification_new_bookings ?? true),
            BusinessOwnerNotificationPreferences::EVENT_BOOKING_CANCELLED => (bool) ($company->notification_cancellations ?? true),
            BusinessOwnerNotificationPreferences::EVENT_PAYMENT => (bool) ($company->notification_payments ?? true),
            BusinessOwnerNotificationPreferences::EVENT_REVIEW => (bool) ($company->notification_reviews ?? true),
            default => true,
        };
    }

    /**
     * Владелец + активные сотрудники с permission `receive_notifications`,
     * у которых заполнен telegram_chat_id.
     *
     * @return Collection<int, User>
     */
    private static function resolveRecipients(Company $company): Collection
    {
        $userIds = collect();

        if ($company->owner_id) {
            $userIds->push((int) $company->owner_id);
        }

        $staffIds = CompanyUser::query()
            ->where('company_id', $company->id)
            ->where('is_active', true)
            ->whereHas('role.permissions', function ($q) {
                $q->where('slug', 'receive_notifications');
            })
            ->pluck('user_id')
            ->all();

        foreach ($staffIds as $id) {
            $userIds->push((int) $id);
        }

        $userIds = $userIds->unique()->values();
        if ($userIds->isEmpty()) {
            return collect();
        }

        return User::query()
            ->whereIn('id', $userIds)
            ->whereNotNull('telegram_chat_id')
            ->get();
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
                Log::warning('TelegramBusinessNotifier: Telegram API error', [
                    'chat_id' => $chatId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('TelegramBusinessNotifier: failed to send message', [
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

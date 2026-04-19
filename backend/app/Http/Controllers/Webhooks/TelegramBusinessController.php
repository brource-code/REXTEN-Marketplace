<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TelegramBusinessNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Webhook от бизнес-бота Telegram.
 * Регистрируется через `php artisan telegram:business:set-webhook`.
 *
 * Поддерживает команды:
 * - /start <token>  — привязывает chat_id к пользователю по одноразовому токену.
 * - /start          — приветствие и инструкция.
 * - /stop           — отвязать текущий chat_id.
 */
class TelegramBusinessController extends Controller
{
    public function handle(Request $request)
    {
        $expectedSecret = (string) (config('services.telegram_business.webhook_secret') ?? '');
        if ($expectedSecret === '' || $request->header('X-Telegram-Bot-Api-Secret-Token') !== $expectedSecret) {
            abort(403);
        }

        $message = $request->input('message') ?? $request->input('edited_message');
        if (! is_array($message)) {
            return response()->json(['ok' => true]);
        }

        $chatId = (string) ($message['chat']['id'] ?? '');
        $text = trim((string) ($message['text'] ?? ''));
        $username = isset($message['from']['username']) ? (string) $message['from']['username'] : null;

        if ($chatId === '' || $text === '') {
            return response()->json(['ok' => true]);
        }

        if (str_starts_with($text, '/start')) {
            $token = trim((string) substr($text, strlen('/start')));
            if ($token === '') {
                $this->replyHelp($chatId);

                return response()->json(['ok' => true]);
            }

            $this->linkByToken($chatId, $username, $token);

            return response()->json(['ok' => true]);
        }

        if ($text === '/stop' || $text === '/unlink') {
            $this->unlinkByChat($chatId);

            return response()->json(['ok' => true]);
        }

        if ($text === '/help') {
            $this->replyHelp($chatId);
        }

        return response()->json(['ok' => true]);
    }

    private function linkByToken(string $chatId, ?string $username, string $token): void
    {
        $user = User::query()
            ->where('telegram_link_token', $token)
            ->where(function ($q) {
                $q->whereNull('telegram_link_token_expires_at')
                    ->orWhere('telegram_link_token_expires_at', '>', Carbon::now());
            })
            ->first();

        if (! $user) {
            TelegramBusinessNotifier::sendRaw($chatId, "Ссылка устарела или недействительна. Откройте «Настройки → Уведомления» и нажмите «Подключить Telegram» ещё раз.");

            return;
        }

        // На случай, если другой пользователь раньше использовал этот chat_id — отвязываем.
        User::query()
            ->where('telegram_chat_id', $chatId)
            ->where('id', '!=', $user->id)
            ->update([
                'telegram_chat_id' => null,
                'telegram_username' => null,
                'telegram_linked_at' => null,
            ]);

        $user->telegram_chat_id = $chatId;
        $user->telegram_username = $username;
        $user->telegram_linked_at = Carbon::now();
        $user->telegram_link_token = null;
        $user->telegram_link_token_expires_at = null;
        $user->save();

        TelegramBusinessNotifier::sendRaw($chatId, "Готово! Сюда будут приходить уведомления REXTEN: новые брони, отмены, оплаты и отзывы. Чтобы отключить — отправьте /stop.");

        Log::info('TelegramBusinessController: user linked', [
            'user_id' => $user->id,
            'chat_id' => $chatId,
        ]);
    }

    private function unlinkByChat(string $chatId): void
    {
        $user = User::query()->where('telegram_chat_id', $chatId)->first();
        if (! $user) {
            TelegramBusinessNotifier::sendRaw($chatId, "Этот чат не был подключён.");

            return;
        }

        $user->telegram_chat_id = null;
        $user->telegram_username = null;
        $user->telegram_linked_at = null;
        $user->save();

        TelegramBusinessNotifier::sendRaw($chatId, "Готово, уведомления отключены. Подключить заново — в «Настройки → Уведомления».");
    }

    private function replyHelp(string $chatId): void
    {
        TelegramBusinessNotifier::sendRaw(
            $chatId,
            "Это бот уведомлений REXTEN. Чтобы получать уведомления, откройте REXTEN → Настройки → Уведомления и нажмите «Подключить Telegram». Команда /stop отключает уведомления."
        );
    }
}

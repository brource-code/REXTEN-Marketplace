<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Регистрирует webhook бизнес-бота Telegram.
 *
 * Использование:
 *   php artisan telegram:business:set-webhook
 *   php artisan telegram:business:set-webhook --url=https://api.rexten.live/api/webhooks/telegram-business
 *   php artisan telegram:business:set-webhook --info       (только показать текущий статус)
 *   php artisan telegram:business:set-webhook --delete     (отвязать webhook)
 *
 * URL по умолчанию берётся из APP_URL + /api/webhooks/telegram-business.
 */
class SetTelegramBusinessWebhookCommand extends Command
{
    protected $signature = 'telegram:business:set-webhook
        {--url= : Полный URL вебхука (по умолчанию APP_URL + /api/webhooks/telegram-business)}
        {--info : Показать текущий статус вебхука}
        {--delete : Удалить вебхук у Telegram}';

    protected $description = 'Set / update / delete Telegram business bot webhook';

    public function handle(): int
    {
        $token = (string) (config('services.telegram_business.bot_token') ?? '');
        $secret = (string) (config('services.telegram_business.webhook_secret') ?? '');

        if ($token === '') {
            $this->error('TELEGRAM_BUSINESS_BOT_TOKEN is empty in .env');

            return self::FAILURE;
        }

        if ($this->option('info')) {
            $resp = Http::timeout(7)->get("https://api.telegram.org/bot{$token}/getWebhookInfo");
            $this->line($resp->body());

            return $resp->successful() ? self::SUCCESS : self::FAILURE;
        }

        if ($this->option('delete')) {
            $resp = Http::timeout(7)->post("https://api.telegram.org/bot{$token}/deleteWebhook", [
                'drop_pending_updates' => false,
            ]);
            $this->line($resp->body());

            return $resp->successful() ? self::SUCCESS : self::FAILURE;
        }

        if ($secret === '') {
            $this->error('TELEGRAM_BUSINESS_WEBHOOK_SECRET is empty in .env (придумайте любую длинную строку)');

            return self::FAILURE;
        }

        $url = (string) ($this->option('url') ?: rtrim((string) config('app.url'), '/').'/api/webhooks/telegram-business');
        if (! preg_match('~^https://~', $url)) {
            $this->error('Webhook URL must be HTTPS, got: '.$url);

            return self::FAILURE;
        }

        $resp = Http::timeout(7)->post("https://api.telegram.org/bot{$token}/setWebhook", [
            'url' => $url,
            'secret_token' => $secret,
            'allowed_updates' => ['message'],
        ]);

        $this->line($resp->body());

        return $resp->successful() ? self::SUCCESS : self::FAILURE;
    }
}

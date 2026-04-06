<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SentryTelegramController extends Controller
{
    public function handle(Request $request)
    {
        $secret = config('app.webhook_secret');
        if (! is_string($secret) || $secret === '' || $request->header('X-Webhook-Secret') !== $secret) {
            abort(403);
        }

        $botToken = config('services.telegram.bot_token');
        $chatId = config('services.telegram.chat_id');

        if (! $botToken || ! $chatId) {
            Log::warning('Sentry webhook received but Telegram not configured');

            return response()->json(['ok' => false, 'reason' => 'Telegram not configured'], 200);
        }

        $data = $request->all();

        $project = $data['project_name'] ?? $data['project'] ?? 'unknown';
        $level = $data['level'] ?? 'error';
        $url = $data['url'] ?? '';

        $title = $data['event']['title']
            ?? $data['message']
            ?? $data['culprit']
            ?? 'Error';

        $user = $data['event']['user']['email']
            ?? $data['event']['user']['id']
            ?? null;

        $environment = $data['event']['environment'] ?? $data['environment'] ?? null;
        $release = $data['event']['release'] ?? $data['release'] ?? null;

        $lines = ["🚨 *Sentry Alert*\n"];
        $lines[] = "*Project:* `{$project}`";
        $lines[] = "*Level:* `{$level}`";

        if ($environment) {
            $lines[] = "*Env:* `{$environment}`";
        }
        if ($release) {
            $lines[] = "*Release:* `{$release}`";
        }
        if ($user) {
            $lines[] = "*User:* `{$user}`";
        }

        $lines[] = "\n*Error:*\n`".mb_substr($title, 0, 500).'`';

        if ($url) {
            $lines[] = "\n[Open in Sentry]({$url})";
        }

        $text = implode("\n", $lines);

        try {
            $response = Http::post("https://api.telegram.org/bot{$botToken}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => 'Markdown',
                'disable_web_page_preview' => true,
            ]);

            if (! $response->successful()) {
                Log::error('Telegram API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('Failed to send Telegram message', ['exception' => $e->getMessage()]);
        }

        return response()->json(['ok' => true]);
    }
}

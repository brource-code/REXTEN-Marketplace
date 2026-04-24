<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class OpenAIClient
{
    private const API_URL = 'https://api.openai.com/v1/chat/completions';

    /**
     * @param  list<array<string, mixed>>  $messages  (по ссылке дополняются)
     * @param  list<array<string, mixed>>  $tools
     * @param  callable(string $name, string $arguments, string $toolCallId): string  $onToolCall
     * @return array{0: int, 1: int} [prompt_tokens, completion_tokens] суммарно за цикл
     */
    public function runToolLoop(
        string $model,
        array &$messages,
        array $tools,
        callable $onToolCall
    ): array {
        $apiKey = (string) config('services.openai.api_key', '');
        if ($apiKey === '') {
            throw new RuntimeException('OpenAI API key is not configured.');
        }

        $totalPrompt = 0;
        $totalCompletion = 0;
        $rounds = 0;
        $maxRounds = 16;

        while ($rounds < $maxRounds) {
            $rounds++;
            // На последнем раунде запрещаем новые tool_calls, чтобы модель завершила текстом
            // и не вылетала с tool loop limit exceeded из-за зацикленных вызовов.
            // OpenAI требует, чтобы 'tool_choice' всегда сопровождался 'tools' — поэтому
            // tools передаём всегда, меняем только tool_choice.
            $forceFinalize = $rounds === $maxRounds;
            $payload = [
                'model' => $model,
                'messages' => $messages,
                'tools' => $tools,
                'tool_choice' => $forceFinalize ? 'none' : 'auto',
            ];
            $res = Http::withHeaders([
                'Authorization' => 'Bearer '.$apiKey,
                'Content-Type' => 'application/json',
            ])
                ->timeout(120)
                ->post(self::API_URL, $payload);

            if (! $res->ok()) {
                throw new RuntimeException('OpenAI error: HTTP '.$res->status().' '.$res->body());
            }

            $data = $res->json();
            if (! is_array($data)) {
                throw new RuntimeException('OpenAI: invalid response');
            }
            $usage = $data['usage'] ?? [];
            $totalPrompt += (int) ($usage['prompt_tokens'] ?? 0);
            $totalCompletion += (int) ($usage['completion_tokens'] ?? 0);

            $message = $data['choices'][0]['message'] ?? null;
            if (! is_array($message)) {
                throw new RuntimeException('OpenAI: no message');
            }
            $messages[] = $message;
            $toolCalls = $message['tool_calls'] ?? null;
            if (! $forceFinalize && is_array($toolCalls) && $toolCalls !== []) {
                foreach ($toolCalls as $tc) {
                    if (! is_array($tc) || ! isset($tc['id'], $tc['type']) || $tc['type'] !== 'function') {
                        continue;
                    }
                    $fn = $tc['function'] ?? null;
                    if (! is_array($fn) || ! isset($fn['name'])) {
                        continue;
                    }
                    $name = (string) $fn['name'];
                    $args = isset($fn['arguments']) && is_string($fn['arguments']) ? $fn['arguments'] : '';
                    $out = $onToolCall($name, $args, (string) $tc['id']);
                    $messages[] = [
                        'role' => 'tool',
                        'tool_call_id' => (string) $tc['id'],
                        'content' => $out,
                    ];
                }

                continue;
            }

            return [$totalPrompt, $totalCompletion];
        }

        // Сюда не доходим: на последнем раунде tool_choice=none гарантирует ответ без tool_calls.
        return [$totalPrompt, $totalCompletion];
    }

    /**
     * @param  list<array<string, mixed>>  $messages
     * @return array{0: string, 1: int, 2: int} [content, prompt_tokens, completion_tokens]
     */
    public function runJsonSchemaCompletion(
        string $model,
        array $messages,
        array $jsonSchemaDef
    ): array {
        $apiKey = (string) config('services.openai.api_key', '');
        if ($apiKey === '') {
            throw new RuntimeException('OpenAI API key is not configured.');
        }

        $res = Http::withHeaders([
            'Authorization' => 'Bearer '.$apiKey,
            'Content-Type' => 'application/json',
        ])
            ->timeout(120)
            ->post(self::API_URL, [
                'model' => $model,
                'messages' => $messages,
                'response_format' => [
                    'type' => 'json_schema',
                    'json_schema' => $jsonSchemaDef,
                ],
            ]);

        if (! $res->ok()) {
            throw new RuntimeException('OpenAI error: HTTP '.$res->status().' '.$res->body());
        }

        $data = $res->json();
        if (! is_array($data)) {
            throw new RuntimeException('OpenAI: invalid response');
        }
        $usage = $data['usage'] ?? [];
        $pt = (int) ($usage['prompt_tokens'] ?? 0);
        $ct = (int) ($usage['completion_tokens'] ?? 0);
        $content = $data['choices'][0]['message']['content'] ?? '';
        if (! is_string($content)) {
            $content = '';
        }

        return [$content, $pt, $ct];
    }
}

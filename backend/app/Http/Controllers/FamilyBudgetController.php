<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FamilyBudgetController extends Controller
{
    /**
     * Получить AI-анализ семейного бюджета
     */
    public function getAiReport(Request $request)
    {
        $validated = $request->validate([
            'period' => 'required|string',
            'safeMinBalance' => 'required|numeric',
            'summary' => 'required|array',
            'flexiblePayments' => 'nullable|array',
            'fixedPayments' => 'nullable|array',
            'criticalPeriods' => 'nullable|array',
        ]);

        $period = $validated['period'];
        $safeMinBalance = $validated['safeMinBalance'];
        $summary = $validated['summary'];
        $flexiblePayments = $validated['flexiblePayments'] ?? [];
        $fixedPayments = $validated['fixedPayments'] ?? [];
        $criticalPeriods = $validated['criticalPeriods'] ?? [];

        // Проверяем наличие API ключа
        $apiKey = config('services.openai.api_key');
        if (empty($apiKey)) {
            return response()->json([
                'error' => 'OpenAI API key not configured'
            ], 500);
        }

        // ЖЁСТКИЙ системный промпт
        $systemPrompt = "You are a financial assistant.

CRITICAL: You receive PRE-CALCULATED scenarios. DO NOT calculate anything yourself.
Just present the provided data in a clear, actionable format.

IMPORTANT CONTEXT:
- 'Гибкие платежи' (flexible payments) = КРЕДИТНЫЕ КАРТЫ (credit cards)
- Кредитки можно переносить на следующий месяц без критических последствий
- При упоминании гибких платежей используй термины: 'кредитки', 'кредитные карты', 'платежи по кредиткам'

STRICT RULES:
- Use EXACTLY 4 bullet points.
- Use ONLY the numbers provided in the data. DO NOT calculate new numbers.
- DO NOT give generic advice.
- DO NOT suggest finding additional income.
- When mentioning flexible payments, refer to them as 'кредитки' or 'кредитные карты'.
- Answer in Russian.
- Be extremely concise.";

        // Данные из summary
        $startBalance = $summary['startBalance'] ?? 0;
        $endingBalance = $summary['endingBalance'] ?? 0;
        $balanceChange = $summary['balanceChange'] ?? 0;
        $totalIncome = $summary['totalIncome'] ?? 0;
        $totalExpense = $summary['totalExpense'] ?? 0;
        $totalFixed = $summary['totalFixed'] ?? 0;
        $totalFlexible = $summary['totalFlexible'] ?? 0;
        $daysNegative = $summary['daysNegative'] ?? 0;
        
        // Готовые сценарии (уже посчитаны!)
        $scenarios = $summary['scenarios'] ?? [];
        $top3Scenario = $scenarios['top3Postponed'] ?? [];
        $allFlexibleScenario = $scenarios['allFlexiblePostponed'] ?? [];
        
        $top3Payments = implode(', ', $top3Scenario['payments'] ?? []);
        $top3Savings = $top3Scenario['savings'] ?? 0;
        $top3NewBalance = $top3Scenario['newBalance'] ?? $endingBalance;
        
        $allFlexibleSavings = $allFlexibleScenario['savings'] ?? 0;
        $allFlexibleNewBalance = $allFlexibleScenario['newBalance'] ?? $endingBalance;

        $flexiblePaymentsStr = !empty($flexiblePayments) ? implode(', ', $flexiblePayments) : 'нет';
        $fixedPaymentsStr = !empty($fixedPayments) ? implode(', ', $fixedPayments) : 'нет';

        // User prompt с ГОТОВЫМИ расчётами
        $userPrompt = "Представь данные в виде краткого плана действий.

ФАКТЫ (не пересчитывай!):
- Старт: {$startBalance}, Финал: {$endingBalance}
- Изменение баланса: {$balanceChange}
- Дней в минусе: {$daysNegative}

ОБЯЗАТЕЛЬНЫЕ платежи: {$fixedPaymentsStr}
Итого обязательных: {$totalFixed}

КРЕДИТНЫЕ КАРТЫ (гибкие, можно перенести на следующий месяц): {$flexiblePaymentsStr}
Итого по кредиткам: {$totalFlexible}

ГОТОВЫЕ СЦЕНАРИИ (уже посчитаны, просто используй эти цифры):

Сценарий A - перенести топ-3 крупнейших кредитки:
  Кредитки: {$top3Payments}
  Экономия: {$top3Savings}
  Новый баланс: {$top3NewBalance}

Сценарий B - перенести ВСЕ кредитки:
  Экономия: {$allFlexibleSavings}
  Новый баланс: {$allFlexibleNewBalance}

Формат ответа (РОВНО 4 пункта):
• Ситуация: баланс упал с {$startBalance} до {$endingBalance} (изменение {$balanceChange}).
• Обязательно оплатить: [перечисли фиксированные] = {$totalFixed}.
• Рекомендация: перенести [топ-3 или все кредитки] на следующий месяц → новый баланс будет [цифра из сценария].
• Итог: [краткий вывод с упоминанием кредиток]";

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $apiKey,
            ])->timeout(30)->post('https://api.openai.com/v1/chat/completions', [
                'model' => 'gpt-4o-mini',
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userPrompt],
                ],
                'temperature' => 0.5,
                'max_tokens' => 800,
            ]);

            if (!$response->successful()) {
                Log::error('OpenAI API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                
                return response()->json([
                    'error' => 'Failed to get AI analysis',
                    'details' => $response->body(),
                ], $response->status());
            }

            $data = $response->json();
            $analysis = $data['choices'][0]['message']['content'] ?? 'Не удалось получить анализ';

            return response()->json([
                'analysis' => $analysis,
            ]);

        } catch (\Exception $e) {
            Log::error('Error in AI report endpoint', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Internal server error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}

<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ModerationService
{
    private ?string $apiKey;

    /**
     * Категории модерации OpenAI и их русские названия
     */
    private const CATEGORY_LABELS = [
        'hate' => 'ненависть или дискриминация',
        'hate/threatening' => 'угрозы на почве ненависти',
        'harassment' => 'оскорбления или преследование',
        'harassment/threatening' => 'угрозы или запугивание',
        'self-harm' => 'контент о самоповреждении',
        'self-harm/intent' => 'намерения самоповреждения',
        'self-harm/instructions' => 'инструкции по самоповреждению',
        'sexual' => 'сексуальный контент',
        'sexual/minors' => 'сексуальный контент с несовершеннолетними',
        'violence' => 'насилие',
        'violence/graphic' => 'графическое насилие',
        'russian_profanity' => 'нецензурная лексика',
    ];

    /**
     * Русские матерные слова и их вариации
     * Только явные матерные слова, без слов которые могут быть частью нормальных
     */
    private const RUSSIAN_PROFANITY_PATTERNS = [
        // Основа "хуй" и производные
        'хуй', 'хуя', 'хуе', 'хуи', 'хую', 'хуём', 'хуёв', 'хуяр', 'хуяч',
        'хуйня', 'хуйло', 'хуйлан', 'хуесос', 'хуеплёт', 'хуеплет',
        'похуй', 'похуист', 'нахуй', 'нахуя', 'дохуя', 'однохуй',
        'охуел', 'охуеть', 'охуенн', 'охуева', 'охуён',
        
        // Основа "пизд" и производные
        'пизд', 'пезд', 'пёзд',
        'пиздец', 'пиздат', 'пиздюк', 'пиздюл', 'пиздобол', 'пизданул',
        'пиздёж', 'пиздеж', 'пиздорван', 'пиздострадал',
        'припизд', 'опизден', 'распизд', 'спиздил', 'спиздел', 'спиздит',
        'запиздел', 'пропизд', 'испизд', 'отпизд', 'подпизд', 'впизд',
        
        // Основа "бляд" и производные
        'бляд', 'блять', 'блядь',
        'блядин', 'блядск', 'блядун', 'блядов', 'выблядок',
        
        // Основа "еб" и производные
        'ебат', 'ебан', 'ебну', 'ебёт', 'ебет', 'ебал', 'ебут', 'ебуч',
        'ёбан', 'ёбанн', 'ебанн', 'ёбаны', 'ебаны',
        'заеба', 'заёба', 'отъеба', 'наеба', 'наёба', 'уеба', 'уёба',
        'поеба', 'выеба', 'съеба', 'разъеба', 'проеба',
        'ёбнул', 'ебнул', 'ёбнут', 'ебнут',
        'ёбарь', 'ебарь', 'ебало', 'ебальник', 'еблан',
        
        // Основа "сук" - только явные формы
        'сука', 'сучка', 'сучар', 'сучён', 'сучен',
        
        // Основа "мудак" и производные  
        'мудак', 'мудач', 'мудил', 'мудозвон',
        
        // Другие матерные слова
        'залупа', 'залупин',
        'шлюха', 'шлюхи', 'шлюх',
        'педик', 'пидор', 'пидар', 'пидр', 'пидорас',
        'гандон', 'гондон',
        'дрочит', 'дрочил', 'дрочка', 'дрочер',
        'жопа', 'жопу', 'жопе', 'жопой', 'жопы', 'жопник',
        'срань', 'срач', 'засранец', 'засранка',
        'говно', 'говнюк', 'говноед',
        'дерьмо', 'дерьмов',
        
        // Оскорбления
        'долбоёб', 'долбоеб', 'долбаёб', 'долбаеб',
        'ублюдок', 'ублюдк',
        'мразь', 'мразот',
        'тварь',
        'падла', 'падлюка',
        'курва',
        'потаскуха',
        'шалава',
        
        // Сексуальные термины (явно неуместные)
        'порнуха',
        'педофил',
        'зоофил',
        'некрофил',
        'изнасилова',
    ];

    /**
     * Дополнительные запрещённые слова (наркотики, оружие, экстремизм)
     */
    private const FORBIDDEN_WORDS = [
        // Наркотики - только явные
        'наркотик', 'героин', 'кокаин', 'марихуан', 'гашиш', 
        'амфетамин', 'метамфетамин', 'мефедрон',
        'закладка', 'закладки', 'барыга', 'наркошоп', 'наркомаг',
        // Экстремизм - только явные
        'терроризм', 'террорист', 'джихад', 'игил', 'isis',
        'убийство на заказ', 'заказное убийство', 'киллер на заказ',
    ];

    public function __construct()
    {
        $this->apiKey = config('services.openai.api_key');
    }

    /**
     * Проверить текст на русский мат и запрещённые слова
     *
     * @param string $text Текст для проверки
     * @return array ['flagged' => bool, 'found_words' => array]
     */
    public function checkRussianProfanity(string $text): array
    {
        $lowerText = mb_strtolower($text);
        $foundWords = [];

        // Проверка матерных слов
        foreach (self::RUSSIAN_PROFANITY_PATTERNS as $pattern) {
            if (mb_strpos($lowerText, mb_strtolower($pattern)) !== false) {
                $foundWords[] = $pattern;
            }
        }

        // Проверка запрещённых слов
        foreach (self::FORBIDDEN_WORDS as $word) {
            if (mb_strpos($lowerText, mb_strtolower($word)) !== false) {
                $foundWords[] = $word;
            }
        }

        return [
            'flagged' => !empty($foundWords),
            'found_words' => array_unique($foundWords),
        ];
    }

    /**
     * Проверить текст через OpenAI Moderation API
     *
     * @param string $text Текст для проверки
     * @return array ['flagged' => bool, 'categories' => array, 'reason' => string|null]
     */
    public function moderate(string $text): array
    {
        // Если текст пустой - нечего проверять
        if (empty(trim($text))) {
            return [
                'flagged' => false,
                'categories' => [],
                'reason' => null,
            ];
        }

        // 1. Сначала проверяем на русский мат (бесплатно и быстро)
        $russianCheck = $this->checkRussianProfanity($text);
        if ($russianCheck['flagged']) {
            Log::info('ModerationService: Russian profanity detected', [
                'found_words' => $russianCheck['found_words'],
                'text_preview' => mb_substr($text, 0, 100) . '...',
            ]);

            return [
                'flagged' => true,
                'categories' => ['russian_profanity'],
                'reason' => 'Контент содержит нецензурную лексику или запрещённые слова',
                'found_words' => $russianCheck['found_words'],
            ];
        }

        // 2. Если API ключ не настроен - пропускаем OpenAI модерацию
        if (empty($this->apiKey)) {
            Log::warning('ModerationService: OpenAI API key not configured, skipping OpenAI moderation');
            return [
                'flagged' => false,
                'categories' => [],
                'reason' => null,
            ];
        }

        // 3. Проверяем через OpenAI Moderation API
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(10)->post('https://api.openai.com/v1/moderations', [
                'input' => $text,
            ]);

            if (!$response->successful()) {
                Log::error('ModerationService: OpenAI API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                // При ошибке API - пропускаем модерацию (fallback)
                return [
                    'flagged' => false,
                    'categories' => [],
                    'reason' => null,
                ];
            }

            $data = $response->json();
            $result = $data['results'][0] ?? [];

            $flagged = $result['flagged'] ?? false;
            $categories = $result['categories'] ?? [];
            $scores = $result['category_scores'] ?? [];

            // Собираем нарушенные категории
            $violatedCategories = [];
            foreach ($categories as $category => $isViolated) {
                if ($isViolated) {
                    $violatedCategories[] = $category;
                }
            }

            // Формируем понятную причину отклонения
            $reason = null;
            if ($flagged && !empty($violatedCategories)) {
                $reason = $this->formatReason($violatedCategories);
            }

            Log::info('ModerationService: Moderation completed', [
                'flagged' => $flagged,
                'categories' => $violatedCategories,
                'text_preview' => mb_substr($text, 0, 100) . '...',
            ]);

            return [
                'flagged' => $flagged,
                'categories' => $violatedCategories,
                'scores' => $scores,
                'reason' => $reason,
            ];

        } catch (\Exception $e) {
            Log::error('ModerationService: Exception during moderation', [
                'error' => $e->getMessage(),
            ]);
            // При исключении - пропускаем модерацию (fallback)
            return [
                'flagged' => false,
                'categories' => [],
                'reason' => null,
            ];
        }
    }

    /**
     * Сформировать понятную причину отклонения на русском языке
     */
    private function formatReason(array $categories): string
    {
        $labels = [];
        foreach ($categories as $category) {
            $labels[] = self::CATEGORY_LABELS[$category] ?? $category;
        }

        if (count($labels) === 1) {
            return 'Контент содержит ' . $labels[0];
        }

        return 'Контент содержит: ' . implode(', ', $labels);
    }

    /**
     * Проверить, настроен ли сервис
     */
    public function isConfigured(): bool
    {
        return !empty($this->apiKey);
    }
}

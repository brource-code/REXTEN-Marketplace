<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Тексты уведомлений по тикетам поддержки (локали как в NotificationLocale: ru, en, es-mx, hy-am, uk-ua).
 */
class SupportTicketNotificationCopy
{
    private const LOCALES = ['ru', 'en', 'es-mx', 'hy-am', 'uk-ua'];

    public static function superadminNewTicket(string $locale, int $id, string $subject): array
    {
        $l = NotificationLocale::normalize($locale);
        $t = [
            'ru' => [
                'title' => 'Новое обращение #' . $id,
                'message' => $subject,
            ],
            'en' => [
                'title' => 'New support ticket #' . $id,
                'message' => $subject,
            ],
            'es-mx' => [
                'title' => 'Nuevo ticket #' . $id,
                'message' => $subject,
            ],
            'hy-am' => [
                'title' => 'Նոր դիմում #' . $id,
                'message' => $subject,
            ],
            'uk-ua' => [
                'title' => 'Нове звернення #' . $id,
                'message' => $subject,
            ],
        ];

        return $t[$l] ?? $t['en'];
    }

    public static function submitterStatusChanged(string $locale, int $id, string $subject, string $status, ?string $publicReply): array
    {
        $l = NotificationLocale::normalize($locale);
        $statusLabel = self::statusLabel($l, $status);
        $reply = $publicReply ? Str::limit(trim($publicReply), 500) : null;

        $t = [
            'ru' => [
                'title' => 'Обращение #' . $id . ': ' . $statusLabel,
                'message' => $reply
                    ? $subject . "\n\n" . $reply
                    : $subject,
            ],
            'en' => [
                'title' => 'Support ticket #' . $id . ': ' . $statusLabel,
                'message' => $reply
                    ? $subject . "\n\n" . $reply
                    : $subject,
            ],
            'es-mx' => [
                'title' => 'Ticket #' . $id . ': ' . $statusLabel,
                'message' => $reply
                    ? $subject . "\n\n" . $reply
                    : $subject,
            ],
            'hy-am' => [
                'title' => 'Տիկետ #' . $id . ': ' . $statusLabel,
                'message' => $reply
                    ? $subject . "\n\n" . $reply
                    : $subject,
            ],
            'uk-ua' => [
                'title' => 'Звернення #' . $id . ': ' . $statusLabel,
                'message' => $reply
                    ? $subject . "\n\n" . $reply
                    : $subject,
            ],
        ];

        return $t[$l] ?? $t['en'];
    }

    /**
     * Первое публичное сообщение команды без смены статуса в этом запросе.
     */
    public static function submitterFirstPublicReply(string $locale, int $id, string $subject, string $publicReply): array
    {
        $l = NotificationLocale::normalize($locale);
        $reply = Str::limit(trim($publicReply), 500);

        $t = [
            'ru' => [
                'title' => 'Ответ по обращению #' . $id,
                'message' => $subject . "\n\n" . $reply,
            ],
            'en' => [
                'title' => 'Reply to ticket #' . $id,
                'message' => $subject . "\n\n" . $reply,
            ],
            'es-mx' => [
                'title' => 'Respuesta al ticket #' . $id,
                'message' => $subject . "\n\n" . $reply,
            ],
            'hy-am' => [
                'title' => 'Պատասխան տիկետ #' . $id,
                'message' => $subject . "\n\n" . $reply,
            ],
            'uk-ua' => [
                'title' => 'Відповідь щодо звернення #' . $id,
                'message' => $subject . "\n\n" . $reply,
            ],
        ];

        return $t[$l] ?? $t['en'];
    }

    private static function statusLabel(string $locale, string $status): string
    {
        $labels = [
            'ru' => [
                'open' => 'Открыт',
                'in_progress' => 'В работе',
                'waiting_customer' => 'Ожидаем ответа',
                'resolved' => 'Решён',
                'closed' => 'Закрыт',
            ],
            'en' => [
                'open' => 'Open',
                'in_progress' => 'In progress',
                'waiting_customer' => 'Waiting for your reply',
                'resolved' => 'Resolved',
                'closed' => 'Closed',
            ],
            'es-mx' => [
                'open' => 'Abierto',
                'in_progress' => 'En curso',
                'waiting_customer' => 'Esperando tu respuesta',
                'resolved' => 'Resuelto',
                'closed' => 'Cerrado',
            ],
            'hy-am' => [
                'open' => 'Բաց է',
                'in_progress' => 'Ընթացքում',
                'waiting_customer' => 'Սպասում ենք պատասխանին',
                'resolved' => 'Լուծված',
                'closed' => 'Փակված',
            ],
            'uk-ua' => [
                'open' => 'Відкрито',
                'in_progress' => 'В роботі',
                'waiting_customer' => 'Очікуємо відповіді',
                'resolved' => 'Вирішено',
                'closed' => 'Закрито',
            ],
        ];

        $map = $labels[$locale] ?? $labels['en'];

        return $map[$status] ?? $status;
    }
}

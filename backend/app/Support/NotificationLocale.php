<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\Auth;

/**
 * Локаль для текстов уведомлений (совпадает с ключами массивов переводов: ru, en, es-mx, hy-am, uk-ua).
 * В БД locale может быть hy-AM, hy, пусто — приводим к каноническому виду.
 * Если у владельца в users.locale пусто, берём locale текущего запроса (тот же пользователь в календаре).
 */
class NotificationLocale
{
    public static function normalize(?string $locale): string
    {
        if ($locale === null || trim($locale) === '') {
            return 'en';
        }

        $l = strtolower(str_replace('_', '-', trim($locale)));

        return match ($l) {
            'hy', 'hy-am' => 'hy-am',
            'uk', 'uk-ua' => 'uk-ua',
            'es', 'es-mx' => 'es-mx',
            'ru' => 'ru',
            'en' => 'en',
            default => in_array($l, ['ru', 'en', 'es-mx', 'hy-am', 'uk-ua'], true) ? $l : 'en',
        };
    }

    /**
     * Локаль владельца бизнеса для пушей/записей уведомлений.
     */
    public static function forBusinessOwner(?User $owner): string
    {
        if (!$owner) {
            return 'en';
        }

        $raw = $owner->locale;
        if ($raw === null || trim((string) $raw) === '') {
            $auth = Auth::user();
            if ($auth && (int) $auth->id === (int) $owner->id && $auth->locale) {
                $raw = $auth->locale;
            }
        }

        return self::normalize($raw);
    }
}

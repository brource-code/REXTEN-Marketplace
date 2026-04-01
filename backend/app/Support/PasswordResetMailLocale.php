<?php

namespace App\Support;

/**
 * Локаль письма сброса пароля: ключи lang/{en,ru,...}/mail.php (es, не es-MX).
 */
final class PasswordResetMailLocale
{
    private const SUPPORTED = ['en', 'ru', 'uk', 'es', 'hy'];

    private const MAP = [
        'uk-UA' => 'uk',
        'es-MX' => 'es',
        'hy-AM' => 'hy',
    ];

    /**
     * Строка из users.locale или с фронта (next-intl) → код для mail-переводов или null, если пусто/неизвестно.
     */
    public static function toMailLang(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }

        $trim = trim($raw);

        foreach (self::MAP as $key => $mapped) {
            if (strcasecmp($key, $trim) === 0) {
                return $mapped;
            }
        }

        $locale = $trim;

        return in_array($locale, self::SUPPORTED, true) ? $locale : null;
    }
}

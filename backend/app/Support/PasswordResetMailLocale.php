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

    /** Локали UI (next-intl / профиль), как в `ProfileController`. */
    public const UI_LOCALES = ['en', 'ru', 'es-MX', 'hy-AM', 'uk-UA'];

    /**
     * Нормализация локали из запроса/профиля для поля users.locale.
     */
    public static function normalizeUiLocale(?string $raw): ?string
    {
        if ($raw === null || trim((string) $raw) === '') {
            return null;
        }

        $t = trim((string) $raw);
        foreach (self::UI_LOCALES as $loc) {
            if (strcasecmp($loc, $t) === 0) {
                return $loc;
            }
        }

        return null;
    }

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

/**
 * Поддерживаемые локали next-intl (имя файла messages/<код>.json).
 * Эталон ключей и английских строк: всегда messages/en.json (остальные локали — та же структура, перевод с EN).
 * При добавлении языка: переводы, merge-locale-parts, dateLocales, languageOptions, backend in:, PHP-уведомления.
 */
export const SUPPORTED_LOCALES = ['en', 'ru', 'es-MX', 'hy-AM', 'uk-UA']

/**
 * Первая часть Accept-Language (es, de, pt…) → полный код приложения, если отличается.
 * Пример: es → es-MX, в будущем de → de-DE.
 */
export const ACCEPT_LANGUAGE_ALIASES = {
    es: 'es-MX',
    hy: 'hy-AM',
    uk: 'uk-UA',
}

/**
 * Код приложения → имя локали dayjs (файл dayjs/locale/<name>.js).
 * Если ключа нет — в LocaleProvider используется сам locale (en, ru, …).
 */
export const APP_LOCALE_TO_DAYJS = {
    'es-MX': 'es',
    'hy-AM': 'hy-am',
    'uk-UA': 'uk',
}

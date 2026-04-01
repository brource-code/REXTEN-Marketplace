/**
 * Часовой пояс отображения дат/времени в суперадминке (США).
 * Данные с API приходят в UTC (ISO); конвертация на клиенте.
 *
 * Переопределение: NEXT_PUBLIC_SUPERADMIN_TIMEZONE=America/New_York
 */
export const SUPERADMIN_DISPLAY_TIMEZONE =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPERADMIN_TIMEZONE
        ? process.env.NEXT_PUBLIC_SUPERADMIN_TIMEZONE
        : 'America/Los_Angeles'

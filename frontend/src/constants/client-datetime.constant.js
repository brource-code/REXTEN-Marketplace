/** Дефолтная таймзона для клиентских экранов, если API не передал IANA-зону компании */
export const CLIENT_DEFAULT_TIMEZONE = 'America/Los_Angeles'

/** 12h AM/PM в стиле США для бронирований и заказов (независимо от языка UI) */
export const CLIENT_TIME_DISPLAY_LOCALE = 'en-US'

/**
 * @param {{ timezone?: string | null } | null | undefined} entity
 * @returns {string}
 */
export function resolveClientBookingTimezone(entity) {
    const tz = entity?.timezone
    if (typeof tz === 'string' && tz.trim()) return tz.trim()
    return CLIENT_DEFAULT_TIMEZONE
}

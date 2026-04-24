import { formatDurationMinutesI18n } from '@/utils/formatDurationMinutesI18n'

/** Локаль для отображения времени на экране маршрутов (US 12h). */
const ROUTE_TIME_LOCALE = 'en-US'

/**
 * Время из ISO в таймзоне бизнеса, 12-часовой американский формат (независимо от языка UI).
 * @param {string|undefined|null} iso
 * @param {string|undefined|null} timeZone IANA
 */
export function formatRouteIsoTime(iso, timeZone) {
    if (!iso) return ''
    try {
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return ''
        return new Intl.DateTimeFormat(ROUTE_TIME_LOCALE, {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: timeZone || undefined,
        }).format(d)
    } catch {
        return ''
    }
}

/**
 * @param {number|string|undefined|null} minutes
 * @param {(key: string, values?: Record<string, number>) => string} tDuration `useTranslations('common.durationMinutes')`
 */
export function formatRouteDurationMinutes(minutes, tDuration) {
    const s = formatDurationMinutesI18n(minutes, tDuration)
    return s === '—' ? '' : s
}

import { formatDurationMinutesI18n } from '@/utils/formatDurationMinutesI18n'

/** Локаль для отображения времени на экране маршрутов (US 12h). */
const ROUTE_TIME_LOCALE = 'en-US'

const DEFAULT_IANA = 'America/Los_Angeles'

/**
 * IANA таймзона для маршрутов: всегда явная, чтобы Intl не брал «локаль хоста».
 * @param {string|undefined|null} timeZone
 * @returns {string}
 */
export function resolveRouteDisplayTimeZone(timeZone) {
    const t = timeZone == null ? '' : String(timeZone).trim()
    return t || DEFAULT_IANA
}

/**
 * Краткое обозначение таймзоны (PT, PDT, EST…) в момент `iso` для зоны бизнеса.
 * @param {string|undefined|null} iso
 * @param {string|undefined|null} timeZone IANA
 * @returns {string}
 */
export function getRouteTimeZoneShortName(iso, timeZone) {
    if (!iso) return ''
    try {
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return ''
        const parts = new Intl.DateTimeFormat(ROUTE_TIME_LOCALE, {
            timeZone: resolveRouteDisplayTimeZone(timeZone),
            timeZoneName: 'short',
        }).formatToParts(d)
        return parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
    } catch {
        return ''
    }
}

/**
 * Время из ISO в таймзоне бизнеса, 12-часовой американский формат (независимо от языка UI).
 * @param {string|undefined|null} iso
 * @param {string|undefined|null} timeZone IANA
 * @param {{ withTimeZoneName?: boolean }} [options] при `withTimeZoneName: true` — суффикс вида «PDT» (как в США для слотов/визитов).
 */
export function formatRouteIsoTime(iso, timeZone, options = undefined) {
    if (!iso) return ''
    try {
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return ''
        const tz = resolveRouteDisplayTimeZone(timeZone)
        const withZ = Boolean(options && options.withTimeZoneName)
        return new Intl.DateTimeFormat(ROUTE_TIME_LOCALE, {
            hour: 'numeric',
            minute: '2-digit',
            /** Явно 12h, без опоры на квирки `hour12` в сочетании с локалью хоста. */
            hourCycle: 'h12',
            timeZone: tz,
            timeZoneName: withZ ? 'short' : undefined,
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

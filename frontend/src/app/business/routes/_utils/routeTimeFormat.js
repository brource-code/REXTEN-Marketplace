import { formatDurationMinutesI18n } from '@/utils/formatDurationMinutesI18n'

/**
 * Время из ISO в таймзоне бизнеса и локали UI (как в попапе карты и списке визитов).
 * @param {string|undefined|null} iso
 * @param {string|undefined|null} timeZone IANA
 * @param {string|undefined|null} intlLocale BCP47 (useLocale)
 */
export function formatRouteIsoTime(iso, timeZone, intlLocale) {
    if (!iso) return ''
    try {
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return ''
        return new Intl.DateTimeFormat(intlLocale || undefined, {
            hour: 'numeric',
            minute: '2-digit',
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

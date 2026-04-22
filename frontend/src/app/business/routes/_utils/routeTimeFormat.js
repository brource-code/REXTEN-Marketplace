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
 * @param {(key: string, values?: Record<string, number>) => string} tRoutes `useTranslations('business.routes')`
 */
export function formatRouteDurationMinutes(minutes, tRoutes) {
    const n = Math.round(Number(minutes))
    if (!Number.isFinite(n) || n < 1) return ''
    const h = Math.floor(n / 60)
    const m = n % 60
    if (h > 0 && m > 0) {
        return tRoutes('mapPopup.durationHm', { h, m })
    }
    if (h > 0) {
        return tRoutes('mapPopup.durationH', { h })
    }
    return tRoutes('mapPopup.durationM', { m })
}

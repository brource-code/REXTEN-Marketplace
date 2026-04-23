/**
 * Длительность в минутах → «часы и минуты» через next-intl (ключи hm / h / m).
 * @param {number|string|null|undefined} minutes
 * @param {(key: string, values?: Record<string, number>) => string} t — `useTranslations('common.durationMinutes')`
 */
export function formatDurationMinutesI18n(minutes, t) {
    const n = Math.round(Number(minutes))
    if (!Number.isFinite(n) || n < 1) {
        return '—'
    }
    const h = Math.floor(n / 60)
    const m = n % 60
    if (h > 0 && m > 0) {
        return t('hm', { h, m })
    }
    if (h > 0) {
        return t('h', { h })
    }
    return t('m', { m })
}

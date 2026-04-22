/**
 * Длительность для подписей в формах бронирования (часы и минуты).
 * @param {number|string|null|undefined} minutes
 * @param {(key: string, values?: Record<string, number>) => string} t `useTranslations('business.schedule.bookingDuration')`
 */
export function formatBookingDurationMinutes(minutes, t) {
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

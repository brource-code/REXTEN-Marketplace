import { formatDurationMinutesI18n } from '@/utils/formatDurationMinutesI18n'

/**
 * Длительность для подписей в формах бронирования (часы и минуты).
 * @param {number|string|null|undefined} minutes
 * @param {(key: string, values?: Record<string, number>) => string} t `useTranslations('common.durationMinutes')`
 */
export function formatBookingDurationMinutes(minutes, t) {
    return formatDurationMinutesI18n(minutes, t)
}

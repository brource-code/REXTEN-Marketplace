/** Варианты длительности в формах: каждые 15 минут до 5 ч включительно (15 … 300). */
export const BOOKING_DURATION_OPTIONS_MINUTES = Array.from({ length: 20 }, (_, i) => (i + 1) * 15)

/** Ближайшее значение из сетки 15…300 (для начального значения из API/услуги). */
export function snapDurationToBookingPresetMinutes(minutes) {
    const n = Math.round(Number(minutes))
    if (!Number.isFinite(n) || n < 1) {
        return 60
    }
    const clamped = Math.min(300, Math.max(15, n))
    const snapped = Math.round(clamped / 15) * 15
    return Math.min(300, Math.max(15, snapped))
}

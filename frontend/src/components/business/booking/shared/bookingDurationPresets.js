/** Максимум длительности в формах услуг / брони (12 ч), сетка по 15 минут. */
export const BOOKING_DURATION_MAX_MINUTES = 12 * 60

/** Варианты длительности: каждые 15 минут от 15 мин до 12 ч включительно (15 … 720). */
export const BOOKING_DURATION_OPTIONS_MINUTES = Array.from(
    { length: BOOKING_DURATION_MAX_MINUTES / 15 },
    (_, i) => (i + 1) * 15,
)

/** Ближайшее значение из сетки 15…720 (для начального значения из API/услуги). */
export function snapDurationToBookingPresetMinutes(minutes) {
    const n = Math.round(Number(minutes))
    if (!Number.isFinite(n) || n < 1) {
        return 60
    }
    const max = BOOKING_DURATION_MAX_MINUTES
    const clamped = Math.min(max, Math.max(15, n))
    const snapped = Math.round(clamped / 15) * 15
    return Math.min(max, Math.max(15, snapped))
}

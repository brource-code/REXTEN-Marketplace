/** Статутные мили (США): отображение расстояний в UI маршрутов. */
export const METERS_PER_MILE = 1609.344

export function metersToMiles(meters) {
    if (meters == null || Number.isNaN(Number(meters))) {
        return null
    }
    return Number(meters) / METERS_PER_MILE
}

/** Одна цифра после запятой для основных блоков (как раньше для км). */
export function formatMilesOneDecimalFromMeters(meters) {
    if (meters == null) return null
    const mi = metersToMiles(meters)
    return mi.toFixed(1)
}

/** Backend preview отдаёт total_distance_km — перевод в мили. */
export function formatMilesOneDecimalFromKm(km) {
    if (km == null || Number.isNaN(Number(km))) {
        return '0.0'
    }
    const meters = Number(km) * 1000
    return formatMilesOneDecimalFromMeters(meters) ?? '0.0'
}

/** Дельта экономии в милях. */
export function formatMilesDeltaFromMeters(metersAbs) {
    const m = Number(metersAbs)
    if (Number.isNaN(m) || m === 0) {
        return '0.00'
    }
    const mi = m / METERS_PER_MILE
    return mi.toFixed(2)
}

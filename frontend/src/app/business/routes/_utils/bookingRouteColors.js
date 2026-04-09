/**
 * Различимые цвета для визитов на карте и в хронологии (светлая/тёмная тема — контрастные HEX).
 * Индекс 0 = первый визит по порядку маршрута.
 */
export const BOOKING_ROUTE_PALETTE = [
    '#2563eb', // blue-600
    '#16a34a', // green-600
    '#c026d3', // fuchsia-600
    '#ea580c', // orange-600
    '#0891b2', // cyan-600
    '#9333ea', // purple-600
    '#ca8a04', // yellow-600
    '#db2777', // pink-600
    '#4f46e5', // indigo-600
    '#0d9488', // teal-600
]

/**
 * @param {number} visitIndexZeroBased индекс визита 0..n-1
 * @returns {string} #RRGGBB
 */
export function getVisitColorHex(visitIndexZeroBased) {
    const i = Math.max(0, Math.floor(visitIndexZeroBased))
    return BOOKING_ROUTE_PALETTE[i % BOOKING_ROUTE_PALETTE.length]
}

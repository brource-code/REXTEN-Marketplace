/**
 * Извлекает текст ошибки из ответа Laravel API (axios).
 * @param {unknown} error
 * @param {string} fallback
 * @returns {string}
 */
export function getLaravelApiErrorMessage(error, fallback) {
    const d = error?.response?.data
    if (typeof d?.message === 'string' && d.message) {
        return d.message
    }
    if (d?.errors && typeof d.errors === 'object') {
        const first = Object.values(d.errors).flat()[0]
        if (typeof first === 'string') {
            return first
        }
    }
    return fallback
}

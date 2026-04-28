/**
 * Сегмент штата в URL → двухбуквенный код (CA).
 * @param {string} param
 */
export function normalizeUsStateCode(param) {
    const s = String(param || '')
        .trim()
        .toUpperCase()
    return s.length === 2 ? s : null
}

/**
 * slug города из URL → строка для фильтра API (Los Angeles).
 * @param {string} slug
 */
export function citySlugToSearchLabel(slug) {
    if (!slug || typeof slug !== 'string') return ''
    return slug
        .split('-')
        .filter(Boolean)
        .map((part) =>
            part.length ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '',
        )
        .join(' ')
}

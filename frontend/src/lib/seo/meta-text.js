/**
 * Truncate meta description without breaking mid-word when possible.
 */
export function truncateMetaDescription(text, maxLen = 160) {
    if (!text || typeof text !== 'string') return ''
    const t = text.replace(/\s+/g, ' ').trim()
    if (t.length <= maxLen) return t
    const slice = t.slice(0, maxLen - 1)
    const lastSpace = slice.lastIndexOf(' ')
    if (lastSpace > 40) return `${slice.slice(0, lastSpace)}…`
    return `${slice}…`
}

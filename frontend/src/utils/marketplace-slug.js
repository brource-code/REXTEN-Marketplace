/**
 * Нормализация сегмента URL для /marketplace/[slug] (Next params, ссылки из path).
 */
export function normalizeMarketplaceRouteSlug(raw) {
    if (raw == null) return ''
    const first = Array.isArray(raw) ? raw[0] : raw
    let s = typeof first === 'string' ? first : String(first)
    s = s.trim()
    if (!s) return ''
    s = s.replace(/^\/marketplace\//i, '').replace(/^marketplace\//i, '').replace(/^\/+/, '')
    try {
        s = decodeURIComponent(s)
    } catch {
        /* оставляем как есть */
    }
    return s.trim()
}

/** Сравнение slug из URL и серверного пропа (кодирование, префиксы). */
export function marketplaceSlugsMatch(a, b) {
    if (a == null || b == null) return false
    return normalizeMarketplaceRouteSlug(a) === normalizeMarketplaceRouteSlug(b)
}

import { absoluteUrl } from './site-url'

/**
 * Normalize image URL for og:image / JSON-LD (absolute https).
 */
export function normalizeSeoImageUrl(pathOrUrl) {
    if (!pathOrUrl || typeof pathOrUrl !== 'string') return null
    const t = pathOrUrl.trim()
    if (!t) return null
    if (/^https?:\/\//i.test(t)) return t
    return absoluteUrl(t.startsWith('/') ? t : `/${t}`)
}

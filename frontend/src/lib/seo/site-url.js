/**
 * Canonical origin for SEO (metadataBase, Open Graph, sitemap).
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://rexten.live).
 */
export function getSiteUrl() {
    const raw =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_CANONICAL_ORIGIN ||
        'https://rexten.live'
    return raw.replace(/\/+$/, '')
}

/**
 * Absolute URL for a path starting with / or full URL passthrough.
 */
export function absoluteUrl(pathOrUrl) {
    if (!pathOrUrl) return getSiteUrl()
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
    const base = getSiteUrl()
    const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
    return `${base}${path}`
}

/**
 * Canonical path for the current site (no query string).
 */
export function buildCanonicalPath(pathname) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    let p = pathname || '/'
    if (basePath && p.startsWith(basePath)) {
        p = p.slice(basePath.length) || '/'
    }
    if (!p.startsWith('/')) p = `/${p}`
    return p
}

/**
 * Full canonical URL for metadata.alternates.canonical
 */
export function buildCanonicalUrl(pathname) {
    return absoluteUrl(buildCanonicalPath(pathname))
}

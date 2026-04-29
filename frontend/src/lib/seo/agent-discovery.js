import { getSiteUrl } from '@/lib/seo/site-url'

function withBasePathPrefix() {
    const bp = process.env.NEXT_PUBLIC_BASE_PATH || ''
    if (!bp) return ''
    return bp.startsWith('/') ? bp : `/${bp}`
}

/**
 * Абсолютный URL публичного сайта (маркетинг / Next), с учётом basePath.
 */
export function absolutePublicUrl(path) {
    const base = getSiteUrl().replace(/\/+$/, '')
    const prefix = withBasePathPrefix()
    const p = path.startsWith('/') ? path : `/${path}`
    return `${base}${prefix}${p}`
}

/**
 * Якорь публичного HTTP API (Laravel). Для linkset и OpenAPI `servers.url`.
 */
export function getPublicApiAnchorUrl() {
    const raw = process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_API_URL || ''
    const trimmed = String(raw).trim().replace(/\/+$/, '')
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return 'https://api.rexten.live/api'
}

/**
 * Одна строка заголовка Link (RFC 8288): несколько связей через запятую.
 */
export function getAgentDiscoveryLinkHeaderValue() {
    return [
        `<${absolutePublicUrl('/.well-known/api-catalog')}>; rel="api-catalog"; type="application/linkset+json"`,
        `<${absolutePublicUrl('/.well-known/openapi.json')}>; rel="service-desc"; type="application/vnd.oai.openapi+json"`,
        `<${absolutePublicUrl('/llms.txt')}>; rel="service-doc"; type="text/plain"`,
        `<${absolutePublicUrl('/sitemap.xml')}>; rel="describedby"; type="application/xml"`,
    ].join(', ')
}

const RFC9727_PROFILE = 'https://www.rfc-editor.org/info/rfc9727'

export function getApiCatalogContentType() {
    return `application/linkset+json; profile="${RFC9727_PROFILE}"`
}

/**
 * Тело RFC 9727 (формат linkset из RFC 9264, пример Appendix A.1).
 */
export function buildApiCatalogLinkset() {
    const anchor = getPublicApiAnchorUrl()
    return {
        linkset: [
            {
                anchor,
                'service-desc': [
                    {
                        href: absolutePublicUrl('/.well-known/openapi.json'),
                        type: 'application/openapi+json',
                    },
                ],
                'service-doc': [
                    {
                        href: absolutePublicUrl('/llms.txt'),
                        type: 'text/plain',
                    },
                ],
            },
        ],
    }
}

export function getApiCatalogHeadLinkHeader() {
    const openapi = absolutePublicUrl('/.well-known/openapi.json')
    return `<${openapi}>; rel="service-desc"; type="application/openapi+json"`
}

import { getServerLaravelApiBaseUrls } from '@/lib/seo/server-api'
import { normalizeMarketplaceRouteSlug } from '@/utils/marketplace-slug'

/**
 * Серверный fetch профиля объявления/услуги для SEO и SSR без browser getLaravelApiUrl.
 * Перебирает базовые URL (Docker internal → NEXT_PUBLIC → localhost), чтобы SSR не давал 404,
 * когда первый endpoint недоступен из контейнера Next.
 */
export async function getServiceProfileServer(slug: string): Promise<unknown | null> {
    const clean = normalizeMarketplaceRouteSlug(slug)
    if (!clean) return null
    for (const api of getServerLaravelApiBaseUrls()) {
        try {
            const url = `${api}/marketplace/services/${encodeURIComponent(clean)}/profile`
            const res = await fetch(url, {
                cache: 'no-store',
                headers: { Accept: 'application/json' },
            })
            if (!res.ok) continue
            return await res.json()
        } catch {
            /* пробуем следующий базовый URL */
        }
    }
    return null
}

export async function getCompanyProfileServer(slug: string): Promise<unknown | null> {
    const clean = normalizeMarketplaceRouteSlug(slug)
    if (!clean) return null
    for (const api of getServerLaravelApiBaseUrls()) {
        try {
            const url = `${api}/marketplace/company/${encodeURIComponent(clean)}`
            const res = await fetch(url, {
                cache: 'no-store',
                headers: { Accept: 'application/json' },
            })
            if (!res.ok) continue
            return await res.json()
        } catch {
            /* пробуем следующий базовый URL */
        }
    }
    return null
}

import { getServerLaravelApiBaseUrls } from '@/lib/seo/server-api'

/**
 * GET JSON с Laravel API при SSR/sitemap: перебирает INTERNAL → NEXT_PUBLIC → localhost.
 */
export async function fetchLaravelPublicJson(pathSuffix, init = {}) {
    const path = pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`
    const merged = {
        headers: { Accept: 'application/json', ...init.headers },
        ...init,
    }
    for (const api of getServerLaravelApiBaseUrls()) {
        try {
            const res = await fetch(`${api}${path}`, merged)
            if (res.ok) {
                return await res.json()
            }
        } catch {
            /* следующий базовый URL */
        }
    }
    return null
}

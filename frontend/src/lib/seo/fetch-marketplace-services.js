import { fetchLaravelPublicJson } from '@/lib/seo/laravel-fetch'

/**
 * @param {{ category?: string; state?: string; city?: string }} filters
 */
export async function fetchMarketplaceServicesServer(filters = {}) {
    const qs = new URLSearchParams()
    if (filters.category) qs.set('category', filters.category)
    if (filters.state) qs.set('state', filters.state)
    if (filters.city) qs.set('city', filters.city)
    const suffix =
        qs.toString().length > 0
            ? `/marketplace/services?${qs.toString()}`
            : '/marketplace/services'
    const data = await fetchLaravelPublicJson(suffix, {
        next: { revalidate: 300 },
    })
    return Array.isArray(data) ? data : []
}

export async function fetchCategoriesServer() {
    const data = await fetchLaravelPublicJson('/marketplace/categories', {
        next: { revalidate: 3600 },
    })
    return Array.isArray(data) ? data : []
}

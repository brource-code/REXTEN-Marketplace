import { getSiteUrl } from '@/lib/seo/site-url'
import { fetchLaravelPublicJson } from '@/lib/seo/laravel-fetch'

function withBasePath(path) {
    const bp = process.env.NEXT_PUBLIC_BASE_PATH || ''
    const p = path.startsWith('/') ? path : `/${path}`
    return bp ? `${bp}${p}` : p
}

function entry(path, opts = {}) {
    const base = getSiteUrl().replace(/\/$/, '')
    const url = `${base}${withBasePath(path)}`
    return {
        url,
        lastModified: opts.lastModified ?? new Date(),
        changeFrequency: opts.changeFrequency ?? 'weekly',
        priority: opts.priority ?? 0.7,
    }
}

async function fetchSeoJson(path) {
    return fetchLaravelPublicJson(path, {
        next: { revalidate: 3600 },
    })
}

/** @returns {import('next').MetadataRoute.Sitemap} */
export default async function sitemap() {
    const staticPaths = [
        { path: '/services', priority: 1, changeFrequency: 'daily' },
        { path: '/for-business', priority: 0.95, changeFrequency: 'weekly' },
        { path: '/privacy', priority: 0.5, changeFrequency: 'monthly' },
        { path: '/terms', priority: 0.5, changeFrequency: 'monthly' },
        { path: '/cookies', priority: 0.5, changeFrequency: 'monthly' },
        { path: '/marketplace-terms', priority: 0.5, changeFrequency: 'monthly' },
    ]

    const items = staticPaths.map(({ path, priority, changeFrequency }) =>
        entry(path, { priority, changeFrequency }),
    )

    const listingsData = await fetchSeoJson('/seo/marketplace-listings')
    if (listingsData?.listings?.length) {
        for (const row of listingsData.listings) {
            if (!row.slug) continue
            const lm = row.updated_at ? new Date(row.updated_at) : new Date()
            items.push(
                entry(`/marketplace/${encodeURIComponent(row.slug)}`, {
                    priority: 0.85,
                    changeFrequency: 'weekly',
                    lastModified: lm,
                }),
            )
        }
    }

    const companiesData = await fetchSeoJson('/seo/companies')
    if (companiesData?.companies?.length) {
        for (const row of companiesData.companies) {
            if (!row.slug) continue
            const lm = row.updated_at ? new Date(row.updated_at) : new Date()
            items.push(
                entry(`/marketplace/company/${encodeURIComponent(row.slug)}`, {
                    priority: 0.85,
                    changeFrequency: 'weekly',
                    lastModified: lm,
                }),
            )
        }
    }

    const landingPaths = await fetchSeoJson('/seo/landing-paths')
    if (landingPaths?.paths?.length) {
        for (const row of landingPaths.paths) {
            if (!row.path) continue
            const lm = row.updated_at ? new Date(row.updated_at) : new Date()
            items.push(
                entry(row.path, {
                    priority: 0.72,
                    changeFrequency: 'weekly',
                    lastModified: lm,
                }),
            )
        }
    }

    return items
}

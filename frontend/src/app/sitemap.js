import { getSiteUrl } from '@/lib/seo/site-url'
import { fetchLaravelPublicJson } from '@/lib/seo/laravel-fetch'

function withBasePath(path) {
    const bp = process.env.NEXT_PUBLIC_BASE_PATH || ''
    const p = path.startsWith('/') ? path : `/${path}`
    return bp ? `${bp}${p}` : p
}

/** Invalid Date ломает генерацию sitemap.xml (500) в части окружений. */
function safeLastModified(isoOrDate) {
    if (isoOrDate instanceof Date) {
        return Number.isNaN(isoOrDate.getTime()) ? new Date() : isoOrDate
    }
    if (isoOrDate == null || isoOrDate === '') return new Date()
    const d = new Date(isoOrDate)
    return Number.isNaN(d.getTime()) ? new Date() : d
}

function normalizeSeoPath(raw) {
    if (raw == null) return ''
    let p = String(raw).trim().replace(/\\/g, '/')
    if (!p.startsWith('/')) p = `/${p}`
    return p
}

function entry(path, opts = {}) {
    const base = getSiteUrl().replace(/\/$/, '')
    const url = `${base}${withBasePath(path)}`
    return {
        url,
        lastModified: safeLastModified(opts.lastModified),
        changeFrequency: opts.changeFrequency ?? 'weekly',
        priority: opts.priority ?? 0.7,
    }
}

async function fetchSeoJson(path) {
    // Без next.revalidate: кэш RSC для sitemap в проде иногда даёт сбой/пустой контекст;
    // sitemap и так лёгкий, держим no-store.
    return fetchLaravelPublicJson(path, { cache: 'no-store' })
}

function dedupeSitemapEntries(items) {
    const byUrl = new Map()
    for (const row of items) {
        if (!row?.url) continue
        const prev = byUrl.get(row.url)
        if (!prev) {
            byUrl.set(row.url, row)
            continue
        }
        const prevT = safeLastModified(prev.lastModified).getTime()
        const nextT = safeLastModified(row.lastModified).getTime()
        if (nextT >= prevT) byUrl.set(row.url, row)
    }
    return [...byUrl.values()]
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

    try {
        const items = staticPaths.map(({ path, priority, changeFrequency }) =>
            entry(path, { priority, changeFrequency }),
        )

        const listingsData = await fetchSeoJson('/seo/marketplace-listings')
        if (listingsData?.listings?.length) {
            for (const row of listingsData.listings) {
                if (!row.slug) continue
                const lm = safeLastModified(row.updated_at)
                items.push(
                    entry(`/marketplace/${encodeURIComponent(String(row.slug))}`, {
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
                const lm = safeLastModified(row.updated_at)
                items.push(
                    entry(
                        `/marketplace/company/${encodeURIComponent(String(row.slug))}`,
                        {
                            priority: 0.85,
                            changeFrequency: 'weekly',
                            lastModified: lm,
                        },
                    ),
                )
            }
        }

        const landingPaths = await fetchSeoJson('/seo/landing-paths')
        if (landingPaths?.paths?.length) {
            for (const row of landingPaths.paths) {
                const p = normalizeSeoPath(row.path)
                if (!p || p === '/') continue
                const lm = safeLastModified(row.updated_at)
                items.push(
                    entry(p, {
                        priority: 0.72,
                        changeFrequency: 'weekly',
                        lastModified: lm,
                    }),
                )
            }
        }

        return dedupeSitemapEntries(items)
    } catch {
        return staticPaths.map(({ path, priority, changeFrequency }) =>
            entry(path, { priority, changeFrequency }),
        )
    }
}

import { notFound } from 'next/navigation'
import MarketplaceListingClient from './MarketplaceListingClient'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildCanonicalUrl, absoluteUrl, getSiteUrl } from '@/lib/seo/site-url'
import { truncateMetaDescription } from '@/lib/seo/meta-text'
import { normalizeSeoImageUrl } from '@/lib/seo/normalize-image'
import { getServiceProfileServer } from '@/lib/api/marketplace-server'
import { fetchLaravelPublicJson } from '@/lib/seo/laravel-fetch'
import { normalizeMarketplaceRouteSlug } from '@/utils/marketplace-slug'
import { absoluteBrandedTitle } from '@/lib/seo/metadata-title'

/** Не кэшировать RSC как 404 при временных сбоях SSR/API */
export const dynamic = 'force-dynamic'

/** @typedef {{ service?: Record<string, unknown> }} ServiceProfilePayload */

async function fetchCategoriesJson() {
    const data = await fetchLaravelPublicJson('/marketplace/categories', {
        next: { revalidate: 3600 },
    })
    return Array.isArray(data) ? data : []
}

function buildListingTitle(svc) {
    const name = typeof svc?.name === 'string' ? svc.name : 'Service'
    const location =
        typeof svc.location === 'string' && svc.location.trim()
            ? svc.location.trim()
            : [svc.city, svc.state].filter(Boolean).join(', ')
    if (location) return `${name} in ${location}`
    return `${name} | Book Online`
}

function buildListingDescription(svc) {
    const parts = []
    if (typeof svc.description === 'string' && svc.description.trim()) {
        parts.push(svc.description.trim())
    }
    if (typeof svc.category === 'string' && svc.category.trim()) {
        parts.push(`Category: ${svc.category.trim()}.`)
    }
    parts.push('Book online on REXTEN. Read reviews and check availability.')
    return truncateMetaDescription(parts.join(' '), 160)
}

/** @param {unknown} profile */
function listingIsPubliclyRenderable(profile) {
    const payload = /** @type {ServiceProfilePayload} */ (profile)
    const svc = payload?.service
    return Boolean(svc && typeof svc === 'object' && svc.name)
}

/** @param {unknown} profile @param {string} slug */
function buildListingStructuredData(profile, slug) {
    const payload = /** @type {ServiceProfilePayload} */ (profile)
    const svc = payload?.service ?? {}
    const canonical = absoluteUrl(`/marketplace/${slug}`)
    const siteUrl = getSiteUrl()

    const name = typeof svc.name === 'string' ? svc.name : 'Service'
    const description =
        typeof svc.description === 'string' ? svc.description : undefined
    const img = normalizeSeoImageUrl(
        typeof svc.imageUrl === 'string' ? svc.imageUrl : null,
    )

    const city = typeof svc.city === 'string' ? svc.city : ''
    const state = typeof svc.state === 'string' ? svc.state : ''
    const ratings =
        typeof svc.rating === 'number' ? svc.rating : Number(svc.rating) || undefined
    const reviewsCountRaw = svc.reviewsCount ?? svc.reviews
    const reviewsCount =
        typeof reviewsCountRaw === 'number'
            ? reviewsCountRaw
            : Number(reviewsCountRaw) || 0

    const price =
        typeof svc.priceValue === 'number'
            ? svc.priceValue
            : Number(svc.priceValue) || undefined

    const providerName =
        typeof svc.companyName === 'string' ? svc.companyName : undefined

    const breadcrumbId = `${canonical}#breadcrumb`
    const thingId = `${canonical}#listing`

    const blocks = []

    blocks.push({
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Marketplace',
                item: absoluteUrl('/services'),
            },
            {
                '@type': 'ListItem',
                position: 2,
                name,
                item: canonical,
            },
        ],
    })

    const ratingBlock =
        ratings &&
        ratings > 0 &&
        typeof reviewsCount === 'number' &&
        reviewsCount > 0
            ? {
                  '@type': 'AggregateRating',
                  ratingValue: ratings,
                  ratingCount: reviewsCount,
                  reviewCount: reviewsCount,
              }
            : undefined

    blocks.push({
        '@type': 'Service',
        '@id': thingId,
        url: canonical,
        name,
        ...(description ? { description } : {}),
        ...(img ? { image: [img] } : {}),
        ...(providerName
            ? {
                  provider: {
                      '@type': 'LocalBusiness',
                      name: providerName,
                      ...(city || state
                          ? {
                                address: {
                                    '@type': 'PostalAddress',
                                    ...(city ? { addressLocality: city } : {}),
                                    ...(state ? { addressRegion: state } : {}),
                                },
                            }
                          : {}),
                  },
              }
            : {}),
        ...(ratingBlock ? { aggregateRating: ratingBlock } : {}),
        ...(typeof price === 'number' && price >= 0
            ? {
                  offers: {
                      '@type': 'Offer',
                      priceCurrency: 'USD',
                      price,
                      url: canonical,
                      availability: 'https://schema.org/InStock',
                  },
              }
            : {}),
    })

    const graph = [...blocks]

    graph.push({
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name,
        ...(description ? { description } : {}),
        isPartOf: { '@id': `${siteUrl}/#website` },
        breadcrumb: { '@id': breadcrumbId },
        ...(img
            ? {
                  primaryImageOfPage: {
                      '@type': 'ImageObject',
                      url: img,
                  },
              }
            : {}),
        mainEntity: { '@id': thingId },
    })

    return {
        '@context': 'https://schema.org',
        '@graph': graph.filter(Boolean),
    }
}

export async function generateMetadata({ params }) {
    const raw = (await params)?.slug
    const slug = normalizeMarketplaceRouteSlug(raw)
    if (!slug) {
        return {
            title: 'Not found',
            robots: { index: false, follow: false },
        }
    }
    const profile = await getServiceProfileServer(slug)

    if (!listingIsPubliclyRenderable(profile)) {
        return {
            title: 'Not found',
            robots: { index: false, follow: false },
        }
    }

    const svc = /** @type {Record<string, unknown>} */ (
        /** @type {ServiceProfilePayload} */ (profile).service
    )
    const title = absoluteBrandedTitle(buildListingTitle(svc))
    const description = buildListingDescription(svc)

    const canonical = buildCanonicalUrl(`/marketplace/${slug}`)
    const ogImage =
        normalizeSeoImageUrl(
            typeof svc.imageUrl === 'string' ? svc.imageUrl : null,
        ) || `${getSiteUrl().replace(/\/$/, '')}/icon.svg`

    const titleText = title.absolute
    return {
        title,
        description,
        alternates: {
            canonical,
        },
        openGraph: {
            title: titleText,
            description,
            url: canonical,
            siteName: 'REXTEN',
            type: 'website',
            images: [{ url: ogImage, width: 1200, height: 630 }],
        },
        twitter: {
            card: 'summary_large_image',
            title: titleText,
            description,
            images: [ogImage],
        },
        robots: {
            index: true,
            follow: true,
        },
    }
}

export default async function MarketplaceListingPage({ params }) {
    const raw = (await params)?.slug
    const slug = normalizeMarketplaceRouteSlug(raw)
    if (!slug) {
        notFound()
    }

    const [profile, initialCategories] = await Promise.all([
        getServiceProfileServer(slug),
        fetchCategoriesJson(),
    ])

    if (!listingIsPubliclyRenderable(profile)) {
        notFound()
    }

    const structuredData = buildListingStructuredData(profile, slug)

    return (
        <>
            <JsonLd data={structuredData} />
            <MarketplaceListingClient
                initialProfile={profile}
                initialSlug={slug}
                initialCategories={initialCategories}
            />
        </>
    )
}

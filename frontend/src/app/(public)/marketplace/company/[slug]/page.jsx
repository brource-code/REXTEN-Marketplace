import { notFound } from 'next/navigation'
import CompanyProfileClient from './CompanyProfileClient'
import { JsonLd } from '@/components/seo/JsonLd'
import {
    absoluteUrl,
    buildCanonicalUrl,
    getSiteUrl,
} from '@/lib/seo/site-url'
import { truncateMetaDescription } from '@/lib/seo/meta-text'
import { normalizeSeoImageUrl } from '@/lib/seo/normalize-image'
import { getCompanyProfileServer } from '@/lib/api/marketplace-server'
import { normalizeMarketplaceRouteSlug } from '@/utils/marketplace-slug'
import { absoluteBrandedTitle } from '@/lib/seo/metadata-title'

/** Не кэшировать RSC как 404 при временных сбоях SSR/API */
export const dynamic = 'force-dynamic'

function companyProfileOk(payload) {
    return Boolean(payload?.company?.name)
}

function buildCompanyTitle(company) {
    const seo = typeof company.seo_title === 'string' ? company.seo_title.trim() : ''
    if (seo) return seo
    const name = typeof company.name === 'string' ? company.name : 'Business'
    const loc =
        typeof company.location === 'string' && company.location.trim()
            ? company.location.trim()
            : [company.city, company.state].filter(Boolean).join(', ')
    if (loc) return `${name} | Services in ${loc}`
    return name
}

function buildCompanyDescription(company) {
    const seo =
        typeof company.seo_description === 'string'
            ? company.seo_description.trim()
            : ''
    if (seo) return truncateMetaDescription(seo, 160)
    const desc =
        typeof company.description === 'string' ? company.description.trim() : ''
    const loc =
        typeof company.location === 'string' ? company.location.trim() : ''
    const parts = []
    if (desc) parts.push(desc)
    if (loc) parts.push(`Located in ${loc}.`)
    parts.push('Browse services and book on REXTEN.')
    return truncateMetaDescription(parts.join(' '), 160)
}

function buildCompanyStructuredData(profile, slug) {
    const company = profile.company ?? {}
    const advertisements = Array.isArray(profile.advertisements)
        ? profile.advertisements
        : []
    const canonical = absoluteUrl(`/marketplace/company/${slug}`)
    const siteUrl = getSiteUrl()

    const name = typeof company.name === 'string' ? company.name : 'Business'
    const description =
        typeof company.description === 'string' ? company.description : undefined
    const phone = typeof company.phone === 'string' ? company.phone : undefined
    const city = typeof company.city === 'string' ? company.city : ''
    const state = typeof company.state === 'string' ? company.state : ''

    const logo = normalizeSeoImageUrl(
        typeof company.logo === 'string' ? company.logo : null,
    )
    const rating =
        typeof company.rating === 'number'
            ? company.rating
            : Number(company.rating) || 0
    const reviewsCount =
        typeof company.reviewsCount === 'number'
            ? company.reviewsCount
            : Number(company.reviewsCount) || 0

    const breadcrumbId = `${canonical}#breadcrumb`
    const businessId = `${canonical}#localbusiness`

    const aggregateRating =
        rating > 0 && reviewsCount > 0
            ? {
                  '@type': 'AggregateRating',
                  ratingValue: rating,
                  ratingCount: reviewsCount,
                  reviewCount: reviewsCount,
              }
            : undefined

    const itemListElements = advertisements.slice(0, 24).map((ad, i) => {
        const path = typeof ad.path === 'string' ? ad.path : ''
        const itemUrl = path.startsWith('http')
            ? path
            : absoluteUrl(path.startsWith('/') ? path : `/marketplace/${path}`)
        return {
            '@type': 'ListItem',
            position: i + 1,
            name: typeof ad.name === 'string' ? ad.name : `Service ${i + 1}`,
            url: itemUrl,
        }
    })

    const graph = [
        {
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
        },
        {
            '@type': 'LocalBusiness',
            '@id': businessId,
            name,
            url: canonical,
            ...(description ? { description } : {}),
            ...(logo ? { image: [logo] } : {}),
            ...(phone ? { telephone: phone } : {}),
            ...(city || state
                ? {
                      address: {
                          '@type': 'PostalAddress',
                          ...(city ? { addressLocality: city } : {}),
                          ...(state ? { addressRegion: state } : {}),
                          addressCountry: 'US',
                      },
                  }
                : {}),
            ...(aggregateRating ? { aggregateRating } : {}),
        },
    ]

    if (itemListElements.length > 0) {
        graph.push({
            '@type': 'ItemList',
            '@id': `${canonical}#offerings`,
            name: `${name} — listings`,
            numberOfItems: itemListElements.length,
            itemListElement: itemListElements,
        })
    }

    graph.push({
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name,
        ...(description ? { description } : {}),
        isPartOf: { '@id': `${siteUrl}/#website` },
        breadcrumb: { '@id': breadcrumbId },
        mainEntity: { '@id': businessId },
    })

    return {
        '@context': 'https://schema.org',
        '@graph': graph,
    }
}

export async function generateMetadata({ params }) {
    const slug = normalizeMarketplaceRouteSlug((await params)?.slug)
    if (!slug) {
        return {
            title: 'Not found',
            robots: { index: false, follow: false },
        }
    }
    const profile = await getCompanyProfileServer(slug)

    if (!companyProfileOk(profile)) {
        return {
            title: 'Not found',
            robots: { index: false, follow: false },
        }
    }

    const company = profile.company
    const title = absoluteBrandedTitle(buildCompanyTitle(company))
    const description = buildCompanyDescription(company)
    const canonical = buildCanonicalUrl(`/marketplace/company/${slug}`)

    const ogImage =
        normalizeSeoImageUrl(
            typeof company.logo === 'string' ? company.logo : null,
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

export default async function CompanyProfilePage({ params }) {
    const slug = normalizeMarketplaceRouteSlug((await params)?.slug)
    if (!slug) {
        notFound()
    }
    const profile = await getCompanyProfileServer(slug)

    if (!companyProfileOk(profile)) {
        notFound()
    }

    const structuredData = buildCompanyStructuredData(profile, slug)

    return (
        <>
            <JsonLd data={structuredData} />
            <CompanyProfileClient
                initialProfile={profile}
                initialSlug={slug}
            />
        </>
    )
}

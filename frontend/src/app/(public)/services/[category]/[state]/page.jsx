import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import ServicesSeoLandingClient from '@/components/seo/ServicesSeoLandingClient'
import {
    fetchCategoriesServer,
    fetchMarketplaceServicesServer,
} from '@/lib/seo/fetch-marketplace-services'
import { JsonLd } from '@/components/seo/JsonLd'
import {
    absoluteUrl,
    buildCanonicalUrl,
    getSiteUrl,
} from '@/lib/seo/site-url'
import { truncateMetaDescription } from '@/lib/seo/meta-text'
import { absoluteDocumentTitle } from '@/lib/seo/metadata-title'
import { US_STATES } from '@/constants/us-locations.constant'
import { normalizeUsStateCode } from '@/utils/seo-location-slugs'

function buildStateFaqJsonLd(t, stateName) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: t('faqStateQ1', { state: stateName }),
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: t('faqStateA1'),
                },
            },
            {
                '@type': 'Question',
                name: t('faqCategoryQ1'),
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: t('faqCategoryA1'),
                },
            },
            {
                '@type': 'Question',
                name: t('faqCategoryQ2'),
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: t('faqCategoryA2'),
                },
            },
        ],
    }
}

export async function generateMetadata({ params }) {
    const { category: categoryParam, state: stateParam } = await params
    const slug = decodeURIComponent(String(categoryParam || ''))
    const stateCode = normalizeUsStateCode(String(stateParam || ''))
    const categories = await fetchCategoriesServer()
    const cat = categories.find((c) => String(c.slug) === slug)
    const stateRow = stateCode
        ? US_STATES.find((s) => s.id === stateCode)
        : null
    if (!cat || !stateCode || !stateRow) {
        return { title: 'Not found', robots: { index: false, follow: false } }
    }
    const t = await getTranslations('public.seoLanding')
    const name = String(cat.name || cat.slug || slug)
    const title = absoluteDocumentTitle(
        t('stateTitle', {
            category: name,
            state: stateRow.name,
        }),
    )
    const description = truncateMetaDescription(
        t('stateDescription', {
            category: name,
            state: stateRow.name,
        }),
        160,
    )
    const canonical = buildCanonicalUrl(
        `/services/${encodeURIComponent(slug)}/${encodeURIComponent(stateCode)}`,
    )
    const ogImage = `${getSiteUrl().replace(/\/$/, '')}/icon.svg`
    const titleText = title.absolute

    return {
        title,
        description,
        alternates: { canonical },
        openGraph: {
            title: titleText,
            description,
            url: canonical,
            siteName: 'REXTEN',
            type: 'website',
            images: [{ url: ogImage }],
        },
        twitter: {
            card: 'summary_large_image',
            title: titleText,
            description,
            images: [ogImage],
        },
        robots: { index: true, follow: true },
    }
}

export default async function CategoryStateSeoPage({ params }) {
    const { category: categoryParam, state: stateParam } = await params
    const slug = decodeURIComponent(String(categoryParam || ''))
    const stateCode = normalizeUsStateCode(String(stateParam || ''))
    const categories = await fetchCategoriesServer()
    const cat = categories.find((c) => String(c.slug) === slug)
    const stateRow = stateCode
        ? US_STATES.find((s) => s.id === stateCode)
        : null
    if (!cat || !stateCode || !stateRow) notFound()

    const services = await fetchMarketplaceServicesServer({
        category: slug,
        state: stateCode,
    })
    if (!services.length) notFound()

    const t = await getTranslations('public.seoLanding')
    const name = String(cat.name || slug)
    const canonical = absoluteUrl(
        `/services/${encodeURIComponent(slug)}/${encodeURIComponent(stateCode)}`,
    )

    const collectionLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: t('stateHeading', {
            category: name,
            state: stateRow.name,
        }),
        url: canonical,
        isPartOf: { '@id': `${getSiteUrl()}/#website` },
    }

    const itemListElements = services.slice(0, 36).map((s, i) => {
        const path = typeof s.path === 'string' && s.path.startsWith('/')
            ? s.path
            : `/marketplace/${s.path || ''}`
        return {
            '@type': 'ListItem',
            position: i + 1,
            name: typeof s.name === 'string' ? s.name : `Listing ${i + 1}`,
            url: absoluteUrl(path),
        }
    })

    const itemListLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        numberOfItems: itemListElements.length,
        itemListElement: itemListElements,
    }

    return (
        <>
            <JsonLd data={buildStateFaqJsonLd(t, stateRow.name)} />
            <JsonLd data={collectionLd} />
            <JsonLd data={itemListLd} />
            <ServicesSeoLandingClient
                level="state"
                categorySlug={slug}
                categoryLabel={name}
                stateCode={stateCode}
                stateName={stateRow.name}
                services={services}
            />
        </>
    )
}

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

function buildCategoryFaqJsonLd(t) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
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
            {
                '@type': 'Question',
                name: t('faqCategoryQ3'),
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: t('faqCategoryA3'),
                },
            },
        ],
    }
}

export async function generateMetadata({ params }) {
    const { category: categoryParam } = await params
    const slug = decodeURIComponent(String(categoryParam || ''))
    const categories = await fetchCategoriesServer()
    const cat = categories.find((c) => String(c.slug) === slug)
    if (!cat) {
        return { title: 'Not found', robots: { index: false, follow: false } }
    }
    const t = await getTranslations('public.seoLanding')
    const name = String(cat.name || cat.slug || slug)
    const title = t('categoryTitle', { category: name })
    const description = truncateMetaDescription(
        t('categoryDescription', { category: name }),
        160,
    )
    const canonical = buildCanonicalUrl(`/services/${encodeURIComponent(slug)}`)
    const ogImage = `${getSiteUrl().replace(/\/$/, '')}/icon.svg`

    return {
        title,
        description,
        alternates: { canonical },
        openGraph: {
            title,
            description,
            url: canonical,
            siteName: 'REXTEN',
            type: 'website',
            images: [{ url: ogImage }],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImage],
        },
        robots: { index: true, follow: true },
    }
}

export default async function CategorySeoPage({ params }) {
    const { category: categoryParam } = await params
    const slug = decodeURIComponent(String(categoryParam || ''))
    const categories = await fetchCategoriesServer()
    const cat = categories.find((c) => String(c.slug) === slug)
    if (!cat) notFound()

    const services = await fetchMarketplaceServicesServer({ category: slug })
    if (!services.length) notFound()

    const t = await getTranslations('public.seoLanding')
    const name = String(cat.name || slug)
    const canonical = absoluteUrl(`/services/${encodeURIComponent(slug)}`)

    const collectionLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: t('categoryHeading', { category: name }),
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
            <JsonLd data={buildCategoryFaqJsonLd(t)} />
            <JsonLd data={collectionLd} />
            <JsonLd data={itemListLd} />
            <ServicesSeoLandingClient
                level="category"
                categorySlug={slug}
                categoryLabel={name}
                services={services}
            />
        </>
    )
}

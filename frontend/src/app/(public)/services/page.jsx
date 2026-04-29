import ServicesPageClient from './ServicesPageClient'
import ServicesCatalogSsr from '@/components/seo/ServicesCatalogSsr'
import { getTranslations } from 'next-intl/server'
import { getSiteUrl, buildCanonicalUrl, absoluteUrl } from '@/lib/seo/site-url'
import { fetchLaravelPublicJson } from '@/lib/seo/laravel-fetch'
import { JsonLd } from '@/components/seo/JsonLd'
import { absoluteBrandedTitle } from '@/lib/seo/metadata-title'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
    const t = await getTranslations('public.services')
    const title = absoluteBrandedTitle(t('seoTitle'))
    const description = t('seoDescription')
    const canonical = buildCanonicalUrl('/services')
    const ogImage = `${getSiteUrl().replace(/\/$/, '')}/icon.svg`
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
            images: [{ url: ogImage, width: 512, height: 512 }],
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

export default async function ServicesCatalogPage() {
    const [categoriesRaw, statesRaw, servicesRaw, featuredRaw] = await Promise.all([
        fetchLaravelPublicJson('/marketplace/categories'),
        fetchLaravelPublicJson('/marketplace/states'),
        fetchLaravelPublicJson('/marketplace/services'),
        fetchLaravelPublicJson('/advertisements/featured?limit=3&placement=services'),
    ])

    const categories = Array.isArray(categoriesRaw) ? categoriesRaw : []
    const states = Array.isArray(statesRaw) ? statesRaw : []
    const services = Array.isArray(servicesRaw) ? servicesRaw : []
    const featured = Array.isArray(featuredRaw) ? featuredRaw : []

    const siteUrl = getSiteUrl()
    const servicesUrl = absoluteUrl('/services')

    const itemListElements = services.slice(0, 36).map((s, i) => {
        const path =
            typeof s.path === 'string' && s.path.startsWith('/')
                ? s.path
                : `/marketplace/${encodeURIComponent(String(s.slug ?? s.id ?? i))}`
        return {
            '@type': 'ListItem',
            position: i + 1,
            url: absoluteUrl(path),
            name: typeof s.name === 'string' ? s.name : 'Service',
        }
    })

    const structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite',
                '@id': `${siteUrl}/#website`,
                url: absoluteUrl('/'),
                name: 'REXTEN',
                publisher: {
                    '@type': 'Organization',
                    name: 'REXTEN',
                    url: siteUrl,
                },
                potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                        '@type': 'EntryPoint',
                        urlTemplate: `${servicesUrl}?q={search_term_string}`,
                    },
                    'query-input': 'required name=search_term_string',
                },
            },
            {
                '@type': 'CollectionPage',
                '@id': `${servicesUrl}#collection`,
                url: servicesUrl,
                name: 'REXTEN Marketplace',
                isPartOf: { '@id': `${siteUrl}/#website` },
            },
            ...(itemListElements.length
                ? [
                      {
                          '@type': 'ItemList',
                          '@id': `${servicesUrl}#itemlist`,
                          name: 'Marketplace listings',
                          numberOfItems: itemListElements.length,
                          itemListOrder: 'https://schema.org/ItemListUnordered',
                          itemListElement: itemListElements,
                      },
                  ]
                : []),
        ],
    }

    return (
        <>
            <JsonLd data={structuredData} />
            <ServicesCatalogSsr services={services} />
            <ServicesPageClient
                initialCategories={categories.length ? categories : undefined}
                initialStates={states.length ? states : undefined}
                initialServices={services.length ? services : undefined}
                initialFeatured={featured}
            />
        </>
    )
}

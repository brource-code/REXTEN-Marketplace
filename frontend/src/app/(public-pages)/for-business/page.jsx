import Landing from '@/app/(public-pages)/landing/components/Landing'
import ForBusinessSeoIntro from '@/components/seo/ForBusinessSeoIntro'
import { getTranslations } from 'next-intl/server'
import { JsonLd } from '@/components/seo/JsonLd'
import {
    absoluteUrl,
    buildCanonicalUrl,
    getSiteUrl,
} from '@/lib/seo/site-url'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
    const t = await getTranslations('forBusiness.meta')
    const title = t('title')
    const description = t('description')
    const canonical = buildCanonicalUrl('/for-business')
    const ogImage = `${getSiteUrl().replace(/\/$/, '')}/icon.svg`

    return {
        title,
        description,
        alternates: {
            canonical,
        },
        openGraph: {
            title,
            description,
            url: canonical,
            siteName: 'REXTEN',
            type: 'website',
            images: [{ url: ogImage, width: 512, height: 512 }],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImage],
        },
        robots: {
            index: true,
            follow: true,
        },
    }
}

export default async function ForBusinessPage() {
    const siteUrl = getSiteUrl()
    const pageUrl = absoluteUrl('/for-business')

    const structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': `${siteUrl}/#organization`,
                name: 'REXTEN',
                url: siteUrl,
            },
            {
                '@type': 'WebSite',
                '@id': `${siteUrl}/#website`,
                url: siteUrl,
                name: 'REXTEN',
                publisher: { '@id': `${siteUrl}/#organization` },
                potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                        '@type': 'EntryPoint',
                        urlTemplate: `${absoluteUrl('/services')}?q={search_term_string}`,
                    },
                    'query-input': 'required name=search_term_string',
                },
            },
            {
                '@type': 'SoftwareApplication',
                name: 'REXTEN',
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web',
                url: pageUrl,
                publisher: { '@id': `${siteUrl}/#organization` },
            },
        ],
    }

    return (
        <>
            <JsonLd data={structuredData} />
            <ForBusinessSeoIntro />
            <Landing />
        </>
    )
}

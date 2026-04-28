/**
 * Иконки не задаём здесь: Next сам выставляет ссылки из `src/app/favicon.ico`,
 * `icon.svg`, `apple-icon.svg` (с digest в проде).
 *
 * SEO: metadataBase, Open Graph, Twitter defaults; канонический домен через NEXT_PUBLIC_SITE_URL.
 */
import { getSiteUrl } from '@/lib/seo/site-url'

const siteUrl = getSiteUrl()

const defaultTitle = 'REXTEN — Marketplace and business workspace'
const defaultDescription =
    'Browse and book services online. Businesses run schedules, CRM, routes, and reports in one workspace.'

/** Fallback OG/Twitter image (paths relative to site root; absolute after metadataBase). */
const defaultOgImagePath = '/icon.svg'

const pageMeta = {
    metadataBase: new URL(siteUrl),
    title: {
        default: defaultTitle,
        template: '%s | REXTEN',
    },
    description: defaultDescription,
    applicationName: 'REXTEN',
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: siteUrl,
        siteName: 'REXTEN',
        title: defaultTitle,
        description: defaultDescription,
        images: [
            {
                url: defaultOgImagePath,
                width: 512,
                height: 512,
                alt: 'REXTEN',
                type: 'image/svg+xml',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: defaultTitle,
        description: defaultDescription,
        images: [defaultOgImagePath],
    },
    robots: {
        index: true,
        follow: true,
    },
}

export default pageMeta

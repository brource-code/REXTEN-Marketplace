import { getSiteUrl } from '@/lib/seo/site-url'

function withBasePath(path) {
    const bp = process.env.NEXT_PUBLIC_BASE_PATH || ''
    const p = path.startsWith('/') ? path : `/${path}`
    return bp ? `${bp}${p}` : p
}

/**
 * robots.txt — публичные страницы разрешены; кабинеты и служебные маршруты закрыты.
 */
export default function robots() {
    const base = getSiteUrl()
    const disallow = [
        '/business/',
        '/client/',
        '/superadmin/',
        '/sign-in',
        '/sign-up',
        '/sign-up/',
        '/forgot-password',
        '/reset-password',
        '/verify-code',
        '/auth/',
        '/profile',
        '/profile/',
        '/orders',
        '/booking',
        '/payment-status',
        '/review/',
        '/manual-test',
        '/admin/',
        '/newlanding',
        '/protected-pages/',
        '/maintenance',
        '/access-denied',
        '/business/demo-login',
        '/auth/demo-login',
        '/babki',
    ].map(withBasePath)

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow,
            },
        ],
        sitemap: `${base.replace(/\/$/, '')}${withBasePath('/sitemap.xml')}`,
    }
}

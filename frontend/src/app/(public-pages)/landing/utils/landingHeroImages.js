import { SUPPORTED_LOCALES } from '@/constants/locale.constant'

/** Если локаль не из списка — показываем комплект `en`. */
export const LANDING_HERO_FALLBACK_LOCALE = 'en'

/** Префикс как у Next.js `basePath` — иначе `/img/...` даёт 404 при непустом NEXT_PUBLIC_BASE_PATH. */
export function getLandingPublicBasePath() {
    if (typeof process === 'undefined') {
        return ''
    }
    const raw = process.env.NEXT_PUBLIC_BASE_PATH
    if (!raw || typeof raw !== 'string') {
        return ''
    }
    return raw.replace(/\/$/, '')
}

/**
 * Код локали next-intl (`useLocale()`): en, ru, es-MX, hy-AM, uk-UA.
 * Должна существовать папка `public/img/landing/hero/<код>/`.
 */
export function resolveLandingHeroLocale(locale) {
    if (locale && SUPPORTED_LOCALES.includes(locale)) {
        return locale
    }
    return LANDING_HERO_FALLBACK_LOCALE
}

/**
 * Публичный URL картинки героя для текущей локали.
 * @param {string} locale — из useLocale()
 * @param {boolean} dark — тёмная тема
 */
export function getLandingHeroImageSrc(locale, dark) {
    const seg = resolveLandingHeroLocale(locale)
    const file = dark ? 'hero-dark.png' : 'hero.png'
    const prefix = getLandingPublicBasePath()
    return `${prefix}/img/landing/hero/${seg}/${file}`
}

/**
 * Секции лендинга: `layouts`, `features`, `tech` — файлы в `public/img/landing/<секция>/<код локали>/`.
 */
export function getLandingLayoutsSrc(locale, fileName) {
    const seg = resolveLandingHeroLocale(locale)
    const prefix = getLandingPublicBasePath()
    return `${prefix}/img/landing/layouts/${seg}/${fileName}`
}

export function getLandingFeaturesSrc(locale, fileName) {
    const seg = resolveLandingHeroLocale(locale)
    const prefix = getLandingPublicBasePath()
    return `${prefix}/img/landing/features/${seg}/${fileName}`
}

export function getLandingTechSrc(locale, stackId) {
    const seg = resolveLandingHeroLocale(locale)
    const prefix = getLandingPublicBasePath()
    return `${prefix}/img/landing/tech/${seg}/${stackId}.png`
}

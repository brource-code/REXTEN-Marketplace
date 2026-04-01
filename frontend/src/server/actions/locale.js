'use server'

import { cookies, headers } from 'next/headers'
import appConfig from '@/configs/app.config'
import { COOKIES_KEY } from '@/constants/app.constant'
import { ACCEPT_LANGUAGE_ALIASES, SUPPORTED_LOCALES } from '@/constants/locale.constant'

const COOKIE_NAME = COOKIES_KEY.LOCALE

/**
 * Парсит заголовок Accept-Language и возвращает предпочтительный язык
 * Пример: "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7" → "ru"
 */
function parseAcceptLanguage(acceptLanguage) {
    if (!acceptLanguage) return null
    
    // Парсим языки с их приоритетами
    const languages = acceptLanguage
        .split(',')
        .map(lang => {
            const [locale, q = 'q=1'] = lang.trim().split(';')
            const quality = parseFloat(q.replace('q=', '')) || 1
            // Берём только код языка (ru-RU → ru)
            const langCode = locale.split('-')[0].toLowerCase()
            return { langCode, quality }
        })
        .sort((a, b) => b.quality - a.quality)
    
    // Ищем первый поддерживаемый язык (алиасы: es → es-MX и т.д.)
    for (const { langCode } of languages) {
        const aliased = ACCEPT_LANGUAGE_ALIASES[langCode]
        if (aliased && SUPPORTED_LOCALES.includes(aliased)) {
            return aliased
        }
        if (SUPPORTED_LOCALES.includes(langCode)) {
            return langCode
        }
    }
    
    return null
}

export async function getLocale() {
    const cookieStore = await cookies()
    const savedLocale = cookieStore.get(COOKIE_NAME)?.value
    
    // Если есть сохранённый язык - используем его
    if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
        return savedLocale
    }
    
    // Если нет - определяем по языку браузера/системы
    const headersList = await headers()
    const acceptLanguage = headersList.get('accept-language')
    const browserLocale = parseAcceptLanguage(acceptLanguage)
    
    if (browserLocale) {
        return browserLocale
    }
    
    // Fallback на дефолтный язык
    return appConfig.locale
}

export async function setLocale(locale) {
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 год
        sameSite: 'lax',
        // Не устанавливаем httpOnly, чтобы cookie был доступен на клиенте через JavaScript
    })
}

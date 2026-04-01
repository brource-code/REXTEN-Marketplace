/**
 * Сервис для работы с cookies согласия
 * Используется для локальной разработки и может быть расширен для production
 */

export type CookieConsentType = 'necessary' | 'analytics' | 'marketing'

export interface CookieConsent {
    necessary: boolean // Всегда true, нельзя отключить
    analytics: boolean
    marketing: boolean
    timestamp: number // Когда было дано согласие
}

const COOKIE_CONSENT_KEY = 'cookie_consent'
const COOKIE_CONSENT_EXPIRY_DAYS = 365 // 1 год

/**
 * Проверяет, дано ли согласие на cookies
 * Возвращает false если согласия нет или если произошла ошибка при проверке
 */
export function hasCookieConsent(): boolean {
    if (typeof window === 'undefined') {
        return false
    }

    try {
        const consent = getCookieConsent()
        
        // Если согласие найдено и имеет валидную структуру - возвращаем true
        if (consent && typeof consent === 'object' && 'timestamp' in consent) {
            return true
        }
        
        return false
    } catch (error) {
        // Если произошла ошибка (например, localStorage заблокирован в инкогнито),
        // считаем что согласия нет - модалка должна показаться
        return false
    }
}

/**
 * Получает текущее согласие на cookies
 */
export function getCookieConsent(): CookieConsent | null {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        // Проверяем cookie
        const cookieValue = getCookie(COOKIE_CONSENT_KEY)
        if (cookieValue) {
            try {
                const parsed = JSON.parse(decodeURIComponent(cookieValue))
                // Проверяем, что это валидный объект согласия
                if (parsed && typeof parsed === 'object' && 'timestamp' in parsed) {
                    return parsed as CookieConsent
                }
            } catch (e) {
                // Если не удалось распарсить cookie, продолжаем проверку localStorage
            }
        }

        // Fallback: проверяем localStorage (для совместимости)
        try {
            const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                // Проверяем, что это валидный объект согласия
                if (parsed && typeof parsed === 'object' && 'timestamp' in parsed) {
                    return parsed as CookieConsent
                }
            }
        } catch (e) {
            // localStorage может быть недоступен в режиме инкогнито
            // Игнорируем ошибку и возвращаем null
        }

        return null
    } catch (error) {
        console.warn('Error reading cookie consent:', error)
        return null
    }
}

/**
 * Сохраняет согласие на cookies
 */
export function setCookieConsent(consent: Partial<CookieConsent>): void {
    if (typeof window === 'undefined') {
        return
    }

    try {
        const fullConsent: CookieConsent = {
            necessary: true, // Всегда включено
            analytics: consent.analytics ?? false,
            marketing: consent.marketing ?? false,
            timestamp: Date.now(),
        }

        // Сохраняем в cookie (может не работать в режиме инкогнито с блокировкой cookies)
        try {
            const expiryDate = new Date()
            expiryDate.setTime(expiryDate.getTime() + COOKIE_CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
            
            const cookieValue = encodeURIComponent(JSON.stringify(fullConsent))
            document.cookie = `${COOKIE_CONSENT_KEY}=${cookieValue}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`
        } catch (cookieError) {
            console.warn('Could not save cookie consent to cookie (may be blocked):', cookieError)
        }

        // Также сохраняем в localStorage для быстрого доступа
        // В режиме инкогнито localStorage может быть недоступен, но пробуем
        try {
            localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(fullConsent))
        } catch (storageError) {
            console.warn('Could not save cookie consent to localStorage (may be blocked in incognito):', storageError)
            // Если localStorage недоступен, используем только cookie
        }
    } catch (error) {
        console.error('Error saving cookie consent:', error)
    }
}

/**
 * Проверяет, дано ли согласие на конкретный тип cookies
 */
export function hasConsentForType(type: CookieConsentType): boolean {
    const consent = getCookieConsent()
    if (!consent) {
        return false
    }

    // Необходимые cookies всегда разрешены
    if (type === 'necessary') {
        return true
    }

    return consent[type] === true
}

/**
 * Удаляет согласие на cookies (для тестирования)
 */
export function clearCookieConsent(): void {
    if (typeof window === 'undefined') {
        return
    }

    try {
        // Удаляем cookie
        document.cookie = `${COOKIE_CONSENT_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        
        // Удаляем из localStorage
        try {
            localStorage.removeItem(COOKIE_CONSENT_KEY)
        } catch (e) {
            // localStorage может быть заблокирован в инкогнито
            console.warn('Could not clear localStorage (may be blocked):', e)
        }
        
    } catch (error) {
        console.error('Error clearing cookie consent:', error)
    }
}

/**
 * Вспомогательная функция для получения cookie по имени
 */
function getCookie(name: string): string | null {
    if (typeof document === 'undefined') {
        return null
    }

    const nameEQ = name + '='
    const ca = document.cookie.split(';')
    
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i]
        while (c.charAt(0) === ' ') {
            c = c.substring(1, c.length)
        }
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length, c.length)
        }
    }
    
    return null
}


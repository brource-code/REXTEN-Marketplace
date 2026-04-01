'use client'

import { useEffect, useState } from 'react'
import CookieConsentModal from './CookieConsentModal'
import { hasCookieConsent, hasConsentForType } from '@/utils/services/cookieService'

/**
 * Провайдер для управления согласием на cookies
 * Проверяет согласие и показывает модалку при необходимости
 */
export default function CookieConsentProvider({ children }) {
    const [isInitialized, setIsInitialized] = useState(false)

    useEffect(() => {
        // Убеждаемся, что мы на клиенте
        if (typeof window !== 'undefined') {
            // Проверяем согласие при монтировании
            setIsInitialized(true)
        }
    }, [])

    return (
        <>
            {children}
            {/* Всегда рендерим модалку, она сама решит показываться или нет */}
            {isInitialized && <CookieConsentModal />}
        </>
    )
}

/**
 * Хук для проверки согласия на конкретный тип cookies
 * Используйте его перед загрузкой аналитики или рекламы
 */
export function useCookieConsent(type) {
    const [hasConsent, setHasConsent] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        const checkConsent = () => {
            setHasConsent(hasConsentForType(type))
        }

        // Проверяем сразу
        checkConsent()

        // Слушаем изменения в localStorage (для синхронизации между вкладками)
        const handleStorageChange = (e) => {
            if (e.key === 'cookie_consent') {
                checkConsent()
            }
        }

        window.addEventListener('storage', handleStorageChange)

        // Также проверяем периодически (на случай изменений в cookie)
        const interval = setInterval(checkConsent, 1000)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            clearInterval(interval)
        }
    }, [type])

    return hasConsent
}


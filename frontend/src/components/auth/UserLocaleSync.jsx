'use client'

import { useEffect, useRef } from 'react'
import { useLocale } from 'next-intl'
import { useAuthStore, useUserStore } from '@/store'
import { updateUserLocale } from '@/lib/api/client'
import { SUPPORTED_LOCALES } from '@/constants/locale.constant'

/**
 * Синхронизирует локаль интерфейса (cookie next-intl) с полем users.locale на бэкенде.
 * Без этого письма и in-app уведомления могут уходить на en, хотя UI на русском.
 */
export default function UserLocaleSync() {
    const locale = useLocale()
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const user = useUserStore((s) => s.user)
    const setUser = useUserStore((s) => s.setUser)
    const inFlightRef = useRef(false)

    useEffect(() => {
        if (!isAuthenticated || !user?.id) {
            return
        }

        const uiLocale = SUPPORTED_LOCALES.includes(locale) ? locale : 'en'
        const savedLocale = user.locale ?? null

        if (savedLocale === uiLocale) {
            return
        }
        if (inFlightRef.current) {
            return
        }

        inFlightRef.current = true
        ;(async () => {
            try {
                await updateUserLocale(uiLocale)
                const current = useUserStore.getState().user
                if (current?.id === user.id) {
                    setUser({ ...current, locale: uiLocale })
                }
            } catch {
                // сеть / 401 — не зацикливаем; повтор при смене локали или перезагрузке
            } finally {
                inFlightRef.current = false
            }
        })()
    }, [isAuthenticated, locale, user?.id, user?.locale, setUser])

    return null
}

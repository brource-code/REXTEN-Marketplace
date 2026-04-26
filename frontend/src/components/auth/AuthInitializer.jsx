'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore, useUserStore } from '@/store'
import useBusinessStore from '@/store/businessStore'
import { authKeys, useCurrentUser } from '@/hooks/api/useAuth'

/**
 * Компонент для инициализации авторизации при загрузке приложения
 * Проверяет токен из localStorage и восстанавливает состояние авторизации
 */
export default function AuthInitializer() {
    const queryClient = useQueryClient()
    const { checkAuth, isAuthenticated, authReady, userId: jwtUserId } =
        useAuthStore()
    const { user, setUser, clearUser } = useUserStore()
    const initializedRef = useRef(false)

    // После authReady роли и токен согласованы с JWT; при рассинхроне persist vs JWT — догружаем /auth/me
    const { data: currentUser, isLoading } = useCurrentUser()

    /**
     * authReady нельзя вешать только на persist.onFinishHydration — в Next.js колбэк иногда
     * не вызывается, и навбар навсегда остаётся в «скелетоне» без кнопок входа.
     * Синхронизируем токен и сразу разблокируем UI (до отрисовки, где возможно).
     */
    useLayoutEffect(() => {
        if (initializedRef.current) {
            return
        }
        initializedRef.current = true
        useAuthStore.getState().checkAuth()
        useAuthStore.setState({ authReady: true })
    }, [])

    useEffect(() => {
        if (!authReady || !isAuthenticated || !jwtUserId || !user) {
            return
        }
        if (String(user.id) !== String(jwtUserId)) {
            clearUser()
            useBusinessStore.getState().clearBusiness()
            queryClient.removeQueries({ queryKey: authKeys.user() })
            queryClient.removeQueries({ queryKey: ['business-profile'] })
        }
    }, [
        authReady,
        isAuthenticated,
        jwtUserId,
        user,
        clearUser,
        queryClient,
    ])

    useEffect(() => {
        if (!isAuthenticated || !currentUser || isLoading) {
            return
        }
        if (!user || String(user.id) !== String(currentUser.id)) {
            setUser(currentUser)
        }
    }, [isAuthenticated, user, currentUser, isLoading, setUser])

    return null
}


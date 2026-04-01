'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore, useUserStore } from '@/store'
import { useCurrentUser } from '@/hooks/api/useAuth'

/**
 * Компонент для инициализации авторизации при загрузке приложения
 * Проверяет токен из localStorage и восстанавливает состояние авторизации
 */
export default function AuthInitializer() {
    const { checkAuth, isAuthenticated } = useAuthStore()
    const { user, setUser } = useUserStore()
    const initializedRef = useRef(false)
    
    // Загружаем данные пользователя только если авторизован
    const { data: currentUser, isLoading } = useCurrentUser({
        enabled: isAuthenticated && !user, // Загружаем только если авторизован и нет данных пользователя
    })

    useEffect(() => {
        // Инициализируем только один раз при монтировании
        if (initializedRef.current) {
            return
        }
        
        // Проверяем авторизацию при загрузке
        checkAuth()
        initializedRef.current = true
    }, []) // Пустой массив - только при монтировании

    useEffect(() => {
        // Обновляем данные пользователя только если они изменились
        if (isAuthenticated && !user && currentUser && !isLoading) {
            setUser(currentUser)
        }
    }, [isAuthenticated, user, currentUser, isLoading, setUser])

    return null
}


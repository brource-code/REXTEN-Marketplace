'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store'
import appConfig from '@/configs/app.config'

/**
 * Компонент для защиты маршрутов
 * Проверяет авторизацию и роль пользователя
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Дочерние компоненты
 * @param {string[]} props.allowedRoles - Разрешенные роли (опционально)
 * @param {string} props.redirectTo - Куда редиректить при отсутствии доступа (по умолчанию /sign-in)
 */
export default function ProtectedRoute({ 
    children, 
    allowedRoles = [], 
    redirectTo = appConfig.unAuthenticatedEntryPath || '/sign-in' 
}) {
    const t = useTranslations('auth')
    const router = useRouter()
    const { isAuthenticated, userRole, checkAuth } = useAuthStore()
    const [isChecking, setIsChecking] = useState(true)
    
    useEffect(() => {
        // Проверяем авторизацию только один раз при монтировании
        // Используем небольшую задержку, чтобы дать время для восстановления состояния из localStorage
        const timer = setTimeout(() => {
            const hasAuth = checkAuth()
            
            // Если нет токена или не авторизован - редирект
            if (!hasAuth) {
                setIsChecking(false)
                router.push(redirectTo)
                return
            }
            
            // Даем еще немного времени для обновления состояния из localStorage
            // и для того, чтобы Zustand store полностью восстановился
            setTimeout(() => {
                // Проверяем еще раз после задержки
                checkAuth()
                setIsChecking(false)
            }, 150)
        }, 100)
        
        return () => clearTimeout(timer)
    }, []) // Пустой массив - проверяем только при монтировании
    
    // Отдельный эффект для проверки роли после загрузки состояния
    useEffect(() => {
        if (isChecking) {
            return // Еще проверяем
        }
        
        // Если нет авторизации - редирект
        if (!isAuthenticated) {
            router.push(redirectTo)
            return
        }
        
        // Если указаны разрешенные роли, строго проверяем роль пользователя
        if (allowedRoles.length > 0) {
            // Если роль не определена или не входит в разрешенные - доступ запрещен
            if (!userRole || !allowedRoles.includes(userRole)) {
                router.push('/access-denied')
                return
            }
        }
    }, [isAuthenticated, userRole, allowedRoles, router, redirectTo, isChecking])
    
    // Показываем загрузку во время проверки
    if (isChecking) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">{t('checkingAccess')}</p>
                </div>
            </div>
        )
    }
    
    // Строгая проверка перед показом контента
    if (!isAuthenticated) {
        return null
    }
    
    // Если указаны роли, строго проверяем
    if (allowedRoles.length > 0) {
        if (!userRole || !allowedRoles.includes(userRole)) {
            return null
        }
    }
    
    return <>{children}</>
}


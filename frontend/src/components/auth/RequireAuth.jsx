'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store'
import appConfig from '@/configs/app.config'

/**
 * HOC для защиты компонентов
 * Используется для обертки страниц, требующих авторизации
 * 
 * @param {React.ComponentType} Component - Компонент для защиты
 * @param {Object} options - Опции
 * @param {string[]} options.allowedRoles - Разрешенные роли
 * @param {string} options.redirectTo - Куда редиректить
 */
export function withAuth(Component, options = {}) {
    const { allowedRoles = [], redirectTo = appConfig.unAuthenticatedEntryPath || '/sign-in' } = options
    
    return function AuthenticatedComponent(props) {
        const router = useRouter()
        const { isAuthenticated, userRole, authReady } = useAuthStore()

        useEffect(() => {
            if (!authReady) {
                return
            }
            if (!isAuthenticated) {
                router.push(redirectTo)
                return
            }
            if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
                router.push('/access-denied')
            }
        }, [authReady, isAuthenticated, userRole, router, redirectTo])

        if (!authReady) {
            return null
        }
        if (!isAuthenticated) {
            return null
        }
        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
            return null
        }

        return <Component {...props} />
    }
}

/**
 * Компонент для условного рендеринга на основе роли
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Дочерние компоненты
 * @param {string[]} props.allowedRoles - Разрешенные роли
 * @param {React.ReactNode} props.fallback - Что показать, если роль не подходит
 */
export function RequireRole({ children, allowedRoles = [], fallback = null }) {
    const { userRole, authReady } = useAuthStore()

    if (!authReady) {
        return null
    }
    if (allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
        return <>{children}</>
    }

    return <>{fallback}</>
}


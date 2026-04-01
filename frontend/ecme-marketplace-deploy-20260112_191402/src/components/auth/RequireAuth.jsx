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
        const { isAuthenticated, userRole, checkAuth } = useAuthStore()
        
        useEffect(() => {
            const hasAuth = checkAuth()
            
            if (!hasAuth) {
                router.push(redirectTo)
                return
            }
            
            if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
                router.push('/access-denied')
                return
            }
        }, [isAuthenticated, userRole, router, redirectTo, checkAuth])
        
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
    const { userRole } = useAuthStore()
    
    if (allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
        return <>{children}</>
    }
    
    return <>{fallback}</>
}


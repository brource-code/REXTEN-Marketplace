'use client'

import { useEffect } from 'react'
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
    redirectTo = appConfig.unAuthenticatedEntryPath || '/sign-in',
}) {
    const t = useTranslations('auth')
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

        if (allowedRoles.length > 0) {
            if (!userRole || !allowedRoles.includes(userRole)) {
                router.push('/access-denied')
            }
        }
    }, [authReady, isAuthenticated, userRole, allowedRoles, router, redirectTo])

    if (!authReady) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto" />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">{t('checkingAccess')}</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return null
    }

    if (allowedRoles.length > 0) {
        if (!userRole || !allowedRoles.includes(userRole)) {
            return null
        }
    }

    return <>{children}</>
}

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermission } from '@/hooks/usePermission'
import useBusinessStore from '@/store/businessStore'
import Loading from '@/components/shared/Loading'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'

/**
 * Компонент для защиты страниц по permissions.
 * Если у пользователя нет нужного разрешения - редирект на дашборд.
 * 
 * @param {string|string[]} permission - Slug разрешения или массив slugs (OR логика)
 * @param {React.ReactNode} children - Содержимое страницы
 * @param {string} redirectTo - Куда редиректить при отсутствии прав (по умолчанию /business/dashboard)
 */
const PermissionGuard = ({ permission, children, redirectTo = '/business/dashboard' }) => {
    const router = useRouter()
    const hasPermission = usePermission(permission)
    const businessId = useBusinessStore((s) => s.businessId)
    const isOwner = useBusinessStore((s) => s.isOwner)
    const permissions = useBusinessStore((s) => s.permissions)
    
    // Ждём пока загрузятся данные бизнеса
    const isLoading = !businessId && !isOwner && permissions.length === 0

    useEffect(() => {
        // Если данные загружены и нет прав - редирект
        if (!isLoading && !hasPermission) {
            router.replace(redirectTo)
        }
    }, [isLoading, hasPermission, router, redirectTo])

    // Показываем загрузку пока данные не загружены
    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    // Если нет прав - показываем загрузку (пока идёт редирект)
    if (!hasPermission) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    return <>{children}</>
}

export default PermissionGuard

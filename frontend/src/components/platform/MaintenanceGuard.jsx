'use client'

import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store'
import { SUPERADMIN } from '@/constants/roles.constant'
import { usePlatformPublicRuntime } from '@/hooks/api/usePlatformPublicRuntime'
import Loading from '@/components/shared/Loading'
import MaintenanceScreen from '@/components/platform/MaintenanceScreen'

/** Пути входа/восстановления — не перекрываем заглушкой (суперадмин и др.). */
function isAuthEntryPath(pathname) {
    if (!pathname) {
        return false
    }
    const base = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BASE_PATH || '' : ''
    let p = pathname
    if (base && p.startsWith(base)) {
        p = p.slice(base.length) || '/'
    }
    p = p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p
    if (p === '/sign-in' || p === '/business/sign-in' || p === '/admin/sign-in') {
        return true
    }
    if (
        p.startsWith('/sign-up') ||
        p.startsWith('/forgot-password') ||
        p.startsWith('/reset-password') ||
        p.startsWith('/auth/google')
    ) {
        return true
    }
    return false
}

/**
 * Публичный каталог, бизнес и клиент: при maintenance — заглушка вместо «пустого» UI.
 * Суперадмин по роли не блокируется. Страницы входа не блокируются.
 * Без редиректа на /maintenance — чтобы не зацикливать «на главную» на /services.
 */
export default function MaintenanceGuard({ children }) {
    const pathname = usePathname()
    const userRole = useAuthStore((s) => s.userRole)
    const skipForRole = userRole === SUPERADMIN
    const skipForAuthPage = isAuthEntryPath(pathname)
    const skip = skipForRole || skipForAuthPage

    const { data, isPending } = usePlatformPublicRuntime({
        enabled: !skip,
    })

    const maintenanceOn = Boolean(data?.maintenanceMode)

    if (skip) {
        return <>{children}</>
    }

    if (isPending) {
        return (
            <div
                data-public-fullscreen
                className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-white dark:bg-gray-900"
            >
                <Loading loading className="min-h-[40vh]" />
            </div>
        )
    }

    if (data == null) {
        return <>{children}</>
    }

    if (maintenanceOn) {
        return <MaintenanceScreen />
    }

    return <>{children}</>
}

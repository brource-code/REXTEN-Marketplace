'use client'

import HorizontalMenuContent from './HorizontalMenuContent'
import { useAuthStore } from '@/store'
import useNavigation from '@/utils/hooks/useNavigation'
import queryRoute from '@/utils/queryRoute'
import appConfig from '@/configs/app.config'
import { usePathname } from 'next/navigation'

const HorizontalNav = ({
    translationSetup = appConfig.activeNavTranslation,
}) => {
    const pathname = usePathname()

    const route = queryRoute(pathname)

    const currentRouteKey = route?.key || ''

    const { userRole } = useAuthStore()

    const { navigationTree } = useNavigation()

    // Преобразуем роль в массив authority для совместимости
    const userAuthority = userRole ? [userRole] : []

    return (
        <HorizontalMenuContent
            navigationTree={navigationTree}
            routeKey={currentRouteKey}
            userAuthority={userAuthority}
            translationSetup={translationSetup}
        />
    )
}

export default HorizontalNav

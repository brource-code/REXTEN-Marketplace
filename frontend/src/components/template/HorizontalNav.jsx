'use client'

import HorizontalMenuContent from './HorizontalMenuContent'
import { useAuthStore } from '@/store'
import useNavigation from '@/utils/hooks/useNavigation'
import queryRoute from '@/utils/queryRoute'
import appConfig from '@/configs/app.config'
import { usePathname } from 'next/navigation'
import { BUSINESS_OWNER } from '@/constants/roles.constant'
import businessHorizontalNavigationConfig from '@/configs/navigation.config/business.horizontal.navigation.config'

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

    // Для бизнеса используем компактную горизонтальную навигацию с группировкой
    const effectiveNavigationTree = userRole === BUSINESS_OWNER
        ? businessHorizontalNavigationConfig
        : navigationTree

    return (
        <HorizontalMenuContent
            navigationTree={effectiveNavigationTree}
            routeKey={currentRouteKey}
            userAuthority={userAuthority}
            translationSetup={translationSetup}
        />
    )
}

export default HorizontalNav

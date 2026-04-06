'use client'
import classNames from '@/utils/classNames'
import ScrollBar from '@/components/ui/ScrollBar'
import Logo from '@/components/template/Logo'
import VerticalMenuContent from '@/components/template/VerticalMenuContent'
import useTheme from '@/utils/hooks/useTheme'
import { useAuthStore } from '@/store'
import useNavigation from '@/utils/hooks/useNavigation'
import queryRoute from '@/utils/queryRoute'
import appConfig from '@/configs/app.config'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

import {
    SIDE_NAV_WIDTH,
    SIDE_NAV_COLLAPSED_WIDTH,
    SIDE_NAV_CONTENT_GUTTER,
    HEADER_HEIGHT,
    LOGO_X_GUTTER,
} from '@/constants/theme.constant'

const sideNavStyle = {
    width: SIDE_NAV_WIDTH,
    minWidth: SIDE_NAV_WIDTH,
}

const sideNavCollapseStyle = {
    width: SIDE_NAV_COLLAPSED_WIDTH,
    minWidth: SIDE_NAV_COLLAPSED_WIDTH,
}

const SideNav = ({
    translationSetup = appConfig.activeNavTranslation,
    background = true,
    className,
    contentClass,
    mode,
}) => {
    const pathname = usePathname()

    const route = queryRoute(pathname)

    const { navigationTree } = useNavigation()

    const defaultMode = useTheme((state) => state.mode)
    const direction = useTheme((state) => state.direction)
    const sideNavCollapse = useTheme((state) => state.layout.sideNavCollapse)

    const currentRouteKey = route?.key || ''
    const { userRole } = useAuthStore()

    // Преобразуем роль в массив authority для совместимости
    const userAuthority = userRole ? [userRole] : []

    return (
        <div
            data-tour="sidebar"
            style={{
                ...(sideNavCollapse ? sideNavCollapseStyle : sideNavStyle),
                transition: 'width 0.2s ease-in-out, min-width 0.2s ease-in-out',
            }}
            className={classNames(
                'side-nav hidden lg:block',
                background && 'side-nav-bg',
                !sideNavCollapse && 'side-nav-expand',
                className,
            )}
        >
            <Link
                href={appConfig.marketplaceHomePath}
                className="side-nav-header flex flex-col justify-center items-start"
                style={{ height: HEADER_HEIGHT }}
            >
                <div className={classNames(
                    'w-full flex items-center',
                    sideNavCollapse ? 'justify-center' : classNames('justify-start', LOGO_X_GUTTER, 'ltr:pl-4 rtl:pr-4')
                )}>
                    <Logo
                        imgClass={sideNavCollapse ? "max-h-8 w-8" : "max-h-14"}
                        mode={mode || defaultMode}
                        type={sideNavCollapse ? "icon" : "full"}
                        forceSvg={true}
                        className="flex-shrink-0"
                    />
                </div>
            </Link>
            <div className={classNames('side-nav-content', contentClass)}>
                <ScrollBar style={{ height: '100%' }} direction={direction}>
                    <VerticalMenuContent
                        collapsed={sideNavCollapse}
                        navigationTree={navigationTree}
                        routeKey={currentRouteKey}
                        direction={direction}
                        translationSetup={translationSetup}
                        userAuthority={userAuthority}
                    />
                </ScrollBar>
            </div>
        </div>
    )
}

export default SideNav

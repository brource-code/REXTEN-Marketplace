import { useState, Suspense, lazy } from 'react'
import classNames from 'classnames'
import Drawer from '@/components/ui/Drawer'
import NavToggle from '@/components/shared/NavToggle'
import RextenMarketplaceLogoLight from '@/components/ui/logos/RextenMarketplaceLogoLight'
import RextenMarketplaceLogoDark from '@/components/ui/logos/RextenMarketplaceLogoDark'
import { DIR_RTL } from '@/constants/theme.constant'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import useNavigation from '@/utils/hooks/useNavigation'
import useTheme from '@/utils/hooks/useTheme'
import queryRoute from '@/utils/queryRoute'
import appConfig from '@/configs/app.config'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store'

const VerticalMenuContent = lazy(
    () => import('@/components/template/VerticalMenuContent'),
)

const MobileNavToggle = withHeaderItem(NavToggle)

const MobileNav = ({ translationSetup = appConfig.activeNavTranslation }) => {
    const [isOpen, setIsOpen] = useState(false)

    const handleOpenDrawer = () => {
        setIsOpen(true)
    }

    const handleDrawerClose = () => {
        setIsOpen(false)
    }

    const pathname = usePathname()

    const route = queryRoute(pathname)

    const currentRouteKey = route?.key || ''

    const direction = useTheme((state) => state.direction)
    const defaultMode = useTheme((state) => state.mode)

    const { userRole } = useAuthStore()

    // Преобразуем роль в массив authority для совместимости
    const userAuthority = userRole ? [userRole] : []

    const { navigationTree } = useNavigation()

    // Логотип для заголовка Drawer - полный логотип с иконкой и текстом, как в развернутом десктопном меню
    // Используем SVG компоненты напрямую для надежного рендеринга
    const LogoComponent = defaultMode === 'dark' ? RextenMarketplaceLogoDark : RextenMarketplaceLogoLight
    
    const drawerTitle = (
        <div className="flex items-center flex-shrink-0">
            <LogoComponent
                className="max-h-10 w-auto"
                customText="REXTEN"
                customColor={defaultMode === 'dark' ? '#FFFFFF' : '#0F172A'}
                customSize={26}
                customIconColor={defaultMode === 'dark' ? '#696cff' : '#2563EB'}
            />
        </div>
    )

    return (
        <>
            <div
                className="text-2xl block lg:hidden"
                onClick={handleOpenDrawer}
            >
                <MobileNavToggle toggled={isOpen} />
            </div>
            <Drawer
                title={drawerTitle}
                isOpen={isOpen}
                bodyClass={classNames('p-0')}
                headerClass={classNames('flex items-center')}
                width={330}
                placement={direction === DIR_RTL ? 'right' : 'left'}
                onClose={handleDrawerClose}
                onRequestClose={handleDrawerClose}
            >
                <Suspense fallback={<></>}>
                    {isOpen && (
                        <VerticalMenuContent
                            collapsed={false}
                            navigationTree={navigationTree}
                            routeKey={currentRouteKey}
                            userAuthority={userAuthority}
                            translationSetup={translationSetup}
                            direction={direction}
                            onMenuItemClick={handleDrawerClose}
                        />
                    )}
                </Suspense>
            </Drawer>
        </>
    )
}

export default MobileNav

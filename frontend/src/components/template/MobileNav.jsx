import { useState } from 'react'
import classNames from 'classnames'
import Drawer from '@/components/ui/Drawer'
import NavToggle from '@/components/shared/NavToggle'
import RextenMarketplaceLogoLight from '@/components/ui/logos/RextenMarketplaceLogoLight'
import RextenMarketplaceLogoDark from '@/components/ui/logos/RextenMarketplaceLogoDark'
import VerticalMenuContent from '@/components/template/VerticalMenuContent'
import { DIR_RTL } from '@/constants/theme.constant'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import useNavigation from '@/utils/hooks/useNavigation'
import useTheme from '@/utils/hooks/useTheme'
import queryRoute from '@/utils/queryRoute'
import appConfig from '@/configs/app.config'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store'
import { REXTEN_MARK_COLOR } from '@/constants/rexten-brand.constant'

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

    // Логотип для заголовка Drawer - полный логотип с иконкой и текстом.
    const LogoComponent = defaultMode === 'dark' ? RextenMarketplaceLogoDark : RextenMarketplaceLogoLight
    
    const drawerTitle = (
        <Link
            href={appConfig.marketplaceHomePath}
            className="flex items-center flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
            onClick={handleDrawerClose}
        >
            <LogoComponent
                className="max-h-8 w-auto"
                customText="REXTEN"
                customColor={defaultMode === 'dark' ? '#ffffff' : '#333333'}
                customSize={26}
                customIconColor={REXTEN_MARK_COLOR}
            />
        </Link>
    )

    return (
        <>
            <div
                className="text-2xl block lg:hidden touch-manipulation"
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
                closeTimeoutMS={280}
                placement={direction === DIR_RTL ? 'right' : 'left'}
                onClose={handleDrawerClose}
                onRequestClose={handleDrawerClose}
            >
                <VerticalMenuContent
                    collapsed={false}
                    navigationTree={navigationTree}
                    routeKey={currentRouteKey}
                    userAuthority={userAuthority}
                    translationSetup={translationSetup}
                    direction={direction}
                    onMenuItemClick={handleDrawerClose}
                />
            </Drawer>
        </>
    )
}

export default MobileNav

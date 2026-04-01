'use client'
import SideNav from '@/components/template/SideNav'
import Header from '@/components/template/Header'
import SideNavToggle from '@/components/template/SideNavToggle'
import MobileNav from '@/components/template/MobileNav'
import Search from '@/components/template/Search'
import LanguageSelector from '@/components/template/LanguageSelector'
import BusinessNotification from '../BusinessNotification'
import UserProfileDropdown from '@/components//template/UserProfileDropdown'
import SidePanel from '@/components//template/SidePanel'
import MarketplaceButton from '@/components/template/MarketplaceButton'
import LayoutBase from '@/components//template/LayoutBase'
import { LAYOUT_COLLAPSIBLE_SIDE, SIDE_NAV_WIDTH, SIDE_NAV_COLLAPSED_WIDTH } from '@/constants/theme.constant'
import useTheme from '@/utils/hooks/useTheme'
import classNames from '@/utils/classNames'
import { useEffect, useState } from 'react'

const CollapsibleSide = ({ children }) => {
    const sideNavCollapse = useTheme((state) => state.layout.sideNavCollapse)
    const [isMounted, setIsMounted] = useState(false)
    const [isDesktop, setIsDesktop] = useState(false)

    useEffect(() => {
        setIsMounted(true)
        
        // Проверяем размер экрана
        const checkDesktop = () => {
            setIsDesktop(typeof window !== 'undefined' && window.innerWidth >= 1024)
        }
        
        checkDesktop()
        window.addEventListener('resize', checkDesktop)
        
        return () => {
            window.removeEventListener('resize', checkDesktop)
        }
    }, [])

    // Вычисляем margin напрямую без задержки
    const contentMargin = isMounted && isDesktop 
        ? (sideNavCollapse ? SIDE_NAV_COLLAPSED_WIDTH : SIDE_NAV_WIDTH)
        : (isMounted ? 0 : SIDE_NAV_WIDTH) // На сервере используем дефолтный margin

    return (
        <LayoutBase
            type={LAYOUT_COLLAPSIBLE_SIDE}
            className={classNames(
                "app-layout-collapsible-side flex flex-auto flex-col",
                sideNavCollapse && "side-nav-collapsed"
            )}
        >
            <div className="flex flex-auto min-w-0">
                <SideNav />
                <div 
                    className="flex flex-col flex-auto min-h-screen min-w-0 relative w-full"
                    style={{
                        marginLeft: `${contentMargin}px`,
                        transition: 'margin-left 0.2s ease-in-out',
                        willChange: 'margin-left', // Оптимизация для браузера
                    }}
                >
                    <Header
                        className="shadow-sm dark:shadow-2xl"
                        headerStart={
                            <>
                                <MobileNav />
                                <SideNavToggle />
                                <Search />
                            </>
                        }
                        headerEnd={
                            <>
                                <MarketplaceButton />
                                <LanguageSelector />
                                <BusinessNotification />
                                <SidePanel />
                                <UserProfileDropdown hoverable={false} />
                            </>
                        }
                    />
                    <div className="h-full flex flex-auto flex-col">
                        {children}
                    </div>
                </div>
            </div>
        </LayoutBase>
    )
}

export default CollapsibleSide

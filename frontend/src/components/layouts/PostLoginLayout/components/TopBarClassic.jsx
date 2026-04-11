'use client'
import Header from '@/components/template/Header'
import SidePanel from '@/components/template/SidePanel'
import UserProfileDropdown from '@/components//template/UserProfileDropdown'
import LanguageSelector from '@/components/template/LanguageSelector'
import BusinessNotification from '../BusinessNotification'
import HeaderLogo from '@/components/template/HeaderLogo'
import Search from '@/components/template/Search'
import MobileNav from '@/components/template/MobileNav'
import HorizontalNav from '@/components/template/HorizontalNav'
import MarketplaceButton from '@/components/template/MarketplaceButton'
import LayoutBase from '@/components//template/LayoutBase'
import { LAYOUT_TOP_BAR_CLASSIC } from '@/constants/theme.constant'

const TopBarClassic = ({ children }) => {
    return (
        <LayoutBase
            type={LAYOUT_TOP_BAR_CLASSIC}
            className="app-layout-top-bar-classic flex flex-auto flex-col min-h-screen"
        >
            <div className="flex flex-auto min-w-0">
                <div className="flex flex-col flex-auto min-h-screen min-w-0 relative w-full">
                    <Header
                        container
                        className="shadow-sm dark:shadow-2xl"
                        headerStart={
                            <>
                                <MobileNav />
                                <HeaderLogo />
                            </>
                        }
                        headerMiddle={<HorizontalNav />}
                        headerEnd={
                            <>
                                {/* Скрываем на lg, показываем на xl+ для экономии места */}
                                <div className="hidden xl:block">
                                    <MarketplaceButton />
                                </div>
                                <div className="hidden xl:block">
                                    <Search />
                                </div>
                                <LanguageSelector />
                                <BusinessNotification />
                                <SidePanel />
                                <UserProfileDropdown hoverable={false} />
                            </>
                        }
                    />
                    {children}
                </div>
            </div>
        </LayoutBase>
    )
}

export default TopBarClassic

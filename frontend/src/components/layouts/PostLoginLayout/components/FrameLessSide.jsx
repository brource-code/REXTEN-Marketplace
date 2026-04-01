'use client'
import SideNav from '@/components/template/SideNav'
import Header from '@/components/template/Header'
import FrameLessGap from '@/components/template/FrameLessGap'
import SideNavToggle from '@/components/template/SideNavToggle'
import MobileNav from '@/components/template/MobileNav'
import Search from '@/components/template/Search'
import LanguageSelector from '@/components/template/LanguageSelector'
import BusinessNotification from '../BusinessNotification'
import UserProfileDropdown from '@/components//template/UserProfileDropdown'
import SidePanel from '@/components//template/SidePanel'
import MarketplaceButton from '@/components/template/MarketplaceButton'
import LayoutBase from '@/components//template/LayoutBase'
import classNames from '@/utils/classNames'
import useScrollTop from '@/utils/hooks/useScrollTop'
import { LAYOUT_FRAMELESS_SIDE, SIDE_NAV_WIDTH, SIDE_NAV_COLLAPSED_WIDTH } from '@/constants/theme.constant'
import useTheme from '@/utils/hooks/useTheme'

const FrameLessSide = ({ children }) => {
    const { isSticky } = useScrollTop()
    const sideNavCollapse = useTheme((state) => state.layout.sideNavCollapse)
    const sideNavWidth = sideNavCollapse ? SIDE_NAV_COLLAPSED_WIDTH : SIDE_NAV_WIDTH

    return (
        <LayoutBase
            adaptiveCardActive
            type={LAYOUT_FRAMELESS_SIDE}
            className={classNames(
                "app-layout-frameless-side flex flex-auto flex-col bg-gray-950",
                sideNavCollapse && "side-nav-collapsed"
            )}
            pageContainerReassemble={({
                pageContainerType,
                pageBackgroundType,
                pageContainerGutterClass,
                children,
                footer,
                header,
                defaultClass,
                pageContainerDefaultClass,
                PageContainerBody,
                PageContainerFooter,
                PageContainerHeader,
            }) => (
                <div
                    className={classNames(
                        defaultClass,
                        'rounded-2xl',
                        pageBackgroundType === 'plain' &&
                            'bg-white dark:bg-gray-900',
                    )}
                >
                    <main className="h-full">
                        <div
                            className={classNames(
                                pageContainerDefaultClass,
                                pageContainerType !== 'gutterless' &&
                                    pageContainerGutterClass,
                                pageContainerType === 'contained' &&
                                    'container mx-auto',
                                !footer && 'pb-0 sm:pb-0 md:pb-0',
                            )}
                        >
                            <PageContainerHeader
                                {...header}
                                gutterLess={pageContainerType === 'gutterless'}
                            />
                            <PageContainerBody
                                pageContainerType={pageContainerType}
                            >
                                {children}
                            </PageContainerBody>
                        </div>
                    </main>
                    <PageContainerFooter
                        footer={footer}
                        pageContainerType={pageContainerType}
                    />
                </div>
            )}
        >
            <div className="flex flex-auto min-w-0">
                <SideNav
                    background={false}
                    className={classNames('contrast-dark pt-6')}
                    contentClass="h-[calc(100vh-8rem)]"
                    mode="dark"
                />
                <FrameLessGap className="min-h-screen min-w-0 relative w-full">
                    <div className="bg-white dark:bg-gray-900 flex flex-col flex-1 h-full rounded-2xl">
                        <Header
                            className={classNames(
                                'rounded-t-2xl dark:bg-gray-900',
                                isSticky && 'shadow-sm rounded-none!',
                            )}
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
                </FrameLessGap>
            </div>
        </LayoutBase>
    )
}

export default FrameLessSide

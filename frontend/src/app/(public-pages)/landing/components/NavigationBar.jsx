'use client'
import { useState, useMemo } from 'react'
import NavList from './NavList'
import Drawer from '@/components/ui/Drawer'
import Dropdown from '@/components/ui/Dropdown'
import Avatar from '@/components/ui/Avatar'
import classNames from '@/utils/classNames'
import useScrollTop from '@/utils/hooks/useScrollTop'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TbMenu2 } from 'react-icons/tb'
import { HiCheck } from 'react-icons/hi'
import { PiStorefront, PiBriefcase } from 'react-icons/pi'
import Logo from '@/components/template/Logo'
import appConfig from '@/configs/app.config'
import { useLocale, useTranslations } from 'next-intl'
import { setLocale } from '@/server/actions/locale'
import { UI_LANGUAGE_OPTIONS } from '@/constants/languageOptions'
import { useAuthStore } from '@/store'

const languageList = UI_LANGUAGE_OPTIONS

const Navigation = ({ toggleMode, mode }) => {
    const pathname = usePathname()
    const { isSticky } = useScrollTop()
    const [isOpen, setIsOpen] = useState(false)
    const locale = useLocale()
    const t = useTranslations('landing.nav')
    const tNavbar = useTranslations('components.navbar')
    const { isAuthenticated, authReady } = useAuthStore()

    const navMenu = useMemo(
        () => [
            {
                title: t('features'),
                value: 'features',
                to: 'features',
            },
            {
                title: t('demos'),
                value: 'demos',
                to: 'demos',
            },
            {
                title: t('pricing'),
                value: 'pricing',
                to: 'pricing',
            },
            {
                title: t('faq'),
                value: 'faq',
                to: 'faq',
            },
        ],
        [t],
    )

    const selectLangFlag = useMemo(() => {
        return languageList.find((lang) => lang.value === locale)?.flag
    }, [locale])

    const handleUpdateLocale = async (newLocale) => {
        await setLocale(newLocale)
    }

    const openDrawer = () => {
        setIsOpen(true)
    }

    const onDrawerClose = () => {
        setIsOpen(false)
    }

    return (
        <div
            style={{ transition: 'all 0.2s ease-in-out' }}
            className={classNames(
                'w-full fixed inset-x-0 z-[40]',
                isSticky ? 'top-4' : 'top-0',
            )}
        >
            <div
                className={classNames(
                    'py-3 max-w-7xl mx-auto px-4 rounded-xl relative z-[60] w-full transition duration-200',
                    isSticky
                        ? 'bg-white dark:bg-gray-800 shadow-lg'
                        : 'bg-white dark:bg-gray-900 lg:bg-transparent lg:dark:bg-transparent',
                    'lg:flex lg:flex-row lg:items-center lg:justify-between',
                    'grid grid-cols-[1fr_auto_1fr] items-center lg:grid-cols-none',
                )}
            >
                {/* Left: hamburger + drawer (mobile) */}
                <div className="flex items-center lg:hidden">
                    <button
                        onClick={openDrawer}
                        className="flex items-center"
                    >
                        <TbMenu2 size={24} />
                    </button>
                    <Drawer
                        title={t('drawerTitle')}
                        isOpen={isOpen}
                        onClose={onDrawerClose}
                        onRequestClose={onDrawerClose}
                        width={250}
                        placement="left"
                    >
                        <div className="flex flex-col gap-4">
                            <NavList onTabClick={onDrawerClose} tabs={navMenu} />
                            {authReady && !isAuthenticated && (
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 sm:hidden">
                                    <Link
                                        href="/sign-in"
                                        onClick={onDrawerClose}
                                        className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                                    >
                                        {tNavbar('signIn')}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </Drawer>
                </div>

                {/* Center: логотип + nav ссылки рядом на десктопе */}
                <div className="flex items-center gap-5 justify-center lg:justify-start lg:order-first">
                    <Link href={appConfig.marketplaceHomePath} className="flex items-center flex-shrink-0">
                        <Logo
                            type="full"
                            mode={mode}
                            forceSvg={true}
                            imgClass="h-7 w-auto max-w-[130px]"
                        />
                    </Link>
                    <nav className="hidden lg:flex items-center gap-0.5">
                        <Link
                            href="/services"
                            className={classNames(
                                'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition',
                                pathname.startsWith('/services') || pathname.startsWith('/marketplace')
                                    ? 'text-gray-900 dark:text-gray-100'
                                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60',
                            )}
                        >
                            <PiStorefront className="shrink-0 text-[17px] text-gray-400 dark:text-gray-500" aria-hidden />
                            {tNavbar('marketplace')}
                        </Link>
                        <Link
                            href="/for-business"
                            className={classNames(
                                'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition',
                                pathname.startsWith('/for-business') || pathname.startsWith('/landing')
                                    ? 'text-gray-900 dark:text-gray-100'
                                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60',
                            )}
                        >
                            <PiBriefcase className="shrink-0 text-[17px] text-gray-400 dark:text-gray-500" aria-hidden />
                            {tNavbar('forBusiness')}
                        </Link>
                    </nav>
                </div>

                {/* Desktop nav links (centered absolute) */}
                <div className="lg:flex flex-row flex-1 absolute inset-0 hidden items-center justify-center text-sm text-zinc-600 font-medium hover:text-zinc-800 transition duration-200 [perspective:1000px] overflow-auto sm:overflow-visible no-visible-scrollbar pointer-events-none">
                    <div className="pointer-events-auto flex flex-row items-center justify-center">
                        <NavList tabs={navMenu} />
                    </div>
                </div>

                {/* Right: controls */}
                <div className="flex items-center justify-end gap-2">
                    {/* Language Selector */}
                    <Dropdown
                        renderTitle={
                            <div className="flex items-center cursor-pointer">
                                <Avatar
                                    size={24}
                                    shape="circle"
                                    src={`/img/countries/${selectLangFlag}.png`}
                                />
                            </div>
                        }
                        placement="bottom-end"
                    >
                        {languageList.map((lang) => (
                            <Dropdown.Item
                                key={lang.label}
                                className="justify-between"
                                eventKey={lang.label}
                                onClick={() => handleUpdateLocale(lang.value)}
                            >
                                <span className="flex items-center">
                                    <Avatar
                                        size={18}
                                        shape="circle"
                                        src={`/img/countries/${lang.flag}.png`}
                                    />
                                    <span className="ml-2">{lang.label}</span>
                                </span>
                                {locale === lang.value && (
                                    <HiCheck className="text-emerald-500 text-lg" />
                                )}
                            </Dropdown.Item>
                        ))}
                    </Dropdown>

                    {/* Theme Toggle */}
                    <button
                        className="relative flex cursor-pointer items-center justify-center rounded-xl p-2 text-neutral-500 hover:shadow-input dark:text-neutral-500"
                        onClick={toggleMode}
                    >
                        <svg
                            className="lucide lucide-sun rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                            fill="none"
                            height="16"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            width="16"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <circle cx="12" cy="12" r="4" />
                            <path d="M12 2v2" />
                            <path d="M12 20v2" />
                            <path d="m4.93 4.93 1.41 1.41" />
                            <path d="m17.66 17.66 1.41 1.41" />
                            <path d="M2 12h2" />
                            <path d="M20 12h2" />
                            <path d="m6.34 17.66-1.41 1.41" />
                            <path d="m19.07 4.93-1.41 1.41" />
                        </svg>
                        <svg
                            className="lucide lucide-moon absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                            fill="none"
                            height="16"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            width="16"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                        </svg>
                        <span className="sr-only">Toggle theme</span>
                    </button>

                    {/* Auth buttons */}
                    {authReady && !isAuthenticated && (
                        <Link href="/sign-in" className="hidden sm:block">
                            <button
                                type="button"
                                className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                            >
                                {tNavbar('signIn')}
                            </button>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Navigation

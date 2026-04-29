'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import useTheme from '@/utils/hooks/useTheme'
import useScrollTop from '@/utils/hooks/useScrollTop'
import { MODE_DARK, MODE_LIGHT } from '@/constants/theme.constant'
import classNames from '@/utils/classNames'
import { useAuthStore, useUserStore } from '@/store'
import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import { useLogout } from '@/hooks/api/useAuth'
import { PiUser, PiSignOut, PiGear, PiCalendar, PiStorefront, PiBuildings, PiShieldCheck, PiBriefcase } from 'react-icons/pi'
import { CLIENT, BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'
import ClientNotification from '@/components/layouts/PublicLayout/ClientNotification'
import Logo from '@/components/template/Logo'
import appConfig from '@/configs/app.config'
import { useLocale, useTranslations } from 'next-intl'
import { setLocale } from '@/server/actions/locale'
import { HiCheck } from 'react-icons/hi'
import { updateUserLocale } from '@/lib/api/client'
import { UI_LANGUAGE_OPTIONS } from '@/constants/languageOptions'
import { PUBLIC_MARKETPLACE_CONTENT_MAX } from '@/constants/public-marketplace-layout.constant'

const languageList = UI_LANGUAGE_OPTIONS

const PublicNavbar = () => {
    const pathname = usePathname()
    const mode = useTheme((state) => state.mode)
    const setMode = useTheme((state) => state.setMode)
    const { isSticky } = useScrollTop()
    const { isAuthenticated, userRole, authReady } = useAuthStore()
    const { user } = useUserStore()
    const logoutMutation = useLogout()
    const locale = useLocale()
    const t = useTranslations('components.navbar')

    const selectLangFlag = useMemo(() => {
        return languageList.find((lang) => lang.value === locale)?.flag
    }, [locale])

    const handleUpdateLocale = async (newLocale) => {
        // Сохраняем в cookie для фронтенда
        await setLocale(newLocale)
        
        // Сохраняем в профиль пользователя (если авторизован)
        if (isAuthenticated) {
            try {
                await updateUserLocale(newLocale)
            } catch (error) {
                // Игнорируем ошибки
            }
        }
    }

    const toggleMode = () => {
        setMode(mode === MODE_LIGHT ? MODE_DARK : MODE_LIGHT)
    }

    const isClient = authReady && isAuthenticated && userRole === CLIENT
    const isBusinessOwner = authReady && isAuthenticated && userRole === BUSINESS_OWNER
    const isSuperAdmin = authReady && isAuthenticated && userRole === SUPERADMIN
    const userName = user?.name || user?.firstName || t('user')
    const userEmail = user?.email || ''
    const userAvatar = user?.avatar || user?.image || null

    const handleSignOut = () => {
        logoutMutation.mutate()
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
                    `relative z-[60] mx-auto flex w-full ${PUBLIC_MARKETPLACE_CONTENT_MAX} flex-row items-center justify-between rounded-xl px-4 py-3 transition duration-200 sm:px-6 lg:px-8`,
                    isSticky
                        ? 'bg-white dark:bg-gray-800 shadow-lg'
                        : 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm lg:bg-transparent lg:dark:bg-transparent lg:backdrop-blur-none',
                )}
            >
                {/* Логотип + nav ссылки — сгруппированы слева */}
                <div className="flex items-center gap-5">
                    <Link href={appConfig.marketplaceHomePath} className="flex items-center flex-shrink-0">
                        <Logo
                            type="full"
                            mode={mode}
                            forceSvg={true}
                            imgClass="h-7 w-auto max-w-[120px]"
                        />
                    </Link>
                    <nav className="hidden sm:flex items-center gap-0.5">
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
                            {t('marketplace')}
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
                            {t('forBusiness')}
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-3">
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
                        onClick={toggleMode}
                        className="relative flex cursor-pointer items-center justify-center rounded-xl p-2 text-neutral-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition w-10 h-10"
                        aria-label="Toggle theme"
                    >
                        <svg
                            className="lucide lucide-sun h-[18px] w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute"
                            fill="none"
                            height="18"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            width="18"
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
                            className="lucide lucide-moon h-[18px] w-[18px] absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                            fill="none"
                            height="18"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            width="18"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                        </svg>
                    </button>

                    {/* Auth Buttons / User Menu */}
                    <div className="flex items-center gap-2">
                        {isClient && (
                            <ClientNotification />
                        )}
                        {!authReady ? (
                            <div
                                className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse shrink-0"
                                aria-hidden
                            />
                        ) : !isAuthenticated ? (
                            <>
                                <Link href="/sign-in">
                                    <button
                                        type="button"
                                        className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        {t('signIn')}
                                    </button>
                                </Link>
                                <Link href="/sign-up">
                                    <button
                                        type="button"
                                        className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                                    >
                                        {t('signUp')}
                                    </button>
                                </Link>
                            </>
                        ) : isClient ? (
                            <Dropdown
                                renderTitle={
                                    <div className="cursor-pointer flex items-center gap-2">
                                        <Avatar 
                                            size={32} 
                                            src={userAvatar}
                                            icon={<PiUser />}
                                        />
                                        <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {userName}
                                        </span>
                                    </div>
                                }
                                placement="bottom-end"
                            >
                                <Dropdown.Item variant="header">
                                    <div className="py-2 px-3 flex items-center gap-3">
                                        <Avatar 
                                            size={40} 
                                            src={userAvatar}
                                            icon={<PiUser />}
                                        />
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                                                {userName}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {userEmail}
                                            </div>
                                        </div>
                                    </div>
                                </Dropdown.Item>
                                <Dropdown.Item variant="divider" />
                                <Dropdown.Item eventKey="profile" className="px-0">
                                    <Link className="flex h-full w-full px-2 py-2" href="/profile">
                                        <span className="flex gap-2 items-center w-full">
                                            <PiUser className="text-lg" />
                                            <span>{t('myProfile')}</span>
                                        </span>
                                    </Link>
                                </Dropdown.Item>
                                <Dropdown.Item eventKey="booking" className="px-0">
                                    <Link className="flex h-full w-full px-2 py-2" href="/booking">
                                        <span className="flex gap-2 items-center w-full">
                                            <PiCalendar className="text-lg" />
                                            <span>{t('myBookings')}</span>
                                        </span>
                                    </Link>
                                </Dropdown.Item>
                                <Dropdown.Item variant="divider" />
                                <Dropdown.Item
                                    eventKey="Sign Out"
                                    className="gap-2"
                                    onClick={handleSignOut}
                                >
                                    <span className="text-lg">
                                        <PiSignOut />
                                    </span>
                                    <span>{t('signOut')}</span>
                                </Dropdown.Item>
                            </Dropdown>
                        ) : isSuperAdmin ? (
                            <Dropdown
                                renderTitle={
                                    <div className="cursor-pointer flex items-center gap-2">
                                        <Avatar 
                                            size={32} 
                                            src={userAvatar}
                                            icon={<PiShieldCheck />}
                                        />
                                        <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {userName}
                                        </span>
                                    </div>
                                }
                                placement="bottom-end"
                            >
                                <Dropdown.Item variant="header">
                                    <div className="py-2 px-3 flex items-center gap-3">
                                        <Avatar 
                                            size={40} 
                                            src={userAvatar}
                                            icon={<PiShieldCheck />}
                                        />
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                                                {userName}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {userEmail}
                                            </div>
                                            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                                {t('superAdministrator')}
                                            </div>
                                        </div>
                                    </div>
                                </Dropdown.Item>
                                <Dropdown.Item variant="divider" />
                                <Dropdown.Item eventKey="superadmin" className="px-0">
                                    <Link className="flex h-full w-full px-2 py-2" href="/superadmin/dashboard">
                                        <span className="flex gap-2 items-center w-full">
                                            <PiShieldCheck className="text-lg" />
                                            <span>{t('superAdmin')}</span>
                                        </span>
                                    </Link>
                                </Dropdown.Item>
                                <Dropdown.Item eventKey="marketplace" className="px-0">
                                    <Link className="flex h-full w-full px-2 py-2" href="/services">
                                        <span className="flex gap-2 items-center w-full">
                                            <PiStorefront className="text-lg" />
                                            <span>{t('home')}</span>
                                        </span>
                                    </Link>
                                </Dropdown.Item>
                                <Dropdown.Item variant="divider" />
                                <Dropdown.Item
                                    eventKey="Sign Out"
                                    className="gap-2"
                                    onClick={handleSignOut}
                                >
                                    <span className="text-lg">
                                        <PiSignOut />
                                    </span>
                                    <span>{t('signOut')}</span>
                                </Dropdown.Item>
                            </Dropdown>
                        ) : isBusinessOwner ? (
                            <Dropdown
                                renderTitle={
                                    <div className="cursor-pointer flex items-center gap-2">
                                        <Avatar 
                                            size={32} 
                                            src={userAvatar}
                                            icon={<PiBuildings />}
                                        />
                                        <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {userName}
                                        </span>
                                    </div>
                                }
                                placement="bottom-end"
                            >
                                <Dropdown.Item variant="header">
                                    <div className="py-2 px-3 flex items-center gap-3">
                                        <Avatar 
                                            size={40} 
                                            src={userAvatar}
                                            icon={<PiBuildings />}
                                        />
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                                                {userName}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {userEmail}
                                            </div>
                                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                {t('businessOwner')}
                                            </div>
                                        </div>
                                    </div>
                                </Dropdown.Item>
                                <Dropdown.Item variant="divider" />
                                <Dropdown.Item eventKey="admin" className="px-0">
                                    <Link className="flex h-full w-full px-2 py-2" href="/business/dashboard">
                                        <span className="flex gap-2 items-center w-full">
                                            <PiGear className="text-lg" />
                                            <span>{t('businessAdmin')}</span>
                                        </span>
                                    </Link>
                                </Dropdown.Item>
                                <Dropdown.Item eventKey="marketplace" className="px-0">
                                    <Link className="flex h-full w-full px-2 py-2" href="/services">
                                        <span className="flex gap-2 items-center w-full">
                                            <PiStorefront className="text-lg" />
                                            <span>{t('home')}</span>
                                        </span>
                                    </Link>
                                </Dropdown.Item>
                                <Dropdown.Item variant="divider" />
                                <Dropdown.Item
                                    eventKey="Sign Out"
                                    className="gap-2"
                                    onClick={handleSignOut}
                                >
                                    <span className="text-lg">
                                        <PiSignOut />
                                    </span>
                                    <span>{t('signOut')}</span>
                                </Dropdown.Item>
                            </Dropdown>
                        ) : (
                            <Dropdown
                                renderTitle={
                                    <div className="cursor-pointer flex items-center gap-2">
                                        <Avatar
                                            size={32}
                                            src={userAvatar}
                                            icon={<PiUser />}
                                        />
                                        <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {userName}
                                        </span>
                                    </div>
                                }
                                placement="bottom-end"
                            >
                                <Dropdown.Item variant="header">
                                    <div className="py-2 px-3 flex items-center gap-3">
                                        <Avatar size={40} src={userAvatar} icon={<PiUser />} />
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                                                {userName}
                                            </div>
                                            {userEmail ? (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {userEmail}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </Dropdown.Item>
                                <Dropdown.Item variant="divider" />
                                <Dropdown.Item eventKey="marketplace" className="px-0">
                                    <Link className="flex h-full w-full px-2 py-2" href="/services">
                                        <span className="flex gap-2 items-center w-full">
                                            <PiStorefront className="text-lg" />
                                            <span>{t('home')}</span>
                                        </span>
                                    </Link>
                                </Dropdown.Item>
                                <Dropdown.Item variant="divider" />
                                <Dropdown.Item
                                    eventKey="Sign Out"
                                    className="gap-2"
                                    onClick={handleSignOut}
                                >
                                    <span className="text-lg">
                                        <PiSignOut />
                                    </span>
                                    <span>{t('signOut')}</span>
                                </Dropdown.Item>
                            </Dropdown>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PublicNavbar


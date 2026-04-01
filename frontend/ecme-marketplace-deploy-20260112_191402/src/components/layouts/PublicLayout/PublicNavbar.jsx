'use client'

import { useState } from 'react'
import Link from 'next/link'
import useTheme from '@/utils/hooks/useTheme'
import useScrollTop from '@/utils/hooks/useScrollTop'
import { MODE_DARK, MODE_LIGHT } from '@/constants/theme.constant'
import classNames from '@/utils/classNames'
import { useAuthStore, useUserStore } from '@/store'
import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import { useLogout } from '@/hooks/api/useAuth'
import { PiUser, PiSignOut, PiGear, PiCalendar, PiStorefront, PiBuildings, PiShieldCheck } from 'react-icons/pi'
import { CLIENT, BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'
import ClientNotification from '@/components/layouts/PublicLayout/ClientNotification'
import Logo from '@/components/template/Logo'

const PublicNavbar = () => {
    const mode = useTheme((state) => state.mode)
    const setMode = useTheme((state) => state.setMode)
    const { isSticky } = useScrollTop()
    const { isAuthenticated, userRole } = useAuthStore()
    const { user } = useUserStore()
    const logoutMutation = useLogout()

    const toggleMode = () => {
        setMode(mode === MODE_LIGHT ? MODE_DARK : MODE_LIGHT)
    }

    const isClient = isAuthenticated && userRole === CLIENT
    const isBusinessOwner = isAuthenticated && userRole === BUSINESS_OWNER
    const isSuperAdmin = isAuthenticated && userRole === SUPERADMIN
    const userName = user?.name || user?.firstName || 'Пользователь'
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
                    'flex flex-row items-center justify-between py-3 max-w-7xl mx-auto px-4 rounded-xl relative z-[60] w-full transition duration-200',
                    isSticky
                        ? 'bg-white dark:bg-gray-800 shadow-lg'
                        : 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm lg:bg-transparent lg:dark:bg-transparent lg:backdrop-blur-none',
                )}
            >
                <Link href="/services" className="flex items-center flex-shrink-0">
                    <Logo
                        type="full"
                        mode={mode}
                        forceSvg={true}
                        imgClass="h-7 w-auto max-w-[130px]"
                    />
                </Link>

                <div className="flex items-center gap-3">
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
                        {isClient ? (
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
                                            <span>Мой профиль</span>
                                        </span>
                                    </Link>
                                </Dropdown.Item>
                                <Dropdown.Item eventKey="booking" className="px-0">
                                    <Link className="flex h-full w-full px-2 py-2" href="/booking">
                                        <span className="flex gap-2 items-center w-full">
                                            <PiCalendar className="text-lg" />
                                            <span>Мои бронирования</span>
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
                                    <span>Выход</span>
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
                                                Суперадминистратор
                                            </div>
                                        </div>
                                    </div>
                                </Dropdown.Item>
                                <Dropdown.Item variant="divider" />
                                <Dropdown.Item eventKey="superadmin" className="px-0">
                                    <Link className="flex h-full w-full px-2 py-2" href="/superadmin/dashboard">
                                        <span className="flex gap-2 items-center w-full">
                                            <PiShieldCheck className="text-lg" />
                                            <span>Суперадминка</span>
                                        </span>
                                    </Link>
                                </Dropdown.Item>
                                <Dropdown.Item eventKey="marketplace" className="px-0">
                                    <Link className="flex h-full w-full px-2 py-2" href="/services">
                                        <span className="flex gap-2 items-center w-full">
                                            <PiStorefront className="text-lg" />
                                            <span>Главная</span>
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
                                    <span>Выход</span>
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
                                                Владелец бизнеса
                                            </div>
                                        </div>
                                    </div>
                                </Dropdown.Item>
                                <Dropdown.Item variant="divider" />
                                <Dropdown.Item eventKey="admin" className="px-0">
                                    <Link className="flex h-full w-full px-2 py-2" href="/business/dashboard">
                                        <span className="flex gap-2 items-center w-full">
                                            <PiGear className="text-lg" />
                                            <span>Админка бизнеса</span>
                                        </span>
                                    </Link>
                                </Dropdown.Item>
                                <Dropdown.Item eventKey="marketplace" className="px-0">
                                    <Link className="flex h-full w-full px-2 py-2" href="/services">
                                        <span className="flex gap-2 items-center w-full">
                                            <PiStorefront className="text-lg" />
                                            <span>Главная</span>
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
                                    <span>Выход</span>
                                </Dropdown.Item>
                            </Dropdown>
                        ) : (
                            <>
                                <Link href="/sign-in">
                                    <button className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        Вход
                                    </button>
                                </Link>
                                <Link href="/sign-up">
                                    <button className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
                                        Регистрация
                                    </button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PublicNavbar


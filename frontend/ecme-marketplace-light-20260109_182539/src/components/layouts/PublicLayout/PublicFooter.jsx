'use client'

import Link from 'next/link'
import Container from '@/components/shared/Container'
import useTheme from '@/utils/hooks/useTheme'
import { MODE_DARK, MODE_LIGHT } from '@/constants/theme.constant'
import { PiFacebookLogo, PiInstagramLogo, PiTwitterLogo } from 'react-icons/pi'
import Logo from '@/components/template/Logo'

const PublicFooter = () => {
    const mode = useTheme((state) => state.mode)
    
    return (
        <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <Container className="max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="py-8 md:py-12">
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6 sm:gap-x-6 sm:gap-y-6 md:gap-8 mb-6 md:mb-8">
                        <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                                О платформе
                            </h4>
                            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                <li>
                                    <Link
                                        href="/about"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        О нас
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/how-it-works"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        Как это работает
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/for-business"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        Для бизнеса
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                                Правовая информация
                            </h4>
                            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                <li>
                                    <Link
                                        href="/terms"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        Условия использования
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/privacy"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        Политика конфиденциальности
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/cookies"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        Cookie Policy
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                                Поддержка
                            </h4>
                            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                <li>
                                    <Link
                                        href="/help"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        Помощь
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/contact"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        Контакты
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/faq"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        FAQ
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                                Социальные сети
                            </h4>
                            <div className="flex gap-2 sm:gap-3">
                                <Link
                                    href="https://facebook.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    aria-label="Facebook"
                                >
                                    <PiFacebookLogo className="text-lg sm:text-xl" />
                                </Link>
                                <Link
                                    href="https://instagram.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-pink-100 dark:hover:bg-pink-900/30 text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
                                    aria-label="Instagram"
                                >
                                    <PiInstagramLogo className="text-lg sm:text-xl" />
                                </Link>
                                <Link
                                    href="https://twitter.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-sky-100 dark:hover:bg-sky-900/30 text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                                    aria-label="Twitter"
                                >
                                    <PiTwitterLogo className="text-lg sm:text-xl" />
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-800 pt-6 md:pt-8">
                        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
                            <div className="flex items-center gap-2 order-2 md:order-1">
                                <Logo
                                    type="full"
                                    mode={mode}
                                    forceSvg={true}
                                    imgClass="h-6 w-auto max-w-[120px]"
                                />
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center order-1 md:order-2">
                                © {new Date().getFullYear()} REXTEN Marketplace. Все права защищены.
                            </p>
                            <div className="flex items-center gap-3 sm:gap-4 order-3">
                                <Link
                                    href="/terms"
                                    className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                                >
                                    Условия
                                </Link>
                                <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
                                <Link
                                    href="/privacy"
                                    className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                                >
                                    Конфиденциальность
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </footer>
    )
}

export default PublicFooter


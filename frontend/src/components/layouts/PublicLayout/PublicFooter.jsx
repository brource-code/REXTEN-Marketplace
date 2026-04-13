'use client'

import Link from 'next/link'
import Container from '@/components/shared/Container'
import useTheme from '@/utils/hooks/useTheme'
import { MODE_DARK, MODE_LIGHT } from '@/constants/theme.constant'
import { PiFacebookLogo, PiInstagramLogo, PiTwitterLogo } from 'react-icons/pi'
import Logo from '@/components/template/Logo'
import appConfig from '@/configs/app.config'
import { useTranslations } from 'next-intl'

const PublicFooter = () => {
    const mode = useTheme((state) => state.mode)
    const t = useTranslations('components.footer')
    
    return (
        <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <Container className="max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="py-8 md:py-12">
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6 sm:gap-x-6 sm:gap-y-6 md:gap-8 mb-6 md:mb-8">
                        <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                                {t('about')}
                            </h4>
                            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                <li>
                                    <Link
                                        href="/about"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        {t('about')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/how-it-works"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        {t('howItWorks')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/for-business"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        {t('forBusiness')}
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                                {t('legal')}
                            </h4>
                            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                <li>
                                    <Link
                                        href="/terms"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        {t('terms')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/privacy"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        {t('privacy')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/cookies"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        {t('cookies')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/marketplace-terms"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        {t('marketplaceTerms')}
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                                {t('support')}
                            </h4>
                            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                <li>
                                    <Link
                                        href="/help"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        {t('help')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/contact"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        {t('contact')}
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/faq"
                                        className="hover:text-gray-900 dark:hover:text-white transition"
                                    >
                                        {t('faq')}
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                                {t('socialNetworks')}
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
                                <Link
                                    href={appConfig.marketplaceHomePath}
                                    className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                                >
                                    <Logo
                                        type="full"
                                        mode={mode}
                                        forceSvg={true}
                                        imgClass="h-6 w-auto max-w-[120px]"
                                    />
                                </Link>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center order-1 md:order-2">
                                © {new Date().getFullYear()} REXTEN Marketplace. {t('rights')}.
                            </p>
                        </div>
                    </div>
                </div>
            </Container>
        </footer>
    )
}

export default PublicFooter


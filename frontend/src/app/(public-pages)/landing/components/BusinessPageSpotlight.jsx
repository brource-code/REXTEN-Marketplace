'use client'

import { useEffect, useMemo, useState } from 'react'
import Container from './LandingContainer'
import { motion } from 'framer-motion'
import { TbCircleCheck } from 'react-icons/tb'
import { useLocale, useTranslations } from 'next-intl'
import useTheme from '@/utils/hooks/useTheme'
import { MODE_DARK } from '@/constants/theme.constant'
import { getCompanyPagePreviewSrc } from '@/app/(public-pages)/landing/utils/landingHeroImages'

/**
 * Превью: `public/img/marketplace/<локаль>/` — локаль совпадает с выбранным языком интерфейса (useLocale).
 */

export default function BusinessPageSpotlight() {
    const locale = useLocale()
    const mode = useTheme((state) => state.mode)
    const isDark = mode === MODE_DARK
    const t = useTranslations('landing.businessPage')
    const [previewBroken, setPreviewBroken] = useState(false)

    const previewSrc = useMemo(
        () => getCompanyPagePreviewSrc(locale, isDark),
        [locale, isDark],
    )

    useEffect(() => {
        setPreviewBroken(false)
    }, [previewSrc])

    return (
        <div id="businessPage" className="relative z-20 py-10 md:py-16">
            <Container>
                <motion.section
                    initial={{ opacity: 0, y: 32 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, type: 'spring', bounce: 0.08 }}
                    viewport={{ once: true }}
                    className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-6 md:p-10"
                    aria-labelledby="landing-business-page-title"
                >
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 lg:items-center">
                        <div className="min-w-0 lg:py-1">
                            <h2
                                id="landing-business-page-title"
                                className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4"
                            >
                                {t('title')}
                            </h2>
                            <p className="text-sm md:text-base font-bold text-gray-500 dark:text-gray-400 mb-6">
                                {t('lead')}
                            </p>
                            <ul className="space-y-4">
                                <li className="flex gap-3">
                                    <TbCircleCheck className="text-xl text-primary flex-shrink-0 mt-0.5" />
                                    <span className="text-sm md:text-base font-bold text-gray-700 dark:text-gray-300">
                                        {t('point1')}
                                    </span>
                                </li>
                                <li className="flex gap-3">
                                    <TbCircleCheck className="text-xl text-primary flex-shrink-0 mt-0.5" />
                                    <span className="text-sm md:text-base font-bold text-gray-700 dark:text-gray-300">
                                        {t('point2')}
                                    </span>
                                </li>
                                <li className="flex gap-3">
                                    <TbCircleCheck className="text-xl text-primary flex-shrink-0 mt-0.5" />
                                    <span className="text-sm md:text-base font-bold text-gray-700 dark:text-gray-300">
                                        {t('point3')}
                                    </span>
                                </li>
                            </ul>
                        </div>
                        <div className="flex w-full min-w-0 flex-col items-center">
                            <motion.div
                                className="inline-flex max-w-full p-2 border border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-700 rounded-[32px] shadow-lg ring-1 ring-black/5 dark:ring-white/10"
                                animate={{ y: [0, -14, 0] }}
                                transition={{
                                    duration: 5,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                                role="img"
                                aria-label={t('imageAlt')}
                            >
                                <div className="bg-white dark:bg-black dark:border-gray-700 border border-gray-200 rounded-[24px] overflow-hidden">
                                    {!previewBroken ? (
                                        <img
                                            key={previewSrc}
                                            src={previewSrc}
                                            alt=""
                                            className="block h-auto w-auto max-w-full object-contain object-top rounded-[24px]"
                                            style={{ maxHeight: 'min(748px, 78vh)' }}
                                            loading="eager"
                                            decoding="async"
                                            onError={() => setPreviewBroken(true)}
                                        />
                                    ) : (
                                        <div className="flex min-h-[200px] w-[260px] items-center justify-center p-6 text-center">
                                            <span className="text-sm font-bold text-gray-400 dark:text-gray-500 max-w-[14rem]">
                                                {t('imagePlaceholder')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                            <p className="mt-4 w-full max-w-[578px] text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('previewCaption')}
                            </p>
                        </div>
                    </div>
                </motion.section>
            </Container>
        </div>
    )
}

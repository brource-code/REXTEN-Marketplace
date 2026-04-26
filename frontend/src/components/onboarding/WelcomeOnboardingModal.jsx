'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
    PiCalendarDuotone,
    PiChartLineUpDuotone,
    PiCompassDuotone,
    PiPercentDuotone,
    PiStarDuotone,
    PiUsersDuotone,
} from 'react-icons/pi'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { useTranslations } from 'next-intl'
import classNames from '@/utils/classNames'

const PREVIEW_KEYS = [
    { icon: PiCompassDuotone, title: 'welcomePreviewNavTitle', text: 'welcomePreviewNavText' },
    { icon: PiCalendarDuotone, title: 'welcomePreviewScheduleTitle', text: 'welcomePreviewScheduleText' },
    { icon: PiUsersDuotone, title: 'welcomePreviewClientsTitle', text: 'welcomePreviewClientsText' },
    { icon: PiChartLineUpDuotone, title: 'welcomePreviewAnalyticsTitle', text: 'welcomePreviewAnalyticsText' },
    { icon: PiPercentDuotone, title: 'welcomePreviewDiscountsTitle', text: 'welcomePreviewDiscountsText' },
    { icon: PiStarDuotone, title: 'welcomePreviewReviewsTitle', text: 'welcomePreviewReviewsText' },
]

export default function WelcomeOnboardingModal({ isOpen, onStart, onSkip, isSubmitting }) {
    const t = useTranslations('business.onboardingTour')
    const [active, setActive] = useState(0)

    return (
        <Dialog
            className="onboarding-dialog"
            isOpen={isOpen}
            onClose={onSkip}
            closable
            width={560}
            contentClassName="p-0 overflow-hidden"
        >
            <div className="w-full max-w-full mx-auto">
                <div className="px-6 sm:px-8 pt-6 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                        REXTEN
                    </p>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('welcomeTitle')}</h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-2">{t('welcomeSubtitle')}</p>
                </div>
                <div className="px-6 sm:px-8 pb-6 pt-4">
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">{t('welcomeBody')}</p>

                    <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/60 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-3">
                            {t('welcomePreviewHint')}
                        </p>

                        <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 overflow-hidden">
                            <div className="h-2 w-1/3 rounded bg-gray-200 dark:bg-gray-700 mb-3" aria-hidden />
                            <div className="flex gap-3 min-h-[168px]">
                                <div
                                    className="grid w-[168px] shrink-0 grid-cols-2 gap-1.5 rounded-lg border border-gray-200 bg-gray-100 p-2 dark:border-gray-600 dark:bg-gray-900/80"
                                    role="presentation"
                                >
                                    {PREVIEW_KEYS.map((item, i) => {
                                        const Icon = item.icon
                                        return (
                                            <button
                                                key={item.title}
                                                type="button"
                                                onClick={() => setActive(i)}
                                                className={classNames(
                                                    'flex flex-col items-center gap-1 rounded-md px-1 py-2 text-center transition-all duration-200',
                                                    active === i
                                                        ? 'bg-gray-900 text-white shadow-sm ring-1 ring-gray-400 dark:bg-gray-100 dark:text-gray-900 dark:ring-gray-500'
                                                        : 'bg-white/90 text-gray-700 hover:bg-gray-50 dark:bg-gray-700/90 dark:text-gray-200 dark:hover:bg-gray-600',
                                                )}
                                            >
                                                <Icon className="text-lg opacity-95" aria-hidden />
                                                <span className="w-full truncate text-[10px] font-bold leading-tight">
                                                    {t(item.title)}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800/70">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={active}
                                            initial={{ opacity: 0, x: 8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -8 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {t(PREVIEW_KEYS[active].title)}
                                            </p>
                                            <p className="mt-2 text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                                                {t(PREVIEW_KEYS[active].text)}
                                            </p>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button variant="default" disabled={isSubmitting} onClick={onSkip}>
                            {t('skip')}
                        </Button>
                        <Button variant="solid" loading={isSubmitting} onClick={onStart}>
                            {t('startTour')}
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    )
}

'use client'

import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { useTranslations } from 'next-intl'
import {
    PiBriefcaseDuotone,
    PiCalendarDuotone,
    PiCreditCardDuotone,
    PiGearDuotone,
    PiLinkSimpleDuotone,
    PiStorefrontDuotone,
    PiUsersThreeDuotone,
} from 'react-icons/pi'
import classNames from '@/utils/classNames'

const PATH_STEPS = [
    { key: 'settings', icon: PiGearDuotone, dot: 'bg-blue-500', ring: 'ring-blue-500/30' },
    { key: 'services', icon: PiBriefcaseDuotone, dot: 'bg-indigo-500', ring: 'ring-indigo-500/30' },
    { key: 'team', icon: PiUsersThreeDuotone, dot: 'bg-violet-500', ring: 'ring-violet-500/30' },
    { key: 'schedule', icon: PiCalendarDuotone, dot: 'bg-amber-500', ring: 'ring-amber-500/30' },
    { key: 'marketplace', icon: PiStorefrontDuotone, dot: 'bg-sky-500', ring: 'ring-sky-500/30' },
    { key: 'payments', icon: PiCreditCardDuotone, dot: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
    { key: 'share_link', icon: PiLinkSimpleDuotone, dot: 'bg-rose-500', ring: 'ring-rose-500/30' },
]

export default function FinishOnboardingModal({ isOpen, onGoToSettings, onClose, isSubmitting }) {
    const t = useTranslations('business.onboardingTour')

    return (
        <Dialog
            className="onboarding-dialog"
            isOpen={isOpen}
            onClose={onClose}
            closable
            width={960}
            contentClassName="p-0 overflow-hidden"
        >
            <div className="w-full max-w-full mx-auto">
                <div className="px-6 sm:px-8 pt-5 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                        REXTEN
                    </p>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('finishTitle')}</h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-2">{t('finishSubtitle')}</p>
                </div>

                <div className="px-6 sm:px-8 pb-4 pt-4 sm:pb-5 sm:pt-4">
                    <div className="overflow-x-auto pb-1 -mx-1 px-1">
                        <div className="min-w-[720px] sm:min-w-0">
                            <ol className="relative flex items-start justify-between gap-0.5 sm:gap-1 pt-1">
                                <div
                                    className="pointer-events-none absolute left-[5%] right-[5%] top-5 h-0.5 rounded-full bg-gradient-to-r from-blue-500 via-violet-500 via-amber-500 via-sky-500 via-emerald-500 to-rose-500 opacity-75"
                                    aria-hidden
                                />
                                {PATH_STEPS.map((step, i) => {
                                    const Icon = step.icon
                                    return (
                                        <li
                                            key={step.key}
                                            className="relative z-10 flex min-w-0 flex-1 flex-col items-center text-center px-0.5"
                                        >
                                            <div
                                                className={classNames(
                                                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-4',
                                                    step.dot,
                                                    step.ring,
                                                )}
                                            >
                                                <Icon className="text-lg" aria-hidden />
                                            </div>
                                            <div className="mt-2 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                                {String(i + 1).padStart(2, '0')}
                                            </div>
                                            <div className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {t(`finishPath.${step.key}.title`)}
                                            </div>
                                            <p className="mt-1 text-xs font-bold leading-snug text-gray-500 dark:text-gray-400">
                                                {t(`finishPath.${step.key}.text`)}
                                            </p>
                                        </li>
                                    )
                                })}
                            </ol>
                        </div>
                    </div>

                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-4 text-center sm:text-left">
                        {t('finishFooter')}
                    </p>

                    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button variant="default" disabled={isSubmitting} onClick={onClose}>
                            {t('finishClose')}
                        </Button>
                        <Button variant="solid" loading={isSubmitting} onClick={onGoToSettings}>
                            {t('finishCta')}
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    )
}

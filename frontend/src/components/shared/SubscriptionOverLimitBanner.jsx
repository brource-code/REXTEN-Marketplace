'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import useSubscriptionLimits from '@/hooks/useSubscriptionLimits'
import { formatDateTimeFromIso } from '@/utils/dateTime'

/**
 * Постоянный баннер при превышении лимитов плана (после даунгрейда и т.п.).
 */
export default function SubscriptionOverLimitBanner({ className = '' }) {
    const t = useTranslations('business.subscription.overLimit')
    const { usage, isLoading, isOverLimit, gracePeriodEndsAt } = useSubscriptionLimits()

    if (isLoading || !usage) {
        return null
    }

    if (!isOverLimit) {
        return null
    }

    const graceDate =
        gracePeriodEndsAt && !Number.isNaN(Date.parse(gracePeriodEndsAt))
            ? formatDateTimeFromIso(gracePeriodEndsAt)
            : null

    return (
        <div
            className={`border-b border-gray-200 bg-gray-50/90 dark:border-gray-700 dark:bg-gray-900/35 ${className}`}
        >
            <div className="mx-auto flex max-w-[1400px] gap-3 px-4 py-3 sm:items-stretch">
                <div
                    className="w-1 shrink-0 self-stretch rounded-full bg-primary min-h-[2.75rem]"
                    aria-hidden
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('bannerTitle')}</p>
                        <p className="mt-0.5 text-sm font-bold text-gray-500 dark:text-gray-400">{t('bannerBody')}</p>
                        {graceDate && usage.grace_period_active ? (
                            <p className="mt-1 text-xs font-bold text-gray-900 dark:text-gray-100">
                                {t('graceEnds', { date: graceDate })}
                            </p>
                        ) : null}
                    </div>
                    <Link
                        href="/business/subscription#resolve-limits"
                        className="shrink-0 text-sm font-bold text-primary transition-colors hover:text-primary-deep hover:underline whitespace-nowrap"
                    >
                        {t('manageLimits')}
                    </Link>
                </div>
            </div>
        </div>
    )
}

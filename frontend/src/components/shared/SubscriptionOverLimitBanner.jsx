'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import useSubscriptionLimits from '@/hooks/useSubscriptionLimits'

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
            ? new Date(gracePeriodEndsAt).toLocaleString()
            : null

    return (
        <div
            className={`border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30 ${className}`}
        >
            <div className="mx-auto max-w-[1400px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('bannerTitle')}</p>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-0.5">{t('bannerBody')}</p>
                    {graceDate && usage.grace_period_active ? (
                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100 mt-1">
                            {t('graceEnds', { date: graceDate })}
                        </p>
                    ) : null}
                </div>
                <Link
                    href="/business/subscription#resolve-limits"
                    className="text-sm font-bold text-primary underline whitespace-nowrap"
                >
                    {t('manageLimits')}
                </Link>
            </div>
        </div>
    )
}

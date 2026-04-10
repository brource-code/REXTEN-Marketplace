'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import useSubscriptionLimits from '@/hooks/useSubscriptionLimits'

/**
 * Баннер при исчерпании лимита подписки (числовой ресурс).
 * @param {'team_members'|'services'|'advertisements'} resource
 */
export default function SubscriptionLimitAlert({ resource, className = '' }) {
    const t = useTranslations('business.subscription.limitReached')
    const { usage, isLoading, canCreate } = useSubscriptionLimits()

    if (isLoading || !usage) {
        return null
    }

    if (canCreate(resource)) {
        return null
    }

    const messageKey =
        resource === 'team_members'
            ? 'teamMembers'
            : resource === 'services'
              ? 'services'
              : 'advertisements'

    return (
        <div
            className={`rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40 ${className}`}
        >
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('title')}</p>
            <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">{t(messageKey)}</p>
            <Link
                href="/business/subscription"
                className="mt-3 inline-block text-sm font-bold text-primary underline"
            >
                {t('upgrade')}
            </Link>
        </div>
    )
}

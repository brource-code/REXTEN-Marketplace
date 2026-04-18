'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import useSubscriptionLimits from '@/hooks/useSubscriptionLimits'
import useBusinessStore from '@/store/businessStore'
import { formatDate } from '@/utils/dateTime'

/**
 * Баннер при исчерпании лимита подписки (числовой ресурс).
 * Если пользователь уже запланировал даунгрейд — показываем другой текст
 * (не «Upgrade!», а «Уберите лишнее до даты X»), это согласуется с уже принятым
 * решением о понижении плана.
 *
 * @param {'team_members'|'services'|'advertisements'} resource
 */
export default function SubscriptionLimitAlert({ resource, className = '' }) {
    const t = useTranslations('business.subscription.limitReached')
    const { usage, isLoading, canCreate } = useSubscriptionLimits()
    const { settings } = useBusinessStore()
    const tz = settings?.timezone || 'America/Los_Angeles'

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

    const hasScheduledDowngrade = Boolean(usage.scheduled_plan)
    const endDate = usage.current_period_end
        ? formatDate(usage.current_period_end, tz, 'short')
        : null

    return (
        <div
            className={`rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40 ${className}`}
        >
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('title')}</p>
            {hasScheduledDowngrade ? (
                <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                    {endDate
                        ? t('scheduledDowngradeWithDate', {
                              endDate,
                              resource: t(messageKey),
                          })
                        : t('scheduledDowngrade', { resource: t(messageKey) })}
                </p>
            ) : (
                <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                    {t(messageKey)}
                </p>
            )}
            <Link
                href="/business/subscription"
                className="mt-3 inline-block text-sm font-bold text-primary underline"
            >
                {hasScheduledDowngrade ? t('manageSubscription') : t('upgrade')}
            </Link>
        </div>
    )
}

'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function RoutesHelpBanner() {
    const t = useTranslations('business.routes')

    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('helpIntro')}</p>
            <div className="flex flex-wrap gap-2">
                <Link
                    href="/business/schedule"
                    className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                    {t('ctaSchedule')}
                </Link>
                <Link
                    href="/business/bookings"
                    className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-bold border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    {t('ctaBookings')}
                </Link>
                <Link
                    href="/business/settings"
                    className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-bold border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    {t('ctaSettingsTeam')}
                </Link>
            </div>
        </div>
    )
}

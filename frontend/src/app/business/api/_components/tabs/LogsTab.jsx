'use client'

import { useTranslations } from 'next-intl'

export default function LogsTab() {
    const t = useTranslations('business.api')

    return (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center dark:border-gray-600 dark:bg-gray-900/40">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('tabs.logs')}</p>
            <p className="mt-2 text-sm font-bold text-gray-900 dark:text-gray-100">{t('tabs.comingSoon')}</p>
        </div>
    )
}

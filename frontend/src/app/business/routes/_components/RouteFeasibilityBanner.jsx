'use client'

import { useTranslations } from 'next-intl'

/**
 * @param {{ issues: import('@/lib/api/business').BusinessRouteFeasibilityIssue[] | undefined }} props
 */
export default function RouteFeasibilityBanner({ issues }) {
    const t = useTranslations('business.routes.issues')
    const n = Array.isArray(issues) ? issues.length : 0
    if (n <= 0) {
        return null
    }
    return (
        <div
            className="rounded-lg border border-amber-200/90 dark:border-amber-800/60 bg-amber-50/90 dark:bg-amber-950/35 px-3 py-2.5"
            role="status"
        >
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">{t('banner', { count: n })}</p>
        </div>
    )
}

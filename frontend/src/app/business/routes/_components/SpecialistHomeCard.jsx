'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

/**
 * @param {{ specialist: import('@/lib/api/business').BusinessRouteSpecialistInfo }} props
 */
export default function SpecialistHomeCard({ specialist }) {
    const t = useTranslations('business.routes')

    const hasCoords =
        specialist?.home_latitude != null &&
        specialist?.home_longitude != null &&
        Number.isFinite(specialist.home_latitude) &&
        Number.isFinite(specialist.home_longitude)

    const hasAddress = Boolean(specialist?.home_address?.trim())

    if (hasCoords) {
        return (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 px-3 py-2.5">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('homeBase')}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                    {hasAddress ? specialist.home_address : t('homeBaseOnMap')}
                </p>
            </div>
        )
    }

    return (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2.5">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('addHomeAddress')}</p>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('addHomeAddressHint')}</p>
            <Link
                href="/business/settings?tab=team"
                className="inline-block mt-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
                {t('openTeamSettings')}
            </Link>
        </div>
    )
}

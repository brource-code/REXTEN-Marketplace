'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { formatMilesOneDecimalFromMeters } from '../_utils/routeMiles'

const US_LOCALE = 'en-US'

function formatDateShort(ymd, locale) {
    if (!ymd || typeof ymd !== 'string') return '—'
    try {
        const [y, m, d] = ymd.split('-').map(Number)
        const dt = new Date(y, m - 1, d)
        return new Intl.DateTimeFormat(locale || US_LOCALE, {
            weekday: 'short',
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
        }).format(dt)
    } catch {
        return ymd
    }
}

/**
 * @param {{
 *   items: import('@/lib/api/business').BusinessRouteSavedSummary[]
 *   currentDate: string
 *   onSelectDate: (ymd: string) => void
 *   isLoading?: boolean
 * }} props
 */
export default function RouteSavedRoutesPanel({ items, currentDate, onSelectDate, isLoading }) {
    const t = useTranslations('business.routes.savedRoutes')
    const ts = useTranslations('business.routes.status')

    const rows = useMemo(() => {
        const list = Array.isArray(items) ? [...items] : []
        return list.sort((a, b) => (b.route_date || '').localeCompare(a.route_date || ''))
    }, [items])

    if (isLoading) {
        return (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-3">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('loading')}</p>
            </div>
        )
    }

    if (rows.length === 0) {
        return (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-3">
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('empty')}</p>
            </div>
        )
    }

    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-3 shadow-sm">
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5 mb-2">{t('hint')}</p>
            <ul className="flex flex-col gap-1 pr-0.5">
                {rows.map((row) => {
                    const active = row.route_date === currentDate
                    const mi = formatMilesOneDecimalFromMeters(row.total_distance_meters)
                    const min =
                        row.total_duration_seconds != null
                            ? String(Math.max(1, Math.round(row.total_duration_seconds / 60)))
                            : '—'
                    const label = formatDateShort(row.route_date, US_LOCALE)
                    return (
                        <li key={row.id}>
                            <button
                                type="button"
                                onClick={() => onSelectDate(row.route_date)}
                                className={`w-full text-left rounded-md px-2 py-2 border transition-colors ${
                                    active
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-400'
                                        : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/80'
                                }`}
                            >
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                                        {label}
                                    </span>
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                        {ts(row.status)}
                                    </span>
                                </div>
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                                    {t('lineStats', {
                                        mi: mi ?? '—',
                                        min,
                                        visits: row.booking_stops_count ?? 0,
                                    })}
                                </div>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

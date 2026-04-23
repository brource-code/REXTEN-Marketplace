'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { formatMilesOneDecimalFromMeters } from '../_utils/routeMiles'
import { formatDurationMinutesI18n } from '@/utils/formatDurationMinutesI18n'

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

function RouteRow({ row, active, ts, t, tDur, onSelectDate }) {
    const mi = formatMilesOneDecimalFromMeters(row.total_distance_meters)
    const duration =
        row.total_duration_seconds != null
            ? formatDurationMinutesI18n(Math.max(1, Math.round(row.total_duration_seconds / 60)), tDur)
            : '—'
    const label = formatDateShort(row.route_date, US_LOCALE)
    return (
        <li>
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
                        duration,
                        visits: row.booking_stops_count ?? 0,
                    })}
                </div>
            </button>
        </li>
    )
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
    const tg = useTranslations('business.routes.savedRoutesGroups')
    const ts = useTranslations('business.routes.status')
    const tDur = useTranslations('common.durationMinutes')

    const { active, empty } = useMemo(() => {
        const list = Array.isArray(items) ? [...items] : []
        list.sort((a, b) => (b.route_date || '').localeCompare(a.route_date || ''))
        const activeRows = []
        const emptyRows = []
        for (const r of list) {
            if ((r.booking_stops_count ?? 0) > 0) {
                activeRows.push(r)
            } else {
                emptyRows.push(r)
            }
        }
        return { active: activeRows, empty: emptyRows }
    }, [items])

    if (isLoading) {
        return (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-3">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('loading')}</p>
            </div>
        )
    }

    if (active.length === 0 && empty.length === 0) {
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

            {active.length > 0 ? (
                <details open className="group mt-2">
                    <summary className="flex cursor-pointer select-none items-center justify-between rounded-md px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {tg('active')}{' '}
                            <span className="text-gray-500 dark:text-gray-400">({active.length})</span>
                        </span>
                        <svg
                            className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden
                        >
                            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </summary>
                    <ul className="flex flex-col gap-1 pr-0.5 mt-1">
                        {active.map((row) => (
                            <RouteRow
                                key={row.id}
                                row={row}
                                active={row.route_date === currentDate}
                                ts={ts}
                                t={t}
                                tDur={tDur}
                                onSelectDate={onSelectDate}
                            />
                        ))}
                    </ul>
                </details>
            ) : null}

            {empty.length > 0 ? (
                <details className="group mt-2">
                    <summary className="flex cursor-pointer select-none items-center justify-between rounded-md px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {tg('empty')}{' '}
                            <span className="text-gray-500 dark:text-gray-400">({empty.length})</span>
                        </span>
                        <svg
                            className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden
                        >
                            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </summary>
                    <ul className="flex flex-col gap-1 pr-0.5 mt-1">
                        {empty.map((row) => (
                            <RouteRow
                                key={row.id}
                                row={row}
                                active={row.route_date === currentDate}
                                ts={ts}
                                t={t}
                                tDur={tDur}
                                onSelectDate={onSelectDate}
                            />
                        ))}
                    </ul>
                </details>
            ) : null}
        </div>
    )
}

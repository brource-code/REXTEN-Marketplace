'use client'

import { useTranslations } from 'next-intl'
import { PiMapTrifold, PiArrowRight, PiClock, PiPath, PiLockKey } from 'react-icons/pi'
import { formatDurationMinutesI18n } from '@/utils/formatDurationMinutesI18n'

const formatDistance = (meters) => {
    if (meters == null) return '—'
    const km = meters / 1000
    if (km >= 10) return `${Math.round(km)} km`
    return `${km.toFixed(1)} km`
}

/**
 * Баннер маршрута дня — отображается в Day-view, когда выбран специалист.
 * Один компактный ряд: иконка → имя → метрики → CTA. Не перегружает экран.
 */
const ScheduleRouteBanner = ({
    specialistName,
    route,
    bookingsCount,
    locked,
    onOpen,
}) => {
    const t = useTranslations('business.schedule.routeBanner')
    const tDur = useTranslations('common.durationMinutes')

    if (locked) {
        return (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-amber-300 dark:border-amber-500/40 bg-amber-50/60 dark:bg-amber-500/5 px-4 py-2.5 text-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300">
                    <PiLockKey className="text-base" />
                </span>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                        {t('title', { name: specialistName || '—' })}
                    </div>
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('lockedHint')}</div>
                </div>
                <button
                    type="button"
                    onClick={onOpen}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-300 dark:border-amber-500/40 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                >
                    {t('openButton')}
                    <PiArrowRight className="text-sm" />
                </button>
            </div>
        )
    }

    if (!route) {
        return (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 px-4 py-2.5 text-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400">
                    <PiMapTrifold className="text-base" />
                </span>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                        {t('title', { name: specialistName || '—' })}
                    </div>
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        {bookingsCount > 0 ? t('buildHint') : t('noRoute')}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onOpen}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                >
                    {t('openButton')}
                    <PiArrowRight className="text-sm" />
                </button>
            </div>
        )
    }

    const stops = Array.isArray(route.stops) ? route.stops.length : (route.booking_stops_count ?? bookingsCount)

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--primary)]/25 dark:border-[var(--primary)]/30 bg-[var(--primary-subtle)] px-4 py-2.5 text-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
                <PiMapTrifold className="text-base" />
            </span>
            <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 dark:text-gray-100 truncate">
                    {t('title', { name: specialistName || '—' })}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-bold text-gray-600 dark:text-gray-300">
                    <span className="inline-flex items-center gap-1">
                        <PiPath className="text-sm" />
                        {t('stops', { count: stops })}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                        <span aria-hidden>·</span>
                        {formatDistance(route.total_distance_meters)}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                        <PiClock className="text-sm" />
                        {route.total_duration_seconds == null || !Number.isFinite(Number(route.total_duration_seconds))
                            ? '—'
                            : formatDurationMinutesI18n(
                                  Math.max(1, Math.round(Number(route.total_duration_seconds) / 60)),
                                  tDur,
                              )}
                    </span>
                </div>
            </div>
            <button
                type="button"
                onClick={onOpen}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-deep shadow-sm transition-colors"
            >
                {t('openButton')}
                <PiArrowRight className="text-sm" />
            </button>
        </div>
    )
}

export default ScheduleRouteBanner

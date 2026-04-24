'use client'

import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import RouteStatusBadge from './RouteStatusBadge'
import { formatMilesOneDecimalFromMeters } from '../_utils/routeMiles'
import { formatDurationMinutesI18n } from '@/utils/formatDurationMinutesI18n'

function formatMiles(meters) {
    if (meters == null) return '—'
    return formatMilesOneDecimalFromMeters(meters) ?? '—'
}

/**
 * Шапка над картой: бейдж статуса + метрики маршрута + Optimize/Actions.
 *
 * @param {{
 *   status: string
 *   statusLabel: string
 *   distanceMeters: number | null
 *   durationSeconds: number | null
 *   visitsCount: number
 *   onOptimize: () => void
 *   onRecalculate: () => void
 *   optimizing: boolean
 *   recalculating: boolean
 *   updatingIncluded: boolean
 *   canManage: boolean
 *   recalculateDisabled: boolean
 *   lateMinutesTotal?: number
 *   idleMinutesTotal?: number
 * }} props
 */
export default function RouteMapHeader({
    status,
    statusLabel,
    distanceMeters,
    durationSeconds,
    visitsCount,
    onOptimize,
    onRecalculate,
    optimizing,
    recalculating,
    updatingIncluded,
    canManage,
    recalculateDisabled,
    lateMinutesTotal = 0,
    idleMinutesTotal = 0,
}) {
    const t = useTranslations('business.routes')
    const tDur = useTranslations('common.durationMinutes')

    const durationLabel =
        durationSeconds == null || !Number.isFinite(Number(durationSeconds))
            ? '—'
            : formatDurationMinutesI18n(Math.max(1, Math.round(Number(durationSeconds) / 60)), tDur)

    const lateN = Number(lateMinutesTotal) || 0
    const idleN = Number(idleMinutesTotal) || 0
    const visitsLabel = t('metricsVisits', { count: visitsCount })

    const lateIdleBlock =
        lateN > 0 || idleN > 0 ? (
            <div className="flex w-full min-w-0 flex-col gap-0.5 text-sm font-bold text-amber-800 dark:text-amber-200 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
                {lateN > 0 ? (
                    <span className="min-w-0 tabular-nums sm:whitespace-normal">
                        {t('headerLateness', {
                            duration: formatDurationMinutesI18n(Math.max(1, lateN), tDur),
                        })}
                    </span>
                ) : null}
                {lateN > 0 && idleN > 0 ? (
                    <span className="hidden text-amber-700/80 dark:text-amber-300/80 sm:inline" aria-hidden>
                        ·
                    </span>
                ) : null}
                {idleN > 0 ? (
                    <span className="min-w-0 tabular-nums sm:whitespace-normal">
                        {t('headerIdle', {
                            duration: formatDurationMinutesI18n(Math.max(1, idleN), tDur),
                        })}
                    </span>
                ) : null}
            </div>
        ) : null

    const metricText = 'text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums'
    const dotClass = 'text-sm font-bold text-gray-400 dark:text-gray-500 select-none'

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-2.5 shadow-sm sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="flex w-full min-w-0 flex-col gap-1 sm:flex-1">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                    <div className="shrink-0">
                        <RouteStatusBadge status={status} label={statusLabel} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className={`${metricText} whitespace-nowrap`}>
                            {formatMiles(distanceMeters)} {t('unitMi')}
                        </span>
                        <span className={dotClass} aria-hidden>
                            ·
                        </span>
                        <span className={`${metricText} whitespace-nowrap`}>{durationLabel}</span>
                        <span className={dotClass} aria-hidden>
                            ·
                        </span>
                        <span className={`${metricText} whitespace-nowrap`}>{visitsLabel}</span>
                    </div>
                </div>
                {lateIdleBlock}
            </div>

            <div className="flex w-full min-w-0 shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
                <Button
                    size="sm"
                    variant="solid"
                    className="min-w-0 flex-1 sm:flex-initial"
                    loading={optimizing}
                    disabled={updatingIncluded || !canManage}
                    onClick={onOptimize}
                >
                    {t('optimize')}
                </Button>
                <Dropdown
                    placement="bottom-end"
                    menuClass="min-w-[200px]"
                    toggleClassName="min-w-0 w-full flex-1 sm:w-auto sm:flex-initial"
                    renderTitle={
                        <Button size="sm" variant="default" className="w-full sm:w-auto" disabled={!canManage}>
                            {t('actions')}
                        </Button>
                    }
                >
                    <Dropdown.Item
                        eventKey="recalculate"
                        disabled={recalculateDisabled || recalculating}
                        onClick={onRecalculate}
                    >
                        {t('recalculate')}
                        {recalculating ? ' …' : ''}
                    </Dropdown.Item>
                </Dropdown>
            </div>
        </div>
    )
}

'use client'

import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import RouteStatusBadge from './RouteStatusBadge'
import { formatMilesOneDecimalFromMeters } from '../_utils/routeMiles'

function formatMiles(meters) {
    if (meters == null) return '—'
    return formatMilesOneDecimalFromMeters(meters) ?? '—'
}

function formatMin(seconds) {
    if (seconds == null) return '—'
    return String(Math.round(seconds / 60))
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
}) {
    const t = useTranslations('business.routes')

    const metricsLine = t('metricsLine', {
        mi: formatMiles(distanceMeters),
        min: formatMin(durationSeconds),
        visits: visitsCount,
    })

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-2.5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 min-w-0">
                <RouteStatusBadge status={status} label={statusLabel} />
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    {metricsLine}
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    size="sm"
                    variant="solid"
                    loading={optimizing}
                    disabled={updatingIncluded || !canManage}
                    onClick={onOptimize}
                >
                    {t('optimize')}
                </Button>
                <Dropdown
                    placement="bottom-end"
                    menuClass="min-w-[200px]"
                    renderTitle={
                        <Button size="sm" variant="default" disabled={!canManage}>
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

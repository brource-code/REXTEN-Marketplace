'use client'

import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import { formatMilesDeltaFromMeters, formatMilesOneDecimalFromKm } from '../_utils/routeMiles'
import { formatDurationMinutesI18n } from '@/utils/formatDurationMinutesI18n'

function resolveOutcome(preview) {
    const o = preview?.comparison?.outcome
    if (
        o === 'improved' ||
        o === 'worse' ||
        o === 'tie' ||
        o === 'unchanged_order' ||
        o === 'insufficient_data'
    ) {
        return o
    }
    const c = preview?.comparison
    if (!c?.jobs_reordered) {
        return 'unchanged_order'
    }
    const dm = c.distance_change_meters ?? 0
    if (dm > 0) {
        return 'improved'
    }
    if (dm < 0) {
        return 'worse'
    }
    return 'tie'
}

export default function RoutePreviewPanel({ preview, onApply, onCancel, applying, applyDisabled = false }) {
    const t = useTranslations('business.routes')
    const tp = useTranslations('business.routes.preview')
    const tc = useTranslations('business.routes.preview.confidence')
    const tDur = useTranslations('common.durationMinutes')

    if (!preview) {
        return null
    }

    const conf = preview.confidence
    const confLabel = conf === 'high' ? tc('high') : conf === 'medium' ? tc('medium') : tc('low')
    const outcome = resolveOutcome(preview)
    const dm = preview.comparison?.distance_change_meters ?? 0
    const pctRaw = Number(preview.comparison?.distance_change_percent ?? 0)
    const pctDisplay = Math.abs(pctRaw).toFixed(2)
    const miDisplay = formatMilesDeltaFromMeters(Math.abs(dm))
    const lateCh = preview.comparison?.late_change_seconds
    const idleCh = preview.comparison?.idle_change_seconds
    const showWindowMetrics =
        (typeof lateCh === 'number' && lateCh !== 0) || (typeof idleCh === 'number' && idleCh !== 0)

    return (
        <div className="space-y-3">
            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tp('title')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{tp('current')}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {tp('routeSummaryLine', {
                            mi: formatMilesOneDecimalFromKm(preview.current?.total_distance_km),
                            duration: formatDurationMinutesI18n(
                                preview.current?.total_duration_min ?? 0,
                                tDur,
                            ),
                        })}
                    </p>
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{tp('proposed')}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {tp('routeSummaryLine', {
                            mi: formatMilesOneDecimalFromKm(preview.proposed?.total_distance_km),
                            duration: formatDurationMinutesI18n(
                                preview.proposed?.total_duration_min ?? 0,
                                tDur,
                            ),
                        })}
                    </p>
                </div>
            </div>
            {outcome === 'insufficient_data' && (
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{tp('insufficientData')}</p>
            )}
            {outcome === 'unchanged_order' && (
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{tp('noChanges')}</p>
            )}
            {outcome === 'improved' && (
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    {tp('savings')}:{' '}
                    <span className="text-gray-900 dark:text-gray-100">
                        {tp('savingsDistance', {
                            mi: miDisplay,
                            pct: pctDisplay,
                        })}
                    </span>
                </p>
            )}
            {outcome === 'worse' && (
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    {tp('extraDistance')}:{' '}
                    <span className="text-gray-900 dark:text-gray-100">
                        {tp('savingsDistance', {
                            mi: miDisplay,
                            pct: pctDisplay,
                        })}
                    </span>
                </p>
            )}
            {outcome === 'tie' && (
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{tp('summaryTie')}</p>
            )}
            {showWindowMetrics ? (
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 space-y-1">
                    {typeof lateCh === 'number' && lateCh !== 0 ? (
                        <p>
                            {tp('lateChange')}:{' '}
                            <span className="text-gray-900 dark:text-gray-100 tabular-nums">
                                {lateCh > 0 ? '−' : '+'}
                                {formatDurationMinutesI18n(Math.max(1, Math.round(Math.abs(lateCh) / 60)), tDur)}
                            </span>
                        </p>
                    ) : null}
                    {typeof idleCh === 'number' && idleCh !== 0 ? (
                        <p>
                            {tp('idleChange')}:{' '}
                            <span className="text-gray-900 dark:text-gray-100 tabular-nums">
                                {idleCh > 0 ? '−' : '+'}
                                {formatDurationMinutesI18n(Math.max(1, Math.round(Math.abs(idleCh) / 60)), tDur)}
                            </span>
                        </p>
                    ) : null}
                </div>
            ) : null}
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{confLabel}</p>
            {outcome === 'improved' && (
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{tp('summaryImproved')}</p>
            )}
            {outcome === 'worse' && (
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{tp('summaryWorse')}</p>
            )}
            {preview.warnings?.length > 0 && (
                <ul className="text-sm font-bold text-amber-700 dark:text-amber-300 list-disc list-inside">
                    {preview.warnings.map((w, i) => (
                        <li key={i}>{w.message}</li>
                    ))}
                </ul>
            )}
            <div className="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    variant="solid"
                    loading={applying}
                    disabled={applyDisabled}
                    onClick={onApply}
                >
                    {t('apply')}
                </Button>
                <Button size="sm" variant="plain" onClick={onCancel}>
                    {t('cancel')}
                </Button>
            </div>
        </div>
    )
}

'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Loading from '@/components/shared/Loading'
import Dialog from '@/components/ui/Dialog'
import RouteMap from './RouteMap'
import RouteStatusBadge from './RouteStatusBadge'
import RoutePreviewPanel from './RoutePreviewPanel'
import SpecialistHomeCard from './SpecialistHomeCard'
import RouteDayBookingsPanel from './RouteDayBookingsPanel'
import RouteTimeline from './RouteTimeline'
import RouteSavedRoutesPanel from './RouteSavedRoutesPanel'
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
 * @param {{
 *   route: import('@/lib/api/business').BusinessRoute
 *   isLoading: boolean
 *   preview: import('@/lib/api/business').BusinessRoutePreview | null
 *   previewOpen: boolean
 *   onOptimizePreview: () => void
 *   onPreviewApply: () => void
 *   onPreviewClose: () => void
 *   onRecalculate: () => void
 *   applying: boolean
 *   recalculating: boolean
 *   optimizingPreview: boolean
 *   onUpdateIncluded: (bookingIds: number[] | null) => void
 *   updatingIncluded: boolean
 *   onOpenBooking?: (bookingId: number) => void
 *   includeReturnLeg: boolean
 *   onIncludeReturnLegChange: (value: boolean) => void
 *   updatingReturnLeg?: boolean
 *   selectedDate: string
 *   savedRoutes: import('@/lib/api/business').BusinessRouteSavedSummary[]
 *   savedRoutesLoading?: boolean
 *   onSelectSavedDate: (ymd: string) => void
 *   canManageRoutes?: boolean
 * }} props
 */
export default function RouteContent({
    route,
    isLoading,
    preview,
    previewOpen,
    onOptimizePreview,
    onPreviewApply,
    onPreviewClose,
    onRecalculate,
    applying,
    recalculating,
    optimizingPreview,
    onUpdateIncluded,
    updatingIncluded,
    onOpenBooking,
    includeReturnLeg,
    onIncludeReturnLegChange,
    updatingReturnLeg,
    selectedDate,
    savedRoutes,
    savedRoutesLoading,
    onSelectSavedDate,
    canManageRoutes = true,
}) {
    const t = useTranslations('business.routes')
    const ts = useTranslations('business.routes.status')

    const canShowReturnLegToggle = useMemo(() => {
        if (!route) return false
        const bookingStops = (route.stops ?? []).filter((s) => s.stop_type === 'booking')
        return bookingStops.length > 0
    }, [route])

    const endStopForMetrics = useMemo(
        () => (route?.stops ?? []).find((s) => s.stop_type === 'end'),
        [route],
    )

    const displayedDistanceMeters = useMemo(() => {
        if (!route) return null
        if (includeReturnLeg) return route.total_distance_meters
        const leg = endStopForMetrics?.distance_from_prev_meters
        if (leg == null) return route.total_distance_meters
        return Math.max(0, Number(route.total_distance_meters ?? 0) - Number(leg))
    }, [route, includeReturnLeg, endStopForMetrics])

    const displayedDurationSeconds = useMemo(() => {
        if (!route) return null
        if (includeReturnLeg) return route.total_duration_seconds
        const sec = endStopForMetrics?.duration_from_prev_seconds
        if (sec == null) return route.total_duration_seconds
        return Math.max(0, Number(route.total_duration_seconds ?? 0) - Number(sec))
    }, [route, includeReturnLeg, endStopForMetrics])

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loading loading />
            </div>
        )
    }

    if (!route) {
        return <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('errors.loadFailed')}</p>
    }

    const status = route.status
    const statusLabel = ts(status)
    const dayBookings = route.day_bookings ?? []
    const specialist = route.specialist
    const bookingStopsCount = (route.stops ?? []).filter((s) => s.stop_type === 'booking').length

    return (
        <>
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                    <RouteStatusBadge status={status} label={statusLabel} />
                </div>

                <div className="flex flex-wrap gap-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('totalDistance')}</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {formatMiles(displayedDistanceMeters)} {t('unitMi')}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('totalDuration')}</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {formatMin(displayedDurationSeconds)} min
                        </p>
                    </div>
                </div>

                <div className="flex min-h-0 flex-col lg:h-[min(85vh,900px)] lg:min-h-[360px] lg:flex-row lg:gap-6 lg:items-stretch">
                    <div className="flex min-h-0 max-h-[min(72vh,640px)] flex-col gap-4 overflow-y-auto overscroll-contain min-w-0 flex-1 scroll-py-2 lg:max-h-none lg:h-full lg:max-w-xl lg:shrink-0 lg:pr-1">
                        {specialist ? <SpecialistHomeCard specialist={specialist} /> : null}

                        <RouteDayBookingsPanel
                            dayBookings={dayBookings}
                            includedBookingIds={route.included_booking_ids ?? null}
                            updatingSelection={updatingIncluded}
                            onToggle={onUpdateIncluded}
                            onOpenBooking={onOpenBooking}
                            selectionReadOnly={!canManageRoutes}
                        />

                        {canShowReturnLegToggle ? (
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                        checked={includeReturnLeg}
                                        disabled={updatingReturnLeg || !canManageRoutes}
                                        onChange={(e) => onIncludeReturnLegChange(e.target.checked)}
                                    />
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {t('routeIncludeReturnLeg')}
                                        {updatingReturnLeg ? ' ...' : ''}
                                    </span>
                                </label>
                            </div>
                        ) : null}

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                size="sm"
                                variant="solid"
                                loading={optimizingPreview}
                                disabled={updatingIncluded || !canManageRoutes}
                                onClick={onOptimizePreview}
                            >
                                {t('optimize')}
                            </Button>
                            <Button
                                size="sm"
                                variant="plain"
                                loading={recalculating}
                                disabled={!route.id || updatingIncluded || !canManageRoutes}
                                onClick={onRecalculate}
                            >
                                {t('recalculate')}
                            </Button>
                        </div>

                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            {t('helpCompact')}{' '}
                            <Link
                                href="/business/schedule"
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                {t('ctaSchedule')}
                            </Link>
                            {' · '}
                            <Link
                                href="/business/bookings"
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                {t('ctaBookings')}
                            </Link>
                        </p>

                        {bookingStopsCount <= 1 ? (
                            <p className="text-xs font-bold text-amber-800/90 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-lg px-3 py-2">
                                {t('optimizeSingleVisitHint')}
                            </p>
                        ) : null}

                        <RouteTimeline route={route} includeReturnLeg={includeReturnLeg} />
                    </div>

                    <div className="flex min-h-0 max-h-[min(72vh,640px)] min-w-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain scroll-py-2 lg:max-h-none lg:h-full lg:pr-1">
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 shrink-0">{t('mapSection')}</p>
                        <div className="w-full min-h-[280px] shrink-0">
                            <RouteMap
                                stops={route.stops}
                                pathLngLat={route.path_lng_lat}
                                minHeight={480}
                                includeReturnLeg={includeReturnLeg}
                            />
                        </div>
                        <RouteSavedRoutesPanel
                            items={savedRoutes ?? []}
                            currentDate={selectedDate}
                            onSelectDate={onSelectSavedDate}
                            isLoading={savedRoutesLoading}
                        />
                    </div>
                </div>
            </div>

            <Dialog isOpen={previewOpen && !!preview} onClose={onPreviewClose} width={560} closable>
                <div className="p-6 max-h-[85vh] overflow-y-auto">
                    {preview ? (
                        <RoutePreviewPanel
                            preview={preview}
                            applying={applying}
                            applyDisabled={!canManageRoutes}
                            onApply={onPreviewApply}
                            onCancel={onPreviewClose}
                        />
                    ) : null}
                </div>
            </Dialog>
        </>
    )
}

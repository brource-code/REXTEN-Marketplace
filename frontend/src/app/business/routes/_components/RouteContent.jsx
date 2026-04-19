'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Loading from '@/components/shared/Loading'
import Dialog from '@/components/ui/Dialog'
import RouteMap from './RouteMap'
import RoutePreviewPanel from './RoutePreviewPanel'
import RouteSidebar from './RouteSidebar'
import RouteMapHeader from './RouteMapHeader'

/**
 * @param {{
 *   route: import('@/lib/api/business').BusinessRoute
 *   isLoading: boolean
 *   teamMembers: Array<{ id: number, name?: string }>
 *   specialistId: number | null
 *   onSpecialistChange: (id: number | null) => void
 *   date: string
 *   onDateChange: (ymd: string) => void
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
    teamMembers,
    specialistId,
    onSpecialistChange,
    date,
    onDateChange,
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

    const status = route?.status
    const statusLabel = status ? ts(status) : ''
    const bookingStopsCount = route
        ? (route.stops ?? []).filter((s) => s.stop_type === 'booking').length
        : 0

    return (
        <>
            <div className="flex min-h-0 flex-col gap-4 lg:h-[calc(100dvh-220px)] lg:min-h-[560px] lg:max-h-[1600px] lg:flex-row lg:items-stretch">
                <section className="order-1 flex min-h-0 min-w-0 flex-col gap-3 lg:order-2 lg:flex-1 lg:h-full">
                    {isLoading ? (
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 min-h-[55vh] lg:min-h-0">
                            <Loading loading />
                        </div>
                    ) : !route ? (
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 min-h-[55vh] lg:min-h-0 px-6 text-center">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('errors.loadFailed')}
                            </p>
                        </div>
                    ) : (
                        <>
                            <RouteMapHeader
                                status={status}
                                statusLabel={statusLabel}
                                distanceMeters={displayedDistanceMeters}
                                durationSeconds={displayedDurationSeconds}
                                visitsCount={bookingStopsCount}
                                onOptimize={onOptimizePreview}
                                onRecalculate={onRecalculate}
                                optimizing={optimizingPreview}
                                recalculating={recalculating}
                                updatingIncluded={updatingIncluded}
                                canManage={canManageRoutes}
                                recalculateDisabled={!route.id}
                            />

                            <div className="flex h-[58vh] min-h-[360px] flex-col lg:h-auto lg:min-h-0 lg:flex-1">
                                <RouteMap
                                    stops={route.stops}
                                    pathLngLat={route.path_lng_lat}
                                    includeReturnLeg={includeReturnLeg}
                                    fill
                                    onOpenBooking={onOpenBooking}
                                    displayTimezone={route.display_timezone}
                                />
                            </div>
                        </>
                    )}
                </section>

                <aside className="order-2 flex min-h-0 min-w-0 flex-col lg:order-1 lg:w-[400px] lg:shrink-0 lg:h-full">
                    <RouteSidebar
                        teamMembers={teamMembers}
                        specialistId={specialistId}
                        onSpecialistChange={onSpecialistChange}
                        date={date}
                        onDateChange={onDateChange}
                        route={route}
                        canShowReturnLegToggle={canShowReturnLegToggle}
                        includeReturnLeg={includeReturnLeg}
                        onIncludeReturnLegChange={onIncludeReturnLegChange}
                        updatingReturnLeg={updatingReturnLeg}
                        canManageRoutes={canManageRoutes}
                        updatingIncluded={updatingIncluded}
                        onUpdateIncluded={onUpdateIncluded}
                        onOpenBooking={onOpenBooking}
                        bookingStopsCount={bookingStopsCount}
                        savedRoutes={savedRoutes}
                        savedRoutesLoading={savedRoutesLoading}
                        onSelectSavedDate={onSelectSavedDate}
                        selectedDate={selectedDate}
                    />
                </aside>
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

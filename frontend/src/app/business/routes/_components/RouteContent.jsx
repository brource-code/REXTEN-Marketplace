'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Loading from '@/components/shared/Loading'
import Dialog from '@/components/ui/Dialog'
import RouteMap from './RouteMap'
import RoutePreviewPanel from './RoutePreviewPanel'
import RouteSidebar from './RouteSidebar'
import RouteMapHeader from './RouteMapHeader'
import RouteAssistantPanel from './RouteAssistantPanel'

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

    const { lateMinutesTotal, idleMinutesTotal } = useMemo(() => {
        if (!route) {
            return { lateMinutesTotal: 0, idleMinutesTotal: 0 }
        }
        if (
            typeof route.late_minutes_total === 'number' &&
            typeof route.idle_minutes_total === 'number'
        ) {
            return {
                lateMinutesTotal: Math.max(0, route.late_minutes_total),
                idleMinutesTotal: Math.max(0, route.idle_minutes_total),
            }
        }
        let late = 0
        let idle = 0
        for (const s of route.stops ?? []) {
            if (s.stop_type !== 'booking') continue
            const sec = Number(s.late_seconds ?? 0)
            if (sec > 0) {
                late += Math.max(1, Math.round(sec / 60))
            }
            const w = Number(s.wait_before_seconds ?? 0)
            if (w > 0) {
                idle += Math.max(1, Math.round(w / 60))
            }
        }
        return { lateMinutesTotal: late, idleMinutesTotal: idle }
    }, [route])

    return (
        <>
            <div className="flex min-h-0 min-w-0 flex-col gap-4 xl:h-[calc(100dvh-220px)] xl:min-h-[560px] xl:max-h-[1600px] xl:flex-row xl:items-stretch xl:overflow-hidden">
                <section className="order-1 flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden xl:order-2 xl:h-full xl:flex-1 xl:basis-0">
                    {isLoading ? (
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 min-h-[55vh] xl:min-h-0">
                            <Loading loading />
                        </div>
                    ) : !route ? (
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 min-h-[55vh] xl:min-h-0 px-6 text-center">
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
                                lateMinutesTotal={lateMinutesTotal}
                                idleMinutesTotal={idleMinutesTotal}
                            />

                            <div className="flex h-[58vh] min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden xl:h-auto xl:min-h-0 xl:flex-1">
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

                <aside className="order-2 flex min-h-0 min-w-0 flex-col xl:order-1 xl:h-full xl:w-[400px] xl:max-w-[400px] xl:shrink-0 xl:flex-none">
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
                <aside className="order-3 flex min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden xl:order-3 xl:h-full xl:min-h-0 xl:w-80 xl:max-w-[20rem] xl:flex-none">
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden pr-0.5 max-xl:overflow-y-auto xl:h-full xl:overflow-hidden">
                        <RouteAssistantPanel
                            key={`${specialistId ?? 'none'}|${date}`}
                            specialistId={specialistId}
                            date={date}
                            displayTimezone={route?.display_timezone ?? null}
                            onOpenBooking={onOpenBooking}
                            canManageRoutes={canManageRoutes}
                        />
                    </div>
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

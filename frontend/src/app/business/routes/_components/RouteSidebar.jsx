'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import SegmentTabBar from '@/components/shared/SegmentTabBar'
import classNames from '@/utils/classNames'
import RouteFilters from './RouteFilters'
import RouteDayBookingsPanel from './RouteDayBookingsPanel'
import RouteSavedRoutesPanel from './RouteSavedRoutesPanel'
import RouteTimeline from './RouteTimeline'
import RouteFeasibilityBanner from './RouteFeasibilityBanner'
import SpecialistHomeCard from './SpecialistHomeCard'
import Checkbox from '@/components/ui/Checkbox'

/**
 * Левая панель страницы «Маршруты» в духе ServiceTitan:
 * табы Filter | Route, фильтры — в первом табе, маршрут с визитами/таймлайном — во втором.
 */
export default function RouteSidebar({
    teamMembers,
    specialistId,
    onSpecialistChange,
    date,
    onDateChange,
    route,
    canShowReturnLegToggle,
    includeReturnLeg,
    onIncludeReturnLegChange,
    updatingReturnLeg,
    canManageRoutes,
    updatingIncluded,
    onUpdateIncluded,
    onOpenBooking,
    bookingStopsCount,
    savedRoutes,
    savedRoutesLoading,
    onSelectSavedDate,
    selectedDate,
}) {
    const t = useTranslations('business.routes')
    const [tab, setTab] = useState('route')
    const [timelineOpen, setTimelineOpen] = useState(true)

    const dayBookings = route?.day_bookings ?? []
    const specialist = route?.specialist

    const routeTabLabel = (
        <span className="inline-flex items-center gap-1.5">
            {t('tabs.route')}
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tabular-nums">
                ({bookingStopsCount})
            </span>
        </span>
    )

    const savedRoutesCount = Array.isArray(savedRoutes) ? savedRoutes.length : 0
    const savedTabLabel = (
        <span className="inline-flex items-center gap-1.5">
            {t('tabs.saved')}
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tabular-nums">
                ({savedRoutesCount})
            </span>
        </span>
    )

    return (
        <div className="flex min-h-0 flex-col gap-3 lg:h-full">
            <div className="min-w-0 shrink-0 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600">
                <SegmentTabBar
                    value={tab}
                    onChange={setTab}
                    items={[
                        { value: 'filter', label: t('tabs.filter') },
                        { value: 'route', label: routeTabLabel },
                        { value: 'saved', label: savedTabLabel },
                    ]}
                />
            </div>

            <div className="mt-1 flex min-h-0 flex-1 flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1 booking-modal-scroll">
                <div
                    role="tabpanel"
                    className={classNames('tab-content min-h-0', tab === 'filter' && 'tab-content-active')}
                >
                        <div className="flex flex-col gap-4">
                            <RouteFilters
                                teamMembers={teamMembers}
                                specialistId={specialistId}
                                onSpecialistChange={onSpecialistChange}
                                date={date}
                                onDateChange={onDateChange}
                            />

                            {specialist ? (
                                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <SpecialistHomeCard specialist={specialist} />
                                </div>
                            ) : null}

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
                        </div>
                </div>

                <div
                    role="tabpanel"
                    className={classNames('tab-content min-h-0', tab === 'route' && 'tab-content-active')}
                >
                        <div className="flex min-h-0 flex-col gap-4">
                            {route ? (
                                <>
                                    <RouteDayBookingsPanel
                                        dayBookings={dayBookings}
                                        includedBookingIds={route.included_booking_ids ?? null}
                                        updatingSelection={updatingIncluded}
                                        onToggle={onUpdateIncluded}
                                        onOpenBooking={onOpenBooking}
                                        selectionReadOnly={!canManageRoutes}
                                        displayTimezone={route.display_timezone}
                                    />

                                    {canShowReturnLegToggle ? (
                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <Checkbox
                                                variant="card"
                                                checked={includeReturnLeg}
                                                disabled={updatingReturnLeg || !canManageRoutes}
                                                onChange={(v) => onIncludeReturnLegChange(v)}
                                                checkboxClass="shrink-0 !m-0"
                                                className={
                                                    updatingReturnLeg || !canManageRoutes
                                                        ? 'opacity-70 pointer-events-none select-none'
                                                        : 'select-none'
                                                }
                                            >
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {t('routeIncludeReturnLeg')}
                                                    {updatingReturnLeg ? ' …' : ''}
                                                </span>
                                            </Checkbox>
                                        </div>
                                    ) : null}

                                    {bookingStopsCount <= 1 && bookingStopsCount > 0 ? (
                                        <p className="text-xs font-bold text-amber-800/90 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-lg px-3 py-2">
                                            {t('optimizeSingleVisitHint')}
                                        </p>
                                    ) : null}

                                    {route?.feasibility_issues && route.feasibility_issues.length > 0 ? (
                                        <RouteFeasibilityBanner issues={route.feasibility_issues} />
                                    ) : null}

                                    {bookingStopsCount > 0 ? (
                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <button
                                                type="button"
                                                className="flex w-full items-center justify-between text-left"
                                                onClick={() => setTimelineOpen((v) => !v)}
                                            >
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {timelineOpen ? t('hideTimeline') : t('showTimeline')}
                                                </span>
                                                <svg
                                                    className={`h-4 w-4 text-gray-500 transition-transform ${
                                                        timelineOpen ? 'rotate-180' : ''
                                                    }`}
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    aria-hidden
                                                >
                                                    <path
                                                        d="M6 9l6 6 6-6"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </button>
                                            {timelineOpen ? (
                                                <div className="mt-3">
                                                    <RouteTimeline route={route} includeReturnLeg={includeReturnLeg} />
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </>
                            ) : (
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {t('noRouteShort')}
                                </p>
                            )}
                        </div>
                </div>

                <div
                    role="tabpanel"
                    className={classNames('tab-content min-h-0', tab === 'saved' && 'tab-content-active')}
                >
                        <div className="flex flex-col gap-4">
                            <RouteSavedRoutesPanel
                                items={savedRoutes ?? []}
                                currentDate={selectedDate}
                                onSelectDate={(ymd) => {
                                    onSelectSavedDate(ymd)
                                    setTab('route')
                                }}
                                isLoading={savedRoutesLoading}
                            />
                        </div>
                </div>
            </div>
        </div>
    )
}

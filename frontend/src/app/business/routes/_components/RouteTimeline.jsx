'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { metersToMiles } from '../_utils/routeMiles'
import { getVisitColorHex } from '../_utils/bookingRouteColors'
import useBusinessStore from '@/store/businessStore'

const US_LOCALE = 'en-US'

/**
 * Дата/время в американском формате (MM/DD/YYYY, 12h) и указанной IANA-таймзоне.
 */
function formatWaitDuration(totalSeconds) {
    if (totalSeconds == null || totalSeconds <= 0) {
        return ''
    }
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.round((totalSeconds % 3600) / 60)
    if (h >= 1) {
        return m > 0 ? `${h} h ${m} min` : `${h} h`
    }
    return `${Math.max(1, m)} min`
}

/**
 * Опоздание: фактическое начало (eta или прибытие) позже запланированного початку окна записи.
 */
function computeLateMinutes(etaIso, arrivedAtIso, windowStartIso) {
    if (!windowStartIso) return 0
    const windowStart = new Date(windowStartIso).getTime()
    if (Number.isNaN(windowStart)) return 0
    const actualIso = arrivedAtIso || etaIso
    if (!actualIso) return 0
    try {
        const actual = new Date(actualIso).getTime()
        if (Number.isNaN(actual)) return 0
        if (actual > windowStart) {
            return Math.max(1, Math.ceil((actual - windowStart) / 60000))
        }
    } catch {
        return 0
    }
    return 0
}

function formatEtaUs(iso, timeZone) {
    if (!iso) {
        return '—'
    }
    try {
        const d = new Date(iso)
        const tz = timeZone && String(timeZone).trim() !== '' ? String(timeZone).trim() : 'America/Los_Angeles'
        return new Intl.DateTimeFormat(US_LOCALE, {
            timeZone: tz,
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZoneName: 'short',
        }).format(d)
    } catch {
        return '—'
    }
}

/**
 * Вертикальный таймлайн маршрута (старт → визиты → домой) в духе «order history».
 *
 * @param {{
 *   route: import('@/lib/api/business').BusinessRoute
 *   includeReturnLeg?: boolean
 * }} props
 */
export default function RouteTimeline({ route, includeReturnLeg = true }) {
    const t = useTranslations('business.routes.timeline')
    const { settings } = useBusinessStore()
    const specialist = route.specialist
    const displayTz = route.display_timezone || settings?.timezone || 'America/Los_Angeles'

    const bookingVisitNumberByStopId = useMemo(() => {
        const sorted = [...(route.stops ?? [])].sort((a, b) => a.sequence_order - b.sequence_order)
        const map = new Map()
        let n = 0
        for (const s of sorted) {
            if (s.stop_type === 'booking') {
                n += 1
                map.set(String(s.id), n)
            }
        }
        return map
    }, [route.stops])

    const rows = useMemo(() => {
        const stops = [...(route.stops ?? [])].sort((a, b) => a.sequence_order - b.sequence_order)
        const out = []

        for (let i = 0; i < stops.length; i++) {
            const stop = stops[i]
            if (i > 0 && stop.distance_from_prev_meters != null && stop.duration_from_prev_seconds != null) {
                out.push({
                    key: `leg-${stop.id}`,
                    type: 'leg',
                    meters: stop.distance_from_prev_meters,
                    seconds: stop.duration_from_prev_seconds,
                })
            }
            out.push({ key: `stop-${stop.id}`, type: 'stop', stop })
        }

        if (!includeReturnLeg && out.length >= 2) {
            const last = out[out.length - 1]
            const prev = out[out.length - 2]
            if (
                last.type === 'stop' &&
                last.stop.stop_type === 'end' &&
                prev.type === 'leg'
            ) {
                return out.slice(0, -2)
            }
        }

        return out
    }, [route.stops, includeReturnLeg])

    if (rows.length === 0) {
        return null
    }

    function addressForStop(stop) {
        if (stop.stop_type === 'start' || stop.stop_type === 'end') {
            return specialist?.home_address?.trim() || t('homeUnknown')
        }
        const b = stop.booking
        return b?.address?.trim() || t('addressUnknown')
    }

    function titleForStop(stop) {
        if (stop.stop_type === 'start') {
            return t('startTitle')
        }
        if (stop.stop_type === 'end') {
            return t('endTitle')
        }
        const name = stop.booking?.client_name?.trim()
        const svc = stop.booking?.title?.trim()
        if (name && svc) {
            return `${name} · ${svc}`
        }
        return name || svc || t('visitFallback')
    }

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <span className="text-emerald-600 dark:text-emerald-400" aria-hidden>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 12h4l3 8 4-16 3 8h4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
            </div>

            <div className="relative pl-1">
                <div
                    className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-gray-200 dark:bg-gray-600 rounded-full"
                    aria-hidden
                />

                <ul className="relative flex flex-col gap-0">
                    {rows.map((row) => {
                        if (row.type === 'leg') {
                            const mi = (metersToMiles(row.meters) ?? 0).toFixed(1)
                            const min = Math.max(1, Math.round(row.seconds / 60))
                            return (
                                <li key={row.key} className="flex gap-3 min-h-[52px] items-center">
                                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white dark:border-gray-900 bg-slate-400 dark:bg-slate-500 text-white">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0 py-1">
                                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('inTransit')}</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {t('legStats', { mi, min })}
                                        </p>
                                    </div>
                                </li>
                            )
                        }

                        const stop = row.stop
                        const isStart = stop.stop_type === 'start'
                        const isEnd = stop.stop_type === 'end'
                        const isBooking = stop.stop_type === 'booking'
                        const visitNumber = isBooking ? bookingVisitNumberByStopId.get(String(stop.id)) : null

                        const visitColorHex =
                            isBooking && visitNumber != null ? getVisitColorHex(visitNumber - 1) : null
                        const ring =
                            visitColorHex != null
                                ? ''
                                : isStart
                                  ? 'bg-emerald-600 dark:bg-emerald-500'
                                  : isEnd
                                    ? 'bg-violet-600 dark:bg-violet-500'
                                    : 'bg-blue-600 dark:bg-blue-500'

                        return (
                            <li key={row.key} className="flex gap-3 pb-1 last:pb-0">
                                <div
                                    className={`relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 border-white dark:border-gray-900 ${ring} text-white shadow-sm ${
                                        visitNumber != null && visitNumber > 9 ? 'h-8 min-w-[2rem] px-1' : 'h-8 w-8'
                                    }`}
                                    style={visitColorHex ? { backgroundColor: visitColorHex } : undefined}
                                >
                                    {isStart ? (
                                        <span className="text-xs font-bold">S</span>
                                    ) : isEnd ? (
                                        <span className="text-xs font-bold">E</span>
                                    ) : visitNumber != null ? (
                                        <span className="text-xs font-bold tabular-nums">{visitNumber}</span>
                                    ) : (
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z" strokeLinecap="round" strokeLinejoin="round" />
                                            <circle cx="12" cy="10" r="3" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 pb-4 last:pb-0">
                                    <div
                                        className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-2.5 shadow-sm ${
                                            visitColorHex ? 'border-l-4' : ''
                                        }`}
                                        style={
                                            visitColorHex
                                                ? { borderLeftColor: visitColorHex }
                                                : undefined
                                        }
                                    >
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{titleForStop(stop)}</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums">
                                            {formatEtaUs(stop.eta, displayTz)}
                                        </p>
                                        {(() => {
                                            if (!isBooking) return null
                                            const lateMin = computeLateMinutes(
                                                stop.eta,
                                                stop.arrived_at,
                                                stop.booking?.time_window_start,
                                            )
                                            const hasWait = (stop.wait_before_seconds ?? 0) > 0 && stop.arrived_at
                                            if (lateMin > 0) {
                                                return (
                                                    <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">
                                                        {t('lateArrival', { min: lateMin })}
                                                    </p>
                                                )
                                            }
                                            if (hasWait) {
                                                return (
                                                    <>
                                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                                            {t('routingArrival')}:{' '}
                                                            <span className="text-gray-900 dark:text-gray-100 tabular-nums">
                                                                {formatEtaUs(stop.arrived_at, displayTz)}
                                                            </span>
                                                        </p>
                                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                                                            {t('waitUntilAppointment', {
                                                                duration: formatWaitDuration(stop.wait_before_seconds),
                                                            })}
                                                        </p>
                                                    </>
                                                )
                                            }
                                            return null
                                        })()}
                                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1 line-clamp-3">
                                            {addressForStop(stop)}
                                        </p>
                                        {isBooking && stop.booking?.duration_minutes ? (
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                                {t('serviceDuration', { min: stop.booking.duration_minutes })}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}

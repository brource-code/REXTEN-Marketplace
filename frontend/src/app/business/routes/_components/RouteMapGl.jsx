'use client'

import { useCallback, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { PiHouse } from 'react-icons/pi'
import Map, { Marker, NavigationControl, Popup, Source, Layer } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
    buildInitialViewStateWithOptionalPath,
    buildRouteLineCoordinates,
    buildRouteMapMarkers,
    getRouteHomeLngLat,
    normalizePathLngLat,
    splitPathIntoStopLegs,
    splitPathOutboundReturn,
} from './buildRouteMapModel'
import { getVisitColorHex } from '../_utils/bookingRouteColors'
import { formatCurrency } from '@/utils/formatCurrency'

function subscribeDark(callback) {
    const el = document.documentElement
    const obs = new MutationObserver(callback)
    obs.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
}

function getDarkSnapshot() {
    if (typeof document === 'undefined') {
        return false
    }
    return document.documentElement.classList.contains('dark')
}

function useAppDark() {
    return useSyncExternalStore(subscribeDark, getDarkSnapshot, () => false)
}

const MAP_MIN_HEIGHT_DEFAULT = 320

function lineFeatureFromCoords(coords) {
    if (!coords || coords.length < 2) return null
    return {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'LineString',
            coordinates: coords,
        },
    }
}

function formatHm(iso, tz) {
    if (!iso) return null
    try {
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return null
        return new Intl.DateTimeFormat(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: tz || undefined,
        }).format(d)
    } catch {
        return null
    }
}

function RouteMapPopupCard({ marker, displayTimezone, onOpenBooking, onClose }) {
    const t = useTranslations('business.routes')
    const booking = marker?.booking ?? null
    const visitNum = marker?.label ?? ''
    const colorHex = marker?.markerColorHex || '#2563eb'

    const eta = marker?.eta ? formatHm(marker.eta, displayTimezone) : null
    const winStart = booking?.time_window_start ? formatHm(booking.time_window_start, displayTimezone) : null
    const winEnd = booking?.time_window_end ? formatHm(booking.time_window_end, displayTimezone) : null
    const timeLine = eta
        ? winStart && winEnd
            ? `${eta} (${winStart}–${winEnd})`
            : eta
        : winStart && winEnd
          ? `${winStart}–${winEnd}`
          : null

    const priceVal = typeof booking?.total_price === 'number' ? booking.total_price : null
    const priceText = priceVal != null ? formatCurrency(priceVal, booking?.currency || 'USD') : null

    return (
        <div className="flex w-[280px] max-w-full flex-col gap-2 p-1">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span
                        className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: colorHex }}
                    >
                        {visitNum}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {t('mapPopup.visit', { n: visitNum })}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 leading-none"
                    aria-label="Close"
                >
                    ×
                </button>
            </div>

            <div className="flex flex-col gap-1.5">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        {t('mapPopup.client')}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 break-words">
                        {booking?.client_name || t('mapPopup.noClient')}
                    </span>
                </div>

                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        {t('mapPopup.service')}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 break-words">
                        {booking?.title || t('mapPopup.noService')}
                    </span>
                </div>

                {timeLine ? (
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            {t('mapPopup.time')}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                            {timeLine}
                        </span>
                    </div>
                ) : null}

                {booking?.duration_minutes ? (
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            {t('mapPopup.duration')}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                            {t('mapPopup.durationMin', { min: booking.duration_minutes })}
                        </span>
                    </div>
                ) : null}

                {priceText ? (
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            {t('mapPopup.price')}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                            {priceText}
                        </span>
                    </div>
                ) : null}

                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        {t('mapPopup.address')}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 break-words">
                        {booking?.address || t('mapPopup.noAddress')}
                    </span>
                </div>
            </div>

            {onOpenBooking && booking?.id ? (
                <button
                    type="button"
                    onClick={() => onOpenBooking(booking.id)}
                    className="mt-1 inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                >
                    {t('mapPopup.openBooking')}
                </button>
            ) : null}
        </div>
    )
}

export default function RouteMapGl({
    stops,
    pathLngLat,
    minHeight: minHeightProp,
    accessToken,
    includeReturnLeg = true,
    fill = false,
    onOpenBooking,
    displayTimezone,
}) {
    const t = useTranslations('business.routes')
    const mapRef = useRef(null)
    const baseId = useId().replace(/:/g, '')
    const isDark = useAppDark()
    const [popupKey, setPopupKey] = useState(null)
    const mapStyle = isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12'
    const mapMinHeight = typeof minHeightProp === 'number' ? minHeightProp : MAP_MIN_HEIGHT_DEFAULT

    const fullLineCoords = useMemo(() => {
        const fromHere = normalizePathLngLat(pathLngLat)
        if (fromHere.length >= 2) {
            return fromHere
        }
        return buildRouteLineCoordinates(stops)
    }, [stops, pathLngLat])

    const { initialViewState } = useMemo(
        () => buildInitialViewStateWithOptionalPath(stops, pathLngLat),
        [stops, pathLngLat],
    )

    const markers = useMemo(() => buildRouteMapMarkers(stops, getVisitColorHex), [stops])

    const popupMarker = useMemo(
        () => (popupKey ? markers.find((m) => m.key === popupKey && m.markerKind === 'booking') : null),
        [markers, popupKey],
    )

    const homeLngLat = useMemo(() => getRouteHomeLngLat(stops), [stops])

    const flyToHome = useCallback(() => {
        if (!homeLngLat || !mapRef.current) return
        const map = mapRef.current
        const z = map.getZoom?.()
        map.flyTo({
            center: [homeLngLat.lng, homeLngLat.lat],
            zoom: typeof z === 'number' ? Math.max(z, 13) : 13,
            essential: true,
        })
    }, [homeLngLat])

    const centerOnMarker = useCallback((lng, lat) => {
        const inst = mapRef.current
        if (!inst) return
        const map = typeof inst.getMap === 'function' ? inst.getMap() : inst
        if (!map || typeof map.project !== 'function' || typeof map.unproject !== 'function') {
            return
        }
        try {
            const point = map.project([lng, lat])
            const container = map.getContainer?.()
            const height = container?.clientHeight ?? 0
            const verticalShift = Math.min(140, Math.max(60, height * 0.22))
            const newCenter = map.unproject([point.x, point.y - verticalShift])
            map.easeTo({
                center: [newCenter.lng, newCenter.lat],
                duration: 350,
                essential: true,
            })
        } catch {
            /* noop */
        }
    }, [])

    const split = useMemo(() => splitPathOutboundReturn(fullLineCoords, stops), [fullLineCoords, stops])

    const hasSplit = split.outbound.length >= 2 && split.returnPart.length >= 2

    const coloredStopLegs = useMemo(() => {
        if (!fullLineCoords || fullLineCoords.length < 2) {
            return []
        }
        const { legs } = splitPathIntoStopLegs(fullLineCoords, stops)
        return legs.filter((leg) => {
            if (leg.kind === 'to_home' && !includeReturnLeg) {
                return false
            }
            return leg.coords.length >= 2
        })
    }, [fullLineCoords, stops, includeReturnLeg])

    const useColoredLegs = coloredStopLegs.length > 0

    const outboundFeature = useMemo(() => {
        if (useColoredLegs) {
            return null
        }
        if (hasSplit) {
            return lineFeatureFromCoords(split.outbound.length >= 2 ? split.outbound : fullLineCoords)
        }
        return lineFeatureFromCoords(fullLineCoords)
    }, [useColoredLegs, hasSplit, split.outbound, fullLineCoords])

    const returnFeature = useMemo(() => {
        if (useColoredLegs) {
            return null
        }
        if (!hasSplit || !includeReturnLeg) {
            return null
        }
        return lineFeatureFromCoords(split.returnPart)
    }, [useColoredLegs, hasSplit, includeReturnLeg, split.returnPart])

    const legPaint = useCallback((leg) => {
        if (leg.kind === 'to_home') {
            return '#d97706'
        }
        if (leg.kind === 'to_booking' && leg.visitIndex != null) {
            return getVisitColorHex(leg.visitIndex)
        }
        return '#64748b'
    }, [])

    if (markers.length === 0) {
        return (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 min-h-[220px] flex items-center justify-center p-4">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 text-center">{t('mapNoGeoHint')}</p>
            </div>
        )
    }

    return (
        <div className={fill ? 'flex h-full min-h-0 flex-col' : 'space-y-2'}>
            <div
                className={
                    fill
                        ? 'relative h-full min-h-[320px] w-full flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700'
                        : 'relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[220px]'
                }
            >
                <Map
                    ref={mapRef}
                    key={isDark ? 'dark' : 'light'}
                    mapboxAccessToken={accessToken}
                    mapStyle={mapStyle}
                    style={fill ? { width: '100%', height: '100%' } : { width: '100%', height: mapMinHeight }}
                    initialViewState={initialViewState}
                    attributionControl
                    renderWorldCopies={false}
                >
                    <NavigationControl position="top-right" showCompass={false} />
                    {useColoredLegs
                        ? coloredStopLegs.map((leg, idx) => {
                              const feat = lineFeatureFromCoords(leg.coords)
                              if (!feat) return null
                              const id = `${baseId}-leg-${idx}`
                              return (
                                  <Source key={id} id={id} type="geojson" data={feat}>
                                      <Layer
                                          id={`${id}-layer`}
                                          type="line"
                                          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                                          paint={{
                                              'line-color': legPaint(leg),
                                              'line-width': 4,
                                              'line-opacity': 0.92,
                                          }}
                                      />
                                  </Source>
                              )
                          })
                        : null}
                    {!useColoredLegs && outboundFeature && (
                        <Source id={`${baseId}-out`} type="geojson" data={outboundFeature}>
                            <Layer
                                id={`${baseId}-out-layer`}
                                type="line"
                                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                                paint={{
                                    'line-color': '#2563eb',
                                    'line-width': 4,
                                    'line-opacity': 0.92,
                                }}
                            />
                        </Source>
                    )}
                    {!useColoredLegs && returnFeature && (
                        <Source id={`${baseId}-ret`} type="geojson" data={returnFeature}>
                            <Layer
                                id={`${baseId}-ret-layer`}
                                type="line"
                                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                                paint={{
                                    'line-color': '#d97706',
                                    'line-width': 4,
                                    'line-opacity': 0.88,
                                }}
                            />
                        </Source>
                    )}
                    {markers.map((m) => {
                        const isBooking = m.markerKind === 'booking'
                        const isStart = m.markerKind === 'start'
                        const isStartEnd = m.markerKind === 'startEnd'
                        const bookingHex = isBooking && m.markerColorHex ? m.markerColorHex : null
                        const bg = bookingHex
                            ? ''
                            : isStartEnd
                              ? 'bg-gradient-to-r from-emerald-600 to-violet-600'
                              : isStart
                                ? 'bg-emerald-600 dark:bg-emerald-500'
                                : m.markerKind === 'end'
                                  ? 'bg-violet-600 dark:bg-violet-500'
                                  : 'bg-blue-600 dark:bg-blue-500'
                        const title = isBooking
                            ? t('mapMarkerVisit', { n: m.label })
                            : isStartEnd
                              ? t('mapMarkerStartEnd')
                              : isStart
                                ? t('mapMarkerStart')
                                : t('mapMarkerEnd')
                        const clickable = isBooking && m.booking
                        return (
                            <Marker
                                key={m.key}
                                longitude={m.lng}
                                latitude={m.lat}
                                anchor="center"
                                onClick={(e) => {
                                    if (!clickable) return
                                    e.originalEvent?.stopPropagation?.()
                                    setPopupKey((prev) => {
                                        const next = prev === m.key ? null : m.key
                                        if (next) {
                                            centerOnMarker(m.lng, m.lat)
                                        }
                                        return next
                                    })
                                }}
                            >
                                <div
                                    className={`flex h-7 min-w-[1.75rem] px-1 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold shadow-md text-white ${
                                        clickable ? 'cursor-pointer hover:scale-110 transition-transform' : ''
                                    } ${bg}`}
                                    style={
                                        bookingHex
                                            ? { backgroundColor: bookingHex, borderColor: '#fff' }
                                            : undefined
                                    }
                                    title={title}
                                >
                                    {m.label}
                                </div>
                            </Marker>
                        )
                    })}
                    {popupMarker ? (
                        <Popup
                            longitude={popupMarker.lng}
                            latitude={popupMarker.lat}
                            anchor="bottom"
                            offset={20}
                            closeOnClick={false}
                            onClose={() => setPopupKey(null)}
                            className="route-map-popup"
                            maxWidth="320px"
                        >
                            <RouteMapPopupCard
                                marker={popupMarker}
                                displayTimezone={displayTimezone}
                                onOpenBooking={onOpenBooking}
                                onClose={() => setPopupKey(null)}
                            />
                        </Popup>
                    ) : null}
                </Map>
                {homeLngLat ? (
                    <button
                        type="button"
                        onClick={flyToHome}
                        title={t('mapFlyToHome')}
                        aria-label={t('mapFlyToHome')}
                        className="absolute top-[5.75rem] right-2.5 z-10 flex h-9 w-9 items-center justify-center rounded border border-gray-200 bg-white/95 text-gray-900 shadow-md hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800/95 dark:text-gray-100 dark:hover:bg-gray-700 pointer-events-auto"
                    >
                        <PiHouse className="h-5 w-5 shrink-0" aria-hidden />
                    </button>
                ) : null}
            </div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('mapHelpHint')}</p>
        </div>
    )
}

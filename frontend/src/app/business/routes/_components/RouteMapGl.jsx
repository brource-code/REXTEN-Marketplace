'use client'

import { useCallback, useId, useMemo, useRef, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { PiHouse } from 'react-icons/pi'
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/mapbox'
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

export default function RouteMapGl({
    stops,
    pathLngLat,
    minHeight: minHeightProp,
    accessToken,
    includeReturnLeg = true,
}) {
    const t = useTranslations('business.routes')
    const mapRef = useRef(null)
    const baseId = useId().replace(/:/g, '')
    const isDark = useAppDark()
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
        <div className="space-y-2">
            <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[220px]">
                <Map
                    ref={mapRef}
                    key={isDark ? 'dark' : 'light'}
                    mapboxAccessToken={accessToken}
                    mapStyle={mapStyle}
                    style={{ width: '100%', height: mapMinHeight }}
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
                        return (
                            <Marker key={m.key} longitude={m.lng} latitude={m.lat} anchor="center">
                                <div
                                    className={`flex h-7 min-w-[1.75rem] px-1 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold shadow-md text-white ${bg}`}
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

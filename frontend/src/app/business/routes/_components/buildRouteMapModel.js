/**
 * Общая геометрия для Mapbox и MapLibre: вид, маркеры, линия маршрута.
 */
export function buildInitialViewState(stops) {
    const withCoords = (stops ?? [])
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
            ...s,
            lat: Number(s.latitude),
            lng: Number(s.longitude),
        }))
        .filter((s) => !Number.isNaN(s.lat) && !Number.isNaN(s.lng))

    const sorted = [...withCoords].sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))

    if (sorted.length === 0) {
        return {
            initialViewState: {
                longitude: -98.5795,
                latitude: 39.8283,
                zoom: 3,
            },
        }
    }

    if (sorted.length === 1) {
        return {
            initialViewState: {
                longitude: sorted[0].lng,
                latitude: sorted[0].lat,
                zoom: 12,
            },
        }
    }

    const lngs = sorted.map((s) => s.lng)
    const lats = sorted.map((s) => s.lat)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    if (maxLng - minLng < 0.0002 && maxLat - minLat < 0.0002) {
        return {
            initialViewState: {
                longitude: (minLng + maxLng) / 2,
                latitude: (minLat + maxLat) / 2,
                zoom: 13,
            },
        }
    }

    return {
        initialViewState: {
            bounds: [
                [minLng, minLat],
                [maxLng, maxLat],
            ],
            fitBoundsOptions: { padding: 48, maxZoom: 14 },
        },
    }
}

/**
 * Геометрия по дорогам с бэкенда (HERE flexible polyline → [lng, lat][]).
 */
export function dedupeLngLatRing(coords, eps = 1e-5) {
    if (coords.length < 2) {
        return coords
    }
    const out = [coords[0]]
    for (let i = 1; i < coords.length; i++) {
        const prev = out[out.length - 1]
        const cur = coords[i]
        if (Math.abs(prev[0] - cur[0]) > eps || Math.abs(prev[1] - cur[1]) > eps) {
            out.push(cur)
        }
    }
    return out.length >= 2 ? out : coords
}

export function normalizePathLngLat(pathLngLat) {
    if (!Array.isArray(pathLngLat) || pathLngLat.length < 2) {
        return []
    }
    const out = []
    for (const p of pathLngLat) {
        if (!Array.isArray(p) || p.length < 2) {
            continue
        }
        const lng = Number(p[0])
        const lat = Number(p[1])
        if (Number.isNaN(lng) || Number.isNaN(lat)) {
            continue
        }
        out.push([lng, lat])
    }
    if (out.length < 2) {
        return []
    }
    return dedupeLngLatRing(out)
}

/**
 * Вид карты: при наличии полилинии по дорогам — bounds по ней, иначе по остановкам.
 */
export function buildInitialViewStateWithOptionalPath(stops, pathLngLat) {
    const path = normalizePathLngLat(pathLngLat)
    if (path.length >= 2) {
        const lngs = path.map((p) => p[0])
        const lats = path.map((p) => p[1])
        const minLng = Math.min(...lngs)
        const maxLng = Math.max(...lngs)
        const minLat = Math.min(...lats)
        const maxLat = Math.max(...lats)
        if (maxLng - minLng < 0.0002 && maxLat - minLat < 0.0002) {
            return {
                initialViewState: {
                    longitude: (minLng + maxLng) / 2,
                    latitude: (minLat + maxLat) / 2,
                    zoom: 13,
                },
            }
        }
        return {
            initialViewState: {
                bounds: [
                    [minLng, minLat],
                    [maxLng, maxLat],
                ],
                fitBoundsOptions: { padding: 48, maxZoom: 14 },
            },
        }
    }
    return buildInitialViewState(stops)
}

/**
 * Остановки с координатами, по порядку (для линии маршрута).
 * @returns {{ key: string, lat: number, lng: number, seq: number }[]}
 */
function stopsWithCoordsSorted(stops) {
    return (stops ?? [])
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
            key: `${s.id ?? s.sequence_order}-${s.stop_type}`,
            lat: Number(s.latitude),
            lng: Number(s.longitude),
            seq: s.sequence_order ?? 0,
            stopType: s.stop_type || 'booking',
            booking: s.booking ?? null,
            eta: s.eta ?? null,
            arrivedAt: s.arrived_at ?? null,
            waitBeforeSeconds: s.wait_before_seconds ?? 0,
        }))
        .filter((s) => !Number.isNaN(s.lat) && !Number.isNaN(s.lng))
        .sort((a, b) => a.seq - b.seq)
}

/**
 * Маркеры для карты: номера только у визитов (booking). Старт/финиш — буквы S/E, без общей нумерации.
 * Иначе на «доме» оказывалась цифра «2» (первый визит), т.к. старт считался первым пунктом в цепочке 1,2,3…
 *
 * @returns {{ key: string, lat: number, lng: number, seq: number, markerKind: 'start' | 'end' | 'booking', label: string }[]}
 */
const COORD_EPS = 1e-5

function coordsNearlyEqual(aLat, aLng, bLat, bLng) {
    return Math.abs(aLat - bLat) < COORD_EPS && Math.abs(aLng - bLng) < COORD_EPS
}

/**
 * Есть ли на линии маршрута отделяемый сегмент «последний визит → база» (для двухцветной отрисовки).
 */
export function hasReturnLegSegment(pathLngLat, stops) {
    const fromHere = normalizePathLngLat(pathLngLat)
    const fullLineCoords = fromHere.length >= 2 ? fromHere : buildRouteLineCoordinates(stops)
    if (!fullLineCoords || fullLineCoords.length < 2) {
        return false
    }
    const split = splitPathOutboundReturn(fullLineCoords, stops)
    return split.outbound.length >= 2 && split.returnPart.length >= 2
}

/**
 * Делит линию маршрута [lng,lat][] на «туда» и «обратно» по ближайшей к последнему визиту точке.
 * @param {Array<[number, number]>} lineCoords — уже нормализованная цепочка (HERE или прямая по стопам).
 * @returns {{ outbound: [number, number][], returnPart: [number, number][] }}
 */
export function splitPathOutboundReturn(lineCoords, stops) {
    const path = !Array.isArray(lineCoords) || lineCoords.length < 2 ? [] : dedupeLngLatRing(lineCoords)
    if (path.length < 2) {
        return { outbound: path, returnPart: [] }
    }

    const sorted = stopsWithCoordsSorted(stops)
    const bookingStops = sorted.filter((s) => s.stopType === 'booking')
    if (bookingStops.length === 0) {
        return { outbound: path, returnPart: [] }
    }

    const last = bookingStops[bookingStops.length - 1]
    const targetLng = last.lng
    const targetLat = last.lat

    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < path.length; i++) {
        const dx = path[i][0] - targetLng
        const dy = path[i][1] - targetLat
        const d = dx * dx + dy * dy
        if (d < bestDist) {
            bestDist = d
            bestIdx = i
        }
    }

    const outbound = path.slice(0, bestIdx + 1)
    const returnPart = path.slice(bestIdx)
    return { outbound, returnPart }
}

/**
 * Координаты базы специалиста (первая остановка типа start с геокодом).
 * @returns {{ lng: number, lat: number } | null}
 */
export function getRouteHomeLngLat(stops) {
    const list = stopsWithCoordsSorted(stops)
    const start = list.find((s) => s.stopType === 'start')
    if (!start) return null
    return { lng: start.lng, lat: start.lat }
}

/**
 * @param {unknown[]} stops
 * @param {(idx: number) => string} [getVisitColor]
 */
export function buildRouteMapMarkers(stops, getVisitColor) {
    const sorted = stopsWithCoordsSorted(stops)
    const start = sorted.find((s) => s.stopType === 'start')
    const end = sorted.find((s) => s.stopType === 'end')
    const sameHome =
        start &&
        end &&
        coordsNearlyEqual(start.lat, start.lng, end.lat, end.lng)

    let visitIndex = 0
    const out = []

    for (const s of sorted) {
        if (s.stopType === 'start') {
            if (sameHome) {
                out.push({
                    ...s,
                    key: 'start-end-home',
                    markerKind: 'startEnd',
                    label: 'S/E',
                })
                continue
            }
            out.push({ ...s, markerKind: 'start', label: 'S' })
            continue
        }
        if (s.stopType === 'end') {
            if (sameHome) {
                continue
            }
            out.push({ ...s, markerKind: 'end', label: 'E' })
            continue
        }
        visitIndex += 1
        const vi = visitIndex - 1
        const hex = typeof getVisitColor === 'function' ? getVisitColor(vi) : undefined
        out.push({
            ...s,
            markerKind: 'booking',
            label: String(visitIndex),
            visitIndex: vi,
            markerColorHex: hex,
        })
    }

    return out
}

/**
 * Делит полилинию маршрута на сегменты между последовательными остановками (ближайшие индексы на пути).
 * @param {Array<[number, number]>} pathLngLat нормализованная [lng,lat][]
 * @param {unknown[]} stops
 * @returns {{ legs: Array<{ coords: [number, number][], kind: 'to_booking' | 'to_home' | 'between', visitIndex?: number }>, sortedStops: ReturnType<stopsWithCoordsSorted> }}
 */
export function splitPathIntoStopLegs(pathLngLat, stops) {
    const path = !Array.isArray(pathLngLat) || pathLngLat.length < 2 ? [] : dedupeLngLatRing(pathLngLat)
    const sorted = stopsWithCoordsSorted(stops)
    if (path.length < 2 || sorted.length < 2) {
        return { legs: [], sortedStops: sorted }
    }

    const closestIdx = (lng, lat) => {
        let best = 0
        let bestD = Infinity
        for (let i = 0; i < path.length; i++) {
            const dx = path[i][0] - lng
            const dy = path[i][1] - lat
            const d = dx * dx + dy * dy
            if (d < bestD) {
                bestD = d
                best = i
            }
        }
        return best
    }

    const indices = sorted.map((s) => closestIdx(s.lng, s.lat))
    for (let i = 1; i < indices.length; i++) {
        if (indices[i] < indices[i - 1]) {
            indices[i] = indices[i - 1]
        }
    }

    /** @type {Array<{ coords: [number, number][], kind: 'to_booking' | 'to_home' | 'between', visitIndex?: number }>} */
    const legs = []
    let bookingVisitIdx = 0

    for (let i = 0; i < sorted.length - 1; i++) {
        const a = indices[i]
        const b = indices[i + 1]
        const nextStop = sorted[i + 1]
        const slice = path.slice(a, b + 1)
        if (slice.length < 2) {
            continue
        }
        if (nextStop.stopType === 'booking') {
            legs.push({
                coords: slice,
                kind: 'to_booking',
                visitIndex: bookingVisitIdx,
            })
            bookingVisitIdx += 1
        } else if (nextStop.stopType === 'end') {
            legs.push({ coords: slice, kind: 'to_home' })
        } else {
            legs.push({ coords: slice, kind: 'between' })
        }
    }

    return { legs, sortedStops: sorted }
}

/** @deprecated используйте buildRouteMapMarkers — нумерация 1..N по всем типам ломала смысл «старт = 1, визит = 2» */
export function buildNumberedStops(stops) {
    const list = stopsWithCoordsSorted(stops)
    return list.map((s, idx) => ({ ...s, label: idx + 1 }))
}

/** Координаты линии [lng, lat] по порядку остановок */
export function buildRouteLineCoordinates(stops) {
    const list = stopsWithCoordsSorted(stops)
    if (list.length < 2) return []
    return list.map((m) => [m.lng, m.lat])
}

'use client'

import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function pad(n) {
    return String(n).padStart(2, '0')
}

function ymd(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function hm(minutesFromMidnight) {
    const h = Math.floor(minutesFromMidnight / 60)
    const m = minutesFromMidnight % 60
    return `${pad(h)}:${pad(m)}`
}

function parseHm(s) {
    if (!s || typeof s !== 'string') return null
    const [h, m] = s.split(':').map((n) => parseInt(n, 10))
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null
    return h * 60 + m
}

function dayKey(date) {
    return DAY_NAMES[date.getDay()]
}

function getDaySettings(scheduleSettings, date) {
    if (!scheduleSettings) return null
    const key = dayKey(date)
    const day = scheduleSettings[key]
    if (!day || !day.enabled) return null
    return day
}

function dayBookingsForSpecialist(slots, dateStr, specialistId, excludeId) {
    const exclude = excludeId != null ? String(excludeId) : null
    const targetSpec = specialistId != null ? String(specialistId) : null
    return slots.filter((slot) => {
        if (!slot || !slot.start) return false
        if (exclude && String(slot.id) === exclude) return false
        if (slot.status === 'cancelled') return false
        const startDate = new Date(slot.start)
        if (Number.isNaN(startDate.getTime())) return false
        if (ymd(startDate) !== dateStr) return false
        if (targetSpec) {
            const slotSpec =
                slot.specialist?.id != null
                    ? String(slot.specialist.id)
                    : slot.specialist_id != null
                        ? String(slot.specialist_id)
                        : null
            if (slotSpec && slotSpec !== targetSpec) return false
        }
        return true
    })
}

function makeBusyRanges(slots) {
    const ranges = []
    for (const slot of slots) {
        const start = parseHm(new Date(slot.start).toTimeString().slice(0, 5))
        const endDate = new Date(slot.end || slot.start)
        const end = parseHm(endDate.toTimeString().slice(0, 5))
        if (start == null || end == null) continue
        ranges.push([start, end])
    }
    return ranges.sort((a, b) => a[0] - b[0])
}

function isSlotFree(startMin, endMin, busyRanges) {
    for (const [bs, be] of busyRanges) {
        if (startMin < be && bs < endMin) return false
    }
    return true
}

/**
 * 3 ближайших свободных окна для указанной длительности услуги.
 * Берёт `business-schedule-slots` из кэша и `scheduleSettings` из аргументов.
 *
 * @param {Object} params
 * @param {string} params.bookingDate - 'YYYY-MM-DD' (start search from this date)
 * @param {number} params.durationMinutes
 * @param {string|number|null} [params.specialistId]
 * @param {string|number|null} [params.excludeId]
 * @param {Object|null} params.scheduleSettings
 * @param {number} [params.lookaheadDays=3]
 * @param {number} [params.maxResults=3]
 * @returns {Array<{ date: string, time: string, label?: string }>}
 */
export function useBookingTimeSuggestions({
    bookingDate,
    durationMinutes,
    specialistId,
    excludeId,
    scheduleSettings,
    lookaheadDays = 3,
    maxResults = 3,
} = {}) {
    const queryClient = useQueryClient()

    return useMemo(() => {
        const duration = Number(durationMinutes) > 0 ? Number(durationMinutes) : 0
        if (!bookingDate || !duration || !scheduleSettings) return []
        const slots = queryClient.getQueryData(['business-schedule-slots']) || []

        const start = new Date(`${bookingDate}T00:00:00`)
        if (Number.isNaN(start.getTime())) return []

        const stepMinutes = Number(scheduleSettings.slot_step_minutes) || 30

        const results = []
        for (let dayOffset = 0; dayOffset < lookaheadDays && results.length < maxResults; dayOffset += 1) {
            const cur = new Date(start)
            cur.setDate(start.getDate() + dayOffset)
            const dateStr = ymd(cur)

            const day = getDaySettings(scheduleSettings, cur)
            if (!day) continue

            const fromMin = parseHm(day.from)
            const toMin = parseHm(day.to)
            if (fromMin == null || toMin == null) continue

            const dayBusy = makeBusyRanges(
                dayBookingsForSpecialist(slots, dateStr, specialistId, excludeId),
            )

            // Учтём перерывы в качестве "занятых" интервалов
            const breaks = Array.isArray(day.breaks) ? day.breaks : []
            for (const br of breaks) {
                const bs = parseHm(br.from)
                const be = parseHm(br.to)
                if (bs != null && be != null) dayBusy.push([bs, be])
            }
            dayBusy.sort((a, b) => a[0] - b[0])

            for (let cursor = fromMin; cursor + duration <= toMin && results.length < maxResults; cursor += stepMinutes) {
                if (isSlotFree(cursor, cursor + duration, dayBusy)) {
                    results.push({
                        date: dateStr,
                        time: hm(cursor),
                    })
                }
            }
        }

        return results
    }, [
        bookingDate,
        durationMinutes,
        specialistId,
        excludeId,
        scheduleSettings,
        lookaheadDays,
        maxResults,
        queryClient,
    ])
}

export default useBookingTimeSuggestions

'use client'

import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'

function buildIso(date, time) {
    if (!date || !time) return null
    const safeTime = time.length === 5 ? `${time}:00` : time
    return `${date}T${safeTime}`
}

function toMs(value) {
    if (!value) return null
    const t = Date.parse(value)
    return Number.isFinite(t) ? t : null
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    if (aStart == null || aEnd == null || bStart == null || bEnd == null) return false
    return aStart < bEnd && bStart < aEnd
}

function getSlotSpecialistId(slot) {
    if (slot?.specialist?.id != null) return String(slot.specialist.id)
    if (slot?.specialist_id != null) return String(slot.specialist_id)
    return null
}

/**
 * Проверка конфликтов бронирования по локальному кэшу business-schedule-slots.
 * Не делает сетевых запросов — этого достаточно для drawer/wizard, потому что
 * страница расписания уже грузит и поддерживает кэш слотов.
 *
 * @param {Object} params
 * @param {string} params.bookingDate - 'YYYY-MM-DD'
 * @param {string} params.bookingTime - 'HH:mm'
 * @param {number} params.durationMinutes
 * @param {string|number|null} [params.specialistId]
 * @param {string|number|null} [params.excludeId] — id текущего слота (исключаем из проверки)
 * @returns {{ hasConflict: boolean, conflicts: any[] }}
 */
export function useBookingConflicts({
    bookingDate,
    bookingTime,
    durationMinutes,
    specialistId,
    excludeId,
} = {}) {
    const queryClient = useQueryClient()

    return useMemo(() => {
        const startMs = toMs(buildIso(bookingDate, bookingTime))
        const duration = Number(durationMinutes) > 0 ? Number(durationMinutes) : 0
        if (!startMs || !duration) {
            return { hasConflict: false, conflicts: [] }
        }
        const endMs = startMs + duration * 60 * 1000
        const targetSpecialistId = specialistId != null ? String(specialistId) : null
        const excludeKey = excludeId != null ? String(excludeId) : null

        const slots = queryClient.getQueryData(['business-schedule-slots']) || []
        const conflicts = slots.filter((slot) => {
            if (!slot) return false
            if (excludeKey && String(slot.id) === excludeKey) return false
            if (slot.status === 'cancelled') return false

            const slotStart = toMs(slot.start)
            const slotEnd = toMs(slot.end)
            if (!rangesOverlap(startMs, endMs, slotStart, slotEnd)) return false

            // Если у текущей брони задан специалист — конфликт только при совпадении специалиста или у "без специалиста" (null).
            if (targetSpecialistId) {
                const slotSpecialist = getSlotSpecialistId(slot)
                if (slotSpecialist && slotSpecialist !== targetSpecialistId) return false
            }
            return true
        })

        return {
            hasConflict: conflicts.length > 0,
            conflicts,
        }
    }, [bookingDate, bookingTime, durationMinutes, specialistId, excludeId, queryClient])
}

export default useBookingConflicts

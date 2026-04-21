/**
 * Произвольное событие / блок времени / задача: в календаре показываем название слота,
 * а не подстановку «Гость» из client.
 */
export function isScheduleBlockOrCustomSlot(slot) {
    if (!slot) return false
    const et = slot.event_type
    if (et === 'block' || et === 'task') return true
    return !!(slot.title && !slot.service_id && !slot.service?.id)
}

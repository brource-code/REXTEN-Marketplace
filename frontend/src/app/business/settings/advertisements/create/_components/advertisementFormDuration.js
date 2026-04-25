/**
 * Длительность в объявлении: в форме — число + unit (hours|days),
 * в API для услуг — поле duration хранится как минуты (как duration_minutes в БД).
 */

/** Порядок в UI: новее (больший service_id / id) выше. */
export function sortAdvertisementServicesNewestFirst(list) {
    if (!Array.isArray(list)) return []
    return [...list].sort((a, b) => {
        const idA = Number(a.service_id ?? a.id) || 0
        const idB = Number(b.service_id ?? b.id) || 0
        return idB - idA
    })
}

let _advertisementServiceTempSeq = 0

/** Уникальный числовой id новой строки услуги (до сохранения в БД), монотонно растёт. */
export function nextAdvertisementServiceTempId() {
    _advertisementServiceTempSeq = (_advertisementServiceTempSeq + 1) % 1000
    return Date.now() * 1000 + _advertisementServiceTempSeq
}

export function advertisementMinutesToDisplay(minutes, preferredUnit = 'hours') {
    const m = Math.round(Number(minutes))
    if (!Number.isFinite(m) || m <= 0) {
        return { value: '', unit: preferredUnit === 'days' ? 'days' : 'hours' }
    }
    if (preferredUnit === 'days' && m % 1440 === 0) {
        return { value: String(m / 1440), unit: 'days' }
    }
    const h = m / 60
    const value = Number.isInteger(h) ? String(h) : String(Math.round(h * 100) / 100)
    return { value, unit: 'hours' }
}

export function advertisementDisplayToMinutes(value, unit) {
    const raw = String(value ?? '').trim().replace(',', '.')
    const n = parseFloat(raw)
    if (!Number.isFinite(n) || n < 0) {
        return 0
    }
    if (unit === 'days') {
        return Math.round(n * 24 * 60)
    }
    return Math.round(n * 60)
}

/** Доп. услуги: в БД duration — минуты; короткая подпись для списка. */
export function formatStoredDurationMinutesLabel(minutes, t) {
    const m = Math.round(Number(minutes))
    if (!Number.isFinite(m) || m < 1) {
        return '—'
    }
    if (m % 1440 === 0) {
        return t('durationCompactDays', { n: m / 1440 })
    }
    if (m % 60 === 0) {
        return t('durationCompactHours', { n: m / 60 })
    }
    const h = Math.round((m / 60) * 10) / 10
    return t('durationCompactHours', { n: h })
}

/** Строка услуги объявления для API: duration → минуты, service_id. */
export function mapAdvertisementServiceForSubmit(service) {
    const { additional_services: _ignored, ...rest } = service
    const durationMinutes = advertisementDisplayToMinutes(rest.duration, rest.duration_unit || 'hours')
    let serviceId = null
    if (service.service_id && typeof service.service_id === 'number' && service.service_id < 1000000) {
        serviceId = service.service_id
    } else if (service.id && typeof service.id === 'number' && service.id < 1000000) {
        serviceId = service.id
    }
    return {
        ...rest,
        duration: durationMinutes,
        service_id: serviceId,
        id: service.id || null,
    }
}

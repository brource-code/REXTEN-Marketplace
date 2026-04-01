/**
 * Имя услуги для слота расписания: как в календаре, так и в модалке редактирования.
 * Услуги из объявления (виртуальные id) могут не совпадать с GET /business/services —
 * тогда подставляем часть из event title «Клиент — Услуга».
 */
const GENERIC_SERVICE_NAMES = ['Услуга', 'Service', 'Servicio', 'Ծառայություն', 'Послуга']

export function isGenericServiceName(name) {
    return !name || GENERIC_SERVICE_NAMES.includes(String(name).trim())
}

/**
 * @param {object} slot — объект слота из API /schedule/slots
 * @param {Array<{id:number|string,name:string}>} services — список услуг бизнеса
 * @returns {string|null}
 */
export function resolveSlotServiceName(slot, services = []) {
    if (!slot) return null

    const serviceIdToSearch = slot.service_id ?? slot.service?.id
    if (serviceIdToSearch && services.length > 0) {
        const found = services.find(
            (s) =>
                String(s.id) === String(serviceIdToSearch) || s.id === serviceIdToSearch,
        )
        if (found?.name && !isGenericServiceName(found.name)) {
            return found.name
        }
    }

    if (slot.service?.name && !isGenericServiceName(slot.service.name)) {
        return slot.service.name
    }

    const rawTitle = slot.title
    if (rawTitle && String(rawTitle).includes(' - ')) {
        const parts = String(rawTitle).split(' - ')
        if (parts.length >= 2) {
            const last = parts.slice(1).join(' - ')
            if (last && !isGenericServiceName(last)) {
                return last
            }
        }
    }

    if (slot.service?.name) {
        return slot.service.name
    }

    return null
}

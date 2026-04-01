/**
 * Итоговая сумма записи расписания: совпадает с полем total_price из API /business/schedule/slots
 * (уже включает доп. услуги). Если total_price нет — base price + доп. услуги на клиенте.
 */
export function getScheduleSlotMonetaryTotal(slot) {
    if (!slot) {
        return 0
    }
    const tp = parseFloat(slot.total_price)
    if (Number.isFinite(tp) && tp >= 0) {
        return tp
    }
    const price = parseFloat(slot.price) || 0
    const additionalServicesTotal = (slot.additional_services || []).reduce((acc, service) => {
        return acc + (parseFloat(service.price) || 0) * (service.quantity || 1)
    }, 0)
    return price + additionalServicesTotal
}

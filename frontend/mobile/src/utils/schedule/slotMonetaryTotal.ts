/**
 * Итоговая сумма записи расписания — как на вебе getScheduleSlotMonetaryTotal.
 */

export type SlotWithPrice = {
  total_price?: string | number | null;
  price?: string | number | null;
  additional_services?: Array<{ price?: string | number | null; quantity?: number }> | null;
};

export function getScheduleSlotMonetaryTotal(slot: SlotWithPrice | null | undefined): number {
  if (!slot) {
    return 0;
  }
  const tp = parseFloat(String(slot.total_price));
  if (Number.isFinite(tp) && tp >= 0) {
    return tp;
  }
  const price = parseFloat(String(slot.price)) || 0;
  const additionalServicesTotal = (slot.additional_services || []).reduce((acc, service) => {
    return acc + (parseFloat(String(service.price)) || 0) * (service.quantity || 1);
  }, 0);
  return price + additionalServicesTotal;
}

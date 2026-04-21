import type { BusinessServiceItem, ScheduleSlot } from '../../api/business';

const GENERIC_SERVICE_NAMES = ['Услуга', 'Service', 'Servicio', 'Ծառայություն', 'Послуга'];

function isGenericServiceName(name: string | undefined | null): boolean {
  return !name || GENERIC_SERVICE_NAMES.includes(String(name).trim());
}

function isPlaceholderServiceTitle(title: string | undefined | null): boolean {
  if (!title) return true;
  return GENERIC_SERVICE_NAMES.some((p) => String(title).includes(p));
}

/** Заголовок события как на вебе ScheduleCalendar (клиент — услуга). */
export function buildScheduleEventTitle(
  slot: ScheduleSlot,
  services: BusinessServiceItem[],
  clientFallback: string
): string {
  let eventTitle = slot.title;
  const isCustomEvent =
    slot.event_type === 'block' ||
    slot.event_type === 'task' ||
    !!(slot.title && !slot.service_id && !slot.service?.id);

  if (isCustomEvent) {
    return slot.title || '—';
  }

  let serviceName: string | null = null;
  if (slot.service?.name && !isGenericServiceName(slot.service.name)) {
    serviceName = slot.service.name;
  } else {
    const serviceIdToSearch = slot.service_id || slot.service?.id;
    if (serviceIdToSearch && services.length > 0) {
      const found = services.find(
        (s) => String(s.id) === String(serviceIdToSearch) || s.id === serviceIdToSearch
      );
      if (found?.name && !isGenericServiceName(found.name)) {
        serviceName = found.name;
      }
    }
  }

  if (serviceName && (isPlaceholderServiceTitle(slot.title) || !slot.title)) {
    const clientName = slot.client?.name || slot.client_name || clientFallback;
    return `${clientName} — ${serviceName}`;
  }

  return eventTitle || '—';
}

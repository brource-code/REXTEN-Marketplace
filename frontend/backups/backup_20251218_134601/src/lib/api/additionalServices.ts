/**
 * API клиент для работы с дополнительными услугами
 */

export interface AdditionalService {
  id: number;
  service_id?: number | null;
  advertisement_id?: number | null;
  name: string;
  description?: string;
  price: number;
  duration?: number;
  is_active: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BookingAdditionalService {
  id: number;
  booking_id: number;
  additional_service_id: number;
  quantity: number;
  price: number;
  additional_service?: AdditionalService;
}

/**
 * Получить базовый URL Laravel API
 */
function getLaravelApiUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Если фронтенд открыт по IP (не localhost), используем тот же IP для API
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Используем тот же протокол и хост, но порт 8000 для API
      return `${protocol}//${hostname}:8000/api`;
    }
  }
  // Иначе используем переменную окружения или localhost
  return process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
}

/**
 * Получить список дополнительных услуг для услуги
 */
export async function getAdditionalServices(serviceId: number): Promise<AdditionalService[]> {
  try {
    // Используем бизнес-маршрут для услуг бизнеса
    const response = await fetch(
      `${getLaravelApiUrl()}/business/settings/additional-services?service_id=${serviceId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      console.warn('Failed to fetch additional services');
      return [];
    }

    const data = await response.json();
    // Обрабатываем разные форматы ответа
    const services = data.data || data;
    return Array.isArray(services) ? services : [];
  } catch (error) {
    console.error('Error fetching additional services:', error);
    return [];
  }
}

/**
 * Получить все дополнительные услуги (для суперадмина)
 */
export async function getAllAdditionalServices(filters?: {
  service_id?: number;
  is_active?: boolean;
}): Promise<AdditionalService[]> {
  try {
    const params = new URLSearchParams();
    
    if (filters?.service_id) {
      params.append('service_id', filters.service_id.toString());
    }
    if (filters?.is_active !== undefined) {
      params.append('is_active', filters.is_active.toString());
    }

    const response = await fetch(
      `${getLaravelApiUrl()}/admin/additional-services/all?${params.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      console.warn('Failed to fetch all additional services');
      return [];
    }

    const data = await response.json();
    const services = data.data || data;
    return Array.isArray(services) ? services : [];
  } catch (error) {
    console.error('Error fetching all additional services:', error);
    return [];
  }
}

/**
 * Получить дополнительную услугу по ID
 */
export async function getAdditionalService(id: number): Promise<AdditionalService | null> {
  try {
    const response = await fetch(
      `${getLaravelApiUrl()}/admin/additional-services/${id}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      console.warn('Failed to fetch additional service');
      return null;
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Error fetching additional service:', error);
    return null;
  }
}

/**
 * Создать дополнительную услугу
 */
export async function createAdditionalService(
  data: Omit<AdditionalService, 'id' | 'created_at' | 'updated_at'>
): Promise<AdditionalService | null> {
  try {
    // ВАЖНО: Для бизнес-админки всегда используем бизнес-маршрут
    // Если есть service_id - это точно бизнес-админка
    // Если нет service_id и нет advertisement_id - тоже бизнес-админка (по умолчанию)
    // Только если есть advertisement_id И нет service_id - это суперадмин
    const hasServiceId = data.service_id !== undefined && data.service_id !== null && data.service_id !== 0;
    const hasAdvertisementId = data.advertisement_id !== undefined && data.advertisement_id !== null;
    
    // Используем бизнес-маршрут по умолчанию, админ-маршрут только для суперадмина
    const url = (hasServiceId || !hasAdvertisementId)
      ? `${getLaravelApiUrl()}/business/settings/additional-services`
      : `${getLaravelApiUrl()}/admin/additional-services`;
    
    console.log('[createAdditionalService] Request data:', { 
      service_id: data.service_id, 
      advertisement_id: data.advertisement_id,
      hasServiceId,
      hasAdvertisementId,
      url,
      fullData: data
    });
    
    const response = await fetch(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create additional service');
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error('Error creating additional service:', error);
    throw error;
  }
}

/**
 * Обновить дополнительную услугу
 */
export async function updateAdditionalService(
  id: number,
  data: Partial<Omit<AdditionalService, 'id' | 'created_at' | 'updated_at'>>
): Promise<AdditionalService | null> {
  try {
    // Используем бизнес-маршрут если есть service_id, иначе админ-маршрут
    const url = data.service_id
      ? `${getLaravelApiUrl()}/business/settings/additional-services/${id}`
      : `${getLaravelApiUrl()}/admin/additional-services/${id}`;
    
    const response = await fetch(
      url,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update additional service');
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error('Error updating additional service:', error);
    throw error;
  }
}

/**
 * Удалить дополнительную услугу
 */
export async function deleteAdditionalService(id: number, serviceId?: number): Promise<boolean> {
  try {
    // Используем бизнес-маршрут если передан serviceId, иначе админ-маршрут
    const url = serviceId
      ? `${getLaravelApiUrl()}/business/settings/additional-services/${id}`
      : `${getLaravelApiUrl()}/admin/additional-services/${id}`;
    
    const response = await fetch(
      url,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      console.warn('Failed to delete additional service');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting additional service:', error);
    return false;
  }
}

/**
 * Получить дополнительные услуги для объявления (публичный API)
 */
export async function getAdditionalServicesByAdvertisement(
  advertisementId: number,
  serviceId?: number
): Promise<AdditionalService[]> {
  try {
    const params = new URLSearchParams();
    if (serviceId) {
      params.append('service_id', serviceId.toString());
    }

    const url = `${getLaravelApiUrl()}/additional-services/by-advertisement/${advertisementId}${params.toString() ? `?${params.toString()}` : ''}`;
    console.log('[getAdditionalServicesByAdvertisement] Request URL:', url);
    console.log('[getAdditionalServicesByAdvertisement] Request params:', {
      advertisementId,
      serviceId,
      params: params.toString()
    });

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    console.log('[getAdditionalServicesByAdvertisement] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getAdditionalServicesByAdvertisement] Failed to fetch:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url
      });
      return [];
    }

    const data = await response.json();
    console.log('[getAdditionalServicesByAdvertisement] Response data:', data);
    
    // Обрабатываем разные форматы ответа
    const services = data.data || data;
    const result = Array.isArray(services) ? services : [];
    console.log('[getAdditionalServicesByAdvertisement] Parsed services:', result);
    return result;
  } catch (error) {
    console.error('[getAdditionalServicesByAdvertisement] Error:', error);
    return [];
  }
}


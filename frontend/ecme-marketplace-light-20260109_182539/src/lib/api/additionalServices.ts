/**
 * API клиент для работы с дополнительными услугами
 */

import LaravelAxios from '@/services/axios/LaravelAxios'

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
    const response = await LaravelAxios.get('/business/settings/additional-services', {
      params: { service_id: serviceId }
    });

    // Обрабатываем разные форматы ответа
    const services = response.data?.data || response.data;
    return Array.isArray(services) ? services : [];
  } catch (error: any) {
    // Улучшенная обработка ошибок
    const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
    const errorStatus = error?.response?.status || 'N/A';
    const errorUrl = error?.config?.url || 'N/A';
    
    // Если это 404 или 403, это нормально (возможно, нет дополнительных услуг)
    // Не логируем как ошибку, просто возвращаем пустой массив
    if (errorStatus === 404 || errorStatus === 403) {
      return [];
    }
    
    // Логируем только реальные ошибки (не 404/403)
    if (errorStatus !== 404 && errorStatus !== 403) {
      console.error('Error fetching additional services:', {
        serviceId,
        status: errorStatus,
        url: errorUrl,
        message: errorMessage,
        error: error?.response?.data || error
      });
    }
    
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
    const response = await LaravelAxios.get('/admin/additional-services/all', {
      params: filters
    });

    const services = response.data?.data || response.data;
    return Array.isArray(services) ? services : [];
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
    const errorStatus = error?.response?.status || 'N/A';
    
    console.error('Error fetching all additional services:', {
      status: errorStatus,
      message: errorMessage,
      error: error?.response?.data || error
    });
    
    return [];
  }
}

/**
 * Получить дополнительную услугу по ID
 */
export async function getAdditionalService(id: number): Promise<AdditionalService | null> {
  try {
    const response = await LaravelAxios.get(`/admin/additional-services/${id}`);
    return response.data?.data || response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
    const errorStatus = error?.response?.status || 'N/A';
    
    console.error('Error fetching additional service:', {
      id,
      status: errorStatus,
      message: errorMessage,
      error: error?.response?.data || error
    });
    
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
      ? '/business/settings/additional-services'
      : '/admin/additional-services';
    
    console.log('[createAdditionalService] Request data:', { 
      service_id: data.service_id, 
      advertisement_id: data.advertisement_id,
      hasServiceId,
      hasAdvertisementId,
      url,
      fullData: data
    });
    
    const response = await LaravelAxios.post(url.replace(/^.*\/api/, ''), data);
    return response.data?.data || response.data;
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
      ? `/business/settings/additional-services/${id}`
      : `/admin/additional-services/${id}`;
    
    const response = await LaravelAxios.put(url, data);
    return response.data?.data || response.data;
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
      ? `/business/settings/additional-services/${id}`
      : `/admin/additional-services/${id}`;
    
    await LaravelAxios.delete(url);
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

    const url = `/additional-services/by-advertisement/${advertisementId}`;
    console.log('[getAdditionalServicesByAdvertisement] Request URL:', url);
    console.log('[getAdditionalServicesByAdvertisement] Request params:', {
      advertisementId,
      serviceId,
      params: params.toString()
    });

    const response = await LaravelAxios.get(url, {
      params: serviceId ? { service_id: serviceId } : {}
    });

    console.log('[getAdditionalServicesByAdvertisement] Response status:', response.status, response.statusText);
    console.log('[getAdditionalServicesByAdvertisement] Response data:', response.data);
    
    // Обрабатываем разные форматы ответа
    const services = response.data?.data || response.data;
    const result = Array.isArray(services) ? services : [];
    console.log('[getAdditionalServicesByAdvertisement] Parsed services:', result);
    return result;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
    const errorStatus = error?.response?.status || 'N/A';
    
    console.error('[getAdditionalServicesByAdvertisement] Error:', {
      advertisementId,
      serviceId,
      status: errorStatus,
      message: errorMessage,
      url,
      error: error?.response?.data || error
    });
    
    // Если это 404, это нормально (возможно, нет дополнительных услуг)
    if (errorStatus === 404) {
      return [];
    }
    
    return [];
  }
}


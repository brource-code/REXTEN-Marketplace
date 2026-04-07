/**
 * API клиент для работы с дополнительными услугами
 */

import LaravelAxios from '@/services/axios/LaravelAxios'
import { logClientApiError } from '@/utils/logClientApiError'

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
      logClientApiError('Error fetching additional services', error, {
        serviceId,
        url: errorUrl,
        message: errorMessage,
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
    
    logClientApiError('Error fetching all additional services', error, {
      status: errorStatus,
      message: errorMessage,
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
    
    logClientApiError('Error fetching additional service', error, {
      id,
      status: errorStatus,
      message: errorMessage,
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

    const response = await LaravelAxios.post(url.replace(/^.*\/api/, ''), data);
    return response.data?.data || response.data;
  } catch (error) {
    logClientApiError('Error creating additional service', error);
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
    logClientApiError('Error updating additional service', error);
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
    logClientApiError('Error deleting additional service', error);
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

    const response = await LaravelAxios.get(url, {
      params: serviceId ? { service_id: serviceId } : {}
    });

    // Обрабатываем разные форматы ответа
    const services = response.data?.data || response.data;
    const result = Array.isArray(services) ? services : [];
    return result;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
    const errorStatus = error?.response?.status || 'N/A';

    logClientApiError('[getAdditionalServicesByAdvertisement] Error', error, {
      advertisementId,
      serviceId,
      status: errorStatus,
      message: errorMessage,
      path: `/additional-services/by-advertisement/${advertisementId}`,
    });
    
    // Если это 404, это нормально (возможно, нет дополнительных услуг)
    if (errorStatus === 404) {
      return [];
    }
    
    return [];
  }
}


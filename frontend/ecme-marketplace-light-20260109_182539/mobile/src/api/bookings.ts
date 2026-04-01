// API слой для бронирований
// Адаптировано из веб-версии для React Native
// Публичные endpoints без аутентификации

import axios from 'axios';
import { API_BASE_URL } from './config';

// Создаем axios инстанс для API
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

export interface AvailableSlot {
  time: string;
  end_time: string;
  available: boolean;
  start_time?: string; // Альтернативное поле
  endTime?: string; // Альтернативное поле
}

export interface CreateBookingRequest {
  company_id: number;
  service_id: number;
  booking_date: string;
  booking_time: string;
  duration_minutes?: number;
  specialist_id?: number;
  client_name: string;
  client_phone: string;
  client_email?: string;
  client_notes?: string;
  advertisement_id?: number; // Опциональный advertisement_id
}

export interface BookingResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    booking_date: string;
    booking_time: string;
    status: string;
    price: number;
  };
}

/**
 * Получить доступные слоты для бронирования
 */
export async function getAvailableSlots(params: {
  company_id: number;
  service_id: number;
  date: string;
  advertisement_id?: number;
}): Promise<AvailableSlot[]> {
  try {
    const response = await apiClient.get<{ data?: AvailableSlot[] } | AvailableSlot[]>('/bookings/available-slots', {
      params,
    });
    
    const data = response.data;
    
    // Обрабатываем разные форматы ответа
    const slots = Array.isArray(data) ? data : (data as any)?.data || [];
    
    // Преобразуем формат слотов для совместимости
    return slots.map((slot: any) => ({
      time: slot.time || slot.start_time || '',
      end_time: slot.end_time || slot.endTime || '',
      available: slot.available !== false, // По умолчанию доступен
    }));
  } catch (error: any) {
    if (error.response?.status === 404) {
      // 404 может быть нормальным, если дата неактивна
      return [];
    }
    console.error('Error fetching available slots:', error);
    return [];
  }
}

/**
 * Создать бронирование (публичный endpoint)
 */
export async function createBooking(data: CreateBookingRequest): Promise<BookingResponse> {
  try {
    const response = await apiClient.post<BookingResponse>('/bookings', data);
    return response.data;
  } catch (error: any) {
    console.error('Error creating booking:', error);
    
    // Обрабатываем ошибки валидации
    if (error.response?.status === 422) {
      return {
        success: false,
        message: error.response.data?.message || 'Ошибка валидации данных',
      };
    }
    
    return {
      success: false,
      message: error.response?.data?.message || 'Не удалось создать бронирование',
    };
  }
}

/**
 * Проверить доступность конкретного слота
 */
export async function checkSlotAvailability(params: {
  company_id: number;
  service_id: number;
  booking_date: string;
  booking_time: string;
  duration_minutes?: number;
  advertisement_id?: number;
}): Promise<{ success: boolean; available: boolean }> {
  try {
    const response = await apiClient.post<{ success: boolean; available: boolean }>('/bookings/check-availability', params);
    return response.data;
  } catch (error: any) {
    console.error('Error checking slot availability:', error);
    return {
      success: false,
      available: false,
    };
  }
}


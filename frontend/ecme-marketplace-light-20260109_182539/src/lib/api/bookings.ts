import LaravelAxios from '@/services/axios/LaravelAxios'

export interface AvailableSlot {
    time: string
    end_time: string
    available: boolean
}

export interface CreateBookingRequest {
    company_id: number
    service_id: number
    booking_date: string
    booking_time: string
    duration_minutes?: number
    specialist_id?: number
    client_name: string
    client_phone: string
    client_email?: string
    client_notes?: string
    advertisement_id?: number // Добавляем опциональный advertisement_id
}

export interface BookingResponse {
    success: boolean
    message: string
    data?: {
        id: number
        booking_date: string
        booking_time: string
        status: string
        price: number
    }
}

/**
 * Создать бронирование (публичный endpoint)
 */
export async function createBooking(data: CreateBookingRequest): Promise<BookingResponse> {
    console.log('[createBooking] Отправка данных бронирования:', JSON.stringify(data, null, 2))
    try {
        const response = await LaravelAxios.post('/bookings', data)
        console.log('[createBooking] Успешный ответ от сервера:', response.data)
        return response.data
    } catch (error) {
        console.error('[createBooking] Ошибка при создании бронирования:', error)
        console.error('[createBooking] Error response:', error?.response)
        console.error('[createBooking] Error response data:', error?.response?.data)
        throw error
    }
}

/**
 * Получить доступные слоты для бронирования
 */
export async function getAvailableSlots(params: {
    company_id: number
    service_id: number
    date: string
    advertisement_id?: number // Добавляем опциональный advertisement_id
    specialist_id?: number // Добавляем опциональный specialist_id для фильтрации бронирований
}): Promise<AvailableSlot[]> {
    const response = await LaravelAxios.get('/bookings/available-slots', { params })
    return response.data.data || response.data
}

/**
 * Проверить доступность конкретного слота
 */
export async function checkSlotAvailability(params: {
    company_id: number
    service_id: number
    booking_date: string
    booking_time: string
    duration_minutes?: number
    advertisement_id?: number // Добавляем опциональный advertisement_id
}): Promise<{ success: boolean; available: boolean }> {
    const response = await LaravelAxios.post('/bookings/check-availability', params)
    return response.data
}


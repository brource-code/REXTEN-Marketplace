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
    execution_type?: 'onsite' | 'offsite' // Для гибридных услуг обязательно
    address_line1?: string // Для offsite бронирований обязательно
    city?: string // Для offsite бронирований обязательно
    state?: string // Для offsite бронирований обязательно
    zip?: string // Для offsite бронирований обязательно
    lat?: number
    lng?: number
    location_notes?: string
    promo_code?: string
    additional_services?: Array<{ id: number; quantity: number }>
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
export interface DiscountPreviewData {
    subtotal: number
    loyalty_bookings_count: number | null
    loyalty_tier: { id: number; name: string; discount_amount: number } | null
    promo: { id: number; code: string; name: string | null; discount_amount: number } | null
    promo_error: string | null
    promo_messages?: Record<string, string[]>
    applied_source: 'promo_code' | 'loyalty_tier' | null
    discount_amount: number
    final_total: number
}

/**
 * Превью скидок (публичный endpoint, при наличии JWT учитывается лояльность).
 */
export async function previewBookingDiscount(params: {
    company_id: number
    subtotal: number
    promo_code?: string
    client_phone?: string
}): Promise<{ success: boolean; data: DiscountPreviewData }> {
    const response = await LaravelAxios.post('/bookings/preview-discount', params)
    return response.data
}

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


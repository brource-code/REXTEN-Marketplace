// API функции для клиентской части
// Используются с React Query

import LaravelAxios from '@/services/axios/LaravelAxios'
import { logClientApiError, logClientApiWarn } from '@/utils/logClientApiError'

// Типы
export interface ClientProfile {
    id: number
    firstName: string
    lastName: string
    email: string
    phone: string
    avatar?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    /** Локаль уведомлений и писем (совпадает с UI при синхронизации) */
    locale?: string | null
}

export interface UpdateProfileData {
    firstName?: string
    lastName?: string
    phone?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
}

export interface ClientOrder {
    id: number
    bookingId: number
    serviceName: string
    businessName: string
    /** IANA, таймзона компании для отображения дат/времени заказа */
    timezone?: string
    date: string
    time: string
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
    price: number
    createdAt: string
}

export interface ClientBooking {
    id: number
    serviceName: string
    businessName: string
    businessSlug: string
    /** IANA, таймзона компании для отображения дат/времени брони */
    timezone?: string
    date: string
    time: string
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
    price: number
    specialist?: string
    notes?: string
    additional_services?: Array<{
        id: number
        name: string
        description?: string
        pivot?: {
            quantity: number
            price: number
        }
        price?: number
        quantity?: number
    }>
    total_price?: number // Общая стоимость с дополнительными услугами
    discount_amount?: number
    discount_source?: string | null
}

// API функции
// Для BUSINESS_OWNER и SUPERADMIN используется /user/profile
// Для CLIENT используется /client/profile (они не должны быть в админке)
export async function getClientProfile(): Promise<ClientProfile> {
    // Пробуем сначала универсальный endpoint для BUSINESS_OWNER и SUPERADMIN
    try {
        const response = await LaravelAxios.get('/user/profile')
        const responseData = response.data
        if (responseData.success && responseData.data) {
            return responseData.data
        }
        return responseData.data || responseData
    } catch (error: any) {
        // Если универсальный endpoint недоступен (403 - не та роль), используем /auth/me
        if (error?.response?.status === 403) {
            const authResponse = await LaravelAxios.get('/auth/me')
            return authResponse.data
        }
        // Если 404 или другая ошибка, пробуем /auth/me как fallback
        try {
            const authResponse = await LaravelAxios.get('/auth/me')
            return authResponse.data
        } catch (authError) {
            throw error
        }
    }
}

export async function updateClientProfile(data: UpdateProfileData): Promise<ClientProfile> {
    // Для BUSINESS_OWNER и SUPERADMIN используется /user/profile
    // Для CLIENT используется /client/profile
    try {
        const response = await LaravelAxios.put('/user/profile', data)
        const responseData = response.data.data || response.data
        return responseData
    } catch (error: any) {
        // Если 403 (не та роль), пробуем /client/profile для CLIENT
        if (error?.response?.status === 403) {
            try {
                const clientResponse = await LaravelAxios.put('/client/profile', data)
                const clientResponseData = clientResponse.data.data || clientResponse.data
                return clientResponseData
            } catch (clientError) {
                throw new Error('This endpoint is not available for your role')
            }
        }
        throw error
    }
}

export async function uploadAvatar(file: File): Promise<{ avatar: string }> {
    const formData = new FormData()
    formData.append('avatar', file)
    
    // Для BUSINESS_OWNER и SUPERADMIN используется /user/profile/avatar
    // Для CLIENT используется /client/profile/avatar (они не должны быть в админке)
    try {
        const response = await LaravelAxios.post('/user/profile/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        const data = response.data.data || response.data
        return data
    } catch (error: any) {
        // Если 403 (не та роль), пробуем /client/profile/avatar для CLIENT
        if (error?.response?.status === 403) {
            try {
                const clientResponse = await LaravelAxios.post('/client/profile/avatar', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                })
                const clientData = clientResponse.data.data || clientResponse.data
                return clientData
            } catch (clientError) {
                throw new Error('This endpoint is not available for your role')
            }
        }
        throw error
    }
}

export async function deleteAvatar(): Promise<{ success: boolean; message: string; avatar: null }> {
    // Для BUSINESS_OWNER и SUPERADMIN используется /user/profile/avatar
    try {
        const response = await LaravelAxios.delete('/user/profile/avatar')
        return response.data
    } catch (error: any) {
        // Если 403 (не та роль), пробуем /client/profile/change-password для CLIENT
        if (error?.response?.status === 403) {
            try {
                const clientResponse = await LaravelAxios.post('/client/profile/change-password', data)
                return clientResponse.data
            } catch (clientError) {
                throw new Error('This endpoint is not available for your role')
            }
        }
        throw error
    }
}

export interface ChangePasswordData {
    currentPassword: string
    newPassword: string
    confirmNewPassword: string
}

export async function changePassword(data: ChangePasswordData): Promise<{ success: boolean; message: string }> {
    // Для BUSINESS_OWNER и SUPERADMIN используется /user/profile/change-password
    // Для CLIENT используется /client/profile/change-password
    try {
        const response = await LaravelAxios.post('/user/profile/change-password', data)
        return response.data
    } catch (error: any) {
        // Если 403 (не та роль), пробуем /client/profile/change-password для CLIENT
        if (error?.response?.status === 403) {
            try {
                const clientResponse = await LaravelAxios.post('/client/profile/change-password', data)
                return clientResponse.data
            } catch (clientError) {
                throw new Error('This endpoint is not available for your role')
            }
        }
        throw error
    }
}

export async function getClientOrders(filters?: {
    status?: string
    dateFrom?: string
    dateTo?: string
}): Promise<ClientOrder[]> {
    const response = await LaravelAxios.get('/client/orders', { params: filters })
    const data = response.data.data || response.data
    return Array.isArray(data) ? data : []
}

export async function getClientBookings(filters?: {
    status?: string
    upcoming?: boolean
}): Promise<ClientBooking[]> {
    const response = await LaravelAxios.get('/client/bookings', { params: filters })
    const data = response.data.data || response.data
    return Array.isArray(data) ? data : []
}

export interface ClientLoyaltyProgressItem {
    company_id: number
    company_name: string
    company_slug: string
    loyalty_bookings_count: number
    loyalty_rule: string
    current_tier: {
        id: number
        name: string
        min_bookings: number
        max_bookings: number | null
        discount_type: string
        discount_value: number
    } | null
    next_tier: {
        id: number
        name: string
        min_bookings: number
        discount_type: string
        discount_value: number
    } | null
}

export async function getClientLoyaltyProgress(): Promise<ClientLoyaltyProgressItem[]> {
    const response = await LaravelAxios.get('/client/discounts/loyalty')
    const data = response.data
    return Array.isArray(data) ? data : []
}

export async function cancelBooking(bookingId: number): Promise<void> {
    await LaravelAxios.post(`/client/bookings/${bookingId}/cancel`)
}

// ========== Reviews ==========
export interface ClientReview {
    id: number
    orderId?: number
    bookingId?: number
    businessName: string
    businessSlug: string
    serviceName: string
    specialistName?: string
    rating: number
    comment: string
    createdAt: string
    businessAvatar?: string
    response?: string
    responseAt?: string
}

export interface PendingReview {
    id: number
    orderId: number
    bookingId: number
    serviceName: string
    businessName: string
    businessSlug: string
    date: string
    time: string
    price: number
    completedAt: string
}

export interface CreateReviewData {
    orderId?: number
    bookingId?: number
    rating: number
    comment: string
}

export async function getClientReviews(): Promise<ClientReview[]> {
    // Mock данные для разработки
    const USE_MOCK = !process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true'
    if (USE_MOCK) {
        return [
            {
                id: 1,
                orderId: 1,
                bookingId: 1,
                businessName: 'Glow Lab Studio',
                businessSlug: 'glow-lab',
                serviceName: 'Стрижка и укладка',
                rating: 5,
                comment: 'Отличный сервис! Мастер очень внимательный и профессиональный. Результат превзошел ожидания.',
                createdAt: '2024-01-15T10:00:00Z',
                businessAvatar: '/img/avatars/thumb-1.jpg',
            },
            {
                id: 2,
                orderId: 2,
                bookingId: 2,
                businessName: 'Atelier Nails',
                businessSlug: 'atelier-nails',
                serviceName: 'Маникюр премиум',
                rating: 4,
                comment: 'Хороший маникюр, но немного долго делали. В целом доволен результатом.',
                createdAt: '2024-01-10T14:30:00Z',
                businessAvatar: '/img/avatars/thumb-2.jpg',
            },
        ]
    }
    const response = await LaravelAxios.get('/client/reviews')
    return response.data.data || response.data
}

export async function getPendingReviews(): Promise<PendingReview[]> {
    const USE_MOCK = !process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true'
    if (USE_MOCK) {
        return [
            {
                id: 3,
                orderId: 3,
                bookingId: 3,
                serviceName: 'Окрашивание волос',
                businessName: 'Glow Lab Studio',
                businessSlug: 'glow-lab',
                date: '2024-01-20',
                time: '15:00',
                price: 2500,
                completedAt: '2024-01-20T15:00:00Z',
            },
        ]
    }
    const response = await LaravelAxios.get('/client/reviews/pending')
    return response.data.data || response.data
}

export async function createReview(data: CreateReviewData): Promise<ClientReview> {
    const USE_MOCK = !process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true'
    if (USE_MOCK) {
        return {
            id: Date.now(),
            orderId: data.orderId,
            bookingId: data.bookingId,
            businessName: 'Glow Lab Studio',
            businessSlug: 'glow-lab',
            serviceName: 'Окрашивание волос',
            rating: data.rating,
            comment: data.comment,
            createdAt: new Date().toISOString(),
        }
    }
    const response = await LaravelAxios.post('/client/reviews', data)
    return response.data.data || response.data
}

// ========== Favorites ==========
export interface FavoriteService {
    id: number
    serviceId: string
    serviceName: string
    businessName: string
    businessSlug: string
    price: number
    rating: number
    image?: string
    addedAt: string
}

export interface FavoriteBusiness {
    id: number
    businessId: number
    businessName: string
    businessSlug: string
    category: string
    rating: number
    image?: string
    addedAt: string
}

export async function getFavoriteServices(): Promise<FavoriteService[]> {
    try {
        const response = await LaravelAxios.get('/client/favorites/services')
        const data = response.data.data || response.data
        // Дедупликация ответа от API по id с использованием Map
        if (!Array.isArray(data)) {
            return []
        }
        const map = new Map()
        data.forEach((item) => {
            if (!map.has(item.id)) {
                map.set(item.id, item)
            }
        })
        return Array.from(map.values())
    } catch (error: any) {
        // Не логируем 401 (Unauthorized) и 403 (Forbidden) как ошибку - это нормально для неавторизованных пользователей или пользователей без роли CLIENT
        if (error?.response?.status === 401 || error?.response?.status === 403) {
            return []
        }
        // Логируем только реальные ошибки (не 401/403)
        if (error?.response?.status !== 401 && error?.response?.status !== 403) {
            logClientApiError('Error fetching favorite services', error)
        }
        return []
    }
}

export async function getFavoriteAdvertisements(): Promise<any[]> {
    try {
        const response = await LaravelAxios.get('/client/favorites/advertisements')
        const data = response.data.data || response.data
        if (!Array.isArray(data)) {
            return []
        }
        const map = new Map()
        data.forEach((item) => {
            if (!map.has(item.id)) {
                map.set(item.id, item)
            }
        })
        return Array.from(map.values())
    } catch (error: any) {
        // Не логируем 401 (Unauthorized) и 403 (Forbidden) как ошибку - это нормально для неавторизованных пользователей или пользователей без роли CLIENT
        if (error?.response?.status === 401 || error?.response?.status === 403) {
            return []
        }
        // Логируем только реальные ошибки (не 401/403)
        if (error?.response?.status !== 401 && error?.response?.status !== 403) {
            logClientApiError('Error fetching favorite advertisements', error)
        }
        return []
    }
}

export async function getFavoriteBusinesses(): Promise<FavoriteBusiness[]> {
    try {
        const response = await LaravelAxios.get('/client/favorites/businesses')
        const data = response.data.data || response.data
        // Дедупликация ответа от API по id с использованием Map
        if (!Array.isArray(data)) {
            return []
        }
        const map = new Map()
        data.forEach((item) => {
            if (!map.has(item.id)) {
                map.set(item.id, item)
            }
        })
        return Array.from(map.values())
    } catch (error: any) {
        // Не логируем 401 (Unauthorized) и 403 (Forbidden) как ошибку - это нормально для неавторизованных пользователей или пользователей без роли CLIENT
        if (error?.response?.status === 401 || error?.response?.status === 403) {
            return []
        }
        // Логируем только реальные ошибки (не 401/403)
        if (error?.response?.status !== 401 && error?.response?.status !== 403) {
            logClientApiError('Error fetching favorite businesses', error)
        }
        return []
    }
}

export async function addToFavorites(type: 'service' | 'business' | 'advertisement', id: number): Promise<void> {
    try {
        await LaravelAxios.post(`/client/favorites/${type}/${id}`)
    } catch (error: any) {
        logClientApiError('Error adding to favorites', error, { type, id })
        throw error
    }
}

export async function removeFromFavorites(type: 'service' | 'business' | 'advertisement', id: number): Promise<void> {
    await LaravelAxios.delete(`/client/favorites/${type}/${id}`)
}

// ========== Notifications ==========
export interface ClientNotification {
    id: number
    type: 'booking' | 'order' | 'review' | 'system'
    title: string
    message: string
    read: boolean
    createdAt: string
    link?: string
}

export async function getClientNotifications(): Promise<ClientNotification[]> {
    // Mock данные для разработки
    const USE_MOCK = !process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true'
    if (USE_MOCK) {
        return [
            {
                id: 1,
                type: 'booking',
                title: 'Бронирование подтверждено',
                message: 'Ваше бронирование в Glow Lab Studio на 20 января в 14:00 подтверждено',
                read: false,
                createdAt: '2024-01-18T10:00:00Z',
                link: '/client/booking',
            },
            {
                id: 2,
                type: 'order',
                title: 'Заказ завершен',
                message: 'Ваш заказ #BK-001 успешно завершен. Спасибо за использование наших услуг!',
                read: false,
                createdAt: '2024-01-15T18:30:00Z',
                link: '/client/orders',
            },
            {
                id: 3,
                type: 'review',
                title: 'Новый ответ на ваш отзыв',
                message: 'Glow Lab Studio ответил на ваш отзыв',
                read: true,
                createdAt: '2024-01-16T09:15:00Z',
                link: '/profile',
            },
            {
                id: 4,
                type: 'system',
                title: 'Обновление системы',
                message: 'Мы обновили платформу. Теперь доступны новые функции!',
                read: true,
                createdAt: '2024-01-10T12:00:00Z',
            },
        ]
    }
    const response = await LaravelAxios.get('/client/notifications')
    return response.data.data || response.data
}

export async function markNotificationAsRead(notificationId: number): Promise<void> {
    // Mock для разработки
    const USE_MOCK = !process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true'
    if (USE_MOCK) {
        return
    }
    await LaravelAxios.post(`/client/notifications/${notificationId}/read`)
}

export async function markAllNotificationsAsRead(): Promise<void> {
    // Mock для разработки
    const USE_MOCK = !process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true'
    if (USE_MOCK) {
        return
    }
    await LaravelAxios.post('/client/notifications/read-all')
}

export async function deleteNotification(notificationId: number): Promise<void> {
    // Mock для разработки
    const USE_MOCK = !process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true'
    if (USE_MOCK) {
        return
    }
    await LaravelAxios.delete(`/client/notifications/${notificationId}`)
}

// ========== Notification Settings ==========
export interface NotificationSettings {
    email: boolean
    sms: boolean
    telegram: boolean
    push: boolean
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
    // Mock данные для разработки
    const USE_MOCK = !process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true'
    if (USE_MOCK) {
        return {
            email: true,
            sms: false,
            telegram: false,
            push: true,
        }
    }
    
    try {
        const response = await LaravelAxios.get('/client/notifications/settings')
        return response.data.data || response.data
    } catch (error: any) {
        // Если профиль не найден (404), возвращаем настройки по умолчанию
        if (error?.response?.status === 404) {
            return {
                email: true,
                sms: false,
                telegram: false,
                push: true,
            }
        }
        throw error
    }
}

export async function updateNotificationSettings(data: Partial<NotificationSettings>): Promise<NotificationSettings> {
    // Mock для разработки
    const USE_MOCK = !process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true'
    if (USE_MOCK) {
        // TODO: Интеграция с email сервисом (SendGrid, Mailgun и т.д.)
        // TODO: Интеграция с SMS сервисом (Twilio, Sms.ru и т.д.)
        // TODO: Интеграция с Telegram Bot API
        return {
            email: data.email ?? true,
            sms: data.sms ?? false,
            telegram: data.telegram ?? false,
            push: data.push ?? true,
        }
    }
    const response = await LaravelAxios.put('/client/notifications/settings', data)
    return response.data.data || response.data
}

// ========== Discounts and Bonuses ==========
export interface Discount {
    id: number
    code: string
    title: string
    description: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    minPurchaseAmount?: number
    maxDiscountAmount?: number
    businessId: number
    businessName: string
    businessSlug: string
    businessImage?: string
    validFrom: string
    validUntil: string
    isActive: boolean
    isUsed: boolean
    usedAt?: string
}

export interface Bonus {
    id: number
    title: string
    description: string
    bonusType: 'points' | 'cashback' | 'service'
    bonusValue: number
    businessId: number
    businessName: string
    businessSlug: string
    businessImage?: string
    validFrom: string
    validUntil: string
    isActive: boolean
    isUsed: boolean
    usedAt?: string
}

export async function getClientDiscounts(): Promise<Discount[]> {
    try {
        const response = await LaravelAxios.get('/client/discounts')
        const data = response.data.data || response.data
        return Array.isArray(data) ? data : []
    } catch (error) {
        // Endpoint может быть не реализован, возвращаем пустой массив
        logClientApiWarn('Discounts endpoint not available', error)
        return []
    }
}

export async function getClientBonuses(): Promise<Bonus[]> {
    try {
        const response = await LaravelAxios.get('/client/bonuses')
        const data = response.data.data || response.data
        return Array.isArray(data) ? data : []
    } catch (error) {
        // Endpoint может быть не реализован, возвращаем пустой массив
        logClientApiWarn('Bonuses endpoint not available', error)
        return []
    }
}

export async function applyDiscount(discountId: number): Promise<void> {
    try {
        await LaravelAxios.post(`/client/discounts/${discountId}/apply`)
    } catch (error) {
        // Endpoint может быть не реализован
        logClientApiWarn('Apply discount endpoint not available', error)
        throw error
    }
}

export async function applyBonus(bonusId: number): Promise<void> {
    try {
        await LaravelAxios.post(`/client/bonuses/${bonusId}/apply`)
    } catch (error) {
        // Endpoint может быть не реализован
        logClientApiWarn('Apply bonus endpoint not available', error)
        throw error
    }
}

/**
 * Обновить язык пользователя в профиле
 */
export async function updateUserLocale(
    locale: 'en' | 'ru' | 'es-MX' | 'hy-AM' | 'uk-UA',
): Promise<{ success: boolean; locale: string }> {
    const response = await LaravelAxios.put('/user/locale', { locale })
    return response.data
}

// API слой для marketplace
// Использует реальные API вызовы с fallback на пустые данные

import { logClientApiError } from '@/utils/logClientApiError'
import { Service, ServiceProfile, Category, State, ServiceItem, ScheduleDay, TimeSlot, Review, TeamMember, PortfolioItem } from '@/types/marketplace'
import { mockServices, mockCategories, mockStates } from '@/mocks/services'
import { isLocalhostDirectNextPort } from '@/constants/frontend-ports.constant'

// Функция для динамического определения API URL
// Если фронтенд открыт по IP, используем IP для API тоже
export const getLaravelApiUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        const protocol = window.location.protocol
        const port = window.location.port
        
        // Для локального домена через nginx - используем относительный путь
        if (hostname === 'rexten.local' || hostname.endsWith('.local')) {
            return '/api'
        }
        
        // Для localhost через nginx (HTTPS на порту 8443) - используем относительный путь
        if ((hostname === 'localhost' || hostname === '127.0.0.1') && protocol === 'https:' && port === '8443') {
            return '/api'
        }
        
        // localhost:3003 (prod) или :3004 (dev) — без nginx → Laravel :8000
        if (
            (hostname === 'localhost' || hostname === '127.0.0.1') &&
            (isLocalhostDirectNextPort(port) || (port === '' && protocol === 'http:'))
        ) {
            return 'http://localhost:8000/api'
        }

        if (process.env.NEXT_PUBLIC_LARAVEL_API_URL === '/api') {
            if ((hostname !== 'localhost' && hostname !== '127.0.0.1') || (port === '8443' && protocol === 'https:')) {
                return '/api'
            }
        }
        
        // Если фронтенд открыт по IP (не localhost), используем тот же IP для API
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            // Проверяем, что это IP адрес (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
            const ipPattern = /^192\.168\.\d+\.\d+$|^10\.\d+\.\d+\.\d+$|^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/
            if (ipPattern.test(hostname)) {
                // Используем тот же протокол и хост, но порт 8000 для API
                return `${protocol}//${hostname}:8000/api`
            }
        }
    }
    // Иначе используем переменную окружения или localhost
    return process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
}

/** Публичные тарифы (БД) — для лендинга, без JWT */
export interface PublicSubscriptionPlan {
    id: string
    name: string
    description: string | null
    price_monthly: number
    price_yearly: number
    features: Record<string, unknown> | null
    badge_text: string | null
    color: string
    sort_order: number
    is_free: boolean
}

export async function getPublicSubscriptionPlans(): Promise<PublicSubscriptionPlan[]> {
    try {
        const response = await fetch(`${getLaravelApiUrl()}/subscription-plans/public`, {
            headers: { Accept: 'application/json' },
        })
        if (!response.ok) {
            return []
        }
        const data = await response.json()
        return Array.isArray(data.plans) ? data.plans : []
    } catch (error) {
        logClientApiError('getPublicSubscriptionPlans', error)
        return []
    }
}

// Получить список всех услуг
export async function getServicesList(): Promise<Service[]> {
    try {
        const response = await fetch(`${getLaravelApiUrl()}/marketplace/services`)
        if (!response.ok) {
            console.warn('Failed to fetch services list, returning empty array')
            return []
        }
        const data = await response.json()
        return Array.isArray(data) ? data : []
    } catch (error) {
        logClientApiError('Error fetching services list', error)
        return []
    }
}

// Получить список категорий
export async function getCategories(): Promise<Category[]> {
    try {
        const response = await fetch(`${getLaravelApiUrl()}/marketplace/categories`)
        if (!response.ok) {
            // Если 401 - это ошибка конфигурации бэкенда, публичные эндпоинты не должны требовать авторизацию
            if (response.status === 401) {
                console.error('Categories endpoint requires authentication - this should be a public endpoint')
                throw new Error('Categories endpoint requires authentication')
            }
            // Для других ошибок возвращаем пустой массив
            console.error('Failed to fetch categories:', response.status)
            return []
        }
        const data = await response.json()
        return data
    } catch (error) {
        logClientApiError('Error fetching categories', error)
        // Только для сетевых ошибок используем моки как fallback
        if (error instanceof TypeError && error.message.includes('fetch')) {
            console.warn('Network error, using fallback categories')
            return mockCategories
        }
        return []
    }
}

// Получить список штатов
export async function getStates(): Promise<State[]> {
    try {
        const response = await fetch(`${getLaravelApiUrl()}/marketplace/states`)
        if (!response.ok) {
            // Если 401 - это ошибка конфигурации бэкенда, публичные эндпоинты не должны требовать авторизацию
            if (response.status === 401) {
                console.error('States endpoint requires authentication - this should be a public endpoint')
                throw new Error('States endpoint requires authentication')
            }
            // Для других ошибок возвращаем пустой массив
            console.error('Failed to fetch states:', response.status)
            return []
        }
        const data = await response.json()
        return data
    } catch (error) {
        logClientApiError('Error fetching states', error)
        // Только для сетевых ошибок используем моки как fallback
        if (error instanceof TypeError && error.message.includes('fetch')) {
            console.warn('Network error, using fallback states')
            return mockStates
        }
        return []
    }
}

// Получить услугу по slug
export async function getServiceBySlug(slug: string): Promise<Service | null> {
    try {
        const response = await fetch(`${getLaravelApiUrl()}/marketplace/services/${slug}`)
        if (!response.ok) {
            if (response.status === 404) {
                return null
            }
            console.warn('Failed to fetch service by slug:', slug)
            return null
        }
        const data = await response.json()
        return data
    } catch (error) {
        logClientApiError('Error fetching service by slug', error, { slug })
        return null
    }
}

// Получить профиль компании со всеми объявлениями
export interface CompanyProfile {
    company: {
        id: string
        name: string
        slug: string
        description?: string
        logo?: string | null
        cover_image?: string | null
        city?: string
        state?: string
        /** IANA, для отображения дат отзывов в таймзоне бизнеса */
        timezone?: string
        location?: string
        phone?: string | null
        email?: string | null
        website?: string | null
        rating: number
        reviewsCount: number
        advertisementsCount: number
    }
    advertisements: Service[]
    services: ServiceItem[]
}

export async function getCompanyProfile(slug: string): Promise<CompanyProfile | null> {
    try {
        const response = await fetch(`${getLaravelApiUrl()}/marketplace/company/${slug}`)
        if (!response.ok) {
            if (response.status === 404) {
                return null
            }
            console.warn('Failed to fetch company profile:', slug)
            return null
        }
        const data = await response.json()
        return data
    } catch (error) {
        logClientApiError('Error fetching company profile', error, { slug })
        return null
    }
}

// Получить полный профиль услуги
export async function getServiceProfile(slug: string, forceRefresh: boolean = false): Promise<ServiceProfile | null> {
    try {
        // Добавляем timestamp для предотвращения кэширования при принудительной перезагрузке
        const url = `${getLaravelApiUrl()}/marketplace/services/${slug}/profile${forceRefresh ? '?t=' + Date.now() : ''}`
        const response = await fetch(url, {
            cache: forceRefresh ? 'no-store' : 'default',
        })
        if (!response.ok) {
            if (response.status === 404) {
                return null
            }
            console.warn('Failed to fetch service profile:', slug)
            return null
        }
        const data = await response.json()
        
        // Преобразуем данные в формат ServiceProfile
        return {
            service: data.service,
            servicesList: data.servicesList || [],
            schedule: data.schedule || { days: [], slots: {} },
            reviews: data.reviews || [],
            team: data.team || [],
            portfolio: data.portfolio || [],
            // Настройки маркетплейса компании
            allowBooking: data.allowBooking,
            showReviews: data.showReviews,
            showPortfolio: data.showPortfolio,
        }
    } catch (error) {
        logClientApiError('Error fetching service profile', error, { slug })
        return null
    }
}

// Получить список услуг с фильтрами
export interface ServicesFilters {
    search?: string
    category?: string
    state?: string
    city?: string
    priceMin?: number
    priceMax?: number
    ratingMin?: number
    tags?: string[]
    sort_by?: string
}

export async function getFilteredServices(filters: ServicesFilters): Promise<Service[]> {
    try {
        const params = new URLSearchParams()
        if (filters.search) params.append('search', filters.search)
        if (filters.category && filters.category !== 'all') params.append('category', filters.category)
        if (filters.state && filters.state !== '' && filters.state !== 'all') {
            params.append('state', filters.state)
        }
        if (filters.city && filters.city !== '' && filters.city !== 'all') {
            params.append('city', filters.city)
        }
        if (filters.priceMin !== undefined) params.append('priceMin', filters.priceMin.toString())
        if (filters.priceMax !== undefined) params.append('priceMax', filters.priceMax.toString())
        if (filters.ratingMin !== undefined) params.append('ratingMin', filters.ratingMin.toString())
        if (filters.tags && filters.tags.length > 0) {
            filters.tags.forEach(tag => params.append('tags[]', tag))
        }
        if (filters.sort_by && filters.sort_by !== 'default') params.append('sort_by', filters.sort_by)

        const url = `${getLaravelApiUrl()}/marketplace/services?${params.toString()}`
        const response = await fetch(url)
        if (!response.ok) {
            // Если 401 - это ошибка конфигурации бэкенда, публичные эндпоинты не должны требовать авторизацию
            if (response.status === 401) {
                console.error('Services endpoint requires authentication - this should be a public endpoint')
                throw new Error('Services endpoint requires authentication')
            }
            // Для других ошибок возвращаем пустой массив
            console.error('Failed to fetch services:', response.status)
            return []
        }
        const data = await response.json()
        return data
    } catch (error) {
        logClientApiError('Error fetching services (filtered)', error)
        // Только для сетевых ошибок используем моки как fallback
        if (error instanceof TypeError && error.message.includes('fetch')) {
            console.warn('Network error, using fallback services')
            return getFilteredServicesFallback(filters)
        }
        return []
    }
}

/** Один POST: какие объявления имеют включённые часы в выбранную дату (TZ компании на бэке). Без слотов на карточку. */
export async function postMarketplaceHasSlotsForDate(
    date: string,
    advertisementIds: number[],
    init?: RequestInit,
): Promise<number[]> {
    if (!date || advertisementIds.length === 0) {
        return []
    }
    try {
        const url = `${getLaravelApiUrl()}/marketplace/has-slots`
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ date, advertisement_ids: advertisementIds }),
            ...init,
        })
        if (!response.ok) {
            return []
        }
        const json = await response.json()
        if (!json?.success || !Array.isArray(json.available_ids)) {
            return []
        }
        return json.available_ids.map((n: unknown) => Number(n)).filter((n) => Number.isFinite(n))
    } catch (error) {
        logClientApiError('postMarketplaceHasSlotsForDate', error)
        return []
    }
}

// Fallback функция для фильтрации моков
function getFilteredServicesFallback(filters: ServicesFilters): Service[] {
    let filtered = [...mockServices]

    if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filtered = filtered.filter(
            (service) =>
                service.name.toLowerCase().includes(searchLower) ||
                service.category.toLowerCase().includes(searchLower) ||
                service.city.toLowerCase().includes(searchLower)
        )
    }

    if (filters.category && filters.category !== 'all') {
        filtered = filtered.filter((service) => service.group === filters.category)
    }

    if (filters.state && filters.state !== '' && filters.state !== 'all') {
        // Проверяем как прямое совпадение, так и по ID/названию
        filtered = filtered.filter((service) => {
            if (service.state === filters.state) return true
            // Если service.state это название, а filters.state это ID - проверяем через US_STATES
            // Но в fallback функции нет доступа к US_STATES, поэтому просто проверяем прямое совпадение
            return false
        })
    }

    if (filters.city) {
        filtered = filtered.filter((service) => 
            service.city && service.city.toLowerCase().includes(filters.city!.toLowerCase())
        )
    }

    if (filters.priceMin !== undefined) {
        filtered = filtered.filter((service) => service.priceValue >= filters.priceMin!)
    }

    if (filters.priceMax !== undefined) {
        filtered = filtered.filter((service) => service.priceValue <= filters.priceMax!)
    }

    if (filters.ratingMin !== undefined) {
        filtered = filtered.filter((service) => service.rating >= filters.ratingMin!)
    }

    if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter((service) =>
            filters.tags!.every((tag) => service.tags.includes(tag))
        )
    }

    return filtered
}

// Получить рекомендуемые услуги (featured) - теперь из реальных объявлений
export async function getFeaturedServices(
    limit: number = 3,
    state?: string,
    city?: string
): Promise<Service[]> {
    try {
        const params = new URLSearchParams()
        params.append('limit', limit.toString())
        params.append('placement', 'services')
        
        if (state) {
            params.append('state', state)
        }
        if (city) {
            params.append('city', city)
        }
        
        const response = await fetch(
            `${getLaravelApiUrl()}/advertisements/featured?${params.toString()}`
        )
        
        if (!response.ok) {
            console.warn('Failed to fetch featured services from API, returning empty array')
            return []
        }
        
        const data = await response.json()
        if (!Array.isArray(data)) {
            return []
        }
        
        return data.map((item) => ({
            ...item,
            businessName: item.businessName || item.company?.name || null,
        }))
    } catch (error) {
        logClientApiError('Error fetching featured services', error)
        return []
    }
}

export async function trackAdImpression(adId: number): Promise<void> {
    try {
        await fetch(`${getLaravelApiUrl()}/advertisements/${adId}/impression`, { method: 'POST' })
    } catch { /* non-critical */ }
}

export async function trackAdClick(adId: number): Promise<void> {
    try {
        await fetch(`${getLaravelApiUrl()}/advertisements/${adId}/click`, { method: 'POST' })
    } catch { /* non-critical */ }
}


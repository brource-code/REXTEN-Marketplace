// API функции для бизнес-админки
// Используются с React Query

import LaravelAxios from '@/services/axios/LaravelAxios'

// ========== Reviews ==========
export interface BusinessReview {
    id: number
    userName: string
    userAvatar: string | null
    rating: number
    comment: string
    serviceName: string | null
    specialistName: string | null
    response: string | null
    responseAt: string | null
    createdAt: string
}

export interface BusinessAdvertisementReviewGroup {
    advertisement: {
        id: number
        title: string
        link: string
        image: string | null
    }
    reviews: BusinessReview[]
    averageRating: number
    totalReviews: number
}

export interface BusinessReviewsData {
    groupedByAdvertisement: BusinessAdvertisementReviewGroup[]
    reviewsWithoutAd: BusinessReview[]
}

export async function getBusinessReviews(filters?: {
    page?: number
    pageSize?: number
}): Promise<BusinessReviewsData & { total?: number; page?: number; pageSize?: number }> {
    const response = await LaravelAxios.get('/business/reviews', { params: filters })
    const data = response.data.data || response.data
    return {
        ...data,
        total: response.data.total,
        page: response.data.page,
        pageSize: response.data.pageSize,
    }
}

export async function updateBusinessReviewResponse(id: number, response: string): Promise<void> {
    await LaravelAxios.put(`/business/reviews/${id}/response`, { response })
}

// ========== Dashboard ==========
export interface BusinessStats {
    totalBookings: number
    totalRevenue: number
    revenueInWork: number
    activeClients: number
    upcomingBookings: number
    activeAdvertisements: number
    revenueByPeriod: Array<{ period: string; amount: number }>
    revenue?: {
        thisWeek: number
        thisMonth: number
        thisYear: number
    }
    bookings?: {
        thisWeek: number
        thisMonth: number
        thisYear: number
    }
    clients?: {
        thisWeek: number
        thisMonth: number
        thisYear: number
    }
}

export interface RecentBooking {
    id: string
    date: string
    time: string
    customer: string
    service: string
    amount: number
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
}

export async function getBusinessStats(): Promise<BusinessStats> {
    try {
        const response = await LaravelAxios.get('/business/dashboard/stats')
        console.log('API Response Full:', response)
        console.log('API Response Data:', response.data)
        
        // Проверяем структуру ответа
        let data = response.data
        if (data && data.data) {
            data = data.data
        }
        
        // Если ответ содержит success: false, это ошибка
        if (response.data && response.data.success === false) {
            console.error('API returned error:', response.data.message)
            throw new Error(response.data.message || 'Failed to fetch stats')
        }
        
        console.log('Parsed Data:', data)
        
        // Проверяем, что все необходимые поля присутствуют
        if (!data || typeof data !== 'object') {
            console.error('Invalid data structure:', data)
            throw new Error('Invalid data structure')
        }
        
        return {
            totalBookings: data.totalBookings ?? 0,
            totalRevenue: data.totalRevenue ?? 0,
            revenueInWork: data.revenueInWork ?? 0,
            activeClients: data.activeClients ?? 0,
            upcomingBookings: data.upcomingBookings ?? 0,
            activeAdvertisements: data.activeAdvertisements ?? 0,
            revenueByPeriod: data.revenueByPeriod ?? [],
        }
    } catch (error: any) {
        // Если ошибка, возвращаем дефолтные значения вместо падения
        console.error('Failed to fetch business stats:', error)
        console.error('Error details:', {
            message: error?.message,
            response: error?.response?.data,
            status: error?.response?.status,
        })
        return {
            totalBookings: 0,
            totalRevenue: 0,
            revenueInWork: 0,
            activeClients: 0,
            upcomingBookings: 0,
            activeAdvertisements: 0,
            revenueByPeriod: [],
        }
    }
}

export async function getRecentBookings(limit: number = 5): Promise<RecentBooking[]> {
    const response = await LaravelAxios.get('/business/dashboard/recent-bookings', {
        params: { limit },
    })
    const data = response.data.data || response.data
    return Array.isArray(data) ? data : []
}

export interface ChartDataPoint {
    date: string
    value: number
}

export interface ChartData {
    series: Array<{ name: string; data: number[] }>
    date: string[]
}

export async function getChartData(
    category: 'revenue' | 'bookings' | 'clients',
    period: 'thisWeek' | 'thisMonth' | 'thisYear'
): Promise<ChartData> {
    try {
        const response = await LaravelAxios.get('/business/dashboard/chart', {
            params: { category, period },
        })
        console.log('Business Chart API Response:', response.data)
        
        // Проверяем структуру ответа
        let data = response.data
        if (data && data.data) {
            data = data.data
        }
        
        console.log('Business Chart Parsed Data:', data)
        
        // Убеждаемся, что структура правильная
        if (!data || typeof data !== 'object') {
            console.error('Invalid chart data structure:', data)
            throw new Error('Invalid chart data structure')
        }
        
        // Проверяем наличие series
        if (!data.series || !Array.isArray(data.series)) {
            console.warn('Chart data missing series array:', data)
            return {
                series: [{ name: category, data: [] }],
                categories: [],
                date: [],
            }
        }
        
        return {
            series: data.series,
            categories: data.categories || data.date || [],
            date: data.date || data.categories || [],
        }
    } catch (error: any) {
        // Endpoint может быть не реализован, возвращаем пустую структуру
        console.error('Chart data endpoint error:', error)
        console.error('Error details:', {
            message: error?.message,
            response: error?.response?.data,
            status: error?.response?.status,
        })
        return {
            series: [{ name: category, data: [] }],
            categories: [],
            date: [],
        }
    }
}

// ========== Schedule ==========
export interface ScheduleSlot {
    id: string
    title: string
    start: string
    end: string
    eventColor?: string
    status?: string
    specialist?: {
        id: number
        name: string
    } | null
    specialistName?: string | null
}

export interface ScheduleSettings {
    monday: { enabled: boolean; from: string; to: string }
    tuesday: { enabled: boolean; from: string; to: string }
    wednesday: { enabled: boolean; from: string; to: string }
    thursday: { enabled: boolean; from: string; to: string }
    friday: { enabled: boolean; from: string; to: string }
    saturday: { enabled: boolean; from: string; to: string }
    sunday: { enabled: boolean; from: string; to: string }
    breakEnabled: boolean
    breakFrom: string
    breakTo: string
    blockPastSlots: boolean
    minBookingHours: number
    maxBookingDays: number
}

export async function getScheduleSlots(): Promise<ScheduleSlot[]> {
    const response = await LaravelAxios.get('/business/schedule/slots')
    return response.data.data || response.data
}

export async function createScheduleSlot(data: Partial<ScheduleSlot>): Promise<ScheduleSlot> {
    const response = await LaravelAxios.post('/business/schedule/slots', data)
    return response.data.data || response.data
}

export async function updateScheduleSlot(id: string, data: Partial<ScheduleSlot>): Promise<ScheduleSlot> {
    const response = await LaravelAxios.put(`/business/schedule/slots/${id}`, data)
    return response.data.data || response.data
}

export async function deleteScheduleSlot(id: string | number): Promise<void> {
    await LaravelAxios.delete(`/business/schedule/slots/${id}`)
}

export async function getScheduleSettings(): Promise<ScheduleSettings> {
    const response = await LaravelAxios.get('/business/settings/schedule')
    return response.data.data || response.data
}

export async function updateScheduleSettings(data: Partial<ScheduleSettings>): Promise<ScheduleSettings> {
    const response = await LaravelAxios.put('/business/settings/schedule', data)
    return response.data.data || response.data
}

// ========== Clients ==========
export interface BusinessClient {
    id: number
    name: string
    email: string
    phone?: string
    img?: string
    totalBookings: number
    totalSpent: number
    lastVisit?: string
    status: string
}

export interface ClientNote {
    id: number
    note: string
    createdAt: string
}

export interface ClientInteraction {
    id: number
    type: string
    title: string
    description: string
    date: string
    time: string
}

export async function getBusinessClients(filters?: {
    search?: string
    status?: string
    page?: number
    pageSize?: number
}): Promise<{ data: BusinessClient[]; total: number }> {
    const response = await LaravelAxios.get('/business/clients', { params: filters })
    return response.data
}

export async function getClientDetails(clientId: number): Promise<{
    client: BusinessClient
    orders: any[]
    notes: ClientNote[]
    interactions: ClientInteraction[]
}> {
    const response = await LaravelAxios.get(`/business/clients/${clientId}`)
    return response.data.data || response.data
}

export async function updateClientStatus(clientId: number, status: 'regular' | 'permanent' | 'vip'): Promise<BusinessClient> {
    const response = await LaravelAxios.put(`/business/clients/${clientId}/status`, { status })
    return response.data.data || response.data
}

export async function createClient(data: {
    name: string
    email: string
    phone?: string
    status?: 'regular' | 'permanent' | 'vip'
}): Promise<BusinessClient> {
    const response = await LaravelAxios.post('/business/clients', data)
    return response.data.data || response.data
}

export async function updateClient(clientId: number, data: Partial<BusinessClient>): Promise<BusinessClient> {
    const response = await LaravelAxios.put(`/business/clients/${clientId}`, data)
    return response.data.data || response.data
}

export async function addClientNote(clientId: number, note: string): Promise<ClientNote> {
    const response = await LaravelAxios.post(`/business/clients/${clientId}/notes`, { note })
    return response.data.data || response.data
}

// ========== Settings ==========
export interface BusinessProfile {
    name: string
    description: string
    address: string
    phone: string
    email: string
    website?: string
    avatar?: string
    slug?: string
    city?: string
    state?: string
    onboarding_completed?: boolean
    onboarding_completed_at?: string | null
}

export interface BusinessService {
    id: number
    name: string
    category: string
    duration: number
    price: number
    status: 'active' | 'inactive'
    advertisement_id?: number | null
}

export interface TeamMember {
    id: number
    name: string
    email: string
    phone: string
    role: string
    status: 'active' | 'inactive'
    img?: string
}

export interface PortfolioItem {
    id: number
    title: string
    category: string
    image: string
}

export interface MarketplaceSettings {
    visible: boolean
    featured: boolean
    showInSearch: boolean
    showInFeatured: boolean
    allowBooking: boolean
    showReviews: boolean
    showPortfolio: boolean
    seoTitle: string
    seoDescription: string
    metaKeywords: string
}

// Profile
export async function getBusinessProfile(): Promise<BusinessProfile & { slug?: string }> {
    const response = await LaravelAxios.get('/business/settings/profile')
    return response.data.data || response.data
}

export async function updateBusinessProfile(data: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const response = await LaravelAxios.put('/business/settings/profile', data)
    return response.data.data || response.data
}

export async function uploadBusinessAvatar(file: File): Promise<{ avatar: string }> {
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await LaravelAxios.post('/business/settings/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.data || response.data
}

// Services
export async function getBusinessServices(): Promise<BusinessService[]> {
    const response = await LaravelAxios.get('/business/settings/services')
    return response.data.data || response.data
}

export async function createBusinessService(data: Omit<BusinessService, 'id'>): Promise<BusinessService> {
    const response = await LaravelAxios.post('/business/settings/services', data)
    return response.data.data || response.data
}

export async function updateBusinessService(id: number, data: Partial<BusinessService>): Promise<BusinessService> {
    const response = await LaravelAxios.put(`/business/settings/services/${id}`, data)
    return response.data.data || response.data
}

export async function deleteBusinessService(id: number): Promise<void> {
    await LaravelAxios.delete(`/business/settings/services/${id}`)
}

// Team
export async function getTeamMembers(): Promise<TeamMember[]> {
    const response = await LaravelAxios.get('/business/settings/team')
    return response.data.data || response.data
}

export async function createTeamMember(data: Omit<TeamMember, 'id'>): Promise<TeamMember> {
    const response = await LaravelAxios.post('/business/settings/team', data)
    return response.data.data || response.data
}

export async function updateTeamMember(id: number, data: Partial<TeamMember>): Promise<TeamMember> {
    const response = await LaravelAxios.put(`/business/settings/team/${id}`, data)
    return response.data.data || response.data
}

export async function deleteTeamMember(id: number): Promise<void> {
    await LaravelAxios.delete(`/business/settings/team/${id}`)
}

// Portfolio
export async function getPortfolioItems(): Promise<PortfolioItem[]> {
    const response = await LaravelAxios.get('/business/settings/portfolio')
    return response.data.data || response.data
}

export async function createPortfolioItem(data: Omit<PortfolioItem, 'id'> & { file: File }): Promise<PortfolioItem> {
    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('category', data.category)
    formData.append('image', data.file)
    const response = await LaravelAxios.post('/business/settings/portfolio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.data || response.data
}

export async function deletePortfolioItem(id: number): Promise<void> {
    await LaravelAxios.delete(`/business/settings/portfolio/${id}`)
}

// Schedule Settings
export async function getScheduleSettingsFromSettings(): Promise<ScheduleSettings> {
    const response = await LaravelAxios.get('/business/settings/schedule')
    return response.data.data || response.data
}

export async function updateScheduleSettingsFromSettings(data: Partial<ScheduleSettings>): Promise<ScheduleSettings> {
    const response = await LaravelAxios.put('/business/settings/schedule', data)
    return response.data.data || response.data
}

// Marketplace Settings
export async function getMarketplaceSettings(): Promise<MarketplaceSettings> {
    const response = await LaravelAxios.get('/business/settings/marketplace')
    return response.data.data || response.data
}

export async function updateMarketplaceSettings(data: Partial<MarketplaceSettings>): Promise<MarketplaceSettings> {
    const response = await LaravelAxios.put('/business/settings/marketplace', data)
    return response.data.data || response.data
}

// Business Notifications Settings
export interface BusinessNotificationSettings {
    email: boolean
    sms: boolean
    newBookings: boolean
    cancellations: boolean
    payments: boolean
    reviews: boolean
}

export async function getBusinessNotificationSettings(): Promise<BusinessNotificationSettings> {
    const response = await LaravelAxios.get('/business/settings/notifications')
    return response.data.data || response.data
}

export async function updateBusinessNotificationSettings(
    data: Partial<BusinessNotificationSettings>
): Promise<BusinessNotificationSettings> {
    const response = await LaravelAxios.put('/business/settings/notifications', data)
    return response.data.data || response.data
}

// ========== Advertisements ==========
export interface BusinessAdvertisement {
    id: number
    title: string
    description?: string
    type: 'advertisement' | 'regular'
    status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive' | 'draft'
    is_active: boolean
    image?: string
    placement: 'homepage' | 'services' | 'sidebar' | 'banner'
    start_date?: string | null
    end_date?: string | null
    impressions?: number
    clicks?: number
    created_at?: string
    updated_at?: string
}

export async function getBusinessAdvertisements(filters?: {
    page?: number
    pageSize?: number
    type?: 'advertisement' | 'regular'
}): Promise<{ data: BusinessAdvertisement[]; total: number; page: number; pageSize: number }> {
    const response = await LaravelAxios.get('/business/settings/advertisements', { params: filters })
    
    // Проверяем структуру ответа
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return {
            data: response.data.data,
            total: response.data.total || response.data.data.length,
            page: response.data.page || 1,
            pageSize: response.data.pageSize || 10,
        }
    }
    
    // Fallback для старого формата
    if (Array.isArray(response.data)) {
        return {
            data: response.data,
            total: response.data.length,
            page: 1,
            pageSize: response.data.length,
        }
    }
    
    return {
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
    }
}

export async function getBusinessAdvertisement(id: number): Promise<BusinessAdvertisement & {
    services?: any[]
    team?: any[]
    portfolio?: any[]
    schedule?: any
    price_from?: number | string | null
    price_to?: number | string | null
    currency?: string
    city?: string
    state?: string
    link?: string
}> {
    const response = await LaravelAxios.get(`/business/settings/advertisements/${id}`)
    return response.data.data || response.data
}

export async function createBusinessAdvertisement(
    data: Omit<BusinessAdvertisement, 'id' | 'status' | 'is_active' | 'created_at' | 'updated_at' | 'impressions' | 'clicks'>
): Promise<BusinessAdvertisement> {
    const response = await LaravelAxios.post('/business/settings/advertisements', data)
    return response.data.data || response.data
}

export async function updateBusinessAdvertisement(
    id: number,
    data: Partial<Omit<BusinessAdvertisement, 'id' | 'status' | 'is_active' | 'created_at' | 'updated_at' | 'impressions' | 'clicks'>>
): Promise<BusinessAdvertisement> {
    const response = await LaravelAxios.put(`/business/settings/advertisements/${id}`, data)
    return response.data.data || response.data
}

export async function deleteBusinessAdvertisement(id: number): Promise<void> {
    await LaravelAxios.delete(`/business/settings/advertisements/${id}`)
}

// Bookings
export interface BusinessBooking {
    id: number
    service: {
        id: number
        name: string
    }
    client: {
        id: number | null
        name: string
        email: string | null
        phone: string | null
    }
    specialist: {
        id: number
        name: string
    } | null
    booking_date: string
    booking_time: string
    duration_minutes: number
    price: number
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
    notes: string | null
    client_notes: string | null
    created_at: string
}

export interface CreateBookingData {
    service_id: number
    user_id?: number
    booking_date: string
    booking_time: string
    duration_minutes?: number
    specialist_id?: number
    price?: number
    status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
    notes?: string
    client_notes?: string
}

export async function getBusinessBookings(params?: {
    status?: string
    date_from?: string
    date_to?: string
    service_id?: number
}): Promise<BusinessBooking[]> {
    const response = await LaravelAxios.get('/business/bookings', { params })
    return response.data.data || response.data
}

export async function getBusinessBooking(id: number): Promise<BusinessBooking> {
    const response = await LaravelAxios.get(`/business/bookings/${id}`)
    return response.data.data || response.data
}

export async function createBusinessBooking(data: CreateBookingData): Promise<BusinessBooking> {
    const response = await LaravelAxios.post('/business/bookings', data)
    return response.data.data || response.data
}

export async function updateBusinessBooking(id: number, data: Partial<CreateBookingData>): Promise<BusinessBooking> {
    const response = await LaravelAxios.put(`/business/bookings/${id}`, data)
    return response.data.data || response.data
}

export async function deleteBusinessBooking(id: number): Promise<void> {
    await LaravelAxios.delete(`/business/bookings/${id}`)
}

// Onboarding
export async function completeOnboarding(): Promise<{
    onboarding_completed: boolean
    onboarding_completed_at: string | null
}> {
    const response = await LaravelAxios.post('/business/onboarding/complete')
    return response.data.data || response.data
}

// ========== Reports ==========
export interface ReportsFilters {
    date_from?: string // Format: YYYY-MM-DD
    date_to?: string // Format: YYYY-MM-DD
    specialist_id?: number
    service_id?: number
    status?: string | string[] // Can be single status or array of statuses
}

export interface ReportsOverview {
    totalBookings: number
    completedBookings: number
    cancelledBookings: number
    activeBookings: number
    totalRevenue: number
    revenueInWork: number
    averageCheck: number
    uniqueClients: number
    activeSpecialists: number
}

export interface BookingReport {
    byStatus: Array<{ status: string; count: number }>
    byPeriod: Array<{ period: string; count: number }>
    topServices: Array<{ serviceId: number; serviceName: string; count: number }>
}

export interface ClientReport {
    topByBookings: Array<{ clientId: number | null; clientName: string; bookings: number }>
    topByRevenue: Array<{ clientId: number | null; clientName: string; revenue: number }>
    newClients: Array<{ period: string; count: number }>
}

export interface RevenueReport {
    byPeriod: Array<{ period: string; revenue: number }>
    byService: Array<{ serviceId: number; serviceName: string; revenue: number }>
    bySpecialist: Array<{ specialistId: number; specialistName: string; revenue: number }>
}

export interface SpecialistReport {
    id: number
    name: string
    bookingsCount: number
    revenue: number
    cancellations: number
    completed: number
    active: number
    averageCheck: number
    clients: Array<{ id: number | null; name: string; bookings: number }>
}

export async function getReportsOverview(params?: ReportsFilters): Promise<ReportsOverview> {
    const response = await LaravelAxios.get('/business/reports', { params })
    return response.data.data || response.data
}

export async function getBookingsReport(params?: ReportsFilters): Promise<BookingReport> {
    const response = await LaravelAxios.get('/business/reports/bookings', { params })
    return response.data.data || response.data
}

export async function getClientsReport(params?: ReportsFilters): Promise<ClientReport> {
    const response = await LaravelAxios.get('/business/reports/clients', { params })
    return response.data.data || response.data
}

export async function getRevenueReport(params?: ReportsFilters): Promise<RevenueReport> {
    const response = await LaravelAxios.get('/business/reports/revenue', { params })
    return response.data.data || response.data
}

export async function getSpecialistsReport(params?: ReportsFilters): Promise<SpecialistReport[]> {
    const response = await LaravelAxios.get('/business/reports/specialists', { params })
    return response.data.data || response.data
}

export async function exportReport(
    type: 'excel' | 'csv',
    reportType: 'overview' | 'bookings' | 'clients' | 'revenue' | 'specialists',
    params?: ReportsFilters
): Promise<Blob> {
    const response = await LaravelAxios.get(`/business/reports/export/${type}`, {
        params: { report_type: reportType, ...params },
        responseType: 'blob',
    })
    return response.data
}


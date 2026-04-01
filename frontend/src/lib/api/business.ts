// API функции для бизнес-админки
// Используются с React Query

import LaravelAxios from '@/services/axios/LaravelAxios'

// ========== Reviews ==========
export interface BusinessReview {
    id: number
    userId: number | null // ID пользователя для ссылки на профиль
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
export interface DashboardPeriodMetric {
    value: number
    growShrink: number
}

function parseDashboardPeriodMetric(raw: unknown): DashboardPeriodMetric {
    if (raw != null && typeof raw === 'object' && 'value' in raw) {
        const o = raw as { value?: unknown; growShrink?: unknown }
        return {
            value: Number(o.value) || 0,
            growShrink: Number(o.growShrink) || 0,
        }
    }
    const n = Number(raw)
    return { value: Number.isFinite(n) ? n : 0, growShrink: 0 }
}

export interface BusinessStats {
    totalBookings: number
    totalRevenue: number
    revenueInWork: number
    overdueBookings?: {
        count: number
        revenue: number
    }
    activeClients: number
    upcomingBookings: number
    activeAdvertisements: number
    revenueByPeriod: Array<{ period: string; amount: number }>
    revenue?: {
        thisWeek: DashboardPeriodMetric
        thisMonth: DashboardPeriodMetric
        thisYear: DashboardPeriodMetric
    }
    bookings?: {
        thisWeek: DashboardPeriodMetric
        thisMonth: DashboardPeriodMetric
        thisYear: DashboardPeriodMetric
    }
    clients?: {
        thisWeek: DashboardPeriodMetric
        thisMonth: DashboardPeriodMetric
        thisYear: DashboardPeriodMetric
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

        let data = response.data
        if (data && data.data) {
            data = data.data
        }

        if (response.data && response.data.success === false) {
            throw new Error(response.data.message || 'Failed to fetch stats')
        }

        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data structure')
        }
        
        return {
            totalBookings: data.totalBookings ?? 0,
            totalRevenue: data.totalRevenue ?? 0,
            revenueInWork: data.revenueInWork ?? 0,
            overdueBookings: data.overdueBookings ?? { count: 0, revenue: 0 },
            activeClients: data.activeClients ?? 0,
            upcomingBookings: data.upcomingBookings ?? 0,
            activeAdvertisements: data.activeAdvertisements ?? 0,
            revenueByPeriod: data.revenueByPeriod ?? [],
            revenue: {
                thisWeek: parseDashboardPeriodMetric(data.revenue?.thisWeek),
                thisMonth: parseDashboardPeriodMetric(data.revenue?.thisMonth),
                thisYear: parseDashboardPeriodMetric(data.revenue?.thisYear),
            },
            bookings: {
                thisWeek: parseDashboardPeriodMetric(data.bookings?.thisWeek),
                thisMonth: parseDashboardPeriodMetric(data.bookings?.thisMonth),
                thisYear: parseDashboardPeriodMetric(data.bookings?.thisYear),
            },
            clients: {
                thisWeek: parseDashboardPeriodMetric(data.clients?.thisWeek),
                thisMonth: parseDashboardPeriodMetric(data.clients?.thisMonth),
                thisYear: parseDashboardPeriodMetric(data.clients?.thisYear),
            },
        }
    } catch (error: any) {
        // Если ошибка, возвращаем дефолтные значения вместо падения
        console.error('Failed to fetch business stats:', error)
        console.error('Error details:', {
            message: error?.message,
            response: error?.response?.data,
            status: error?.response?.status,
        })
        const z = (): DashboardPeriodMetric => ({ value: 0, growShrink: 0 })

        return {
            totalBookings: 0,
            totalRevenue: 0,
            revenueInWork: 0,
            activeClients: 0,
            upcomingBookings: 0,
            activeAdvertisements: 0,
            revenueByPeriod: [],
            revenue: { thisWeek: z(), thisMonth: z(), thisYear: z() },
            bookings: { thisWeek: z(), thisMonth: z(), thisYear: z() },
            clients: { thisWeek: z(), thisMonth: z(), thisYear: z() },
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
    user_id?: number | null
    has_client_account?: boolean // Есть ли у клиента аккаунт с ролью CLIENT (исключаем CRM клиентов с @local.local)
    review_token?: string | null // Токен для отзыва клиентов без клиентского аккаунта
    specialist?: {
        id: number
        name: string
    } | null
    specialistName?: string | null
    service?: {
        id: number | string
        name: string
        service_type?: string
    } | null
    client?: {
        id: number | null
        name: string
        email?: string | null
        phone?: string | null
        address?: string | null
        city?: string | null
        state?: string | null
        zip_code?: string | null
    } | null
    client_name?: string | null
    service_id?: number | string | null
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
    address?: string
    city?: string
    state?: string
    zip_code?: string
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

export interface ClientSummary {
    firstVisit: string | null
    lastVisit: string | null
    totalBookings: number
    completedBookings: number
    cancelledBookings: number
    totalSpent: number
    averageCheck: number
    conversionRate: number
    favoriteService: {
        id: number
        name: string
    } | null
    favoriteSpecialist: {
        id: number
        name: string
    } | null
    visitFrequency: number
}

export interface ClientBookingReview {
    id: number
    rating: number
    comment: string | null
    created_at: string | null
}

export interface ClientBookingLocation {
    address_line1: string
    address_line2?: string | null
    city: string
    state: string
    zip: string
    notes?: string | null
}

export interface ClientBookingAdditionalService {
    id: number
    name: string
    pivot: {
        quantity: number
        price: number
    }
    price: number
    quantity: number
}

export interface ClientBookingDiscountTier {
    id: number
    name: string
    discount_type: string
    discount_value: number
}

export interface ClientBookingPromoCode {
    id: number
    code: string
}

export interface ClientBooking {
    id: number
    service: {
        id: number
        name: string
    } | null
    specialist: {
        id: number
        name: string
    } | null
    booking_date: string | null
    booking_time: string | null
    duration_minutes: number
    price: number
    total_price: number
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'new'
    notes: string | null
    client_notes: string | null
    execution_type: 'onsite' | 'offsite'
    location: ClientBookingLocation | null
    additional_services: ClientBookingAdditionalService[]
    review: ClientBookingReview | null
    created_at: string | null
    currency: string
    discount_amount?: number
    discount_source?: string | null
    discount_tier?: ClientBookingDiscountTier | null
    promo_code?: ClientBookingPromoCode | null
}

export interface ClientLoyaltyTierInfo {
    id: number
    name: string
    min_bookings: number
    max_bookings?: number | null
    discount_type: string
    discount_value: number
}

export interface ClientLoyaltyNextTierInfo {
    id: number
    name: string
    min_bookings: number
    discount_type: string
    discount_value: number
}

export interface ClientLoyaltySummary {
    loyalty_bookings_count: number
    loyalty_rule: string
    /** false — в компании нет активных уровней в discount_tiers, скидка по лояльности не применится */
    tiers_configured?: boolean
    current_tier: ClientLoyaltyTierInfo | null
    next_tier: ClientLoyaltyNextTierInfo | null
    bookings_to_next_tier: number | null
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

export async function getClientDetails(clientId: number, filters?: {
    status?: string
    date_from?: string
    date_to?: string
    sort_by?: 'booking_date' | 'price'
    sort_order?: 'asc' | 'desc'
}): Promise<{
    client: BusinessClient
    summary: ClientSummary
    bookings: ClientBooking[]
    notes: ClientNote[]
    loyalty?: ClientLoyaltySummary | null
}> {
    const response = await LaravelAxios.get(`/business/clients/${clientId}`, { params: filters })
    return response.data.data || response.data
}

export async function updateClientStatus(clientId: number, status: 'regular' | 'permanent' | 'vip'): Promise<BusinessClient> {
    const response = await LaravelAxios.put(`/business/clients/${clientId}/status`, { status })
    return response.data.data || response.data
}

export async function deleteClient(clientId: number): Promise<void> {
    await LaravelAxios.delete(`/business/clients/${clientId}`)
}

export async function createClient(data: {
    name: string
    email: string
    phone?: string
    address?: string
    status?: 'regular' | 'permanent' | 'vip'
}): Promise<BusinessClient> {
    const response = await LaravelAxios.post('/business/clients', data)
    return response.data.data || response.data
}

export async function updateClient(clientId: number, data: Partial<BusinessClient>): Promise<BusinessClient> {
    const response = await LaravelAxios.put(`/business/clients/${clientId}`, data)
    return response.data.data || response.data
}

export async function uploadClientAvatar(clientId: number, file: File): Promise<{ avatar: string }> {
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await LaravelAxios.post(`/business/clients/${clientId}/avatar`, formData)
    const data = response.data?.data ?? response.data
    return { avatar: data?.avatar ?? '' }
}

export async function addClientNote(clientId: number, note: string): Promise<ClientNote> {
    const response = await LaravelAxios.post(`/business/clients/${clientId}/notes`, { note })
    return response.data.data || response.data
}

// ========== Settings ==========
export interface BusinessProfile {
    id?: number
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
    timezone?: string
    onboarding_completed?: boolean
    onboarding_completed_at?: string | null
    is_owner?: boolean
    permissions?: string[]
}

export interface BusinessService {
    id: number
    name: string
    category: string
    duration: number
    price: number
    status: 'active' | 'inactive'
    advertisement_id?: number | null
    service_type?: 'onsite' | 'offsite' | 'hybrid'
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
    showInSearch: boolean
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

// Company Users (staff with roles - managers, etc.)
export interface CompanyUserMember {
    id: string | number
    user_id: number
    email: string
    name: string
    role: { id: number; name: string; slug: string; is_system: boolean } | null
    is_owner: boolean
    is_active: boolean
}

export async function getCompanyUsers(): Promise<{ members: CompanyUserMember[] }> {
    const response = await LaravelAxios.get('/business/users')
    return response.data
}

export async function inviteCompanyUser(data: { email: string; role_id: number }): Promise<{ member: CompanyUserMember; temporary_password?: string }> {
    const response = await LaravelAxios.post('/business/users/invite', data)
    return response.data
}

export async function updateCompanyUserRole(id: number, roleId: number): Promise<void> {
    await LaravelAxios.put(`/business/users/${id}/role`, { role_id: roleId })
}

export async function removeCompanyUser(id: number): Promise<void> {
    await LaravelAxios.delete(`/business/users/${id}`)
}

// Company Roles
export interface CompanyRoleItem {
    id: number
    name: string
    slug: string
    is_system: boolean
    permissions: string[]
}

export interface PermissionGroup {
    [group: string]: Array<{ id: number; name: string; slug: string }>
}

export async function getCompanyRoles(): Promise<{ roles: CompanyRoleItem[] }> {
    const response = await LaravelAxios.get('/business/roles')
    return response.data
}

export async function getCompanyPermissions(): Promise<{ permissions: PermissionGroup }> {
    const response = await LaravelAxios.get('/business/roles/permissions')
    return response.data
}

export async function createCompanyRole(data: { name: string; slug: string; permission_ids?: number[] }): Promise<{ role: CompanyRoleItem }> {
    const response = await LaravelAxios.post('/business/roles', data)
    return response.data
}

export async function updateCompanyRole(id: number, data: { name?: string; permission_ids?: number[] }): Promise<{ role: CompanyRoleItem }> {
    const response = await LaravelAxios.put(`/business/roles/${id}`, data)
    return response.data
}

export async function deleteCompanyRole(id: number): Promise<void> {
    await LaravelAxios.delete(`/business/roles/${id}`)
}

export async function getBusinessCompanies(): Promise<{ companies: Array<{ id: number; name: string; slug: string; is_owner: boolean }> }> {
    const response = await LaravelAxios.get('/business/companies')
    return response.data
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

// Business notifications (list, read, delete)
export interface BusinessNotificationItem {
    id: number
    type: string
    title: string
    message: string
    read: boolean
    createdAt: string
    link?: string
}

export async function getBusinessNotifications(): Promise<BusinessNotificationItem[]> {
    const response = await LaravelAxios.get('/business/notifications')
    return response.data.data || response.data
}

export async function markBusinessNotificationAsRead(id: number): Promise<void> {
    await LaravelAxios.post(`/business/notifications/${id}/read`)
}

export async function markAllBusinessNotificationsAsRead(): Promise<void> {
    await LaravelAxios.post('/business/notifications/read-all')
}

export async function deleteBusinessNotification(id: number): Promise<void> {
    await LaravelAxios.delete(`/business/notifications/${id}`)
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
    data: Partial<Omit<BusinessAdvertisement, 'id' | 'status' | 'created_at' | 'updated_at' | 'impressions' | 'clicks'>>
): Promise<BusinessAdvertisement> {
    const response = await LaravelAxios.put(`/business/settings/advertisements/${id}`, data)
    return response.data.data || response.data
}

export async function updateAdvertisementVisibility(
    id: number,
    isActive: boolean
): Promise<BusinessAdvertisement> {
    const response = await LaravelAxios.patch(`/business/settings/advertisements/${id}/visibility`, {
        is_active: isActive
    })
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
// Salary
export interface SalarySetting {
    id: number
    specialist_id: number
    payment_type: 'percent' | 'fixed' | 'fixed_plus_percent' | 'hourly'
    percent_rate: number | null
    fixed_amount: number | null
    hourly_rate: number | null
    is_active: boolean
    effective_from: string
    effective_to: string | null
    created_at: string
}

export interface SalaryCalculation {
    id: number
    specialist_id: number
    specialist_name: string
    period_start: string
    period_end: string
    total_bookings: number
    total_hours: number
    base_amount: number
    percent_amount: number
    total_salary: number
    calculation_details?: Array<{
        booking_id: number
        booking_date: string
        booking_time: string
        total_price: number
        duration_minutes: number
        payment_type: string
        salary: number
        setting_id: number
    }>
    created_at: string
}

export interface SalaryFilters {
    date_from?: string
    date_to?: string
    specialist_id?: number
    page?: number
    pageSize?: number
}

export interface CalculateSalaryData {
    period_start: string
    period_end: string
    specialist_id?: number
    force?: boolean
}

export async function getSalaryCalculations(filters?: SalaryFilters): Promise<{
    data: SalaryCalculation[]
    total: number
    page: number
    pageSize: number
}> {
    const response = await LaravelAxios.get('/business/salary', { params: filters })
    return response.data
}

export async function calculateSalary(data: CalculateSalaryData): Promise<{
    message: string
    data: Array<{
        id: number
        specialist_id: number
        specialist_name: string
        total_salary: number
        total_bookings: number
    }>
}> {
    const response = await LaravelAxios.post('/business/salary/calculate', data)
    return response.data
}

export async function getSalarySettings(specialistId: number): Promise<SalarySetting[]> {
    const response = await LaravelAxios.get(`/business/salary/settings/${specialistId}`)
    return response.data.data || response.data
}

export async function updateSalarySettings(
    specialistId: number,
    data: Omit<SalarySetting, 'id' | 'specialist_id' | 'created_at'>
): Promise<SalarySetting> {
    const response = await LaravelAxios.put(`/business/salary/settings/${specialistId}`, data)
    return response.data.data || response.data
}

export async function getSalaryCalculationDetails(id: number): Promise<SalaryCalculation> {
    const response = await LaravelAxios.get(`/business/salary/${id}`)
    return response.data.data || response.data
}

export async function exportSalaryReport(type: 'csv', filters?: SalaryFilters): Promise<Blob> {
    const response = await LaravelAxios.get(`/business/salary/export/${type}`, {
        params: filters,
        responseType: 'blob',
    })
    return response.data
}

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

export interface SalaryReport {
    totalSalary: number
    totalCalculations: number
    totalSpecialists: number
    averageSalary: number
    bySpecialist: Array<{
        specialist_id: number
        specialist_name: string
        total_salary: number
        total_bookings: number
        total_hours: number
    }>
    byPeriod: Array<{
        period_start: string
        period_end: string
        total_salary: number
        calculations_count: number
    }>
}

export async function getSalaryReport(params?: ReportsFilters): Promise<SalaryReport> {
    const response = await LaravelAxios.get('/business/reports/salary', { params })
    return response.data.data || response.data
}

export async function exportReport(
    type: 'excel' | 'csv',
    reportType: 'overview' | 'bookings' | 'clients' | 'revenue' | 'specialists' | 'salary',
    params?: ReportsFilters
): Promise<Blob> {
    const response = await LaravelAxios.get(`/business/reports/export/${type}`, {
        params: { report_type: reportType, ...params },
        responseType: 'blob',
    })
    return response.data
}

// ========== Recurring Bookings ==========
export interface RecurringBookingChain {
    id: number
    service_id: number | null
    service?: {
        id: number
        name: string
    } | null
    user_id: number | null
    client_name: string | null
    client_email: string | null
    client_phone: string | null
    specialist_id: number | null
    specialist?: {
        id: number
        name: string
    } | null
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly'
    days_of_week: number[] | null
    day_of_month: number | null
    days_of_month: number[] | null
    booking_time: string
    duration_minutes: number
    price: number
    start_date: string
    end_date: string | null
    notes: string | null
    status: 'active' | 'paused' | 'cancelled'
    upcoming_bookings?: Array<{
        id: number
        booking_date: string
        status: string
    }>
}

export interface CreateRecurringBookingData {
    service_id?: number | null
    user_id?: number | null
    specialist_id?: number | null
    advertisement_id?: number | null
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly'
    days_of_week?: number[] | null
    day_of_month?: number | null
    days_of_month?: number[] | null
    booking_time: string
    duration_minutes?: number
    price?: number
    start_date: string
    end_date?: string | null
    client_name?: string | null
    client_email?: string | null
    client_phone?: string | null
    notes?: string | null
}

export async function getRecurringBookings(): Promise<RecurringBookingChain[]> {
    const response = await LaravelAxios.get('/business/recurring-bookings')
    return response.data.data || response.data
}

export async function createRecurringBooking(data: CreateRecurringBookingData): Promise<RecurringBookingChain> {
    const response = await LaravelAxios.post('/business/recurring-bookings', data)
    return response.data.data || response.data
}

export async function updateRecurringBooking(id: number, data: Partial<CreateRecurringBookingData>): Promise<RecurringBookingChain> {
    const response = await LaravelAxios.put(`/business/recurring-bookings/${id}`, data)
    return response.data.data || response.data
}

export async function deleteRecurringBooking(id: number): Promise<void> {
    await LaravelAxios.delete(`/business/recurring-bookings/${id}`)
}

export async function regenerateRecurringBooking(id: number): Promise<{ deleted: number; created: number }> {
    const response = await LaravelAxios.post(`/business/recurring-bookings/${id}/regenerate`)
    return response.data.data || response.data
}

// ========== Скидки и промокоды ==========
export type LoyaltyBookingCountRule = 'completed' | 'all_non_cancelled'

export async function getBusinessDiscountSettings(): Promise<{ loyalty_booking_count_rule: LoyaltyBookingCountRule }> {
    const response = await LaravelAxios.get('/business/discounts/settings')
    return response.data.data || response.data
}

export async function updateBusinessDiscountSettings(data: {
    loyalty_booking_count_rule: LoyaltyBookingCountRule
}): Promise<{ loyalty_booking_count_rule: LoyaltyBookingCountRule }> {
    const response = await LaravelAxios.put('/business/discounts/settings', data)
    return response.data.data || response.data
}

export interface BusinessDiscountTier {
    id: number
    company_id: number
    name: string
    min_bookings: number
    max_bookings: number | null
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    sort_order: number
    is_active: boolean
}

export async function getBusinessDiscountTiers(): Promise<BusinessDiscountTier[]> {
    const response = await LaravelAxios.get('/business/discount-tiers')
    const data = response.data.data || response.data
    return Array.isArray(data) ? data : []
}

export async function createBusinessDiscountTier(
    payload: Omit<BusinessDiscountTier, 'id' | 'company_id'>
): Promise<BusinessDiscountTier> {
    const response = await LaravelAxios.post('/business/discount-tiers', payload)
    return response.data.data || response.data
}

export async function updateBusinessDiscountTier(
    id: number,
    payload: Partial<Omit<BusinessDiscountTier, 'id' | 'company_id'>>
): Promise<BusinessDiscountTier> {
    const response = await LaravelAxios.put(`/business/discount-tiers/${id}`, payload)
    return response.data.data || response.data
}

export async function deleteBusinessDiscountTier(id: number): Promise<void> {
    await LaravelAxios.delete(`/business/discount-tiers/${id}`)
}

export interface BusinessPromoCode {
    id: number
    company_id: number
    code: string
    name: string | null
    description: string | null
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    min_order_amount: number | null
    max_discount_amount: number | null
    usage_limit: number | null
    usage_per_user: number | null
    used_count: number
    valid_from: string | null
    valid_until: string | null
    is_active: boolean
}

export async function getBusinessPromoCodes(): Promise<BusinessPromoCode[]> {
    const response = await LaravelAxios.get('/business/promo-codes')
    const data = response.data.data || response.data
    return Array.isArray(data) ? data : []
}

export async function createBusinessPromoCode(
    payload: Omit<BusinessPromoCode, 'id' | 'company_id' | 'used_count'>
): Promise<BusinessPromoCode> {
    const response = await LaravelAxios.post('/business/promo-codes', payload)
    return response.data.data || response.data
}

export async function updateBusinessPromoCode(
    id: number,
    payload: Partial<Omit<BusinessPromoCode, 'id' | 'company_id' | 'used_count'>>
): Promise<BusinessPromoCode> {
    const response = await LaravelAxios.put(`/business/promo-codes/${id}`, payload)
    return response.data.data || response.data
}

export async function deleteBusinessPromoCode(id: number): Promise<void> {
    await LaravelAxios.delete(`/business/promo-codes/${id}`)
}
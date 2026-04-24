// API функции для бизнес-админки
// Используются с React Query

import LaravelAxios from '@/services/axios/LaravelAxios'
import { logClientApiError, logClientApiWarn } from '@/utils/logClientApiError'

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

function parseBookingsGoalPeriod(raw: unknown): BookingsGoalPeriod {
    if (raw != null && typeof raw === 'object' && 'current' in raw) {
        const o = raw as { current?: unknown; target?: unknown; percent?: unknown }
        return {
            current: Number(o.current) || 0,
            target: Number(o.target) || 0,
            percent: Number(o.percent) || 0,
        }
    }
    return { current: 0, target: 0, percent: 0 }
}

function parseTopServiceRows(raw: unknown): TopServiceRow[] {
    if (!Array.isArray(raw)) {
        return []
    }
    return raw.map((row) => {
        const o = row as Record<string, unknown>
        return {
            serviceId: Number(o.serviceId) || 0,
            name: typeof o.name === 'string' ? o.name : '',
            image: o.image == null || o.image === '' ? null : String(o.image),
            count: Number(o.count) || 0,
            growShrink: Number(o.growShrink) || 0,
        }
    })
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

export interface BookingsGoalPeriod {
    current: number
    target: number
    percent: number
}

export interface TopServiceRow {
    serviceId: number
    name: string
    image: string | null
    count: number
    growShrink: number
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
    bookingsGoal?: {
        thisWeek: BookingsGoalPeriod
        thisMonth: BookingsGoalPeriod
        thisYear: BookingsGoalPeriod
    }
    topServices?: {
        thisWeek: TopServiceRow[]
        thisMonth: TopServiceRow[]
        thisYear: TopServiceRow[]
    }
}

export interface RecentBooking {
    id: string
    date: string
    time: string
    customer: string
    service: string
    amount: number
    status: 'new' | 'pending' | 'confirmed' | 'completed' | 'cancelled'
    payment_status?: string
    execution_type?: 'onsite' | 'offsite'
    service_id?: string | number | null
    title?: string | null
    event_type?: string
    specialist_name?: string | null
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
            bookingsGoal: {
                thisWeek: parseBookingsGoalPeriod(data.bookingsGoal?.thisWeek),
                thisMonth: parseBookingsGoalPeriod(data.bookingsGoal?.thisMonth),
                thisYear: parseBookingsGoalPeriod(data.bookingsGoal?.thisYear),
            },
            topServices: {
                thisWeek: parseTopServiceRows(data.topServices?.thisWeek),
                thisMonth: parseTopServiceRows(data.topServices?.thisMonth),
                thisYear: parseTopServiceRows(data.topServices?.thisYear),
            },
        }
    } catch (error: any) {
        // Если ошибка, возвращаем дефолтные значения вместо падения
        logClientApiError('Failed to fetch business stats', error)
        const z = (): DashboardPeriodMetric => ({ value: 0, growShrink: 0 })

        const g = (): BookingsGoalPeriod => ({ current: 0, target: 0, percent: 0 })

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
            bookingsGoal: { thisWeek: g(), thisMonth: g(), thisYear: g() },
            topServices: { thisWeek: [], thisMonth: [], thisYear: [] },
        }
    }
}

export async function getRecentBookings(limit: number = 5): Promise<RecentBooking[]> {
    const response = await LaravelAxios.get('/business/dashboard/recent-bookings', {
        params: { limit },
    })
    const data = response.data.data || response.data
    if (!Array.isArray(data)) return []
    return data.map((row: Record<string, unknown>) => ({
        id: String(row.id ?? ''),
        date: String(row.date ?? ''),
        time: String(row.time ?? '00:00:00'),
        customer: String(row.customer ?? ''),
        service: String(row.service ?? ''),
        amount: Number(row.amount) || 0,
        status: (row.status ?? 'new') as RecentBooking['status'],
        payment_status: row.payment_status != null ? String(row.payment_status) : undefined,
        execution_type: (row.execution_type as RecentBooking['execution_type']) ?? 'onsite',
        service_id: row.service_id ?? null,
        title: row.title != null ? String(row.title) : null,
        event_type: row.event_type != null ? String(row.event_type) : 'booking',
        specialist_name: row.specialist_name != null ? String(row.specialist_name) : null,
    }))
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

        // Проверяем структуру ответа
        let data = response.data
        if (data && data.data) {
            data = data.data
        }

        // Убеждаемся, что структура правильная
        if (!data || typeof data !== 'object') {
            console.error('Invalid chart data structure:', typeof data)
            throw new Error('Invalid chart data structure')
        }
        
        // Проверяем наличие series
        if (!data.series || !Array.isArray(data.series)) {
            logClientApiWarn('Chart data missing series array', new Error('Missing series'), { category, period })
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
        logClientApiError('Chart data endpoint error', error, { category, period })
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
    /** booking | block | task — с бэкенда GET /business/schedule/slots */
    event_type?: string
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
    /** onsite | offsite — для гибридных услуг задаётся при бронировании */
    execution_type?: 'onsite' | 'offsite'
    /** ID цепочки регулярного бронирования (если слот сгенерирован из recurring) */
    recurring_chain_id?: string | number | null
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
    /** С бэкенда объявления — для шага времени в пикерах перерыва */
    slot_step_minutes?: number
    time_format?: string
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
    payment_status?: string
    included_in_route?: boolean
    recurring_chain_id?: string | number | null
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

export interface BusinessClientsIndexSummary {
    activeLast30: number
    permanentVip: number
    totalRevenue: number
}

export async function getBusinessClients(filters?: {
    search?: string
    status?: string
    quickFilter?: '' | 'active30' | 'idle90' | 'vip'
    sortKey?: 'name' | 'lastVisit' | 'totalBookings' | 'totalSpent' | 'status'
    order?: 'asc' | 'desc'
    page?: number
    pageSize?: number
}): Promise<{ data: BusinessClient[]; total: number; summary: BusinessClientsIndexSummary }> {
    const response = await LaravelAxios.get('/business/clients', { params: filters })
    const d = response.data
    return {
        data: d.data || [],
        total: d.total ?? 0,
        summary: d.summary ?? { activeLast30: 0, permanentVip: 0, totalRevenue: 0 },
    }
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
    /** Текущая пройденная версия тура (например v1) */
    onboarding_version?: string | null
    /** Цель бронирований в месяц для виджета дашборда; null — авто от прошлой активности */
    dashboard_monthly_bookings_goal?: number | null
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
    /** Соответствует is_active в БД; для списков без include_inactive всегда true */
    is_active?: boolean
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
    is_active?: boolean
    img?: string
    /** Домашняя база для старта маршрута; координаты — с сервера (HERE) или с Google Places при сохранении */
    home_address?: string | null
    /** Опционально при сохранении: координаты из Google Places (обход HERE) */
    home_latitude?: number | null
    home_longitude?: number | null
    max_jobs_per_day?: number | null
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
    onlinePaymentEnabled?: boolean
    stripeConnected?: boolean
    cancellationFreeHours?: number
    cancellationLateFeePercent?: number
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
export async function getBusinessServices(options?: { includeInactive?: boolean }): Promise<BusinessService[]> {
    const params = options?.includeInactive ? { include_inactive: '1' } : undefined
    const response = await LaravelAxios.get('/business/settings/services', { params })
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
export async function getTeamMembers(options?: { includeInactive?: boolean }): Promise<TeamMember[]> {
    const params = options?.includeInactive ? { include_inactive: '1' } : undefined
    const response = await LaravelAxios.get('/business/settings/team', { params })
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
    sms?: boolean
    telegram?: boolean
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

// Telegram bot link (per-user)
export interface BusinessTelegramStatus {
    connected: boolean
    username?: string | null
    linkedAt?: string | null
    botUsername?: string | null
    botConfigured: boolean
}

export interface BusinessTelegramConnect extends BusinessTelegramStatus {
    deepLink: string
    tokenExpiresAt: string
}

export async function getBusinessTelegramStatus(): Promise<BusinessTelegramStatus> {
    const response = await LaravelAxios.get('/business/settings/telegram')
    return response.data.data || response.data
}

export async function connectBusinessTelegram(): Promise<BusinessTelegramConnect> {
    const response = await LaravelAxios.post('/business/settings/telegram/connect')
    return response.data.data || response.data
}

export async function disconnectBusinessTelegram(): Promise<BusinessTelegramStatus> {
    const response = await LaravelAxios.delete('/business/settings/telegram')
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

export async function deleteAllBusinessNotifications(): Promise<void> {
    await LaravelAxios.delete('/business/notifications')
}

// ========== Support tickets ==========
export interface BusinessSupportTicketListItem {
    id: number
    subject: string
    category: string
    status: string
    areaSection: string | null
    pagePath: string | null
    attachmentCount: number
    createdAt: string
    updatedAt: string
}

export async function getBusinessSupportTickets(params?: {
    page?: number
    pageSize?: number
}): Promise<{
    data: BusinessSupportTicketListItem[]
    total: number
    page: number
    pageSize: number
}> {
    const response = await LaravelAxios.get('/business/support/tickets', { params })
    return {
        data: response.data.data ?? [],
        total: response.data.total ?? 0,
        page: response.data.page ?? 1,
        pageSize: response.data.pageSize ?? 20,
    }
}

export interface BusinessSupportTicketDetail {
    id: number
    subject: string
    category: string
    status: string
    areaSection: string | null
    pagePath: string | null
    body: string
    createdAt: string
    updatedAt: string
    resolvedAt: string | null
    adminPublicReply: string | null
    attachments: Array<{
        id: number
        originalName: string
        mime: string | null
        size: number
        url: string
    }>
}

export async function getBusinessSupportTicket(id: number): Promise<BusinessSupportTicketDetail> {
    const response = await LaravelAxios.get(`/business/support/tickets/${id}`)
    return response.data.data
}

export async function createBusinessSupportTicket(formData: FormData): Promise<BusinessSupportTicketDetail> {
    const response = await LaravelAxios.post('/business/support/tickets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.data
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
    onboarding_version?: string | null
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

// ========== Knowledge base (platform guides) ==========

export interface KnowledgeTopic {
    id: number
    title: string
    slug: string
    description: string | null
    module_key?: string | null
    locale?: string
    topic_key?: string | null
    sort_order: number
    is_published: boolean
    articles_count?: number
}

export interface KnowledgeArticleSummary {
    id: number
    knowledge_topic_id: number
    locale?: string
    title: string
    slug: string
    excerpt?: string | null
    sort_order?: number
    created_at?: string
    updated_at?: string
}

export interface KnowledgeArticle extends KnowledgeArticleSummary {
    body: string
    is_published?: boolean
    topic?: KnowledgeTopic
}

export async function getBusinessKnowledgeTopics(params?: {
    search?: string
    locale?: string
}): Promise<KnowledgeTopic[]> {
    const response = await LaravelAxios.get('/business/knowledge/topics', { params })
    const data = response.data.data ?? response.data
    return Array.isArray(data) ? data : []
}

export async function getBusinessKnowledgePopularArticles(
    limit = 8,
    locale?: string,
): Promise<KnowledgeArticle[]> {
    const response = await LaravelAxios.get('/business/knowledge/popular-articles', {
        params: { limit, ...(locale ? { locale } : {}) },
    })
    const data = response.data.data ?? response.data
    return Array.isArray(data) ? data : []
}

export async function searchBusinessKnowledgeArticles(q: string, locale?: string): Promise<KnowledgeArticle[]> {
    const response = await LaravelAxios.get('/business/knowledge/search-articles', {
        params: { q, ...(locale ? { locale } : {}) },
    })
    const data = response.data.data ?? response.data
    return Array.isArray(data) ? data : []
}

export async function getBusinessKnowledgeTopicBySlug(
    topicSlug: string,
    locale?: string,
): Promise<{
    topic: KnowledgeTopic
    articles: KnowledgeArticleSummary[]
}> {
    const response = await LaravelAxios.get(`/business/knowledge/topics/${encodeURIComponent(topicSlug)}`, {
        params: locale ? { locale } : undefined,
    })
    const payload = response.data.data ?? response.data
    return payload as { topic: KnowledgeTopic; articles: KnowledgeArticleSummary[] }
}

export async function getBusinessKnowledgeArticleBySlugs(
    topicSlug: string,
    articleSlug: string,
    locale?: string,
): Promise<KnowledgeArticle> {
    const response = await LaravelAxios.get(
        `/business/knowledge/topics/${encodeURIComponent(topicSlug)}/articles/${encodeURIComponent(articleSlug)}`,
        { params: locale ? { locale } : undefined },
    )
    const data = response.data.data ?? response.data
    return data as KnowledgeArticle
}

// ========== Route Intelligence ==========

export interface BusinessRouteStop {
    id: number
    booking_id: number | null
    sequence_order: number
    stop_type: 'start' | 'booking' | 'end'
    latitude: number
    longitude: number
    eta: string | null
    /** Прибытие по маршруту до ожидания до окна записи */
    arrived_at?: string | null
    /** Секунды ожидания до начала услуги (окно брони) */
    wait_before_seconds?: number
    distance_from_prev_meters: number | null
    duration_from_prev_seconds: number | null
    status: 'pending' | 'arrived' | 'completed' | 'skipped'
    /** Опоздание относительно начала окна (сервер) */
    late_seconds?: number
    /** Слишком поздно относительно окон/смены (сервер) */
    is_infeasible?: boolean
    /** Конкретная причина невозможности (для UI/AI) */
    infeasible_reason?:
        | 'no_geocode'
        | 'no_time'
        | 'window_before_shift_start'
        | 'late_over_4h'
        | null
    /** ISO начала смены специалиста — для подстановки в текст ошибки */
    shift_start_iso?: string | null
    /** ISO начала окна (=booking_time) — для подстановки в текст ошибки */
    window_start_iso?: string | null
    /** Опоздание в минутах (округлено вверх), для текстов «опоздание {duration}» */
    late_minutes?: number
    booking?: {
        id: number
        client_name: string | null
        title?: string | null
        address: string
        execution_type?: string
        offsite_address_missing?: boolean
        time_window_start: string | null
        time_window_end: string | null
        priority: number
        duration_minutes: number
        total_price?: number
        currency?: string
    } | null
}

export interface BusinessRouteDayBooking {
    id: number
    /** null — исполнитель в брони не назначен; запись всё равно попадает в маршрут выбранного специалиста */
    specialist_id: number | null
    client_name: string | null
    title: string | null
    address: string
    execution_type: string
    offsite_address_missing: boolean
    time_window_start: string | null
    time_window_end: string | null
    /** true если нет валидного booking_time (окно нельзя отобразить) */
    time_window_unavailable?: boolean
    priority: number
    duration_minutes: number
    has_coordinates: boolean
}

export interface BusinessRouteSpecialistInfo {
    id: number
    name: string
    home_address: string | null
    home_latitude: number | null
    home_longitude: number | null
}

/** Краткая запись маршрута для списка «сохранённые по дням» */
export interface BusinessRouteSavedSummary {
    id: string | number
    route_date: string
    status: BusinessRoute['status']
    optimized_at?: string | null
    total_distance_meters: number | null
    total_duration_seconds: number | null
    include_return_leg?: boolean
    booking_stops_count: number
}

export type BusinessRouteFeasibilityIssueType =
    | 'late'
    | 'infeasible'
    | 'no_geocode'
    | 'no_time'
    | 'out_of_shift'

export interface BusinessRouteFeasibilityIssue {
    type: BusinessRouteFeasibilityIssueType
    booking_id?: number
    stop_id?: number
    minutes?: number
    message?: string
}

export interface BusinessRoute {
    id: string
    specialist_id: number
    route_date: string
    /** Версія кешу маршруту на бекенді; для AI apply (expected_version) */
    cache_version?: number
    /** IANA (например America/Los_Angeles) — отображение ETA в таймлайне маршрута */
    display_timezone?: string
    status: 'draft' | 'stale' | 'optimizing' | 'ready' | 'in_progress' | 'completed'
    total_distance_meters: number | null
    total_duration_seconds: number | null
    /** Линия по дорогам [lng, lat] из HERE; без неё карта соединяет остановки прямой */
    path_lng_lat?: [number, number][] | null
    /** null = all day bookings are included */
    included_booking_ids: number[] | null
    /** Включать возврат домой в расчёт маршрута */
    include_return_leg?: boolean
    /** Старт дня маршрута (смена специалиста) для проверок «вне смены» */
    day_start_iso?: string
    /** Сводка проблем по визитам/окнам (детерминировано на сервере) */
    feasibility_issues?: BusinessRouteFeasibilityIssue[]
    /** Сумма опозданий по визитам (мин, округление как у AI-снимка) */
    late_minutes_total?: number
    /** Суммарное ожидание до окна по визитам (мин) */
    idle_minutes_total?: number
    specialist: BusinessRouteSpecialistInfo
    day_bookings: BusinessRouteDayBooking[]
    stops: BusinessRouteStop[]
}

export interface BusinessRoutePreview {
    current: { jobs: unknown[]; total_distance_km: number; total_duration_min: number }
    proposed: { jobs: unknown[]; total_distance_km: number; total_duration_min: number }
    comparison: {
        distance_change_meters: number
        duration_change_seconds: number
        distance_change_percent: number
        /** current late_seconds − proposed (positive = less late in proposed) */
        late_change_seconds?: number
        /** current idle_seconds − proposed */
        idle_change_seconds?: number
        jobs_reordered: boolean
        locked_jobs: number
        outcome?:
            | 'unchanged_order'
            | 'improved'
            | 'worse'
            | 'tie'
            | 'insufficient_data'
    }
    confidence: 'high' | 'medium' | 'low'
    reorder_details: {
        changed: boolean
        moved_count: number
    }
    warnings: Array<{ type: string; message: string; job_id?: number }>
    /** HERE-предпросмотр: порядок из эвристики хуже текущего — предложение не показываем (тост на фронте) */
    suppressed_worse_proposal?: boolean
}

export async function getBusinessRoute(specialistId: number, date: string): Promise<BusinessRoute | null> {
    try {
        const response = await LaravelAxios.get(`/business/routes/${specialistId}/${date}`)
        const payload = response.data?.data ?? response.data
        return payload as BusinessRoute
    } catch (e) {
        logClientApiError('getBusinessRoute', e)
        return null
    }
}

export async function getBusinessRouteOptimizePreview(
    specialistId: number,
    date: string,
    options?: { includeReturnLeg?: boolean },
): Promise<BusinessRoutePreview | null> {
    try {
        const include_return_leg = options?.includeReturnLeg !== false
        const response = await LaravelAxios.post(`/business/routes/${specialistId}/${date}/optimize/preview`, {
            include_return_leg: include_return_leg,
        })
        const payload = response.data?.data ?? response.data
        return payload as BusinessRoutePreview
    } catch (e) {
        logClientApiError('getBusinessRouteOptimizePreview', e)
        return null
    }
}

export async function applyBusinessRouteOptimization(
    specialistId: number,
    date: string,
    options?: { includeReturnLeg?: boolean },
): Promise<BusinessRoute | null> {
    try {
        const response = await LaravelAxios.post(`/business/routes/${specialistId}/${date}/optimize/apply`, {
            include_return_leg: options?.includeReturnLeg ?? true,
        })
        const payload = response.data?.data ?? response.data
        return payload as BusinessRoute
    } catch (e) {
        logClientApiError('applyBusinessRouteOptimization', e)
        return null
    }
}

export async function recalculateBusinessRoute(routeId: string): Promise<BusinessRoute | null> {
    try {
        const response = await LaravelAxios.post(`/business/routes/${routeId}/recalculate`)
        const payload = response.data?.data ?? response.data
        return payload as BusinessRoute
    } catch (e) {
        logClientApiError('recalculateBusinessRoute', e)
        return null
    }
}

export async function updateBusinessRouteIncludedBookings(
    specialistId: number,
    date: string,
    bookingIds: number[] | null,
): Promise<BusinessRoute | null> {
    try {
        const response = await LaravelAxios.put(
            `/business/routes/${specialistId}/${date}/included-bookings`,
            { booking_ids: bookingIds },
        )
        const payload = response.data?.data ?? response.data
        return payload as BusinessRoute
    } catch (e) {
        logClientApiError('updateBusinessRouteIncludedBookings', e)
        return null
    }
}

export async function updateBusinessRouteIncludeReturnLeg(
    specialistId: number,
    date: string,
    includeReturnLeg: boolean,
): Promise<BusinessRoute | null> {
    try {
        const response = await LaravelAxios.put(
            `/business/routes/${specialistId}/${date}/include-return-leg`,
            { include_return_leg: includeReturnLeg },
        )
        const payload = response.data?.data ?? response.data
        return payload as BusinessRoute
    } catch (e) {
        logClientApiError('updateBusinessRouteIncludeReturnLeg', e)
        return null
    }
}

export async function getBusinessRouteSavedList(
    specialistId: number,
    limit?: number,
): Promise<BusinessRouteSavedSummary[]> {
    try {
        const response = await LaravelAxios.get(`/business/routes/${specialistId}/saved`, {
            params: limit != null ? { limit } : undefined,
        })
        const payload = response.data?.data ?? response.data
        return Array.isArray(payload) ? (payload as BusinessRouteSavedSummary[]) : []
    } catch (e) {
        logClientApiError('getBusinessRouteSavedList', e)
        return []
    }
}

// ========== Developer API tokens ==========

export interface BusinessApiTokenRow {
    id: number
    name: string
    prefix: string | null
    abilities: string[] | null
    last_used_at: string | null
    expires_at: string | null
    created_at: string | null
}

export async function listBusinessApiTokens(): Promise<BusinessApiTokenRow[]> {
    const response = await LaravelAxios.get('/business/api/tokens')
    const raw = response.data?.data
    return Array.isArray(raw) ? (raw as BusinessApiTokenRow[]) : []
}

export async function createBusinessApiToken(payload: {
    name: string
    expires_in_days?: 30 | 90 | 365 | 'never' | null
}): Promise<{ token: string; meta: { id: number; name: string; prefix: string; expires_at: string | null } }> {
    const response = await LaravelAxios.post('/business/api/tokens', payload)
    return response.data as {
        token: string
        meta: { id: number; name: string; prefix: string; expires_at: string | null }
    }
}

export async function revokeBusinessApiToken(id: number): Promise<void> {
    await LaravelAxios.delete(`/business/api/tokens/${id}`)
}

// ========== Booking Activities (Activity tab in BookingDrawer) ==========
export type BookingActivityType =
    | 'created'
    | 'deleted'
    | 'status_changed'
    | 'rescheduled'
    | 'price_changed'
    | 'payment_authorized'
    | 'payment_captured'
    | 'payment_refunded'
    | 'comment'

export interface BookingActivity {
    id: number
    type: BookingActivityType
    payload: Record<string, unknown> | null
    actor: { id: number; name: string } | null
    created_at: string
}

export async function getBookingActivities(bookingId: number | string): Promise<BookingActivity[]> {
    const response = await LaravelAxios.get(`/business/bookings/${bookingId}/activities`)
    const items = response?.data?.data
    return Array.isArray(items) ? (items as BookingActivity[]) : []
}

export async function addBookingComment(
    bookingId: number | string,
    text: string,
): Promise<BookingActivity> {
    const response = await LaravelAxios.post(`/business/bookings/${bookingId}/activities`, {
        type: 'comment',
        payload: { text },
    })
    return response.data?.data as BookingActivity
}

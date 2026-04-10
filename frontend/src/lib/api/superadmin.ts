// API функции для суперадминки
// Используются с React Query

import LaravelAxios from '@/services/axios/LaravelAxios'
import { logClientApiError, logClientApiWarn } from '@/utils/logClientApiError'
import type { KnowledgeArticle, KnowledgeTopic } from '@/lib/api/business'

export type { KnowledgeArticle, KnowledgeTopic }

// ========== Companies ==========
export interface Company {
    id: number
    name: string
    slug?: string
    owner: string
    email: string
    phone?: string
    category?: string
    status: 'pending' | 'active' | 'suspended' | 'rejected'
    subscription?: string
    createdAt: string
}

export interface CompanyStats {
    revenue: {
        thisWeek: number
        thisMonth: number
        thisYear: number
        total: number
    }
    bookings: {
        thisWeek: number
        thisMonth: number
        thisYear: number
        total: number
    }
    clients: {
        total: number
        active: number
        new: number
    }
    rating: number
}

export async function getCompanies(filters?: {
    search?: string
    status?: string
    page?: number
    pageSize?: number
}): Promise<{ data: Company[]; total: number }> {
    const response = await LaravelAxios.get('/admin/companies', { params: filters })
    return response.data
}

/** Полная карточка компании (GET /admin/companies/:id) */
export async function getCompany(companyId: number): Promise<Record<string, unknown>> {
    const response = await LaravelAxios.get(`/admin/companies/${companyId}`)
    const d = response.data?.data ?? response.data
    return d as Record<string, unknown>
}

export interface CompanyTeamMember {
    id: number
    name: string
    email: string
    phone: string
    role: string
    status: 'active' | 'inactive'
    img?: string
}

export async function getCompanyTeam(companyId: number): Promise<CompanyTeamMember[]> {
    const response = await LaravelAxios.get(`/admin/companies/${companyId}/team`)
    return response.data.data || response.data || []
}

export interface CompanyService {
    id: number
    name: string
    description?: string
    price: number
    duration_minutes?: number
    category?: string
}

export async function getCompanyServices(companyId: number): Promise<CompanyService[]> {
    try {
        const response = await LaravelAxios.get(`/admin/companies/${companyId}/services`)
        return response.data.data || response.data || []
    } catch (error) {
        logClientApiWarn('Failed to fetch company services', error, { companyId })
        return []
    }
}

export async function getCompanyStats(companyId: number): Promise<CompanyStats> {
    const response = await LaravelAxios.get(`/admin/companies/${companyId}/stats`)
    return response.data.data || response.data
}

export interface CompanyChartData {
    series: Array<{ name: string; data: number[] }>
    date: string[]
    categories: string[]
}

export async function getCompanyChart(companyId: number, period: 'thisWeek' | 'thisMonth' | 'thisYear' = 'thisWeek'): Promise<CompanyChartData> {
    try {
        const response = await LaravelAxios.get(`/admin/companies/${companyId}/chart`, {
            params: { period },
        })
        const data = response.data.data || response.data
        return data
    } catch (error) {
        logClientApiWarn('Company chart endpoint not available', error, { companyId, period })
        return {
            series: [{ name: 'Выручка', data: [] }],
            categories: [],
            date: [],
        }
    }
}

export async function approveCompany(companyId: number): Promise<Company> {
    const response = await LaravelAxios.post(`/admin/companies/${companyId}/approve`)
    return response.data.data || response.data
}

export async function rejectCompany(companyId: number): Promise<Company> {
    const response = await LaravelAxios.post(`/admin/companies/${companyId}/reject`)
    return response.data.data || response.data
}

export async function blockCompany(companyId: number): Promise<Company> {
    const response = await LaravelAxios.post(`/admin/companies/${companyId}/block`)
    return response.data.data || response.data
}

export async function unblockCompany(companyId: number): Promise<Company> {
    const response = await LaravelAxios.post(`/admin/companies/${companyId}/unblock`)
    return response.data.data || response.data
}

export async function createCompany(data: Partial<Company>): Promise<Company> {
    const response = await LaravelAxios.post('/admin/companies', data)
    return response.data.data || response.data
}

export async function updateCompany(companyId: number, data: Partial<Company>): Promise<Company> {
    const response = await LaravelAxios.put(`/admin/companies/${companyId}`, data)
    return response.data.data || response.data
}

// ========== Dashboard ==========
export interface AdminDashboardStats {
    companies: {
        total: number
        pending: number
        active: number
        suspended: number
        rejected: number
    }
    users: {
        total: number
        client: number
        business_owner: number
        superadmin: number
    }
    bookings: { today: number; yesterday: number }
    revenue: { this_month: number; last_month: number }
    advertisements: {
        marketplace_active: number
        promo_active: number
        pending_moderation: number
    }
    average_rating: number
    pending_companies: Array<{
        id: number
        name: string
        slug?: string
        created_at?: string
    }>
    pending_advertisements: Array<{
        id: number
        title: string
        company_name?: string
        type?: string
        created_at?: string
    }>
    low_rating_reviews: Array<{
        id: number
        rating: number
        company_name?: string
        created_at?: string
    }>
    top_companies_by_revenue: Array<{
        id: number
        name: string
        revenue: number
        orders: number
    }>
    top_categories: Array<{
        id: number
        name: string
        services_count: number
    }>
}

export interface AdminDashboardChart {
    date: string[]
    series: Array<{ name: string; data: number[] }>
}

export interface AdminDashboardActivityItem {
    id: number
    user: { id: number; name: string; email: string } | null
    action: string
    entity_type?: string
    entity_name?: string
    description?: string
    created_at: string
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
    const response = await LaravelAxios.get('/admin/dashboard/stats')
    const raw = response.data?.data ?? response.data
    return raw as AdminDashboardStats
}

export async function getAdminDashboardChart(days = 14): Promise<AdminDashboardChart> {
    const response = await LaravelAxios.get('/admin/dashboard/chart', { params: { days } })
    const raw = response.data?.data ?? response.data
    return {
        date: raw?.date ?? [],
        series: raw?.series ?? [],
    }
}

export async function getAdminDashboardRecentActivity(): Promise<AdminDashboardActivityItem[]> {
    const response = await LaravelAxios.get('/admin/dashboard/recent-activity')
    const raw = response.data?.data ?? response.data
    return Array.isArray(raw) ? raw : []
}

// ========== Users ==========
export interface AdminUser {
    id: number
    name: string
    firstName?: string
    lastName?: string
    email: string
    role: 'CLIENT' | 'BUSINESS_OWNER' | 'SUPERADMIN'
    status: 'active' | 'blocked'
    createdAt: string
    img?: string | null
    isActive?: boolean
    isBlocked?: boolean
}

export async function getUsers(filters?: {
    search?: string
    role?: string
    status?: string
    page?: number
    pageSize?: number
}): Promise<{ data: AdminUser[]; total: number }> {
    const response = await LaravelAxios.get('/admin/users', { params: filters })
    
    // Проверяем структуру ответа
    if (response.data) {
        // Если ответ уже в правильном формате { data: [], total: number }
        if (response.data.data && Array.isArray(response.data.data)) {
            return response.data
        }
        // Если ответ - массив напрямую, оборачиваем в нужную структуру
        if (Array.isArray(response.data)) {
            return {
                data: response.data,
                total: response.data.length,
            }
        }
    }
    
    return { data: [], total: 0 }
}

export async function blockUser(userId: number): Promise<AdminUser> {
    const response = await LaravelAxios.post(`/admin/users/${userId}/block`)
    return response.data.data || response.data
}

export async function unblockUser(userId: number): Promise<AdminUser> {
    const response = await LaravelAxios.post(`/admin/users/${userId}/unblock`)
    return response.data.data || response.data
}

export async function createUser(data: {
    email: string
    password: string
    role: 'CLIENT' | 'BUSINESS_OWNER' | 'SUPERADMIN'
    firstName?: string
    lastName?: string
}): Promise<AdminUser> {
    const response = await LaravelAxios.post('/admin/users', data)
    return response.data.data || response.data
}

export async function updateUser(userId: number, data: Partial<AdminUser>): Promise<AdminUser> {
    const response = await LaravelAxios.put(`/admin/users/${userId}`, data)
    return response.data.data || response.data
}

export async function deleteUser(userId: number): Promise<void> {
    await LaravelAxios.delete(`/admin/users/${userId}`)
}

// ========== Advertisements ==========
export interface Advertisement {
    id: number
    title: string
    description?: string
    business?: string
    company_id?: number
    company?: {
        id: number
        name: string
    }
    type: 'advertisement' | 'regular'
    placement: 'homepage' | 'services' | 'sidebar' | 'banner'
    status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive'
    is_active: boolean
    impressions?: number
    clicks?: number
    ctr?: number
    priority?: number
    start_date?: string | null
    end_date?: string | null
    image?: string
    link?: string
    created_at?: string
    updated_at?: string
    services?: Array<{
        id?: number | string
        name: string
        price: string | number
        duration: string | number
        description?: string
    }>
    team?: Array<{
        id?: number | string
        name: string
        position: string
        photo?: string
        description?: string
    }>
    portfolio?: Array<{
        id?: number | string
        title: string
        image: string
        description?: string
    }>
    schedule?: {
        [key: string]: {
            enabled: boolean
            from: string
            to: string
        }
    }
    price_from?: number | string | null
    price_to?: number | string | null
    currency?: string
}

export interface AdvertisementPlacement {
    position: 'top' | 'sidebar' | 'bottom' | 'inline'
    page: 'services' | 'marketplace' | 'landing'
    priority: number
    startDate: string
    endDate: string
}

export async function getAdvertisements(filters?: {
    status?: string
    type?: string
    page?: number
    pageSize?: number
}): Promise<{ data: Advertisement[]; total: number; page: number; pageSize: number }> {
    const response = await LaravelAxios.get('/admin/advertisements', { params: filters })
    
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

export async function updateAdvertisementPlacement(
    adId: number,
    placement: AdvertisementPlacement
): Promise<void> {
    await LaravelAxios.put(`/admin/advertisements/${adId}/placement`, placement)
}

export async function approveAdvertisement(adId: number): Promise<Advertisement> {
    const response = await LaravelAxios.post(`/admin/advertisements/${adId}/approve`)
    return response.data.data || response.data
}

export async function rejectAdvertisement(adId: number): Promise<Advertisement> {
    const response = await LaravelAxios.post(`/admin/advertisements/${adId}/reject`)
    return response.data.data || response.data
}

export async function getAdvertisement(adId: number): Promise<Advertisement> {
    const response = await LaravelAxios.get(`/admin/advertisements/${adId}`)
    return response.data.data || response.data
}

export async function updateAdvertisement(adId: number, data: Partial<Advertisement>): Promise<Advertisement> {
    const response = await LaravelAxios.put(`/admin/advertisements/${adId}`, data)
    return response.data.data || response.data
}

export async function createAdvertisement(data: Partial<Advertisement>): Promise<Advertisement> {
    const response = await LaravelAxios.post('/admin/advertisements', data)
    return response.data.data || response.data
}

export async function deleteAdvertisement(adId: number): Promise<void> {
    await LaravelAxios.delete(`/admin/advertisements/${adId}`)
}

export async function toggleAdvertisementActive(adId: number, isActive: boolean): Promise<Advertisement> {
    const response = await LaravelAxios.put(`/admin/advertisements/${adId}`, { is_active: isActive })
    return response.data.data || response.data
}

export async function trackAdvertisementClick(adId: number): Promise<void> {
    await LaravelAxios.post(`/api/advertisements/${adId}/click`)
}

// Advertisement Statistics
export interface AdvertisementStats {
    advertisement_id: number
    title: string
    total_impressions: number
    total_clicks: number
    unique_impressions: number
    ctr: number
    start_date: string | null
    end_date: string | null
    status: string
    is_active: boolean
    impressions_by_day: Array<{
        date: string
        impressions: number
    }>
    by_state: Array<{
        state: string
        impressions: number
    }>
    by_city: Array<{
        city: string
        impressions: number
    }>
}

export async function getAdvertisementStats(adId: number): Promise<AdvertisementStats> {
    const response = await LaravelAxios.get(`/admin/advertisements/${adId}/stats`)
    return response.data
}

// ========== Settings ==========
export interface PlatformSettings {
    siteName: string
    siteDescription: string
    contactEmail: string
    contactPhone: string
    timezone?: string
    currency?: string
    defaultLanguage?: string
    companyName?: string
    companyAddress?: string
    companyTaxId?: string
    instagramUrl?: string
    facebookUrl?: string
    twitterUrl?: string
    logoLight?: string
    logoDark?: string
    logoIconLight?: string
    logoIconDark?: string
    logoText?: string
    logoColorLight?: string
    logoColorDark?: string
    logoSize?: number
    logoIconColorLight?: string
    logoIconColorDark?: string
}

export interface IntegrationSettings {
    stripeEnabled: boolean
    stripeConfigured: boolean
    stripePublicConfigured: boolean
    stripeWebhookConfigured: boolean
    emailConfigured: boolean
    smsConfigured: boolean
    logChannels: {
        default: string
        channels: string[]
    }
}

export interface SubscriptionPlan {
    key: string
    name: string
    price: number
    currency: string
    period: string
    features: string[]
}

export interface SubscriptionSettings {
    enabled: boolean
    plans: SubscriptionPlan[]
}

export interface SystemSettings {
    maintenanceMode: boolean
    registrationEnabled: boolean
    emailVerification: boolean
    smsVerification: boolean
    twoFactorAuth: boolean
    sessionTimeout: number
    maxUploadSize: number
    cacheEnabled: boolean
    cacheDuration: number
    logLevel: string
    apiRateLimit: number
}

export interface HealthStatusResponse {
    overall_status: 'healthy' | 'degraded' | 'unhealthy'
    overall_hint?: string
    systems: {
        database: { status: string; message: string }
        cache: { status: string; message: string }
    }
    alerts: {
        unresolved_count: number
        critical_count: number
    }
    server: {
        php_version: string
        laravel_version: string
        app_env: string
        app_debug: boolean
        timezone: string
        hostname?: string | null
        uptime_seconds: number | null
        uptime_note?: string
        load_average?: { '1m': number; '5m': number; '15m': number } | null
        memory_usage_mb: number
        memory_peak_mb: number
        memory_note?: string
        host_memory_total_bytes?: number | null
        host_memory_available_bytes?: number | null
        host_memory_used_bytes?: number | null
        host_memory_used_percent?: number | null
        host_memory_note?: string
        disk_total_bytes: number | null
        disk_used_bytes: number | null
        disk_free_bytes: number | null
        disk_used_percent: number | null
        disk_note?: string
    }
    checked_at: string
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
    const response = await LaravelAxios.get('/admin/settings/general')
    return response.data.data || response.data
}

export async function getPublicPlatformSettings(): Promise<Partial<PlatformSettings>> {
    const response = await LaravelAxios.get('/settings/public')
    return response.data.data || response.data
}

export async function updatePlatformSettings(data: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const response = await LaravelAxios.put('/admin/settings/general', data)
    return response.data.data || response.data
}

export async function uploadPlatformLogo(file: File, type: 'light' | 'dark' | 'iconLight' | 'iconDark'): Promise<{ url: string; path: string }> {
    const formData = new FormData()
    formData.append('logo', file)
    formData.append('type', type)
    const response = await LaravelAxios.post('/admin/settings/logo', formData, {
        headers: {},
    })
    return response.data
}

export async function removePlatformLogo(type: 'light' | 'dark' | 'iconLight' | 'iconDark'): Promise<void> {
    await LaravelAxios.delete('/admin/settings/logo', {
        data: { type },
    })
}

export async function getIntegrationSettings(): Promise<IntegrationSettings> {
    const response = await LaravelAxios.get('/admin/settings/integrations')
    return response.data.data || response.data
}

export async function updateIntegrationSettings(data: { stripeEnabled: boolean }): Promise<IntegrationSettings> {
    const response = await LaravelAxios.put('/admin/settings/integrations', data)
    return response.data.data || response.data
}

export async function getSubscriptionSettings(): Promise<SubscriptionSettings> {
    const response = await LaravelAxios.get('/admin/settings/subscriptions')
    return response.data.data || response.data
}

export async function updateSubscriptionSettings(data: Partial<SubscriptionSettings>): Promise<SubscriptionSettings> {
    const response = await LaravelAxios.put('/admin/settings/subscriptions', data)
    return response.data.data || response.data
}

export async function getSystemSettings(): Promise<SystemSettings> {
    const response = await LaravelAxios.get('/admin/settings/system')
    return response.data.data || response.data
}

export async function updateSystemSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    const response = await LaravelAxios.put('/admin/settings/system', data)
    return response.data.data || response.data
}

export async function clearSystemCache(): Promise<{ success: boolean; message: string }> {
    const response = await LaravelAxios.post('/admin/settings/system/clear-cache')
    return response.data
}

export async function getHealthStatus(): Promise<HealthStatusResponse> {
    const response = await LaravelAxios.get('/admin/health/status')
    return response.data.data || response.data
}

export interface RealtimeSessionRow {
    user_id: number
    email?: string | null
    role?: string | null
    last_seen_at?: string | null
    client_session_id_short?: string | null
    user_agent_short?: string | null
    ip_address?: string | null
}

export interface RealtimeMetrics {
    online_threshold_seconds: number
    online_users_count: number
    online_sessions_count: number
    online_by_role: Record<string, number>
    recent_sessions: RealtimeSessionRow[]
    bookings_today: number
    new_users_today: number
    users_total: number
    companies_total: number
    server_time: string
}

export async function getRealtimeMetrics(): Promise<RealtimeMetrics> {
    const response = await LaravelAxios.get('/admin/realtime-metrics')
    const d = response.data?.data ?? response.data
    return d as RealtimeMetrics
}

// ========== Platform backups (full archive) ==========
export interface PlatformBackupRow {
    id: number
    filename: string
    sizeBytes: number
    status: string
    trigger: string
    s3Ok: boolean
    s3Key?: string | null
    errorMessage?: string | null
    meta?: Record<string, unknown> | null
    createdAt?: string
}

export interface PlatformBackupsConfig {
    projectRoot: string
    dockerEnabled: boolean
    dockerImages: string[]
    s3Enabled?: boolean
    s3Configured: boolean
    s3Bucket?: string | null
    s3KeepBackups?: number
}

export async function getPlatformBackups(): Promise<{
    data: PlatformBackupRow[]
    config: PlatformBackupsConfig
}> {
    const response = await LaravelAxios.get('/admin/backups')
    return {
        data: response.data.data ?? [],
        config: response.data.config ?? ({} as PlatformBackupsConfig),
    }
}

export async function createPlatformBackup(): Promise<{
    id: number
    filename: string
    sizeBytes: number
    status: string
}> {
    const response = await LaravelAxios.post('/admin/backups', {}, { timeout: 120000 })
    const d = response.data.data ?? response.data
    return d as { id: number; filename: string; sizeBytes: number; status: string }
}

export async function downloadPlatformBackup(id: number, _filename: string): Promise<void> {
    const response = await LaravelAxios.get<{ data?: { url?: string } }>(`/admin/backups/${id}/download-url`)
    const url = response.data?.data?.url ?? (response.data as { url?: string })?.url
    if (!url) {
        throw new Error('Нет ссылки на скачивание')
    }
    window.open(url, '_blank', 'noopener,noreferrer')
}

export async function deletePlatformBackup(id: number): Promise<void> {
    await LaravelAxios.delete(`/admin/backups/${id}`)
}

export async function downloadPartnerSourceArchive(): Promise<void> {
    try {
        const response = await LaravelAxios.get('/admin/backups/partner-export', {
            responseType: 'blob',
            timeout: 600000,
        })
        const blob = response.data as Blob
        const cd = response.headers['content-disposition'] as string | undefined
        let filename = 'rexten-source-partners.tar.gz'
        if (cd) {
            const m = /filename\*?=(?:UTF-8''|"?)([^";\n]+)/i.exec(cd) || /filename="?([^";\n]+)"?/i.exec(cd)
            if (m?.[1]) {
                filename = decodeURIComponent(m[1].replace(/^"|"$/g, ''))
            }
        }
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
    } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: Blob } }
        const data = axiosErr.response?.data
        if (data instanceof Blob) {
            const text = await data.text()
            let msg = 'Failed to build archive'
            try {
                const j = JSON.parse(text) as { message?: string }
                if (j.message) msg = j.message
            } catch {
                if (text) msg = text.slice(0, 300)
            }
            throw new Error(msg)
        }
        throw err
    }
}

// ========== Categories ==========
export interface ServiceCategory {
    id: number
    name: string
    slug: string
    description?: string
    icon?: string
    sort_order: number
    is_active: boolean
    created_at?: string
    updated_at?: string
}

export async function getCategories(filters?: {
    search?: string
    is_active?: boolean
    page?: number
    pageSize?: number
}): Promise<{ data: ServiceCategory[]; total: number }> {
    try {
        const response = await LaravelAxios.get('/admin/categories', { params: filters })
        
        // Проверяем структуру ответа
        if (response.data) {
            // Если ответ уже в правильном формате { data: [], total: number }
            if (response.data.data && Array.isArray(response.data.data)) {
                return response.data
            }
            // Если ответ - массив напрямую, оборачиваем в нужную структуру
            if (Array.isArray(response.data)) {
                return {
                    data: response.data,
                    total: response.data.length,
                }
            }
        }
        
        return { data: [], total: 0 }
    } catch (error) {
        logClientApiError('Error fetching categories', error)
        return { data: [], total: 0 }
    }
}

export async function getCategory(id: number): Promise<ServiceCategory> {
    const response = await LaravelAxios.get(`/admin/categories/${id}`)
    return response.data.data || response.data
}

export async function createCategory(data: Partial<ServiceCategory>): Promise<ServiceCategory> {
    const response = await LaravelAxios.post('/admin/categories', data)
    return response.data.data || response.data
}

export async function updateCategory(id: number, data: Partial<ServiceCategory>): Promise<ServiceCategory> {
    const response = await LaravelAxios.put(`/admin/categories/${id}`, data)
    return response.data.data || response.data
}

export async function deleteCategory(id: number): Promise<void> {
    await LaravelAxios.delete(`/admin/categories/${id}`)
}

// ========== Activity Log ==========
export interface ActivityLog {
    id: number
    user: {
        id: number
        name: string
        email: string
    } | null
    action: string
    entity_type: string
    entity_id: number | null
    entity_name: string | null
    old_values: Record<string, any> | null
    new_values: Record<string, any> | null
    ip_address: string | null
    user_agent: string | null
    description: string | null
    created_at: string
}

export async function getActivityLogs(filters?: {
    user_id?: number
    action?: string
    entity_type?: string
    entity_id?: number
    date_from?: string
    date_to?: string
    search?: string
    page?: number
    pageSize?: number
}): Promise<{ data: ActivityLog[]; total: number; page: number; pageSize: number }> {
    const response = await LaravelAxios.get('/admin/activity-log', { params: filters })
    return response.data
}

export async function getActivityLog(id: number): Promise<ActivityLog> {
    const response = await LaravelAxios.get(`/admin/activity-log/${id}`)
    return response.data.data || response.data
}

export async function exportActivityLogs(filters?: {
    user_id?: number
    action?: string
    entity_type?: string
    date_from?: string
    date_to?: string
}): Promise<Blob> {
    const response = await LaravelAxios.get('/admin/activity-log/export/csv', {
        params: filters,
        responseType: 'blob',
    })
    return response.data
}

export interface ActivityStats {
    total: number
    today: number
    by_segment: Record<string, number>
    by_category: Record<string, number>
    by_action: Record<string, number>
    last_7_days: Array<{ date: string; count: number }>
}

export async function getActivityStats(): Promise<ActivityStats> {
    const response = await LaravelAxios.get('/admin/activity-log/stats')
    return response.data
}

export async function getCompanyActivity(companyId: number, filters?: {
    category?: string
    action?: string
    date_from?: string
    date_to?: string
    page?: number
    pageSize?: number
}): Promise<{ data: ActivityLog[]; total: number; page: number; pageSize: number }> {
    const response = await LaravelAxios.get(`/admin/companies/${companyId}/activity`, { params: filters })
    return response.data
}

export interface CompanyUser {
    id: number
    email: string
    name: string
    first_name?: string
    last_name?: string
    role: string
    role_name: string
    role_id?: number | null
    status: 'active' | 'blocked'
    avatar?: string
    phone?: string
    last_login?: string
    created_at?: string
}

export async function getCompanyUsers(companyId: number): Promise<{ data: CompanyUser[]; total: number }> {
    const response = await LaravelAxios.get(`/admin/companies/${companyId}/users`)
    return response.data
}

export interface CompanyRoleOption {
    id: number
    name: string
    slug: string
    company_id: number | null
}

export async function getCompanyRolesForAdmin(companyId: number): Promise<CompanyRoleOption[]> {
    const response = await LaravelAxios.get(`/admin/companies/${companyId}/roles`)
    return response.data.data || []
}

export async function updateCompanyUser(
    companyId: number,
    userId: number,
    data: {
        first_name?: string
        last_name?: string
        phone?: string
        is_blocked?: boolean
        role_id?: number | null
    },
): Promise<CompanyUser> {
    const response = await LaravelAxios.put(`/admin/companies/${companyId}/users/${userId}`, data)
    return response.data.data
}

// ========== Knowledge base (superadmin — темы и статьи) ==========

export async function getAdminKnowledgeTopics(params?: {
    search?: string
    is_published?: boolean
}): Promise<KnowledgeTopic[]> {
    const response = await LaravelAxios.get('/admin/knowledge/topics', { params })
    const data = response.data.data ?? response.data
    return Array.isArray(data) ? data : []
}

export async function getAdminKnowledgeTopic(id: number): Promise<KnowledgeTopic> {
    const response = await LaravelAxios.get(`/admin/knowledge/topics/${id}`)
    const data = response.data.data ?? response.data
    return data as KnowledgeTopic
}

export async function uploadKnowledgeMedia(file: File): Promise<{
    url: string
    path: string
    mime: string
    original_name: string
    size: number
    kind: string
}> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await LaravelAxios.post('/admin/knowledge/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    const payload = response.data.data ?? response.data
    return payload as {
        url: string
        path: string
        mime: string
        original_name: string
        size: number
        kind: string
    }
}

export type KnowledgeTopicTranslationInput = {
    title: string
    slug?: string
    description?: string | null
}

export async function createAdminKnowledgeTopic(payload: {
    topic_key?: string | null
    module_key?: string | null
    sort_order?: number
    is_published?: boolean
    translations: Record<string, KnowledgeTopicTranslationInput>
}): Promise<KnowledgeTopic> {
    const response = await LaravelAxios.post('/admin/knowledge/topics', payload)
    const data = response.data.data ?? response.data
    return data as KnowledgeTopic
}

export async function updateAdminKnowledgeTopic(
    id: number,
    payload: Partial<{
        module_key: string | null
        sort_order: number
        is_published: boolean
        translations: Record<string, KnowledgeTopicTranslationInput>
    }>,
): Promise<KnowledgeTopic> {
    const response = await LaravelAxios.put(`/admin/knowledge/topics/${id}`, payload)
    const data = response.data.data ?? response.data
    return data as KnowledgeTopic
}

export async function deleteAdminKnowledgeTopic(id: number): Promise<void> {
    await LaravelAxios.delete(`/admin/knowledge/topics/${id}`)
}

export async function getAdminKnowledgeArticles(
    topicId: number,
    params?: { is_published?: boolean; locale?: string },
): Promise<KnowledgeArticle[]> {
    const response = await LaravelAxios.get(`/admin/knowledge/topics/${topicId}/articles`, { params })
    const data = response.data.data ?? response.data
    return Array.isArray(data) ? data : []
}

export async function getAdminKnowledgeArticle(id: number): Promise<KnowledgeArticle> {
    const response = await LaravelAxios.get(`/admin/knowledge/articles/${id}`)
    const data = response.data.data ?? response.data
    return data as KnowledgeArticle
}

export async function createAdminKnowledgeArticle(
    topicId: number,
    payload: {
        locale: string
        title: string
        slug?: string
        excerpt?: string | null
        body: string
        sort_order?: number
        is_published?: boolean
    },
): Promise<KnowledgeArticle> {
    const response = await LaravelAxios.post(`/admin/knowledge/topics/${topicId}/articles`, payload)
    const data = response.data.data ?? response.data
    return data as KnowledgeArticle
}

export async function updateAdminKnowledgeArticle(
    id: number,
    payload: Partial<{
        title: string
        slug: string
        excerpt: string | null
        body: string
        sort_order: number
        is_published: boolean
    }>,
): Promise<KnowledgeArticle> {
    const response = await LaravelAxios.put(`/admin/knowledge/articles/${id}`, payload)
    const data = response.data.data ?? response.data
    return data as KnowledgeArticle
}

export async function deleteAdminKnowledgeArticle(id: number): Promise<void> {
    await LaravelAxios.delete(`/admin/knowledge/articles/${id}`)
}

// ========== Admin notifications ==========
export interface AdminNotificationItem {
    id: number
    type: string
    title: string
    message: string
    read: boolean
    createdAt: string
    link?: string
}

export async function getAdminNotifications(): Promise<AdminNotificationItem[]> {
    const response = await LaravelAxios.get('/admin/notifications')
    return response.data.data || response.data
}

export async function markAdminNotificationAsRead(id: number): Promise<void> {
    await LaravelAxios.post(`/admin/notifications/${id}/read`)
}

export async function markAllAdminNotificationsAsRead(): Promise<void> {
    await LaravelAxios.post('/admin/notifications/read-all')
}

export async function deleteAdminNotification(id: number): Promise<void> {
    await LaravelAxios.delete(`/admin/notifications/${id}`)
}

// ========== Support tickets (admin) ==========
export interface AdminSupportTicketListItem {
    id: number
    subject: string
    category: string
    status: string
    company: { id: number; name: string; slug?: string; email?: string | null } | null
    submitterEmail: string | null
    createdAt: string
}

export async function getAdminSupportTickets(params?: {
    status?: string
    search?: string
    company_id?: number
    page?: number
    pageSize?: number
}): Promise<{
    data: AdminSupportTicketListItem[]
    total: number
    page: number
    pageSize: number
}> {
    const response = await LaravelAxios.get('/admin/support/tickets', { params })
    return {
        data: response.data.data ?? [],
        total: response.data.total ?? 0,
        page: response.data.page ?? 1,
        pageSize: response.data.pageSize ?? 20,
    }
}

export interface AdminSupportTicketDetail {
    id: number
    subject: string
    category: string
    status: string
    areaSection: string | null
    pagePath: string | null
    body: string
    clientMeta: Record<string, unknown> | null
    adminInternalNote: string | null
    adminPublicReply: string | null
    createdAt: string
    updatedAt: string
    resolvedAt: string | null
    attachments: Array<{
        id: number
        originalName: string
        mime: string | null
        size: number
        url: string
    }>
    company: Record<string, unknown> | null
    companyOwner: Record<string, unknown> | null
    submitter: Record<string, unknown> | null
}

export async function getAdminSupportTicket(id: number): Promise<AdminSupportTicketDetail> {
    const response = await LaravelAxios.get(`/admin/support/tickets/${id}`)
    return response.data.data
}

export async function updateAdminSupportTicket(
    id: number,
    payload: { status?: string; adminInternalNote?: string | null; publicReply?: string | null },
): Promise<AdminSupportTicketDetail> {
    const response = await LaravelAxios.put(`/admin/support/tickets/${id}`, payload)
    return response.data.data
}

// ========== Subscription Plans ==========
export interface SubscriptionPlanFeatures {
    max_team_members: number
    max_services: number
    max_advertisements: number
    analytics: boolean
    priority_support: boolean
    api_access: boolean
}

export interface SubscriptionPlan {
    id: number
    slug: string
    name: string
    description: string | null
    price_monthly: number
    price_yearly: number
    price_monthly_cents: number
    price_yearly_cents: number
    currency: string
    features: SubscriptionPlanFeatures
    is_active: boolean
    is_default: boolean
    is_free: boolean
    sort_order: number
    badge_text: string | null
    color: string
    subscribers_count?: number
}

export interface SubscriptionPlansStats {
    total_plans: number
    active_plans: number
    total_subscribers: number
    mrr: number
    by_plan: Array<{
        slug: string
        name: string
        color: string
        subscribers: number
        mrr: number
    }>
}

export async function getSubscriptionPlans(): Promise<{ plans: SubscriptionPlan[] }> {
    const response = await LaravelAxios.get('/admin/subscription-plans')
    return response.data
}

export async function getSubscriptionPlansStats(): Promise<SubscriptionPlansStats> {
    const response = await LaravelAxios.get('/admin/subscription-plans/stats')
    return response.data
}

export async function getSubscriptionPlan(id: number): Promise<{ plan: SubscriptionPlan }> {
    const response = await LaravelAxios.get(`/admin/subscription-plans/${id}`)
    return response.data
}

export async function createSubscriptionPlan(data: Partial<SubscriptionPlan>): Promise<{ success: boolean; plan: SubscriptionPlan }> {
    const response = await LaravelAxios.post('/admin/subscription-plans', data)
    return response.data
}

export async function updateSubscriptionPlan(id: number, data: Partial<SubscriptionPlan>): Promise<{ success: boolean; plan: SubscriptionPlan }> {
    const response = await LaravelAxios.put(`/admin/subscription-plans/${id}`, data)
    return response.data
}

export async function deleteSubscriptionPlan(id: number): Promise<{ success: boolean }> {
    const response = await LaravelAxios.delete(`/admin/subscription-plans/${id}`)
    return response.data
}

export async function setDefaultSubscriptionPlan(id: number): Promise<{ success: boolean; plan: SubscriptionPlan }> {
    const response = await LaravelAxios.post(`/admin/subscription-plans/${id}/set-default`)
    return response.data
}

export async function reorderSubscriptionPlans(order: number[]): Promise<{ success: boolean }> {
    const response = await LaravelAxios.post('/admin/subscription-plans/reorder', { order })
    return response.data
}

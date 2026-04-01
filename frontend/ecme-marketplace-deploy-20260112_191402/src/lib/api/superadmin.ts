// API функции для суперадминки
// Используются с React Query

import LaravelAxios from '@/services/axios/LaravelAxios'

// ========== Reviews ==========
export interface AdminReview {
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

export interface AdvertisementReviewGroup {
    advertisement: {
        id: number
        title: string
        link: string
        image: string | null
        company: {
            id: number
            name: string
            slug: string | null
        }
    }
    reviews: AdminReview[]
    averageRating: number
    totalReviews: number
}

export interface ReviewsData {
    groupedByAdvertisement: AdvertisementReviewGroup[]
    reviewsWithoutAd: AdminReview[]
}

export async function getReviews(filters?: {
    page?: number
    pageSize?: number
}): Promise<ReviewsData & { total?: number; page?: number; pageSize?: number }> {
    const response = await LaravelAxios.get('/admin/reviews', { params: filters })
    const data = response.data.data || response.data
    return {
        ...data,
        total: response.data.total,
        page: response.data.page,
        pageSize: response.data.pageSize,
    }
}

export async function updateReviewResponse(id: number, response: string): Promise<void> {
    await LaravelAxios.put(`/admin/reviews/${id}/response`, { response })
}

export async function deleteReview(id: number): Promise<void> {
    await LaravelAxios.delete(`/admin/reviews/${id}`)
}

// ========== Dashboard ==========
export interface PlatformStats {
    totalCompanies: number
    totalUsers: number
    totalRevenue: number
    activeBookings: number
    revenueByPeriod: Array<{ period: string; amount: number }>
    revenue?: {
        thisWeek: number
        thisMonth: number
        thisYear: number
    }
    businesses?: {
        thisWeek: number
        thisMonth: number
        thisYear: number
    }
    users?: {
        thisWeek: number
        thisMonth: number
        thisYear: number
    }
}

export async function getPlatformStats(): Promise<PlatformStats> {
    try {
        const response = await LaravelAxios.get('/admin/dashboard/stats')
        const data = response.data.data || response.data
        return data
    } catch (error) {
        // Если ошибка, возвращаем дефолтные значения вместо падения
        console.warn('Failed to fetch platform stats, using defaults:', error)
        return {
            totalCompanies: 0,
            totalUsers: 0,
            totalRevenue: 0,
            activeBookings: 0,
            revenueByPeriod: [],
        }
    }
}

export interface ChartData {
    series: Array<{ name: string; data: number[] }>
    date: string[]
    categories: string[]
}

export async function getChartData(
    category: 'revenue' | 'businesses' | 'users',
    period: 'thisWeek' | 'thisMonth' | 'thisYear'
): Promise<ChartData> {
    try {
        const response = await LaravelAxios.get('/admin/dashboard/chart', {
            params: { category, period },
        })
        console.log('Admin Chart API Response:', response.data)
        
        // Проверяем структуру ответа
        let data = response.data
        if (data && data.data) {
            data = data.data
        }
        
        console.log('Admin Chart Parsed Data:', data)
        
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

// ========== Recent Activity ==========
export interface RecentActivity {
    id: number
    type: string
    title: string
    description: string
    time: string
    status: 'pending' | 'approved' | 'rejected' | 'completed'
}

export async function getRecentActivity(): Promise<RecentActivity[]> {
    try {
        const response = await LaravelAxios.get('/admin/dashboard/recent-activity')
        return response.data.data || response.data || []
    } catch (error) {
        // Если эндпоинт еще не создан, возвращаем пустой массив
        console.warn('Failed to fetch recent activity, endpoint may not be implemented yet:', error)
        return []
    }
}

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
        console.warn('Failed to fetch company services:', error)
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
        console.warn('Company chart endpoint not available:', error)
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

export async function createCompany(data: Partial<Company>): Promise<Company> {
    const response = await LaravelAxios.post('/admin/companies', data)
    return response.data.data || response.data
}

export async function updateCompany(companyId: number, data: Partial<Company>): Promise<Company> {
    const response = await LaravelAxios.put(`/admin/companies/${companyId}`, data)
    return response.data.data || response.data
}

// ========== Users ==========
export interface AdminUser {
    id: number
    name: string
    email: string
    role: 'CLIENT' | 'BUSINESS_OWNER' | 'SUPERADMIN'
    status: 'active' | 'blocked'
    createdAt: string
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
    // Дополнительные данные
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

// ========== Modules ==========
export interface Module {
    id: number
    name: string
    description: string
    enabled: boolean
    required: boolean
    availableFor: string[]
}

export async function getModules(): Promise<Module[]> {
    const response = await LaravelAxios.get('/admin/modules')
    return response.data.data || response.data
}

export async function updateModule(id: number, data: Partial<Module>): Promise<Module> {
    const response = await LaravelAxios.put(`/admin/modules/${id}`, data)
    return response.data.data || response.data
}

export async function updateModuleAvailability(
    moduleId: number,
    availableFor: string[]
): Promise<Module> {
    const response = await LaravelAxios.put(`/admin/modules/${moduleId}/availability`, {
        availableFor,
    })
    return response.data.data || response.data
}

// ========== Settings ==========
export interface PlatformSettings {
    siteName: string
    siteDescription: string
    contactEmail: string
    contactPhone: string
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
    // ... другие настройки
}

export interface PaymentSettings {
    stripePublicKey: string
    stripeSecretKey: string
    // ... другие настройки платежей
}

export interface FeesSettings {
    platformFee: number
    transactionFee: number
    // ... другие настройки комиссий
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
        headers: {
            // Не устанавливаем Content-Type явно - axios автоматически установит multipart/form-data с boundary
        },
    })
    return response.data
}

export async function removePlatformLogo(type: 'light' | 'dark' | 'iconLight' | 'iconDark'): Promise<void> {
    await LaravelAxios.delete('/admin/settings/logo', {
        data: { type },
    })
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
    const response = await LaravelAxios.get('/admin/settings/payments')
    return response.data.data || response.data
}

export async function updatePaymentSettings(data: Partial<PaymentSettings>): Promise<PaymentSettings> {
    const response = await LaravelAxios.put('/admin/settings/payments', data)
    return response.data.data || response.data
}

export async function getFeesSettings(): Promise<FeesSettings> {
    const response = await LaravelAxios.get('/admin/settings/fees')
    return response.data.data || response.data
}

export async function updateFeesSettings(data: Partial<FeesSettings>): Promise<FeesSettings> {
    const response = await LaravelAxios.put('/admin/settings/fees', data)
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
        console.error('Error fetching categories:', error)
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


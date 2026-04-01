import LaravelAxios from '@/services/axios/LaravelAxios'

export interface SuperadminBillingOverview {
    stripe_configured: boolean
    revenue_this_month: number
    revenue_last_month: number
    revenue_growth_pct: number | null
    revenue_ad_this_month: number
    revenue_subscription_this_month: number
    revenue_other_this_month: number
    transactions_this_month: number
    avg_check_this_month: number
    transactions_today: number
    amount_today: number
    open_checkouts: number
    open_checkouts_amount: number
}

export interface SuperadminBillingChart {
    stripe_configured: boolean
    date: string[]
    series: Array<{ name: string; data: number[] }>
}

export interface SuperadminBillingStructure {
    stripe_configured: boolean
    advertisement: number
    subscription: number
    other: number
    total: number
}

export interface SuperadminBillingTransaction {
    id: string
    type: string
    amount: number
    currency: string
    status: string
    description: string
    created: string
    company_id: number | null
    company_name: string | null
    advertisement_id: number | null
    package_id: string | null
}

export interface SuperadminBillingTransactionsResponse {
    stripe_configured: boolean
    data: SuperadminBillingTransaction[]
    total: number
    page: number
    pageSize: number
}

export interface SuperadminBillingCompanyRow {
    company_id: number
    company_name: string
    total_amount: number
    transaction_count: number
}

export interface SuperadminBillingAdSpend {
    stripe_configured: boolean
    this_month: number
    last_month: number
    by_package: Array<{ package_id: string; amount: number }>
    transactions_count: number
}

export interface SuperadminBillingCampaignItem {
    description: string
    amount: number
    currency: string
    created: string
    company_name: string
    package_id: string | null
}

export interface SuperadminBillingForecast {
    stripe_configured: boolean
    last_7_days_total: number
    daily_avg: number
    projected_month: number
}

export async function getSuperadminBillingOverview(): Promise<SuperadminBillingOverview> {
    const { data } = await LaravelAxios.get('/admin/billing/overview')
    return data
}

export async function getSuperadminBillingRevenueChart(
    days: 7 | 14 | 30 | 90 = 14,
): Promise<SuperadminBillingChart> {
    const { data } = await LaravelAxios.get('/admin/billing/revenue-chart', {
        params: { days },
    })
    return data
}

export async function getSuperadminBillingRevenueStructure(): Promise<SuperadminBillingStructure> {
    const { data } = await LaravelAxios.get('/admin/billing/revenue-structure')
    return data
}

export async function getSuperadminBillingTransactions(params: {
    page?: number
    pageSize?: number
    type?: string
    company_id?: string | number
}): Promise<SuperadminBillingTransactionsResponse> {
    const { data } = await LaravelAxios.get('/admin/billing/transactions', { params })
    return data
}

export async function getSuperadminBillingRevenueByCompany(
    limit = 10,
): Promise<{ stripe_configured: boolean; companies: SuperadminBillingCompanyRow[] }> {
    const { data } = await LaravelAxios.get('/admin/billing/revenue-by-company', {
        params: { limit },
    })
    return data
}

export async function getSuperadminBillingAdSpend(): Promise<SuperadminBillingAdSpend> {
    const { data } = await LaravelAxios.get('/admin/billing/ad-spend')
    return data
}

export async function getSuperadminBillingCampaigns(
    limit = 15,
): Promise<{ stripe_configured: boolean; items: SuperadminBillingCampaignItem[] }> {
    const { data } = await LaravelAxios.get('/admin/billing/campaigns', {
        params: { limit },
    })
    return data
}

export async function getSuperadminBillingForecast(): Promise<SuperadminBillingForecast> {
    const { data } = await LaravelAxios.get('/admin/billing/forecast')
    return data
}

export async function downloadSuperadminBillingExport(from: string, to: string): Promise<void> {
    const response = await LaravelAxios.get('/admin/billing/export', {
        params: { from, to },
        responseType: 'blob',
    })
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `billing-export-${from}-${to}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
}

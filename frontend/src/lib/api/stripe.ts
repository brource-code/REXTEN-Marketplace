// API функции для Stripe платежей
// Используются с React Query

import LaravelAxios from '@/services/axios/LaravelAxios'

export interface StripeCheckoutSession {
    checkout_url: string
    session_id: string
    packageId?: 'basic' | 'standard' | 'premium'
    advertisementId?: number
}

export interface StripeTransaction {
    id: string
    type: 'advertisement' | 'subscription' | 'unknown'
    amount: number
    currency: string
    status: string
    description: string
    plan?: string | null
    interval?: string | null
    created: string
    created_timestamp: number
    metadata: {
        advertisement_id?: number | null
        package_id?: string | null
        subscription_id?: string | null
        type?: string | null
        plan?: string | null
        interval?: string | null
    }
}

export interface StripeTransactionsResponse {
    transactions: StripeTransaction[]
    has_more: boolean
    next_cursor: string | null
}

export async function createStripeCheckoutSession(
    advertisementId: number,
    packageId: 'basic' | 'standard' | 'premium'
): Promise<StripeCheckoutSession> {
    const response = await LaravelAxios.post('/business/stripe/checkout-session', {
        advertisement_id: advertisementId,
        package_id: packageId,
    })
    return {
        ...response.data,
        packageId,
        advertisementId,
    }
}

export async function getStripeTransactions(
    limit?: number,
    startingAfter?: string
): Promise<StripeTransactionsResponse> {
    const params: Record<string, string | number> = {}
    if (limit) params.limit = limit
    if (startingAfter) params.starting_after = startingAfter

    const response = await LaravelAxios.get('/business/stripe/transactions', { params })
    return response.data
}

// ========== Subscriptions ==========

export interface SubscriptionPlanFeatures {
    max_team_members: number
    max_services: number
    max_advertisements: number
    analytics: boolean
    priority_support: boolean
    api_access: boolean
}

export interface SubscriptionPlan {
    id: string
    name: string
    price_monthly: number
    price_yearly: number
    features: SubscriptionPlanFeatures
    sort_order?: number
    is_free?: boolean
}

export interface SubscriptionData {
    id: number
    plan: string
    status: string
    price: number
    currency: string
    interval: string
    current_period_start: string | null
    current_period_end: string | null
    canceled_at: string | null
    cancellation_scheduled?: boolean
    scheduled_plan?: string | null
    grace_period_ends_at?: string | null
    previous_plan?: string | null
    is_active: boolean
    is_free?: boolean
}

export interface CurrentSubscriptionResponse {
    subscription: SubscriptionData | null
    plan: {
        name: string
        features: SubscriptionPlanFeatures
    } | null
}

export interface SubscriptionUsageNumeric {
    current: number
    limit: number
    unlimited: boolean
    total?: number
    over_limit?: boolean
    over_by?: number
}

export interface SubscriptionUsageBoolean {
    allowed: boolean
}

export interface SubscriptionUsage {
    team_members: SubscriptionUsageNumeric
    services: SubscriptionUsageNumeric
    advertisements: SubscriptionUsageNumeric
    analytics: SubscriptionUsageBoolean
    api_access: SubscriptionUsageBoolean
    priority_support: SubscriptionUsageBoolean
    grace_period_ends_at?: string | null
    grace_period_active?: boolean
    is_over_limit?: boolean
    scheduled_plan?: string | null
}

export interface OverLimitItem {
    id: number
    type: 'team_member' | 'company_user' | 'service' | 'advertisement'
    name?: string
    email?: string
    user_id?: number
    is_active?: boolean
}

export interface OverLimitResourceBlock {
    current_active: number
    total_all: number
    limit: number
    unlimited: boolean
    over_by: number
    items: OverLimitItem[]
}

export interface SubscriptionOverLimitResponse {
    is_over_limit: boolean
    grace_period_ends_at: string | null
    grace_period_active: boolean
    resources: {
        team_members?: OverLimitResourceBlock
        services?: OverLimitResourceBlock
        advertisements?: OverLimitResourceBlock
    }
}

export interface ResolveSubscriptionLimitsPayload {
    deactivate_team_member_ids?: number[]
    deactivate_company_user_ids?: number[]
    deactivate_service_ids?: number[]
    deactivate_advertisement_ids?: number[]
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const response = await LaravelAxios.get('/business/subscription/plans')
    return response.data.plans
}

export async function getCurrentSubscription(): Promise<CurrentSubscriptionResponse> {
    const response = await LaravelAxios.get('/business/subscription/current')
    return response.data
}

export async function getSubscriptionUsage(): Promise<SubscriptionUsage> {
    const response = await LaravelAxios.get('/business/subscription/usage')
    return response.data
}

export async function createSubscriptionCheckout(
    plan: string,
    interval: 'month' | 'year'
): Promise<StripeCheckoutSession> {
    const response = await LaravelAxios.post('/business/subscription/checkout', {
        plan,
        interval,
    })
    return response.data
}

export async function cancelSubscription(): Promise<void> {
    await LaravelAxios.post('/business/subscription/cancel')
}

export async function resumeSubscription(): Promise<void> {
    await LaravelAxios.post('/business/subscription/resume')
}

export async function changeSubscriptionPlan(
    plan: string,
    interval: 'month' | 'year'
): Promise<{
    action?: string
    checkout_url?: string
    session_id?: string
    scheduled_plan?: string
    current_period_end?: string
    message?: string
}> {
    const response = await LaravelAxios.post('/business/subscription/change-plan', {
        plan,
        interval,
    })
    return response.data
}

export async function cancelScheduledPlanChange(): Promise<void> {
    await LaravelAxios.post('/business/subscription/cancel-scheduled-change')
}

export async function getSubscriptionOverLimit(): Promise<SubscriptionOverLimitResponse> {
    const response = await LaravelAxios.get('/business/subscription/over-limit')
    return response.data
}

export async function resolveSubscriptionLimits(
    payload: ResolveSubscriptionLimitsPayload
): Promise<{ usage: SubscriptionUsage; over_limit: SubscriptionOverLimitResponse }> {
    const response = await LaravelAxios.post('/business/subscription/resolve-limits', payload)
    return response.data
}

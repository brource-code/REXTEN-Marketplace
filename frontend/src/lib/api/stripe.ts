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
    created: string
    created_timestamp: number
    metadata: {
        advertisement_id?: number | null
        package_id?: string | null
        subscription_id?: string | null
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

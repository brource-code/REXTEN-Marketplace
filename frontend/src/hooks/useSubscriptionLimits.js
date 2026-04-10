'use client'

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSubscriptionUsage } from '@/lib/api/stripe'

/**
 * Лимиты и фичи подписки (GET /business/subscription/usage).
 */
export default function useSubscriptionLimits() {
    const { data: usage, isLoading, isError, refetch } = useQuery({
        queryKey: ['subscription-usage'],
        queryFn: getSubscriptionUsage,
        staleTime: 60 * 1000,
        retry: 1,
    })

    const canCreate = useCallback(
        (resource) => {
            if (!usage) {
                return true
            }
            const block = usage[resource]
            if (!block || block.unlimited) {
                return true
            }
            return block.current < block.limit
        },
        [usage],
    )

    const hasFeature = useCallback(
        (feature) => {
            if (!usage) {
                return false
            }
            const block = usage[feature]
            return block?.allowed === true
        },
        [usage],
    )

    const isOverLimit = Boolean(usage?.is_over_limit)
    const gracePeriodEndsAt = usage?.grace_period_ends_at ?? null

    return {
        usage,
        isLoading,
        isError,
        refetch,
        canCreate,
        hasFeature,
        isOverLimit,
        gracePeriodEndsAt,
    }
}


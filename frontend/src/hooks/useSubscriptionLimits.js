'use client'

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSubscriptionUsage } from '@/lib/api/stripe'

/**
 * Лимиты и фичи подписки (GET /business/subscription/usage).
 * @param {{ enabled?: boolean }} [options]
 */
export default function useSubscriptionLimits(options = {}) {
    const { enabled = true } = options
    const { data: usage, isLoading, isError, refetch } = useQuery({
        queryKey: ['subscription-usage'],
        queryFn: getSubscriptionUsage,
        staleTime: 60 * 1000,
        retry: 1,
        enabled,
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
            // Не показывать ложный «нет доступа» при сбое API (бейдж/FeatureLock)
            if (isError) {
                return true
            }
            if (!usage) {
                return false
            }
            const block = usage[feature]
            return block?.allowed === true
        },
        [usage, isError],
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


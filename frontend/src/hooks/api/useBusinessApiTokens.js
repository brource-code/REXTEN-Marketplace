'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    createBusinessApiToken,
    listBusinessApiTokens,
    revokeBusinessApiToken,
} from '@/lib/api/business'

const QUERY_KEY = ['business-api-tokens']

export function useBusinessApiTokensQuery(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: listBusinessApiTokens,
        enabled,
        staleTime: 30 * 1000,
        retry: 1,
    })
}

export function useCreateBusinessApiTokenMutation() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: createBusinessApiToken,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEY })
        },
    })
}

export function useRevokeBusinessApiTokenMutation() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: revokeBusinessApiToken,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEY })
        },
    })
}

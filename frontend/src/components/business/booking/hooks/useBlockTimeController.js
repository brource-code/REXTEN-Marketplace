'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { createScheduleSlot, updateScheduleSlot } from '@/lib/api/business'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

export function useBlockTimeController({ refetchSlots } = {}) {
    const queryClient = useQueryClient()
    const t = useTranslations('business.schedule')
    const tCommon = useTranslations('business.common')

    const [open, setOpen] = useState(false)
    const [seed, setSeed] = useState(null)

    const invalidate = useCallback(async () => {
        if (typeof refetchSlots === 'function') await refetchSlots()
        await queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
    }, [queryClient, refetchSlots])

    const createMutation = useMutation({
        mutationFn: createScheduleSlot,
        onSuccess: async () => {
            await invalidate()
            setOpen(false)
            setSeed(null)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('block.createSuccess')}
                </Notification>,
                { placement: 'top-end' },
            )
        },
        onError: (error) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {error?.response?.data?.message || error?.message || t('block.createError')}
                </Notification>,
                { placement: 'top-end' },
            )
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateScheduleSlot(id, data),
        onSuccess: async () => {
            await invalidate()
            setOpen(false)
            setSeed(null)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('block.updateSuccess')}
                </Notification>,
                { placement: 'top-end' },
            )
        },
        onError: (error) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {error?.response?.data?.message || error?.message || t('block.updateError')}
                </Notification>,
                { placement: 'top-end' },
            )
        },
    })

    const openModal = useCallback((nextSeed) => {
        setSeed(nextSeed || null)
        setOpen(true)
    }, [])

    const closeModal = useCallback(() => {
        setOpen(false)
        setSeed(null)
    }, [])

    const submit = useCallback(
        async (data) => {
            if (seed?.id) {
                return updateMutation.mutateAsync({ id: seed.id, data })
            }
            return createMutation.mutateAsync(data)
        },
        [seed, createMutation, updateMutation],
    )

    return {
        open,
        seed,
        openModal,
        closeModal,
        submit,
        saving: createMutation.isPending || updateMutation.isPending,
    }
}

export default useBlockTimeController

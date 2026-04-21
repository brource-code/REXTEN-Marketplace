'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { createScheduleSlot } from '@/lib/api/business'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

export function useNewBookingController({ refetchSlots } = {}) {
    const queryClient = useQueryClient()
    const t = useTranslations('business.schedule')
    const tCommon = useTranslations('business.common')

    const [open, setOpen] = useState(false)
    const [seed, setSeed] = useState(null)

    const createMutation = useMutation({
        mutationFn: createScheduleSlot,
        onSuccess: async () => {
            if (typeof refetchSlots === 'function') await refetchSlots()
            await queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
            setOpen(false)
            setSeed(null)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.bookingCreated')}
                </Notification>,
                { placement: 'top-end' },
            )
        },
        onError: (error) => {
            const code = error?.response?.data?.error
            const msg =
                error?.response?.data?.message ||
                error?.message ||
                t('notifications.createError')
            const type = code === 'slot_occupied' ? 'warning' : 'danger'
            toast.push(
                <Notification
                    title={code === 'slot_occupied' ? tCommon('warning') : tCommon('error')}
                    type={type}
                >
                    {msg}
                </Notification>,
                { placement: 'top-end' },
            )
        },
    })

    const openWizard = useCallback((nextSeed) => {
        setSeed(nextSeed || null)
        setOpen(true)
    }, [])

    const closeWizard = useCallback(() => {
        setOpen(false)
        setSeed(null)
    }, [])

    const submit = useCallback(
        (data) => createMutation.mutateAsync(data),
        [createMutation],
    )

    return {
        open,
        seed,
        openWizard,
        closeWizard,
        submit,
        creating: createMutation.isPending,
    }
}

export default useNewBookingController

'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
    updateScheduleSlot,
    deleteScheduleSlot,
} from '@/lib/api/business'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

/**
 * Контроллер для BookingDrawer (редактирование/просмотр существующего бронирования
 * или блока времени). Поддерживает update + удаление с undo-toast.
 */
export function useBookingDrawerController({ refetchSlots } = {}) {
    const queryClient = useQueryClient()
    const t = useTranslations('business.schedule')
    const tCommon = useTranslations('business.common')

    const [open, setOpen] = useState(false)
    const [slot, setSlot] = useState(null)
    const [pendingDelete, setPendingDelete] = useState(null)

    const invalidate = useCallback(async () => {
        if (typeof refetchSlots === 'function') {
            await refetchSlots()
        }
        await queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
    }, [queryClient, refetchSlots])

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateScheduleSlot(id, data),
        onSuccess: async (response) => {
            const responseData = response?.data || response
            await invalidate()
            if (responseData && responseData.id) {
                setSlot((prev) => ({ ...(prev || {}), ...responseData }))
                queryClient.invalidateQueries({
                    queryKey: ['booking-activities', responseData.id],
                })
            }
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.bookingUpdated')}
                </Notification>,
                { placement: 'top-end' },
            )
        },
        onError: (error) => {
            const msg =
                error?.response?.data?.message ||
                error?.message ||
                t('notifications.updateError')
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {msg}
                </Notification>,
                { placement: 'top-end' },
            )
        },
    })

    const deleteMutation = useMutation({
        mutationFn: deleteScheduleSlot,
        onSuccess: async () => {
            await invalidate()
            setOpen(false)
            setSlot(null)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.bookingDeleted')}
                </Notification>,
                { placement: 'top-end' },
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.deleteError')}
                </Notification>,
                { placement: 'top-end' },
            )
        },
    })

    const openForSlot = useCallback((nextSlot) => {
        setSlot(nextSlot)
        setOpen(true)
    }, [])

    const closeDrawer = useCallback(() => {
        setOpen(false)
        setSlot(null)
    }, [])

    const submitUpdate = useCallback(
        (data) => {
            if (!slot?.id) return Promise.resolve()
            return updateMutation.mutateAsync({ id: slot.id, data })
        },
        [slot?.id, updateMutation],
    )

    const requestDelete = useCallback(
        (id) => {
            setPendingDelete(id ?? slot?.id ?? null)
        },
        [slot?.id],
    )

    const cancelDelete = useCallback(() => setPendingDelete(null), [])

    const confirmDelete = useCallback(async () => {
        if (!pendingDelete) return
        await deleteMutation.mutateAsync(pendingDelete)
        setPendingDelete(null)
    }, [pendingDelete, deleteMutation])

    return {
        open,
        slot,
        openForSlot,
        closeDrawer,
        submitUpdate,
        updating: updateMutation.isPending,
        requestDelete,
        cancelDelete,
        confirmDelete,
        deleting: deleteMutation.isPending,
        pendingDelete,
    }
}

export default useBookingDrawerController

'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
    createScheduleSlot,
    updateScheduleSlot,
    deleteScheduleSlot,
    getBusinessServices,
} from '@/lib/api/business'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

/**
 * Общая логика модалки слота (создание/редактирование/удаление) для расписания и списка броней.
 */
export function useBusinessScheduleSlotModalController({ refetchSlots }) {
    const queryClient = useQueryClient()
    const t = useTranslations('business.schedule')
    const tCommon = useTranslations('business.common')

    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedSlot, setSelectedSlot] = useState(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [slotToDelete, setSlotToDelete] = useState(null)

    const { data: services = [] } = useQuery({
        queryKey: ['business-services'],
        queryFn: getBusinessServices,
    })

    const createSlotMutation = useMutation({
        mutationFn: createScheduleSlot,
        onSuccess: async () => {
            await refetchSlots()
            queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
            setDialogOpen(false)
            setSelectedSlot(null)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.bookingCreated')}
                </Notification>,
            )
        },
        onError: (error) => {
            const errorCode = error?.response?.data?.error
            const errorMessage = error?.response?.data?.message || error?.message || t('notifications.createError')

            if (errorCode === 'past_date') {
                toast.push(
                    <Notification title={tCommon('error')} type="danger">
                        {errorMessage}
                    </Notification>,
                )
                setDialogOpen(false)
                setSelectedSlot(null)
            } else if (errorCode === 'slot_occupied') {
                toast.push(
                    <Notification title={tCommon('warning')} type="warning">
                        {errorMessage}. {t('notifications.changeTimeOrDate')}
                    </Notification>,
                )
            } else {
                toast.push(
                    <Notification title={tCommon('error')} type="danger">
                        {errorMessage}
                    </Notification>,
                )
                setDialogOpen(false)
                setSelectedSlot(null)
            }
        },
    })

    const updateSlotMutation = useMutation({
        mutationFn: ({ id, data }) => updateScheduleSlot(id, data),
        onSuccess: async (response) => {
            const responseData = response?.data || response

            const result = await refetchSlots()
            const updatedSlots = result?.data || []

            queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })

            const isCompleted = responseData?.status === 'completed'
            const hasReviewToken = !!responseData?.review_token
            const isUnregisteredClient = !responseData?.user_id || responseData?.user_id === null

            if (isCompleted && hasReviewToken && selectedSlot) {
                const updatedSlot = updatedSlots.find((s) => String(s.id) === String(selectedSlot.id))

                if (updatedSlot) {
                    setSelectedSlot({
                        ...updatedSlot,
                        type: 'EDIT',
                    })
                } else {
                    setSelectedSlot((prev) => ({
                        ...prev,
                        status: responseData.status || prev.status,
                        review_token: responseData.review_token,
                        user_id: responseData.user_id,
                        has_client_account: responseData.has_client_account,
                        specialist_id: responseData.specialist_id,
                        specialist: responseData.specialist,
                    }))
                }

                if (isUnregisteredClient) {
                    toast.push(
                        <Notification title={tCommon('success')} type="success">
                            {t('notifications.bookingCompletedReviewLink')}
                        </Notification>,
                    )
                    return
                }
            }

            setDialogOpen(false)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.bookingUpdated')}
                </Notification>,
            )
        },
        onError: (error) => {
            const errorCode = error?.response?.data?.error
            const errorMessage = error?.response?.data?.message || error?.message || t('notifications.updateError')

            if (errorCode === 'past_date') {
                toast.push(
                    <Notification title={tCommon('error')} type="danger">
                        {errorMessage}
                    </Notification>,
                )
            } else if (errorCode !== 'slot_occupied') {
                toast.push(
                    <Notification title={tCommon('error')} type="danger">
                        {errorMessage}
                    </Notification>,
                )
            }
            setDialogOpen(false)
            setSelectedSlot(null)
        },
    })

    const deleteSlotMutation = useMutation({
        mutationFn: deleteScheduleSlot,
        onSuccess: async () => {
            await refetchSlots()
            queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
            setIsDeleteDialogOpen(false)
            setSlotToDelete(null)
            setDialogOpen(false)
            setSelectedSlot(null)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.bookingDeleted')}
                </Notification>,
            )
        },
        onError: () => {
            setIsDeleteDialogOpen(false)
            setSlotToDelete(null)
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.deleteError')}
                </Notification>,
            )
        },
    })

    const handleSubmit = (data, type) => {
        if (type === 'NEW') {
            const selectedService = services.find((s) => s.id === data.service_id)
            const servicePrice = selectedService?.price || 0

            createSlotMutation.mutate({
                service_id: data.service_id || null,
                title: data.title || null,
                booking_date: data.booking_date,
                booking_time: data.booking_time,
                duration_minutes: data.duration_minutes,
                status: data.status,
                notes: data.notes || null,
                user_id: data.user_id || null,
                client_name: data.client_name || null,
                client_email: data.client_email || null,
                client_phone: data.client_phone || null,
                advertisement_id: data.advertisement_id || null,
                specialist_id: data.specialist_id || null,
                price: data.title ? Math.round(Number(data.price ?? 0) * 100) / 100 : servicePrice,
                additional_services: data.additional_services || [],
                address_line1: data.address_line1 || null,
                city: data.city || null,
                state: data.state || null,
                zip: data.zip || null,
            })
        } else if (type === 'EDIT') {
            updateSlotMutation.mutate({
                id: data.id,
                data: {
                    booking_date: data.booking_date,
                    booking_time: data.booking_time,
                    duration_minutes: data.duration_minutes,
                    status: data.status,
                    title: data.title || null,
                    notes: data.notes || null,
                    specialist_id: data.specialist_id || null,
                    price: data.price,
                    additional_services: (data.additional_services || []).map((s) => ({
                        id: s.id,
                        quantity: s.quantity || 1,
                        price: s.price,
                    })),
                },
            })
        }
    }

    const handleDelete = (slotId) => {
        setSlotToDelete(slotId)
        setIsDeleteDialogOpen(true)
    }

    const handleConfirmDelete = () => {
        if (slotToDelete) {
            deleteSlotMutation.mutate(slotToDelete)
        }
    }

    const cancelDelete = () => {
        setIsDeleteDialogOpen(false)
        setSlotToDelete(null)
    }

    const closeModal = () => {
        setDialogOpen(false)
        setSelectedSlot(null)
    }

    return {
        dialogOpen,
        setDialogOpen,
        selectedSlot,
        setSelectedSlot,
        isDeleteDialogOpen,
        handleSubmit,
        handleDelete,
        handleConfirmDelete,
        cancelDelete,
        closeModal,
        updateSlotMutation,
    }
}

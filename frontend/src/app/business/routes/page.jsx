'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import PermissionGuard from '@/components/shared/PermissionGuard'
import FeatureLockOverlay from '@/components/shared/FeatureLockOverlay'
import RouteContent from './_components/RouteContent'
import BookingDrawer from '@/components/business/booking/BookingDrawer'
import {
    getTeamMembers,
    getBusinessRoute,
    getBusinessRouteSavedList,
    getBusinessRouteOptimizePreview,
    applyBusinessRouteOptimization,
    recalculateBusinessRoute,
    updateBusinessRouteIncludedBookings,
    updateBusinessRouteIncludeReturnLeg,
    getScheduleSlots,
} from '@/lib/api/business'
import toast from '@/components/ui/toast'
import { usePermission } from '@/hooks/usePermission'
import { useBookingDrawerController } from '@/components/business/booking/hooks/useBookingDrawerController'

function localTodayYmd() {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function RoutesPageInner() {
    const t = useTranslations('business.routes')
    const queryClient = useQueryClient()
    const searchParams = useSearchParams()
    const canManageSchedule = usePermission('manage_schedule')
    const canManageRoutes = usePermission(['manage_routes', 'manage_schedule'])
    const initialSpecialistFromUrl = searchParams?.get('specialist')
    const initialDateFromUrl = searchParams?.get('date')
    const [specialistId, setSpecialistId] = useState(() =>
        initialSpecialistFromUrl ? Number(initialSpecialistFromUrl) || null : null,
    )
    const [date, setDate] = useState(() => initialDateFromUrl || localTodayYmd())
    const [preview, setPreview] = useState(null)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [includeReturnLeg, setIncludeReturnLeg] = useState(true)

    const { data: teamMembers = [], isLoading: loadingTeam } = useQuery({
        queryKey: ['business-team'],
        queryFn: getTeamMembers,
    })

    const resolvedSpecialistId = specialistId ?? teamMembers[0]?.id ?? null

    const routeQuery = useQuery({
        queryKey: ['business-route', resolvedSpecialistId, date],
        queryFn: () => getBusinessRoute(resolvedSpecialistId, date),
        enabled: !!resolvedSpecialistId && !!date,
    })

    const { data: scheduleSlots = [], refetch: refetchScheduleSlotsQuery } = useQuery({
        queryKey: ['business-schedule-slots'],
        queryFn: getScheduleSlots,
    })

    const refetchSlots = useCallback(async () => {
        const result = await refetchScheduleSlotsQuery()
        await queryClient.invalidateQueries({ queryKey: ['business-route'] })
        return result
    }, [refetchScheduleSlotsQuery, queryClient])

    const invalidateSavedRoutes = useCallback(() => {
        if (resolvedSpecialistId) {
            queryClient.invalidateQueries({ queryKey: ['business-route-saved', resolvedSpecialistId] })
        }
    }, [queryClient, resolvedSpecialistId])

    const savedRoutesQuery = useQuery({
        queryKey: ['business-route-saved', resolvedSpecialistId],
        queryFn: () => getBusinessRouteSavedList(resolvedSpecialistId),
        enabled: !!resolvedSpecialistId,
    })

    const drawer = useBookingDrawerController({ refetchSlots })

    const openBookingModal = useCallback(
        async (bookingId) => {
            const idStr = String(bookingId)
            let slot = scheduleSlots.find((s) => String(s.id) === idStr)
            if (!slot) {
                const res = await refetchScheduleSlotsQuery()
                const list = res.data ?? []
                slot = list.find((s) => String(s.id) === idStr)
            }
            if (slot) {
                drawer.openForSlot(slot)
            } else {
                toast.push(t('errors.bookingModalLoadFailed'))
            }
        },
        [scheduleSlots, refetchScheduleSlotsQuery, drawer, t],
    )

    const applyMutation = useMutation({
        mutationFn: async ({ includeReturnLeg: inc }) =>
            applyBusinessRouteOptimization(resolvedSpecialistId, date, { includeReturnLeg: inc }),
        onSuccess: (data) => {
            if (data) {
                queryClient.setQueryData(['business-route', resolvedSpecialistId, date], data)
                toast.push(t('optimizeApplied'))
                invalidateSavedRoutes()
            } else {
                toast.push(t('errors.optimizeFailed'))
            }
            setPreviewOpen(false)
            setPreview(null)
        },
        onError: () => toast.push(t('errors.optimizeFailed')),
    })

    const recalcMutation = useMutation({
        mutationFn: async () => {
            const r = routeQuery.data
            if (!r?.id) return null
            return recalculateBusinessRoute(r.id)
        },
        onSuccess: (data) => {
            if (data) {
                queryClient.setQueryData(['business-route', resolvedSpecialistId, date], data)
                invalidateSavedRoutes()
            }
        },
    })

    const updateIncludedMutation = useMutation({
        mutationFn: (bookingIds) =>
            updateBusinessRouteIncludedBookings(resolvedSpecialistId, date, bookingIds),
        onSuccess: (data) => {
            if (data) {
                queryClient.setQueryData(['business-route', resolvedSpecialistId, date], data)
                invalidateSavedRoutes()
            } else {
                toast.push(t('errors.loadFailed'))
            }
        },
        onError: () => toast.push(t('errors.loadFailed')),
    })

    const updateReturnLegMutation = useMutation({
        mutationFn: (includeReturnLeg) =>
            updateBusinessRouteIncludeReturnLeg(resolvedSpecialistId, date, includeReturnLeg),
        onSuccess: (data) => {
            if (data) {
                queryClient.setQueryData(['business-route', resolvedSpecialistId, date], data)
                setIncludeReturnLeg(data.include_return_leg ?? true)
                invalidateSavedRoutes()
            } else {
                toast.push(t('errors.loadFailed'))
            }
        },
        onError: () => toast.push(t('errors.loadFailed')),
    })

    useEffect(() => {
        const fromRoute = routeQuery.data?.include_return_leg
        setIncludeReturnLeg(fromRoute !== undefined ? fromRoute : true)
    }, [routeQuery.data?.id, routeQuery.data?.include_return_leg])

    const previewMutation = useMutation({
        mutationFn: ({ includeReturnLeg: inc }) =>
            getBusinessRouteOptimizePreview(resolvedSpecialistId, date, { includeReturnLeg: inc }),
        onSuccess: (data) => {
            if (!data) {
                toast.push(t('errors.optimizeFailed'))
                return
            }
            if (data.suppressed_worse_proposal) {
                toast.push(t('previewSuppressedWorse'))
                return
            }
            setPreview(data)
            setPreviewOpen(true)
        },
        onError: () => toast.push(t('errors.optimizeFailed')),
    })

    const onOptimizePreview = useCallback(() => {
        if (!resolvedSpecialistId) return
        previewMutation.mutate({ includeReturnLeg })
    }, [resolvedSpecialistId, previewMutation, includeReturnLeg])

    const onPreviewApply = useCallback(() => {
        applyMutation.mutate({ includeReturnLeg })
    }, [applyMutation, includeReturnLeg])

    const onPreviewClose = useCallback(() => {
        setPreviewOpen(false)
        setPreview(null)
    }, [])

    const onRecalculate = useCallback(() => {
        if (!routeQuery.data?.id) return
        recalcMutation.mutate()
    }, [routeQuery.data?.id, recalcMutation])

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex min-w-0 flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {t('description')}
                        </p>
                    </div>

                    <RouteContent
                        route={routeQuery.data}
                        isLoading={routeQuery.isLoading || loadingTeam}
                        teamMembers={teamMembers}
                        specialistId={resolvedSpecialistId}
                        onSpecialistChange={setSpecialistId}
                        date={date}
                        onDateChange={setDate}
                        preview={preview}
                        previewOpen={previewOpen}
                        onOptimizePreview={onOptimizePreview}
                        onPreviewApply={onPreviewApply}
                        onPreviewClose={onPreviewClose}
                        onRecalculate={onRecalculate}
                        applying={applyMutation.isPending}
                        recalculating={recalcMutation.isPending}
                        optimizingPreview={previewMutation.isPending}
                        onUpdateIncluded={(bookingIds) => updateIncludedMutation.mutate(bookingIds)}
                        updatingIncluded={updateIncludedMutation.isPending}
                        onOpenBooking={openBookingModal}
                        includeReturnLeg={includeReturnLeg}
                        onIncludeReturnLegChange={(val) => updateReturnLegMutation.mutate(val)}
                        updatingReturnLeg={updateReturnLegMutation.isPending}
                        selectedDate={date}
                        savedRoutes={savedRoutesQuery.data ?? []}
                        savedRoutesLoading={savedRoutesQuery.isLoading}
                        onSelectSavedDate={setDate}
                        canManageRoutes={canManageRoutes}
                    />

                    <BookingDrawer
                        open={drawer.open}
                        slot={drawer.slot}
                        onClose={drawer.closeDrawer}
                        onSubmit={canManageSchedule ? drawer.submitUpdate : undefined}
                        onRequestDelete={canManageSchedule ? drawer.requestDelete : undefined}
                        saving={drawer.updating}
                        pendingDelete={drawer.pendingDelete}
                        onConfirmDelete={drawer.confirmDelete}
                        onCancelDelete={drawer.cancelDelete}
                        deleting={drawer.deleting}
                    />
                </div>
            </AdaptiveCard>
        </Container>
    )
}

export default function BusinessRoutesPage() {
    return (
        <PermissionGuard permission={['view_routes', 'view_schedule']}>
            <FeatureLockOverlay feature="routes">
                <RoutesPageInner />
            </FeatureLockOverlay>
        </PermissionGuard>
    )
}

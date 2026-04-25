'use client'

import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { PiCalendarBlank, PiListBullets } from 'react-icons/pi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRecentBookings, getScheduleSlots } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import EmptyStatePanel from '@/components/shared/EmptyStatePanel'
import BookingDrawer from '@/components/business/booking/BookingDrawer'
import { useBookingDrawerController } from '@/components/business/booking/hooks/useBookingDrawerController'
import { usePermission } from '@/hooks/usePermission'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useTranslations } from 'next-intl'
import BusinessBookingListRow, {
    combineBookingDateTimeStart,
} from '@/components/business/booking/BusinessBookingListRow'

function isRecentBlockLike(b) {
    const et = b?.event_type
    if (et === 'block' || et === 'task') return true
    const sid = b?.service_id
    const hasService = sid != null && String(sid).trim() !== ''
    return !!(b?.title && !hasService)
}

const RecentBookings = () => {
    const router = useRouter()
    const queryClient = useQueryClient()
    const t = useTranslations('business.dashboard.recentBookings')
    const tSchedule = useTranslations('business.schedule.statuses')
    const tScheduleRoot = useTranslations('business.schedule')
    const tCommon = useTranslations('business.common')
    const tBookings = useTranslations('business.bookings')
    const canManageSchedule = usePermission('manage_schedule')

    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ['business-recent-bookings'],
        queryFn: () => getRecentBookings(5),
    })

    const { data: slots = [], refetch: refetchScheduleSlots } = useQuery({
        queryKey: ['business-schedule-slots'],
        queryFn: getScheduleSlots,
    })

    const refetchSlots = async () => {
        await refetchScheduleSlots()
        await queryClient.invalidateQueries({ queryKey: ['business-recent-bookings'] })
    }

    const drawer = useBookingDrawerController({ refetchSlots })

    const clientFallback = tScheduleRoot('modal.labels.client')

    const getStatusLabel = (status) => {
        const key = status || 'new'
        return tSchedule(key)
    }

    const openBookingDrawer = async (bookingId) => {
        const id = String(bookingId)
        let list = Array.isArray(slots) ? slots : []
        let slot = list.find((s) => String(s.id) === id)
        if (!slot) {
            const res = await refetchScheduleSlots()
            list = Array.isArray(res.data) ? res.data : list
            slot = list.find((s) => String(s.id) === id)
        }
        if (slot) {
            drawer.openForSlot(slot)
            return
        }
        toast.push(
            <Notification title={tCommon('error')} type="danger">
                {tBookings('openDrawerError')}
            </Notification>,
            { placement: 'top-end' },
        )
    }

    const goToScheduleDay = (bookingId, e) => {
        e.stopPropagation()
        router.push(`/business/schedule?openBookingId=${bookingId}`)
    }

    if (isLoading) {
        return (
            <Card>
                <div className="flex items-center justify-center py-12">
                    <Loading loading />
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-4 sm:mb-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                <Button
                    size="sm"
                    variant="outline"
                    className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 sm:w-auto"
                    onClick={() => router.push('/business/bookings')}
                >
                    <PiListBullets className="text-base shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />
                    {t('viewAll')}
                </Button>
            </div>
            {bookings.length === 0 ? (
                <EmptyStatePanel
                    icon={PiCalendarBlank}
                    title={t('emptyTitle')}
                    hint={t('emptyHint')}
                />
            ) : (
                <div className="grid gap-1.5 sm:gap-2">
                    {bookings.map((booking) => {
                        const st = booking.status || 'new'
                        const total = Number(booking.amount) || 0
                        const currency = booking.currency || 'USD'
                        const isBlockLike = isRecentBlockLike(booking)
                        const clientName = isBlockLike
                            ? '—'
                            : (booking.customer || clientFallback)
                        const serviceLabel = isBlockLike
                            ? (booking.title || booking.service || '—')
                            : (booking.service || '—')
                        const spec = booking.specialist_name || '—'
                        const headline = isBlockLike
                            ? (booking.title || serviceLabel || '—')
                            : (clientName || serviceLabel || '—')
                        const start = combineBookingDateTimeStart(booking.date, booking.time)

                        return (
                            <BusinessBookingListRow
                                key={booking.id}
                                start={start}
                                rowId={String(booking.id)}
                                headline={headline}
                                serviceLabel={serviceLabel}
                                spec={spec}
                                isBlockLike={isBlockLike}
                                executionType={booking.execution_type || 'onsite'}
                                total={total}
                                currency={currency}
                                status={st}
                                statusLabel={getStatusLabel(st)}
                                paymentStatus={booking.payment_status}
                                platformFee={booking.platform_fee ?? null}
                                netAmount={booking.net_amount ?? null}
                                includedInRoute={false}
                                recurringChainId={booking.recurring_chain_id ?? null}
                                onRowClick={() => openBookingDrawer(booking.id)}
                                onOpenInSchedule={(e) => goToScheduleDay(booking.id, e)}
                            />
                        )
                    })}
                </div>
            )}
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
        </Card>
    )
}

export default RecentBookings

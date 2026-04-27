'use client'

import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getScheduleSlots } from '@/lib/api/business'
import BookingDrawer from '@/components/business/booking/BookingDrawer'
import { useBookingDrawerController } from '@/components/business/booking/hooks/useBookingDrawerController'
import { usePermission } from '@/hooks/usePermission'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import {
    PiArrowRight,
    PiCalendar,
    PiCalendarBlank,
    PiCalendarDuotone,
    PiClock,
    PiCreditCardFill,
    PiCurrencyDollar,
    PiPackage,
    PiUser,
    PiMapPinFill,
    PiArrowsClockwise,
} from 'react-icons/pi'
import classNames from '@/utils/classNames'
import { getStatusPalette } from '@/app/business/schedule/_components/ScheduleEventContent'
import { formatDate, formatTime } from '@/utils/dateTime'
import Button from '@/components/ui/Button'
import OffsiteExecutionBadge from '@/components/shared/OffsiteExecutionBadge'
import EmptyStatePanel from '@/components/shared/EmptyStatePanel'

/**
 * Список бронирований клиента — тот же визуальный язык, что «Бронирования» и агенда расписания:
 * цветная полоска статуса, карточка-кнопка, колонки дата/время / услуга / специалист / сумма / статус.
 */
export default function ClientBookingsTabList({ clientId, bookings = [], timezone }) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const locale = useLocale()
    const t = useTranslations('business.clients')
    const tBookings = useTranslations('business.bookings')
    const tCommon = useTranslations('business.common')
    const canManageSchedule = usePermission('manage_schedule')
    const tSchedule = useTranslations('business.schedule.statuses')
    const tScheduleBadges = useTranslations('business.schedule.badges')

    const getStatusLabel = (status) => tSchedule(status || 'new')

    const { data: slots = [], refetch: refetchScheduleSlots } = useQuery({
        queryKey: ['business-schedule-slots'],
        queryFn: getScheduleSlots,
    })

    const refetchSlots = async () => {
        await refetchScheduleSlots()
        if (clientId != null) {
            await queryClient.invalidateQueries({ queryKey: ['client-details', clientId] })
        }
    }

    const drawer = useBookingDrawerController({ refetchSlots })

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

    const openInSchedule = (bookingId, e) => {
        e.stopPropagation()
        router.push(`/business/schedule?openBookingId=${bookingId}`)
    }

    const bookingDrawer = (
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
            onPatchSlot={drawer.patchSlot}
        />
    )

    if (!bookings.length) {
        return (
            <>
                <EmptyStatePanel
                    icon={PiCalendarBlank}
                    title={t('detailsPage.bookings.emptyTitle')}
                    hint={t('detailsPage.bookings.emptyHint')}
                />
                {bookingDrawer}
            </>
        )
    }

    return (
        <>
        <div className="grid gap-1.5 sm:gap-2">
            {bookings.map((booking) => {
                const st = booking.status || 'new'
                const palette = getStatusPalette(st)
                const isCancelled = st === 'cancelled'
                const bookingCurrency = booking.currency || 'USD'

                const additionalServices = booking.additional_services || []
                const basePrice = parseFloat(booking.price || 0)
                const additionalTotal = additionalServices.reduce((sum, item) => {
                    const price = parseFloat(item.pivot?.price || item.price || 0)
                    const quantity = parseInt(item.pivot?.quantity || item.quantity || 1, 10)
                    return sum + price * quantity
                }, 0)
                const totalPrice = parseFloat(booking.total_price || basePrice + additionalTotal)

                const amountLabel =
                    totalPrice > 0
                        ? new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: bookingCurrency,
                              minimumFractionDigits: 2,
                          }).format(totalPrice)
                        : '—'

                const serviceLabel = booking.service?.name || t('detailsPage.bookings.serviceNotSpecified')
                const specialistName = booking.specialist?.name || '—'
                const paymentStatus = booking.payment_status
                const isPaidOnline =
                    paymentStatus === 'paid' || paymentStatus === 'authorized'
                const isCardReserved =
                    paymentStatus === 'reserved' || paymentStatus === 'requires_capture'
                const isInRoute = !!booking.included_in_route
                const isRecurring = !!booking.recurring_chain_id

                const dateRaw = booking.booking_date
                const timeRaw = booking.booking_time

                return (
                    <button
                        type="button"
                        key={booking.id}
                        onClick={() => openBookingDrawer(booking.id)}
                        className={classNames(
                            'relative flex w-full cursor-pointer items-stretch overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 sm:rounded-xl',
                            isCancelled && 'opacity-60',
                        )}
                    >
                        <span className={classNames('w-1 shrink-0 sm:w-1.5', palette.accent)} aria-hidden />

                        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2 sm:flex-row sm:items-center sm:gap-4 sm:p-3">
                            <div className="flex items-center gap-2 min-w-0 sm:hidden">
                                <span className="inline-flex min-w-0 items-center gap-1 text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                    <PiCalendar className="text-sm shrink-0 text-gray-400 dark:text-gray-500" />
                                    <span className="truncate">
                                        {dateRaw ? formatDate(dateRaw, timezone, 'numeric') : '—'}
                                    </span>
                                </span>
                                <span
                                    className="shrink-0 text-[11px] font-bold text-gray-300 dark:text-gray-600"
                                    aria-hidden
                                >
                                    ·
                                </span>
                                <span
                                    className={classNames(
                                        'inline-flex shrink-0 items-center gap-1 text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100',
                                        isCancelled && 'line-through',
                                    )}
                                >
                                    <PiClock className="text-sm shrink-0 text-gray-400 dark:text-gray-500" />
                                    {timeRaw ? formatTime(timeRaw, timezone, locale) : '—'}
                                </span>
                            </div>

                            <div className="hidden w-full shrink-0 flex-col gap-1 sm:flex sm:w-48">
                                <span className="inline-flex items-center gap-1.5 text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                    <PiCalendar className="text-base shrink-0 text-gray-400 dark:text-gray-500" />
                                    {dateRaw ? formatDate(dateRaw, timezone, 'short') : '—'}
                                </span>
                                <span
                                    className={classNames(
                                        'inline-flex items-center gap-1.5 text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100',
                                        isCancelled && 'line-through',
                                    )}
                                >
                                    <PiClock className="text-base shrink-0 text-gray-400 dark:text-gray-500" />
                                    {timeRaw ? formatTime(timeRaw, timezone, locale) : '—'}
                                </span>
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                                    <span className="shrink-0 text-[11px] font-bold tabular-nums text-gray-500 dark:text-gray-400 sm:text-xs">
                                        #{booking.id}
                                    </span>
                                    <span
                                        className={classNames(
                                            'min-w-0 truncate text-sm font-bold text-gray-900 dark:text-gray-100 max-sm:leading-tight',
                                            isCancelled && 'line-through',
                                        )}
                                    >
                                        {serviceLabel}
                                    </span>
                                    <div className="flex shrink-0 items-center gap-1">
                                        {isPaidOnline && (
                                            <span
                                                title={tBookings('paidOnline')}
                                                className="flex h-4 w-4 items-center justify-center rounded bg-emerald-500 text-white"
                                                aria-label={tBookings('paidOnline')}
                                            >
                                                <PiCreditCardFill className="text-[10px]" />
                                            </span>
                                        )}
                                        {!isPaidOnline && isCardReserved && (
                                            <span
                                                title={tScheduleBadges('cardReserved')}
                                                className="flex h-4 w-4 items-center justify-center rounded bg-amber-500 text-white"
                                                aria-label={tScheduleBadges('cardReserved')}
                                            >
                                                <PiCreditCardFill className="text-[10px]" />
                                            </span>
                                        )}
                                        {isInRoute && (
                                            <span
                                                title={tScheduleBadges('inRoute')}
                                                className="flex h-4 w-4 items-center justify-center rounded bg-primary text-white"
                                                aria-hidden
                                            >
                                                <PiMapPinFill className="text-[10px]" />
                                            </span>
                                        )}
                                        {isRecurring && (
                                            <span
                                                title={tScheduleBadges('recurring')}
                                                className="flex h-4 w-4 items-center justify-center rounded bg-purple-500 text-white"
                                                aria-hidden
                                            >
                                                <PiArrowsClockwise className="text-[10px]" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 sm:text-xs">
                                    <span className="inline-flex min-w-0 items-center gap-1 truncate">
                                        <PiPackage className="shrink-0 text-sm text-gray-400 dark:text-gray-500" aria-hidden />
                                        <span className="truncate">{serviceLabel}</span>
                                    </span>
                                    {(booking.execution_type || 'onsite') === 'offsite' && (
                                        <OffsiteExecutionBadge label={tCommon('offsite')} />
                                    )}
                                    <span className="inline-flex shrink-0 items-center gap-1">
                                        <PiUser className="text-sm text-gray-400 dark:text-gray-500" aria-hidden />
                                        {specialistName}
                                    </span>
                                </div>
                            </div>

                            <div className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1.5 sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-3">
                                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:justify-end">
                                    {totalPrice > 0 ? (
                                        <span className="inline-flex items-center gap-0.5 text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100 sm:text-sm sm:gap-1">
                                            <PiCurrencyDollar className="text-sm text-emerald-500 sm:text-base" />
                                            {amountLabel}
                                        </span>
                                    ) : (
                                        <span className="text-xs font-bold tabular-nums text-gray-400 dark:text-gray-500 sm:text-sm">
                                            —
                                        </span>
                                    )}
                                    <span
                                        className={classNames(
                                            'inline-flex shrink-0 items-center rounded-full px-2 py-px text-[10px] font-bold sm:px-2.5 sm:py-0.5 sm:text-[11px]',
                                            palette.bg,
                                            palette.text,
                                        )}
                                    >
                                        {getStatusLabel(st)}
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    size="xs"
                                    variant="plain"
                                    title={tBookings('openInSchedule')}
                                    aria-label={tBookings('openInSchedule')}
                                    className="inline-flex shrink-0 items-center justify-center gap-0.5 self-end sm:self-center p-1.5 sm:p-2"
                                    onClick={(e) => openInSchedule(booking.id, e)}
                                >
                                    <PiCalendarDuotone
                                        className="text-xl shrink-0 text-gray-500 dark:text-gray-400"
                                        aria-hidden
                                    />
                                    <PiArrowRight
                                        className="text-sm shrink-0 text-gray-400 dark:text-gray-500 sm:text-base"
                                        aria-hidden
                                    />
                                </Button>
                            </div>
                        </div>
                    </button>
                )
            })}
        </div>
        {bookingDrawer}
        </>
    )
}

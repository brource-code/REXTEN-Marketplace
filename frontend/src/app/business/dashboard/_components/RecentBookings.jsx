'use client'

import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import {
    PiCalendar,
    PiCalendarBlank,
    PiClock,
    PiCreditCardFill,
    PiCurrencyDollar,
    PiListBullets,
    PiPackage,
    PiUser,
} from 'react-icons/pi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRecentBookings, getScheduleSlots } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import EmptyStatePanel from '@/components/shared/EmptyStatePanel'
import BookingDrawer from '@/components/business/booking/BookingDrawer'
import { useBookingDrawerController } from '@/components/business/booking/hooks/useBookingDrawerController'
import { usePermission } from '@/hooks/usePermission'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import OffsiteExecutionBadge from '@/components/shared/OffsiteExecutionBadge'
import { useTranslations } from 'next-intl'
import { formatDate, formatTime } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'
import classNames from '@/utils/classNames'
import { getStatusPalette } from '@/app/business/schedule/_components/ScheduleEventContent'

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
    const tScheduleBadges = useTranslations('business.schedule.badges')
    const { settings } = useBusinessStore()
    const timezone = settings?.timezone || 'America/Los_Angeles'

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
                        const palette = getStatusPalette(st)
                        const isCancelled = st === 'cancelled'
                        const total = Number(booking.amount) || 0
                        const currency = 'USD'
                        const amountLabel =
                            total > 0
                                ? new Intl.NumberFormat('en-US', {
                                      style: 'currency',
                                      currency,
                                      minimumFractionDigits: 2,
                                  }).format(total)
                                : '—'
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

                        const isPaidOnline =
                            booking.payment_status === 'paid' ||
                            booking.payment_status === 'authorized'
                        const isCardReserved =
                            booking.payment_status === 'reserved' ||
                            booking.payment_status === 'requires_capture'

                        return (
                            <div
                                role="button"
                                tabIndex={0}
                                key={booking.id}
                                onClick={() => openBookingDrawer(booking.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        openBookingDrawer(booking.id)
                                    }
                                }}
                                className={classNames(
                                    'group relative flex w-full cursor-pointer items-stretch overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 text-left transition-all hover:shadow-md sm:rounded-xl sm:hover:-translate-y-0.5',
                                    isCancelled && 'opacity-60',
                                )}
                            >
                                <span
                                    className={classNames('w-1 shrink-0 sm:w-1.5', palette.accent)}
                                    aria-hidden
                                />
                                <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2 sm:flex-row sm:items-center sm:gap-4 sm:p-3">
                                    <div className="flex min-w-0 items-center gap-2 sm:hidden">
                                        <span className="inline-flex min-w-0 items-center gap-1 text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                            <PiCalendar className="text-sm shrink-0 text-gray-400 dark:text-gray-500" />
                                            <span className="truncate">
                                                {formatDate(booking.date, timezone, 'numeric')}
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
                                            {formatTime(booking.time, timezone)}
                                        </span>
                                    </div>

                                    <div className="hidden w-full shrink-0 flex-col gap-1 sm:flex sm:w-48">
                                        <span className="inline-flex items-center gap-1.5 text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                            <PiCalendar className="text-base shrink-0 text-gray-400 dark:text-gray-500" />
                                            {formatDate(booking.date, timezone, 'short')}
                                        </span>
                                        <span
                                            className={classNames(
                                                'inline-flex items-center gap-1.5 text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100',
                                                isCancelled && 'line-through',
                                            )}
                                        >
                                            <PiClock className="text-base shrink-0 text-gray-400 dark:text-gray-500" />
                                            {formatTime(booking.time, timezone)}
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
                                                {headline}
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
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 sm:text-xs">
                                            {!isBlockLike && (
                                                <span className="inline-flex min-w-0 items-center gap-1 truncate">
                                                    <PiPackage
                                                        className="shrink-0 text-sm text-gray-400 dark:text-gray-500"
                                                        aria-hidden
                                                    />
                                                    <span className="truncate">{serviceLabel}</span>
                                                </span>
                                            )}
                                            {(booking.execution_type || 'onsite') === 'offsite' && (
                                                <OffsiteExecutionBadge label={tCommon('offsite')} />
                                            )}
                                            <span className="inline-flex shrink-0 items-center gap-1">
                                                <PiUser
                                                    className="text-sm text-gray-400 dark:text-gray-500"
                                                    aria-hidden
                                                />
                                                {spec}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1.5 sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-3">
                                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:justify-end">
                                            {total > 0 ? (
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
                                            className="inline-flex shrink-0 items-center gap-1 self-end sm:self-center max-sm:px-1.5 max-sm:py-1"
                                            onClick={(e) => goToScheduleDay(booking.id, e)}
                                        >
                                            <PiCalendarBlank
                                                className="text-base text-gray-500 dark:text-gray-400 sm:hidden"
                                                aria-hidden
                                            />
                                            <span className="hidden sm:inline whitespace-nowrap">
                                                {tBookings('openInSchedule')}
                                            </span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
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

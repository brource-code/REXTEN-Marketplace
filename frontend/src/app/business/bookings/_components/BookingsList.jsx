'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dayjs from 'dayjs'
import { useQuery } from '@tanstack/react-query'
import { getScheduleSlots, getBusinessServices } from '@/lib/api/business'
import { useTranslations } from 'next-intl'
import { usePermission } from '@/hooks/usePermission'
import BookingDrawer from '@/components/business/booking/BookingDrawer'
import { useBookingDrawerController } from '@/components/business/booking/hooks/useBookingDrawerController'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Pagination from '@/components/ui/Pagination'
import {
    PiCalendar,
    PiCalendarBlank,
    PiClock,
    PiCreditCardFill,
    PiCurrencyDollar,
    PiMagnifyingGlass,
    PiMapPinFill,
    PiArrowsClockwise,
    PiPackage,
    PiSlidersHorizontal,
    PiUser,
} from 'react-icons/pi'
import classNames from '@/utils/classNames'
import EmptyStatePanel from '@/components/shared/EmptyStatePanel'
import { getStatusPalette } from '@/app/business/schedule/_components/ScheduleEventContent'
import { formatDate, formatTime } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'
import { resolveSlotServiceName } from '@/utils/schedule/resolveSlotServiceName'
import { isScheduleBlockOrCustomSlot } from '@/utils/schedule/isScheduleBlockOrCustomSlot'
import { getScheduleSlotMonetaryTotal } from '@/utils/schedule/slotMonetaryTotal'
import Loading from '@/components/shared/Loading'
import OffsiteExecutionBadge from '@/components/shared/OffsiteExecutionBadge'

const STATUS_KEYS = ['new', 'pending', 'confirmed', 'completed', 'cancelled']
const PAGE_SIZE_OPTIONS = [10, 25, 50]

export default function BookingsList() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const urlBookingId = searchParams.get('bookingId')
    const t = useTranslations('business.bookings')
    const tCommon = useTranslations('business.common')
    const tSchedule = useTranslations('business.schedule.statuses')
    const tScheduleRoot = useTranslations('business.schedule')
    const tScheduleBadges = useTranslations('business.schedule.badges')
    const { settings } = useBusinessStore()
    const timezone = settings?.timezone || 'America/Los_Angeles'
    const canManageSchedule = usePermission('manage_schedule')

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [pageIndex, setPageIndex] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const { data: slots = [], isLoading, refetch: refetchSlots } = useQuery({
        queryKey: ['business-schedule-slots'],
        queryFn: getScheduleSlots,
    })

    const { data: services = [] } = useQuery({
        queryKey: ['business-services'],
        queryFn: getBusinessServices,
    })

    const drawer = useBookingDrawerController({ refetchSlots })

    const statusFilterOptions = useMemo(
        () => [
            { value: '', label: t('statusAll') },
            ...STATUS_KEYS.map((k) => ({ value: k, label: tSchedule(k) })),
        ],
        [t, tSchedule],
    )

    const statusFilterValue = useMemo(
        () => statusFilterOptions.find((o) => o.value === statusFilter) ?? statusFilterOptions[0],
        [statusFilterOptions, statusFilter],
    )

    const pageSizeSelectOptions = useMemo(
        () =>
            PAGE_SIZE_OPTIONS.map((n) => ({
                value: n,
                label: t('perPage', { count: n }),
            })),
        [t],
    )

    const pageSizeSelectValue = useMemo(
        () => pageSizeSelectOptions.find((o) => o.value === pageSize) ?? pageSizeSelectOptions[0],
        [pageSizeSelectOptions, pageSize],
    )

    const openedFromUrl = useRef(false)
    useEffect(() => {
        if (!urlBookingId) {
            openedFromUrl.current = false
            return
        }
        if (!slots.length || openedFromUrl.current) return
        const id = String(urlBookingId)
        const slot = slots.find((s) => String(s.id) === id)
        if (slot) {
            openedFromUrl.current = true
            drawer.openForSlot(slot)
            router.replace('/business/bookings', { scroll: false })
        }
    }, [urlBookingId, slots, router, drawer])

    useEffect(() => {
        setPageIndex(1)
    }, [search, statusFilter, pageSize])

    const getStatusLabel = (status) => {
        const key = status || 'new'
        return tSchedule(key)
    }

    const clientFallback = tScheduleRoot('modal.labels.client')

    const filteredSlots = useMemo(() => {
        const q = search.trim().toLowerCase()
        let list = [...slots]

        if (statusFilter) {
            list = list.filter((s) => (s.status || 'new') === statusFilter)
        }

        if (q) {
            list = list.filter((slot) => {
                const name = (slot.client?.name || slot.client_name || '').toLowerCase()
                const email = (slot.client?.email || slot.client_email || '').toLowerCase()
                const phone = (slot.client?.phone || slot.client_phone || '').toLowerCase()
                const serviceName = (resolveSlotServiceName(slot, services) || '').toLowerCase()
                const title = (slot.title || '').toLowerCase()
                return (
                    name.includes(q) ||
                    email.includes(q) ||
                    phone.includes(q) ||
                    serviceName.includes(q) ||
                    title.includes(q) ||
                    String(slot.id).includes(q)
                )
            })
        }

        list.sort((a, b) => {
            const ta = dayjs(a.start).valueOf()
            const tb = dayjs(b.start).valueOf()
            return tb - ta
        })

        return list
    }, [slots, statusFilter, search, services])

    const totalFiltered = filteredSlots.length
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize) || 1)

    useEffect(() => {
        if (pageIndex > totalPages) {
            setPageIndex(totalPages)
        }
    }, [pageIndex, totalPages])

    const paginatedSlots = useMemo(() => {
        const start = (pageIndex - 1) * pageSize
        return filteredSlots.slice(start, start + pageSize)
    }, [filteredSlots, pageIndex, pageSize])

    const openSlot = (slot) => {
        drawer.openForSlot(slot)
    }

    const goToScheduleDay = (slot, e) => {
        e.stopPropagation()
        router.push(`/business/schedule?openBookingId=${slot.id}`)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[320px]">
                <Loading loading />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center gap-1.5"
                        onClick={() => router.push('/business/schedule')}
                    >
                        <PiCalendarBlank className="text-base shrink-0 text-gray-500 dark:text-gray-400" />
                        {t('scheduleCalendar')}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-2.5 lg:items-end">
                <Input
                    className="lg:flex-1"
                    placeholder={t('searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    prefix={<PiMagnifyingGlass className="text-lg text-gray-400 dark:text-gray-500" aria-hidden />}
                />
                <div className="flex flex-col gap-1.5 w-full lg:w-72 shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 dark:text-gray-400">
                        <PiSlidersHorizontal className="text-base shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
                        {t('statusLabel')}
                    </span>
                    <Select
                        size="sm"
                        isSearchable={false}
                        className="min-w-0"
                        options={statusFilterOptions}
                        value={statusFilterValue}
                        onChange={(opt) => setStatusFilter(opt?.value ?? '')}
                    />
                </div>
            </div>

            {filteredSlots.length === 0 ? (
                <EmptyStatePanel
                    icon={PiCalendarBlank}
                    title={t('emptyTitle')}
                    hint={t('emptyHint')}
                />
            ) : (
                <>
                    {/* Тот же визуальный язык, что у списка «Агенда» в расписании: полоска статуса, карточка, hover */}
                    <div className="grid gap-1.5 sm:gap-2">
                        {paginatedSlots.map((slot) => {
                            const st = slot.status || 'new'
                            const palette = getStatusPalette(st)
                            const isCancelled = st === 'cancelled'
                            const total = getScheduleSlotMonetaryTotal(slot)
                            const currency = slot.currency || 'USD'
                            const amountLabel =
                                total > 0
                                    ? new Intl.NumberFormat('en-US', {
                                          style: 'currency',
                                          currency,
                                          minimumFractionDigits: 2,
                                      }).format(total)
                                    : '—'
                            const isBlockLike = isScheduleBlockOrCustomSlot(slot)
                            const clientName = isBlockLike
                                ? '—'
                                : (slot.client?.name || slot.client_name || clientFallback)
                            const serviceLabel = isBlockLike
                                ? (slot.title || '—')
                                : (resolveSlotServiceName(slot, services) || '—')
                            const spec = slot.specialist?.name || slot.specialistName || '—'
                            const headline = isBlockLike
                                ? (slot.title || serviceLabel || '—')
                                : (clientName || serviceLabel || '—')

                            const isPaidOnline =
                                slot.payment_status === 'paid' ||
                                slot.payment_status === 'authorized'
                            const isCardReserved =
                                slot.payment_status === 'reserved' ||
                                slot.payment_status === 'requires_capture'
                            const isInRoute = !!slot.included_in_route
                            const isRecurring = !!slot.recurring_chain_id

                            const feeLine =
                                isPaidOnline &&
                                slot.platform_fee != null &&
                                slot.net_amount != null ? (
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                        {t('feeLine', {
                                            fee: new Intl.NumberFormat('en-US', {
                                                style: 'currency',
                                                currency,
                                                minimumFractionDigits: 2,
                                            }).format(slot.platform_fee),
                                            net: new Intl.NumberFormat('en-US', {
                                                style: 'currency',
                                                currency,
                                                minimumFractionDigits: 2,
                                            }).format(slot.net_amount),
                                        })}
                                    </span>
                                ) : null

                            return (
                                <button
                                    type="button"
                                    key={slot.id}
                                    onClick={() => openSlot(slot)}
                                    className={classNames(
                                        'group relative flex w-full items-stretch overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 text-left transition-all hover:shadow-md sm:rounded-xl sm:hover:-translate-y-0.5',
                                        isCancelled && 'opacity-60',
                                    )}
                                >
                                    <span
                                        className={classNames('w-1 shrink-0 sm:w-1.5', palette.accent)}
                                        aria-hidden
                                    />
                                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2 sm:flex-row sm:items-center sm:gap-4 sm:p-3">
                                        <div className="flex items-center gap-2 min-w-0 sm:hidden">
                                            <span className="inline-flex min-w-0 items-center gap-1 text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                                <PiCalendar className="text-sm shrink-0 text-gray-400 dark:text-gray-500" />
                                                <span className="truncate">
                                                    {formatDate(slot.start, timezone, 'numeric')}
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
                                                {formatTime(slot.start, timezone)}
                                            </span>
                                        </div>

                                        <div className="hidden w-full shrink-0 flex-col gap-1 sm:flex sm:w-48">
                                            <span className="inline-flex items-center gap-1.5 text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                                <PiCalendar className="text-base shrink-0 text-gray-400 dark:text-gray-500" />
                                                {formatDate(slot.start, timezone, 'short')}
                                            </span>
                                            <span
                                                className={classNames(
                                                    'inline-flex items-center gap-1.5 text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100',
                                                    isCancelled && 'line-through',
                                                )}
                                            >
                                                <PiClock className="text-base shrink-0 text-gray-400 dark:text-gray-500" />
                                                {formatTime(slot.start, timezone)}
                                            </span>
                                        </div>

                                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                                                <span className="shrink-0 text-[11px] font-bold tabular-nums text-gray-500 dark:text-gray-400 sm:text-xs">
                                                    #{slot.id}
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
                                                            title={t('paidOnline')}
                                                            className="flex h-4 w-4 items-center justify-center rounded bg-emerald-500 text-white"
                                                            aria-label={t('paidOnline')}
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
                                                {!isBlockLike && (
                                                    <span className="inline-flex min-w-0 items-center gap-1 truncate">
                                                        <PiPackage className="shrink-0 text-sm text-gray-400 dark:text-gray-500" aria-hidden />
                                                        <span className="truncate">{serviceLabel}</span>
                                                    </span>
                                                )}
                                                {(slot.execution_type || 'onsite') === 'offsite' && (
                                                    <OffsiteExecutionBadge label={tCommon('offsite')} />
                                                )}
                                                <span className="inline-flex shrink-0 items-center gap-1">
                                                    <PiUser className="text-sm text-gray-400 dark:text-gray-500" aria-hidden />
                                                    {spec}
                                                </span>
                                            </div>
                                            {feeLine ? <div className="pt-0.5 max-sm:leading-snug">{feeLine}</div> : null}
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
                                                title={t('openInSchedule')}
                                                aria-label={t('openInSchedule')}
                                                className="inline-flex shrink-0 items-center gap-1 self-end sm:self-center max-sm:px-1.5 max-sm:py-1"
                                                onClick={(e) => goToScheduleDay(slot, e)}
                                            >
                                                <PiCalendarBlank className="text-base text-gray-500 dark:text-gray-400 sm:hidden" aria-hidden />
                                                <span className="hidden sm:inline whitespace-nowrap">
                                                    {t('openInSchedule')}
                                                </span>
                                            </Button>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Pagination
                            pageSize={pageSize}
                            currentPage={pageIndex}
                            total={totalFiltered}
                            onChange={(page) => setPageIndex(page)}
                        />
                        <Select
                            size="sm"
                            isSearchable={false}
                            menuPlacement="top"
                            className="min-w-[140px] sm:max-w-[200px]"
                            options={pageSizeSelectOptions}
                            value={pageSizeSelectValue}
                            onChange={(opt) => {
                                if (opt?.value) setPageSize(opt.value)
                            }}
                        />
                    </div>
                </>
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
        </div>
    )
}

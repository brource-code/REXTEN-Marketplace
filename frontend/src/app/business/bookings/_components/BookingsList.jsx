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
    PiArrowRight,
    PiCalendarBlank,
    PiCalendarDuotone,
    PiMagnifyingGlass,
    PiSlidersHorizontal,
} from 'react-icons/pi'
import EmptyStatePanel from '@/components/shared/EmptyStatePanel'
import BusinessBookingListRow from '@/components/business/booking/BusinessBookingListRow'
import { resolveSlotServiceName } from '@/utils/schedule/resolveSlotServiceName'
import { isScheduleBlockOrCustomSlot } from '@/utils/schedule/isScheduleBlockOrCustomSlot'
import { getScheduleSlotMonetaryTotal } from '@/utils/schedule/slotMonetaryTotal'
import Loading from '@/components/shared/Loading'

const STATUS_KEYS = ['new', 'pending', 'confirmed', 'completed', 'cancelled']
const PAGE_SIZE_OPTIONS = [10, 25, 50]

export default function BookingsList() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const urlBookingId = searchParams.get('bookingId')
    const t = useTranslations('business.bookings')
    const tSchedule = useTranslations('business.schedule.statuses')
    const tScheduleRoot = useTranslations('business.schedule')
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
                        title={t('scheduleCalendar')}
                        aria-label={t('scheduleCalendar')}
                        className="inline-flex items-center justify-center gap-0.5 p-2 sm:p-2.5"
                        onClick={() => router.push('/business/schedule')}
                    >
                        <PiCalendarDuotone className="text-xl shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />
                        <PiArrowRight
                            className="text-sm shrink-0 text-gray-400 dark:text-gray-500 sm:text-base"
                            aria-hidden
                        />
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
                            const total = getScheduleSlotMonetaryTotal(slot)
                            const currency = slot.currency || 'USD'
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

                            return (
                                <BusinessBookingListRow
                                    key={slot.id}
                                    start={slot.start}
                                    rowId={String(slot.id)}
                                    headline={headline}
                                    serviceLabel={serviceLabel}
                                    spec={spec}
                                    isBlockLike={isBlockLike}
                                    executionType={slot.execution_type || 'onsite'}
                                    total={total}
                                    currency={currency}
                                    status={st}
                                    statusLabel={getStatusLabel(st)}
                                    paymentStatus={slot.payment_status}
                                    platformFee={slot.platform_fee ?? null}
                                    netAmount={slot.net_amount ?? null}
                                    includedInRoute={!!slot.included_in_route}
                                    recurringChainId={slot.recurring_chain_id ?? null}
                                    onRowClick={() => openSlot(slot)}
                                    onOpenInSchedule={(e) => goToScheduleDay(slot, e)}
                                />
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
                onPatchSlot={drawer.patchSlot}
            />
        </div>
    )
}

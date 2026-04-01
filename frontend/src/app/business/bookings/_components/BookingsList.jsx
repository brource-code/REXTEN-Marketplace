'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dayjs from 'dayjs'
import { useQuery } from '@tanstack/react-query'
import { getScheduleSlots, getBusinessServices } from '@/lib/api/business'
import { useTranslations } from 'next-intl'
import { usePermission } from '@/hooks/usePermission'
import { useBusinessScheduleSlotModalController } from '@/hooks/useBusinessScheduleSlotModalController'
import ScheduleSlotModal from '@/app/business/schedule/_components/ScheduleSlotModal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import Select from '@/components/ui/Select'
import Pagination from '@/components/ui/Pagination'
import { PiCalendar, PiClock } from 'react-icons/pi'
import { formatDate, formatTime } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'
import { resolveSlotServiceName } from '@/utils/schedule/resolveSlotServiceName'
import { getScheduleSlotMonetaryTotal } from '@/utils/schedule/slotMonetaryTotal'
import Loading from '@/components/shared/Loading'

const { Tr, Td, TBody, THead, Th } = Table

const bookingStatusColor = {
    new: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100',
    pending: 'bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100',
    confirmed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100',
}

const STATUS_KEYS = ['new', 'pending', 'confirmed', 'completed', 'cancelled']
const PAGE_SIZE_OPTIONS = [10, 25, 50]

export default function BookingsList() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const urlBookingId = searchParams.get('bookingId')
    const t = useTranslations('business.bookings')
    const tSchedule = useTranslations('business.schedule.statuses')
    const tScheduleRoot = useTranslations('business.schedule')
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

    const {
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
    } = useBusinessScheduleSlotModalController({ refetchSlots })

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
            setSelectedSlot({ type: 'EDIT', ...slot })
            setDialogOpen(true)
            router.replace('/business/bookings', { scroll: false })
        }
    }, [urlBookingId, slots, router, setSelectedSlot, setDialogOpen])

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
        setSelectedSlot({ type: 'EDIT', ...slot })
        setDialogOpen(true)
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
                    <Button variant="outline" size="sm" onClick={() => router.push('/business/schedule')}>
                        {t('scheduleCalendar')}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
                <Input
                    className="lg:flex-1"
                    placeholder={t('searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <div className="flex flex-col gap-1.5 w-full lg:w-72 shrink-0">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('statusLabel')}</span>
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
                <div className="text-center py-12 text-sm font-bold text-gray-500 dark:text-gray-400">{t('empty')}</div>
            ) : (
                <>
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <Table>
                            <THead>
                                <Tr>
                                    <Th>{t('columns.id')}</Th>
                                    <Th>{t('columns.dateTime')}</Th>
                                    <Th>{t('columns.client')}</Th>
                                    <Th>{t('columns.service')}</Th>
                                    <Th>{t('columns.status')}</Th>
                                    <Th>{t('columns.specialist')}</Th>
                                    <Th>{t('columns.amount')}</Th>
                                    <Th>{t('openInSchedule')}</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {paginatedSlots.map((slot) => {
                                    const st = slot.status || 'new'
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
                                    const clientName = slot.client?.name || slot.client_name || clientFallback
                                    const serviceLabel = resolveSlotServiceName(slot, services) || '—'
                                    const spec =
                                        slot.specialist?.name || slot.specialistName || '—'

                                    return (
                                        <Tr
                                            key={slot.id}
                                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60"
                                            onClick={() => openSlot(slot)}
                                        >
                                            <Td>
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    #{slot.id}
                                                </span>
                                            </Td>
                                            <Td>
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <span className="inline-flex items-center gap-1 text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        <PiCalendar className="text-gray-400 shrink-0" />
                                                        {formatDate(slot.start, timezone, 'short')}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        <PiClock className="text-gray-400 shrink-0" />
                                                        {formatTime(slot.start, timezone)}
                                                    </span>
                                                </div>
                                            </Td>
                                            <Td>
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {clientName}
                                                </span>
                                            </Td>
                                            <Td>
                                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                    {serviceLabel}
                                                </span>
                                            </Td>
                                            <Td>
                                                <Tag className={bookingStatusColor[st] || bookingStatusColor.new}>
                                                    {getStatusLabel(st)}
                                                </Tag>
                                            </Td>
                                            <Td>
                                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                    {spec}
                                                </span>
                                            </Td>
                                            <Td>
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {amountLabel}
                                                </span>
                                            </Td>
                                            <Td>
                                                <Button
                                                    type="button"
                                                    size="xs"
                                                    variant="plain"
                                                    className="whitespace-nowrap"
                                                    onClick={(e) => goToScheduleDay(slot, e)}
                                                >
                                                    {t('openInSchedule')}
                                                </Button>
                                            </Td>
                                        </Tr>
                                    )
                                })}
                            </TBody>
                        </Table>
                    </div>

                    <div className="md:hidden space-y-3">
                        {paginatedSlots.map((slot) => {
                            const st = slot.status || 'new'
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
                            const clientName = slot.client?.name || slot.client_name || clientFallback
                            const serviceLabel = resolveSlotServiceName(slot, services) || '—'

                            return (
                                <Card
                                    key={slot.id}
                                    className="p-4 cursor-pointer border border-gray-200 dark:border-gray-700"
                                    onClick={() => openSlot(slot)}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            #{slot.id}
                                        </span>
                                        <Tag className={bookingStatusColor[st] || bookingStatusColor.new}>
                                            {getStatusLabel(st)}
                                        </Tag>
                                    </div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
                                        {formatDate(slot.start, timezone, 'short')} · {formatTime(slot.start, timezone)}
                                    </div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">{clientName}</div>
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{serviceLabel}</div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{amountLabel}</span>
                                        <Button
                                            type="button"
                                            size="xs"
                                            variant="plain"
                                            onClick={(e) => goToScheduleDay(slot, e)}
                                        >
                                            {t('openInSchedule')}
                                        </Button>
                                    </div>
                                </Card>
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

            <ScheduleSlotModal
                key={selectedSlot?.id ? `slot-${selectedSlot.id}` : 'slot-new'}
                isOpen={dialogOpen}
                onClose={closeModal}
                slot={selectedSlot}
                onSave={canManageSchedule ? handleSubmit : null}
                onDelete={canManageSchedule && selectedSlot?.id ? () => handleDelete(selectedSlot.id) : null}
                readOnly={!canManageSchedule}
            />
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                type="danger"
                title={tScheduleRoot('deleteConfirm.title')}
                onCancel={cancelDelete}
                onConfirm={handleConfirmDelete}
                confirmText={tScheduleRoot('deleteConfirm.confirm')}
                cancelText={tScheduleRoot('deleteConfirm.cancel')}
            >
                <p>{tScheduleRoot('deleteConfirm.message')}</p>
            </ConfirmDialog>
        </div>
    )
}

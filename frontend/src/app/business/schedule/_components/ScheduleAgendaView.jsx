'use client'

import { useMemo } from 'react'
import dayjs from 'dayjs'
import { useTranslations, useLocale } from 'next-intl'
import { PiCreditCardFill, PiMapPinFill, PiArrowsClockwise, PiUser, PiClock, PiCurrencyDollar, PiCalendarBlank } from 'react-icons/pi'
import classNames from '@/utils/classNames'
import { isScheduleBlockOrCustomSlot } from '@/utils/schedule/isScheduleBlockOrCustomSlot'
import { getStatusPalette, getSpecialistPalette } from './ScheduleEventContent'

const formatRangeLabel = (slot, locale) => {
    const start = dayjs(slot.start)
    const end = dayjs(slot.end)
    const startFmt = start.toDate().toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true })
    const endFmt = end.toDate().toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${startFmt} – ${endFmt}`
}

const dayHeaderLabel = (date, t, locale) => {
    const today = dayjs().startOf('day')
    const d = date.startOf('day')
    if (d.isSame(today, 'day')) return t('todayLabel')
    if (d.isSame(today.add(1, 'day'), 'day')) return t('tomorrowLabel')
    if (d.isSame(today.subtract(1, 'day'), 'day')) return t('yesterdayLabel')
    return d.toDate().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
}

/**
 * Agenda (список) — современная альтернатива сетке для тех, кто работает с телефона
 * или просто хочет «что у меня сегодня и завтра».
 *
 * Группирует слоты по дате, показывает мини-итоги дня, кликабельные карточки.
 */
const ScheduleAgendaView = ({
    slots = [],
    dateRange,
    services = [],
    onEventClick,
    statusLabels = {},
    badgeLabels = {},
    colorMode = 'status',
    currencyFormatter,
    onCreateClick,
}) => {
    const t = useTranslations('business.schedule.agenda')
    const tCommon = useTranslations('business.schedule')
    const locale = useLocale()

    const grouped = useMemo(() => {
        if (!dateRange?.start || !dateRange?.end) return []

        const start = dayjs(dateRange.start).startOf('day')
        const end = dayjs(dateRange.end)

        const filtered = slots
            .filter((slot) => {
                const d = dayjs(slot.start)
                return !d.isBefore(start) && d.isBefore(end)
            })
            .sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf())

        const map = new Map()
        for (const slot of filtered) {
            const key = dayjs(slot.start).format('YYYY-MM-DD')
            if (!map.has(key)) map.set(key, [])
            map.get(key).push(slot)
        }

        return Array.from(map.entries()).map(([key, items]) => {
            const date = dayjs(key)
            const revenue = items
                .filter((s) => s.status !== 'cancelled')
                .reduce((sum, s) => sum + (Number(s.total_price ?? s.price) || 0), 0)
            return { key, date, items, revenue }
        })
    }, [slots, dateRange])

    if (grouped.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 px-6 py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                    <PiCalendarBlank className="text-3xl text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100">{t('noBookings')}</p>
                <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">{t('noBookingsHint')}</p>
                {onCreateClick && (
                    <button
                        type="button"
                        onClick={onCreateClick}
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-deep"
                    >
                        + {tCommon('newBooking')}
                    </button>
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            {grouped.map((group) => (
                <section key={group.key}>
                    <header className="mb-3 flex items-baseline justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-2">
                        <div className="flex items-baseline gap-3">
                            <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {dayHeaderLabel(group.date, t, locale)}
                            </h5>
                            <span className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                {group.date.toDate().toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tabular-nums">
                            {t('summary', {
                                count: group.items.length,
                                revenue: currencyFormatter ? currencyFormatter(group.revenue) : `$${group.revenue.toFixed(0)}`,
                            })}
                        </span>
                    </header>

                    <div className="grid gap-2">
                        {group.items.map((slot) => {
                            const palette = colorMode === 'specialist'
                                ? getSpecialistPalette(slot.specialist_id || slot.specialist?.id)
                                : getStatusPalette(slot.status || 'new')
                            const isCancelled = slot.status === 'cancelled'
                            const isPaidOnline = slot.payment_status === 'paid' || slot.payment_status === 'authorized'
                            const isCardReserved = slot.payment_status === 'reserved' || slot.payment_status === 'requires_capture'
                            const isInRoute = !!slot.included_in_route
                            const isRecurring = !!slot.recurring_chain_id
                            const isCustom = isScheduleBlockOrCustomSlot(slot)
                            const rawClientName = slot.client?.name || slot.client_name || ''
                            const clientName = isCustom ? '' : rawClientName
                            const serviceName = (() => {
                                if (isCustom) return ''
                                if (slot.service?.name) return slot.service.name
                                const found = services.find((s) => String(s.id) === String(slot.service_id))
                                return found?.name || t('noService')
                            })()
                            const specialistName = slot.specialist?.name || slot.specialistName || ''
                            const total = Number(slot.total_price ?? slot.price ?? 0)

                            return (
                                <button
                                    type="button"
                                    key={slot.id}
                                    onClick={() => onEventClick?.(slot)}
                                    className={classNames(
                                        'relative flex w-full cursor-pointer items-stretch overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                                        isCancelled && 'opacity-60',
                                    )}
                                >
                                    <span className={classNames('w-1.5 shrink-0', palette.accent)} aria-hidden />
                                    <div className="flex flex-1 flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4">
                                        <div className="flex w-full shrink-0 items-center gap-2 sm:w-44">
                                            <PiClock className="text-base text-gray-400 dark:text-gray-500" />
                                            <span
                                                className={classNames(
                                                    'text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100',
                                                    isCancelled && 'line-through',
                                                )}
                                            >
                                                {formatRangeLabel(slot, locale)}
                                            </span>
                                        </div>

                                        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span
                                                    className={classNames(
                                                        'truncate text-sm font-bold text-gray-900 dark:text-gray-100',
                                                        isCancelled && 'line-through',
                                                    )}
                                                >
                                                    {isCustom
                                                        ? (slot.title || serviceName || t('noService'))
                                                        : (clientName || serviceName || t('noService'))}
                                                </span>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    {isPaidOnline && (
                                                        <span title={badgeLabels.paidOnline} className="flex h-4 w-4 items-center justify-center rounded bg-emerald-500 text-white">
                                                            <PiCreditCardFill className="text-[10px]" />
                                                        </span>
                                                    )}
                                                    {!isPaidOnline && isCardReserved && (
                                                        <span title={badgeLabels.cardReserved} className="flex h-4 w-4 items-center justify-center rounded bg-amber-500 text-white">
                                                            <PiCreditCardFill className="text-[10px]" />
                                                        </span>
                                                    )}
                                                    {isInRoute && (
                                                        <span title={badgeLabels.inRoute} className="flex h-4 w-4 items-center justify-center rounded bg-primary text-white">
                                                            <PiMapPinFill className="text-[10px]" />
                                                        </span>
                                                    )}
                                                    {isRecurring && (
                                                        <span title={badgeLabels.recurring} className="flex h-4 w-4 items-center justify-center rounded bg-purple-500 text-white">
                                                            <PiArrowsClockwise className="text-[10px]" />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {serviceName && <span className="truncate">{serviceName}</span>}
                                                {specialistName ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <PiUser className="text-sm" />
                                                        {specialistName}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 italic opacity-70">
                                                        <PiUser className="text-sm" />
                                                        {t('noSpecialist')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                                            {total > 0 && (
                                                <span className="inline-flex items-center gap-1 text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                                    <PiCurrencyDollar className="text-base text-emerald-500" />
                                                    {currencyFormatter ? currencyFormatter(total) : total.toFixed(2)}
                                                </span>
                                            )}
                                            <span
                                                className={classNames(
                                                    'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                                                    palette.bg,
                                                    palette.text,
                                                )}
                                            >
                                                {statusLabels[slot.status] || slot.status}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </section>
            ))}
        </div>
    )
}

export default ScheduleAgendaView

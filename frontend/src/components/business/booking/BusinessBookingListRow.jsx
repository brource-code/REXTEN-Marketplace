'use client'

import {
    PiArrowRight,
    PiArrowsClockwise,
    PiCalendar,
    PiCalendarDuotone,
    PiClock,
    PiCreditCardFill,
    PiCurrencyDollar,
    PiMapPinFill,
    PiPackage,
    PiUser,
} from 'react-icons/pi'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import OffsiteExecutionBadge from '@/components/shared/OffsiteExecutionBadge'
import classNames from '@/utils/classNames'
import { getStatusPalette } from '@/app/business/schedule/_components/ScheduleEventContent'
import { formatDate, formatTime } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'

/**
 * Склеивает дату и время бронирования в строку для formatDate/formatTime (как slot.start у расписания).
 */
export function combineBookingDateTimeStart(dateStr, timeStr) {
    if (!dateStr) return ''
    const raw = String(timeStr || '00:00:00')
    const segs = raw.split(':')
    const h = String(Math.min(23, Math.max(0, parseInt(segs[0], 10) || 0))).padStart(2, '0')
    const m = String(Math.min(59, Math.max(0, parseInt(segs[1], 10) || 0))).padStart(2, '0')
    const secPart = segs[2] != null ? String(segs[2]).replace(/\.\d+$/, '') : '0'
    const s = String(Math.min(59, Math.max(0, parseInt(secPart, 10) || 0))).padStart(2, '0')
    return `${dateStr}T${h}:${m}:${s}`
}

/**
 * Одна строка списка бронирований — та же вёрстка, что на странице «Бронирования».
 */
export default function BusinessBookingListRow({
    start,
    rowId,
    headline,
    serviceLabel,
    spec,
    isBlockLike,
    executionType = 'onsite',
    total,
    currency = 'USD',
    status,
    statusLabel,
    paymentStatus,
    platformFee = null,
    netAmount = null,
    includedInRoute = false,
    recurringChainId = null,
    onRowClick,
    onOpenInSchedule,
}) {
    const t = useTranslations('business.bookings')
    const tCommon = useTranslations('business.common')
    const tScheduleBadges = useTranslations('business.schedule.badges')
    const { settings } = useBusinessStore()
    const timezone = settings?.timezone || 'America/Los_Angeles'

    const st = status || 'new'
    const palette = getStatusPalette(st)
    const isCancelled = st === 'cancelled'

    const amountLabel =
        total > 0
            ? new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency,
                  minimumFractionDigits: 2,
              }).format(total)
            : '—'

    const isPaidOnline = paymentStatus === 'paid' || paymentStatus === 'authorized'
    const isCardReserved =
        paymentStatus === 'reserved' || paymentStatus === 'requires_capture'
    const isInRoute = !!includedInRoute
    const isRecurring = recurringChainId != null && String(recurringChainId).trim() !== ''

    const feeLine =
        isPaidOnline && platformFee != null && netAmount != null ? (
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {t('feeLine', {
                    fee: new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency,
                        minimumFractionDigits: 2,
                    }).format(platformFee),
                    net: new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency,
                        minimumFractionDigits: 2,
                    }).format(netAmount),
                })}
            </span>
        ) : null

    return (
        <button
            type="button"
            onClick={onRowClick}
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
                        <span className="truncate">{formatDate(start, timezone, 'numeric')}</span>
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
                        {formatTime(start, timezone)}
                    </span>
                </div>

                <div className="hidden w-full shrink-0 flex-col gap-1 sm:flex sm:w-48">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                        <PiCalendar className="text-base shrink-0 text-gray-400 dark:text-gray-500" />
                        {formatDate(start, timezone, 'short')}
                    </span>
                    <span
                        className={classNames(
                            'inline-flex items-center gap-1.5 text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100',
                            isCancelled && 'line-through',
                        )}
                    >
                        <PiClock className="text-base shrink-0 text-gray-400 dark:text-gray-500" />
                        {formatTime(start, timezone)}
                    </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="shrink-0 text-[11px] font-bold tabular-nums text-gray-500 dark:text-gray-400 sm:text-xs">
                            #{rowId}
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
                        {(executionType || 'onsite') === 'offsite' && (
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
                            {statusLabel}
                        </span>
                    </div>
                    <Button
                        type="button"
                        size="xs"
                        variant="plain"
                        title={t('openInSchedule')}
                        aria-label={t('openInSchedule')}
                        className="inline-flex shrink-0 items-center justify-center gap-0.5 self-end sm:self-center p-1.5 sm:p-2"
                        onClick={onOpenInSchedule}
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
}

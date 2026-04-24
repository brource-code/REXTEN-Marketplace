'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Checkbox from '@/components/ui/Checkbox'
import Button from '@/components/ui/Button'
import { formatRouteIsoTime } from '../_utils/routeTimeFormat'

/**
 * @param {{
 *   dayBookings: import('@/lib/api/business').BusinessRouteDayBooking[]
 *   includedBookingIds: number[] | null
 *   updatingSelection?: boolean
 *   onToggle: (nextIds: number[] | null) => void
 *   onOpenBooking?: (bookingId: number) => void
 *   selectionReadOnly?: boolean
 *   displayTimezone?: string | null
 * }} props
 */
export default function RouteDayBookingsPanel({
    dayBookings,
    includedBookingIds,
    updatingSelection,
    onToggle,
    onOpenBooking,
    selectionReadOnly = false,
    displayTimezone,
}) {
    const t = useTranslations('business.routes')

    const allIds = dayBookings.map((b) => b.id)

    const isIncluded = (id) => {
        if (includedBookingIds === null) {
            return true
        }
        return includedBookingIds.includes(id)
    }

    const handleCheck = (bookingId, checked) => {
        if (selectionReadOnly) return
        const base =
            includedBookingIds === null ? new Set(allIds) : new Set(includedBookingIds)
        if (checked) {
            base.add(bookingId)
        } else {
            base.delete(bookingId)
        }
        const next = Array.from(base)
        const allIncluded = allIds.length > 0 && next.length === allIds.length && allIds.every((i) => next.includes(i))
        if (allIncluded) {
            onToggle(null)
            return
        }
        onToggle(next)
    }

    const includedCount =
        includedBookingIds === null ? allIds.length : includedBookingIds.filter((id) => allIds.includes(id)).length

    if (!dayBookings?.length) {
        return (
            <div className="space-y-2">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('noRouteForDate')}</p>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/business/schedule"
                        className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        {t('ctaSchedule')}
                    </Link>
                    <span className="text-sm font-bold text-gray-400">·</span>
                    <Link
                        href="/business/bookings"
                        className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        {t('ctaBookings')}
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3 min-h-0">
            <div className="flex shrink-0 items-center justify-between gap-2">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('dayBookingsTitle')}</p>
                {updatingSelection ? (
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('savingSelection')}</span>
                ) : null}
            </div>

            <div className="min-h-0 max-md:max-h-[min(260px,50vh)] max-md:overflow-y-auto max-md:overflow-x-hidden max-md:pr-1 max-md:-mr-0.5">
                <ul className="flex flex-col gap-2.5 pr-1 -mr-1">
                {dayBookings.map((b) => {
                    const checked = isIncluded(b.id)
                    return (
                        <li
                            key={b.id}
                            className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2.5"
                        >
                            <Checkbox
                                className={`min-w-0 flex-1 !items-start gap-3 ${
                                    selectionReadOnly || updatingSelection
                                        ? 'cursor-default pointer-events-none opacity-70'
                                        : 'cursor-pointer'
                                } ${updatingSelection ? 'opacity-60' : ''}`}
                                checkboxClass="shrink-0 mt-1 !m-0"
                                checked={checked}
                                disabled={updatingSelection || selectionReadOnly}
                                onChange={(next) => handleCheck(b.id, next)}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                                            {formatRouteIsoTime(
                                                b.time_window_start,
                                                displayTimezone ?? undefined,
                                            )}
                                        </span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                            {b.client_name || t('stopBookingFallbackName')}
                                        </span>
                                        {b.specialist_id == null ? (
                                            <span className="text-xs font-bold rounded px-1.5 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                                                {t('bookingUnassignedSpecialist')}
                                            </span>
                                        ) : null}
                                    </div>
                                    {b.title ? (
                                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                            {b.title}
                                        </p>
                                    ) : null}
                                    {b.address ? (
                                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                            {b.address}
                                        </p>
                                    ) : null}
                                    {b.offsite_address_missing ? (
                                        <p className="text-sm font-bold text-amber-700 dark:text-amber-300 mt-1">
                                            {t('stopOffsiteAddressMissing', {
                                                client: b.client_name || t('stopBookingFallbackName'),
                                            })}
                                        </p>
                                    ) : null}
                                    {(b.execution_type ?? 'onsite') === 'offsite' &&
                                    !b.has_coordinates &&
                                    !b.offsite_address_missing ? (
                                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                            {t('addressNotOnMapYet')}
                                        </p>
                                    ) : null}
                                </div>
                            </Checkbox>
                            {typeof onOpenBooking === 'function' ? (
                                <Button
                                    type="button"
                                    size="xs"
                                    variant="solid"
                                    className="shrink-0 self-start mt-0.5"
                                    disabled={updatingSelection}
                                    onClick={() => onOpenBooking(b.id)}
                                >
                                    {t('dayBookingOpenLink')}
                                </Button>
                            ) : null}
                        </li>
                    )
                })}
                </ul>
            </div>

            <p className="shrink-0 border-t border-gray-200 pt-1 text-sm font-bold text-gray-900 dark:border-gray-700 dark:text-gray-100">
                {t('includedCount', { included: includedCount, total: allIds.length })}
            </p>
        </div>
    )
}

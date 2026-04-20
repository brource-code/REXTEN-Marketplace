'use client'

import { PiCreditCardFill, PiMapPinFill, PiArrowsClockwise, PiCalendarStarFill } from 'react-icons/pi'
import classNames from '@/utils/classNames'

/**
 * Кастомный рендер события для FullCalendar.
 *
 * Единый дизайн плитки: цветной фон по статусу/специалисту + узкая цветная
 * полоса слева, внутри — несколько строк с полной информацией о брони.
 * Когда высота плитки маленькая (короткий слот) — нижние строки естественно
 * обрезаются через overflow + truncate, без скачков layout.
 *
 * Палитры: статусы (по умолчанию) или специалисты.
 */

const STATUS_PALETTE = {
    new: { bg: 'bg-sky-50 dark:bg-sky-500/10', accent: 'bg-sky-500', text: 'text-sky-900 dark:text-sky-100', soft: 'text-sky-800/70 dark:text-sky-100/70' },
    pending: { bg: 'bg-amber-50 dark:bg-amber-500/10', accent: 'bg-amber-500', text: 'text-amber-900 dark:text-amber-100', soft: 'text-amber-800/70 dark:text-amber-100/70' },
    confirmed: { bg: 'bg-orange-50 dark:bg-orange-500/10', accent: 'bg-orange-500', text: 'text-orange-900 dark:text-orange-100', soft: 'text-orange-800/70 dark:text-orange-100/70' },
    completed: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', accent: 'bg-emerald-500', text: 'text-emerald-900 dark:text-emerald-100', soft: 'text-emerald-800/70 dark:text-emerald-100/70' },
    cancelled: { bg: 'bg-rose-50 dark:bg-rose-500/10', accent: 'bg-rose-400', text: 'text-rose-900 dark:text-rose-100', soft: 'text-rose-800/70 dark:text-rose-100/70' },
}

const SPECIALIST_PALETTE = [
    { bg: 'bg-violet-50 dark:bg-violet-500/10', accent: 'bg-violet-500', text: 'text-violet-900 dark:text-violet-100', soft: 'text-violet-800/70 dark:text-violet-100/70' },
    { bg: 'bg-emerald-50 dark:bg-emerald-500/10', accent: 'bg-emerald-500', text: 'text-emerald-900 dark:text-emerald-100', soft: 'text-emerald-800/70 dark:text-emerald-100/70' },
    { bg: 'bg-sky-50 dark:bg-sky-500/10', accent: 'bg-sky-500', text: 'text-sky-900 dark:text-sky-100', soft: 'text-sky-800/70 dark:text-sky-100/70' },
    { bg: 'bg-pink-50 dark:bg-pink-500/10', accent: 'bg-pink-500', text: 'text-pink-900 dark:text-pink-100', soft: 'text-pink-800/70 dark:text-pink-100/70' },
    { bg: 'bg-amber-50 dark:bg-amber-500/10', accent: 'bg-amber-500', text: 'text-amber-900 dark:text-amber-100', soft: 'text-amber-800/70 dark:text-amber-100/70' },
    { bg: 'bg-teal-50 dark:bg-teal-500/10', accent: 'bg-teal-500', text: 'text-teal-900 dark:text-teal-100', soft: 'text-teal-800/70 dark:text-teal-100/70' },
    { bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10', accent: 'bg-fuchsia-500', text: 'text-fuchsia-900 dark:text-fuchsia-100', soft: 'text-fuchsia-800/70 dark:text-fuchsia-100/70' },
    { bg: 'bg-indigo-50 dark:bg-indigo-500/10', accent: 'bg-indigo-500', text: 'text-indigo-900 dark:text-indigo-100', soft: 'text-indigo-800/70 dark:text-indigo-100/70' },
]

const UNASSIGNED_PALETTE = {
    bg: 'bg-gray-100 dark:bg-gray-700/50',
    accent: 'bg-gray-400',
    text: 'text-gray-800 dark:text-gray-100',
    soft: 'text-gray-600 dark:text-gray-300',
}

export const getSpecialistPalette = (specialistId) => {
    if (specialistId == null) return UNASSIGNED_PALETTE
    const id = Number(specialistId)
    if (Number.isNaN(id)) return UNASSIGNED_PALETTE
    return SPECIALIST_PALETTE[Math.abs(id) % SPECIALIST_PALETTE.length]
}

export const getStatusPalette = (status) => STATUS_PALETTE[status] || STATUS_PALETTE.new

const formatTimeText = (timeText) => {
    if (!timeText) return ''
    return timeText.replace(/\s+a$/i, ' am').replace(/\s+p$/i, ' pm')
}

const Badges = ({ ext, isPaidOnline, isCardReserved, isInRoute, isRecurring, badgeLabels }) => (
    <div className="flex shrink-0 items-center gap-0.5">
        {isPaidOnline && (
            <span
                title={badgeLabels.paidOnline}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-emerald-500/90 text-white"
                aria-label={badgeLabels.paidOnline}
            >
                <PiCreditCardFill className="text-[9px]" />
            </span>
        )}
        {!isPaidOnline && isCardReserved && (
            <span
                title={badgeLabels.cardReserved}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-amber-500/90 text-white"
                aria-label={badgeLabels.cardReserved}
            >
                <PiCreditCardFill className="text-[9px]" />
            </span>
        )}
        {isInRoute && (
            <span
                title={badgeLabels.inRoute}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-primary text-white"
                aria-label={badgeLabels.inRoute}
            >
                <PiMapPinFill className="text-[9px]" />
            </span>
        )}
        {isRecurring && (
            <span
                title={badgeLabels.recurring}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-purple-500/90 text-white"
                aria-label={badgeLabels.recurring}
            >
                <PiArrowsClockwise className="text-[9px]" />
            </span>
        )}
        {ext.isCustom && !isRecurring && (
            <span
                title={badgeLabels.customEvent}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-gray-500/90 text-white"
                aria-label={badgeLabels.customEvent}
            >
                <PiCalendarStarFill className="text-[9px]" />
            </span>
        )}
    </div>
)

const ScheduleEventContent = ({
    arg,
    colorMode = 'status',
    badgeLabels = {},
}) => {
    const { event, isStart, isEnd } = arg
    const ext = event.extendedProps || {}

    const palette = colorMode === 'specialist'
        ? getSpecialistPalette(ext.specialist_id)
        : getStatusPalette(ext.status)

    const isCancelled = ext.status === 'cancelled'
    const clientName = ext.clientName || ''
    const serviceName = ext.serviceName || ''
    const specialistName = ext.specialistName || ''
    const isPaidOnline = ext.payment_status === 'paid' || ext.payment_status === 'authorized'
    const isCardReserved = ext.payment_status === 'reserved' || ext.payment_status === 'requires_capture'
    const isInRoute = !!ext.isInRoute
    const isRecurring = !!ext.isRecurring
    const amountLabel = ext.amountLabel
    const continuation = isEnd && !isStart

    const primaryLine = clientName || serviceName || event.title
    const subLineParts = [serviceName, specialistName].filter(Boolean)
    const subLine = subLineParts.join(' · ')

    const detailTitle = [
        formatTimeText(arg.timeText),
        clientName || undefined,
        serviceName || undefined,
        specialistName || undefined,
        amountLabel || undefined,
    ]
        .filter(Boolean)
        .join(' · ')

    const strike = (cls) => classNames(cls, isCancelled && 'line-through')

    return (
        <div
            title={detailTitle}
            className={classNames(
                'group relative flex h-full min-h-0 w-full overflow-hidden rounded-md',
                palette.bg,
                isCancelled && 'opacity-70',
                continuation && 'rounded-l-none',
                !isEnd && isStart && 'rounded-r-none',
            )}
        >
            <span
                className={classNames(
                    'w-1 shrink-0',
                    palette.accent,
                    continuation && 'opacity-0',
                )}
                aria-hidden
            />
            <div
                className={classNames(
                    'flex min-h-0 min-w-0 flex-1 flex-col gap-0.5 px-1.5 py-1',
                    palette.text,
                )}
            >
                {!continuation ? (
                    <div className="flex items-center justify-between gap-1 leading-none">
                        <span className={strike('truncate text-[11px] font-bold tabular-nums')}>
                            {formatTimeText(arg.timeText)}
                        </span>
                        <Badges
                            ext={ext}
                            isPaidOnline={isPaidOnline}
                            isCardReserved={isCardReserved}
                            isInRoute={isInRoute}
                            isRecurring={isRecurring}
                            badgeLabels={badgeLabels}
                        />
                    </div>
                ) : (
                    <span className="sr-only">{detailTitle}</span>
                )}

                {!continuation && (
                    <div className={strike('truncate text-[12px] font-bold leading-tight')}>
                        {primaryLine}
                    </div>
                )}

                {!continuation && subLine && (
                    <div className={classNames('truncate text-[10.5px] font-medium leading-tight', palette.soft)}>
                        {subLine}
                    </div>
                )}

                {!continuation && amountLabel && (
                    <div className="truncate text-[10px] font-bold leading-tight tabular-nums opacity-90">
                        {amountLabel}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ScheduleEventContent

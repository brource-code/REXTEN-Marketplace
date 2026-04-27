'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { NumericFormat } from 'react-number-format'
import { PiCurrencyDollar, PiClock, PiCheckCircle, PiCalendarCheck, PiMinusCircle } from 'react-icons/pi'
import dayjs from 'dayjs'
import { formatDate } from '@/utils/dateTime'
import Card from '@/components/ui/Card'
import useBusinessStore from '@/store/businessStore'
import { getScheduleSlotMonetaryTotal } from '@/utils/schedule/slotMonetaryTotal'

const ScheduleStats = ({ slots = [], dateRange, statsMode = 'visibleRange' }) => {
    const t = useTranslations('business.schedule.stats')
    const { settings } = useBusinessStore()
    const scheduleDisplayTz = settings?.timezone || 'America/Los_Angeles'

    const stats = useMemo(() => {
        if (!dateRange?.start || !dateRange?.end) {
            return {
                nonCancelledSum: 0,
                completedSum: 0,
                inProgress: 0,
                inProgressRevenue: 0,
                completed: 0,
                total: 0,
            }
        }

        const startDate = dayjs(dateRange.start).startOf('day')
        const endDate = dayjs(dateRange.end)

        const filteredSlots = slots.filter((slot) => {
            const slotDate = dayjs(slot.start)
            return !slotDate.isBefore(startDate) && slotDate.isBefore(endDate)
        })

        const nonCancelled = filteredSlots.filter((s) => s.status !== 'cancelled')
        const completed = filteredSlots.filter((s) => s.status === 'completed')
        const inProgress = filteredSlots.filter(
            (s) => s.status === 'new' || s.status === 'pending' || s.status === 'confirmed',
        )

        const nonCancelledSum = nonCancelled.reduce(
            (sum, slot) => sum + getScheduleSlotMonetaryTotal(slot),
            0,
        )
        const completedSum = completed.reduce(
            (sum, slot) => sum + getScheduleSlotMonetaryTotal(slot),
            0,
        )
        const inProgressRevenue = inProgress.reduce(
            (sum, slot) => sum + getScheduleSlotMonetaryTotal(slot),
            0,
        )

        return {
            nonCancelledSum,
            completedSum,
            inProgress: inProgress.length,
            inProgressRevenue,
            completed: completed.length,
            total: filteredSlots.length,
        }
    }, [slots, dateRange])

    const { rangeStart, rangeEnd } = useMemo(() => {
        if (!dateRange?.start || !dateRange?.end) {
            return { rangeStart: null, rangeEnd: null }
        }
        const start = dayjs(dateRange.start).startOf('day')
        const endExclusive = dayjs(dateRange.end)
        const lastInclusive = endExclusive.subtract(1, 'millisecond')
        if (lastInclusive.isBefore(start)) {
            return { rangeStart: null, rangeEnd: null }
        }
        return {
            rangeStart: formatDate(start, scheduleDisplayTz, 'short'),
            rangeEnd: formatDate(lastInclusive, scheduleDisplayTz, 'short'),
        }
    }, [dateRange, scheduleDisplayTz])

    const statsList = [
        {
            title: t('sumExcludingCancelled'),
            value: stats.nonCancelledSum,
            prefix: '$',
            icon: PiMinusCircle,
            color: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
        },
        {
            title: t('sumCompleted'),
            value: stats.completedSum,
            prefix: '$',
            icon: PiCurrencyDollar,
            color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        },
        {
            title: t('inProgress'),
            value: stats.inProgress,
            subtitle: stats.inProgressRevenue > 0 ? `$${stats.inProgressRevenue.toFixed(2)}` : null,
            icon: PiClock,
            color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
        },
        {
            title: t('completed'),
            value: stats.completed,
            icon: PiCheckCircle,
            color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
        },
        {
            title: t('total'),
            value: stats.total,
            icon: PiCalendarCheck,
            color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
        },
    ]

    return (
        <div className="mb-4 md:mb-6">
            {rangeStart && rangeEnd ? (
                <div className="mb-2 md:mb-3">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {t('periodRangeLabel', { start: rangeStart, end: rangeEnd })}
                    </p>
                </div>
            ) : null}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2 md:gap-3">
                {statsList.map((stat, index) => {
                    const Icon = stat.icon
                    return (
                        <Card key={index}>
                            <div className="flex items-center justify-between min-w-0">
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] sm:text-sm font-bold text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-2 sm:truncate break-words">
                                        {stat.title}
                                    </div>
                                    <div className="text-xs sm:text-sm md:text-lg font-bold text-gray-900 dark:text-gray-100 sm:truncate break-words">
                                        {stat.prefix ? (
                                            <NumericFormat
                                                displayType="text"
                                                value={stat.value}
                                                prefix={stat.prefix}
                                                thousandSeparator={true}
                                                decimalScale={2}
                                            />
                                        ) : (
                                            stat.value
                                        )}
                                    </div>
                                    {stat.subtitle && (
                                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 sm:truncate hidden sm:block mt-0.5">
                                            {stat.subtitle}
                                        </div>
                                    )}
                                </div>
                                <div
                                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg flex-shrink-0 ${stat.color}`}
                                >
                                    <Icon className="text-base sm:text-xl md:text-xl" />
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}

export default ScheduleStats

'use client'

import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import {
    PiCalendarCheck,
    PiCheckCircle,
    PiXCircle,
    PiClock,
    PiCurrencyDollar,
    PiUsers,
    PiUserCircle,
} from 'react-icons/pi'
import { NumericFormat } from 'react-number-format'
import { useReportsOverview } from '@/hooks/api/useBusinessReports'

function StatCard({ title, value, prefix, icon: Icon, color }) {
    return (
        <Card>
            <div className="flex items-center justify-between min-w-0 gap-2">
                <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 sm:text-sm mb-0.5 sm:mb-1 sm:truncate break-words">
                        {title}
                    </div>
                    <div className="text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100 sm:text-sm md:text-lg sm:truncate break-words">
                        {prefix ? (
                            <NumericFormat
                                displayType="text"
                                value={value}
                                prefix={prefix}
                                thousandSeparator
                                decimalScale={2}
                            />
                        ) : (
                            value
                        )}
                    </div>
                </div>
                <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 md:h-12 md:w-12 ${color}`}
                >
                    <Icon className="text-base sm:text-xl md:text-xl" aria-hidden />
                </div>
            </div>
        </Card>
    )
}

function OverviewSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-5 md:gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-[72px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 sm:h-[84px]"
                    />
                ))}
            </div>
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2 sm:gap-2 md:grid-cols-4 md:gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-[72px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 sm:h-[84px]"
                    />
                ))}
            </div>
        </div>
    )
}

export default function OverviewCards({ filters }) {
    const t = useTranslations('nav.business.schedule.reports.overview')
    const tNoData = useTranslations('nav.business.schedule.reports')
    const { data, isLoading, error } = useReportsOverview(filters)

    if (isLoading) {
        return <OverviewSkeleton />
    }

    if (error || !data) {
        return (
            <Card>
                <div className="py-8 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                    {tNoData('noData')}
                </div>
            </Card>
        )
    }

    const bookingsStats = [
        {
            title: t('totalBookings'),
            value: data.totalBookings || 0,
            icon: PiCalendarCheck,
            color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
        },
        {
            title: t('completedBookings'),
            value: data.completedBookings || 0,
            icon: PiCheckCircle,
            color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
        },
        {
            title: t('cancelledBookings'),
            value: data.cancelledBookings || 0,
            icon: PiXCircle,
            color: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
        },
        {
            title: t('activeBookings'),
            value: data.activeBookings || 0,
            icon: PiClock,
            color: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
        },
        {
            title: t('averageCheck'),
            value: data.averageCheck || 0,
            prefix: '$',
            icon: PiCurrencyDollar,
            color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
        },
    ]

    const financeStats = [
        {
            title: t('totalRevenue'),
            value: data.totalRevenue || 0,
            prefix: '$',
            icon: PiCurrencyDollar,
            color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
        },
        {
            title: t('revenueInWork'),
            value: data.revenueInWork || 0,
            prefix: '$',
            icon: PiCurrencyDollar,
            color: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400',
        },
        {
            title: t('uniqueClients'),
            value: data.uniqueClients || 0,
            icon: PiUsers,
            color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400',
        },
        {
            title: t('activeSpecialists'),
            value: data.activeSpecialists || 0,
            icon: PiUserCircle,
            color: 'bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400',
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 sm:text-base">
                    {t('sectionBookings')}
                </h4>
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-5 md:gap-3">
                    {bookingsStats.map((stat) => (
                        <StatCard key={stat.title} {...stat} />
                    ))}
                </div>
            </div>
            <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 sm:text-base">
                    {t('sectionFinance')}
                </h4>
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-2 sm:gap-2 md:grid-cols-4 md:gap-3">
                    {financeStats.map((stat) => (
                        <StatCard key={stat.title} {...stat} />
                    ))}
                </div>
            </div>
        </div>
    )
}

'use client'
import { useState, useMemo } from 'react'
import Card from '@/components/ui/Card'
import Segment from '@/components/ui/Segment'
import { PiCalendarCheck, PiUsers, PiCurrencyDollar, PiClock, PiMegaphone } from 'react-icons/pi'
import { NumericFormat } from 'react-number-format'
import { useTranslations } from 'next-intl'

const BusinessStats = ({ stats }) => {
    const t = useTranslations('business.dashboard.stats')
    const [view, setView] = useState('lifetime')

    const lifetimeStats = useMemo(
        () => [
            {
                title: t('totalClients'),
                value: stats?.activeClients || 0,
                icon: <PiUsers className="text-xl" />,
                color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
            },
            {
                title: t('totalRevenue'),
                value: stats?.totalRevenue || 0,
                prefix: '$',
                icon: <PiCurrencyDollar className="text-xl" />,
                color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
            },
            {
                title: t('totalBookings'),
                value: stats?.totalBookings || 0,
                icon: <PiClock className="text-xl" />,
                color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
            },
        ],
        [stats, t],
    )

    const currentStats = useMemo(
        () => [
            {
                title: t('activeBookings'),
                value: stats?.upcomingBookings || 0,
                icon: <PiCalendarCheck className="text-xl" />,
                color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
            },
            {
                title: t('revenueInWork'),
                value: stats?.revenueInWork || 0,
                prefix: '$',
                icon: <PiCurrencyDollar className="text-xl" />,
                color: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400',
                overdueRevenue: stats?.overdueBookings?.revenue || 0,
            },
            {
                title: t('activeAdvertisements'),
                value: stats?.activeAdvertisements || 0,
                icon: <PiMegaphone className="text-xl" />,
                color: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
            },
        ],
        [stats, t],
    )

    const activeList = view === 'lifetime' ? lifetimeStats : currentStats

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <Segment
                    value={view}
                    onChange={setView}
                    className="inline-flex w-full sm:w-auto shrink-0 rounded-xl p-1"
                >
                    <Segment.Item value="lifetime" className="rounded-lg flex-1 sm:flex-initial font-bold">
                        {t('viewLifetime')}
                    </Segment.Item>
                    <Segment.Item value="current" className="rounded-lg flex-1 sm:flex-initial font-bold">
                        {t('viewCurrent')}
                    </Segment.Item>
                </Segment>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 sm:max-w-xl sm:text-right">
                    {view === 'lifetime' ? t('statsHintLifetime') : t('statsHintCurrent')}
                </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                {activeList.map((stat, index) => (
                    <Card key={`${view}-${index}`}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 truncate">
                                    {stat.title}
                                </div>
                                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    {stat.prefix ? (
                                        <NumericFormat
                                            displayType="text"
                                            value={stat.value}
                                            prefix={stat.prefix}
                                            thousandSeparator={true}
                                        />
                                    ) : (
                                        stat.value
                                    )}
                                </div>
                                {stat.overdueRevenue > 0 && (() => {
                                    let formattedAmount = '$0'
                                    try {
                                        formattedAmount = new Intl.NumberFormat('en-US', {
                                            style: 'currency',
                                            currency: 'USD',
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0,
                                        }).format(stat.overdueRevenue)
                                    } catch {
                                        formattedAmount = `$${stat.overdueRevenue.toLocaleString()}`
                                    }
                                    const translation = t('includingOverdue', { amount: '{AMOUNT}' })
                                    const parts = translation.split('{AMOUNT}')
                                    return (
                                        <div className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">
                                            {parts[0]}
                                            <span className="font-bold">{formattedAmount}</span>
                                            {parts[1]}
                                        </div>
                                    )
                                })()}
                            </div>
                            <div
                                className={`flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-lg shrink-0 ${stat.color}`}
                            >
                                {stat.icon}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}

export default BusinessStats

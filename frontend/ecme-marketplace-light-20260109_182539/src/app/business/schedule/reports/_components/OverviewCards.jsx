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
    PiUserCircle 
} from 'react-icons/pi'
import { NumericFormat } from 'react-number-format'
import { useReportsOverview } from '@/hooks/api/useBusinessReports'
import Loading from '@/components/shared/Loading'

export default function OverviewCards({ filters }) {
    // Все хуки должны быть вызваны в начале компонента, до любых условных возвратов
    // Порядок важен: сначала useTranslations, затем другие хуки
    const t = useTranslations('nav.business.schedule.reports.overview')
    const tNoData = useTranslations('nav.business.schedule.reports')
    const { data, isLoading, error } = useReportsOverview(filters)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <Loading loading />
            </div>
        )
    }

    if (error || !data) {
        return (
            <Card>
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    {tNoData('noData')}
                </div>
            </Card>
        )
    }

    const statsList = [
        {
            title: t('totalBookings'),
            value: data.totalBookings || 0,
            icon: <PiCalendarCheck className="text-2xl" />,
            color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
        },
        {
            title: t('completedBookings'),
            value: data.completedBookings || 0,
            icon: <PiCheckCircle className="text-2xl" />,
            color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        },
        {
            title: t('cancelledBookings'),
            value: data.cancelledBookings || 0,
            icon: <PiXCircle className="text-2xl" />,
            color: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
        },
        {
            title: t('activeBookings'),
            value: data.activeBookings || 0,
            icon: <PiClock className="text-2xl" />,
            color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
        },
        {
            title: t('totalRevenue'),
            value: data.totalRevenue || 0,
            prefix: '$',
            icon: <PiCurrencyDollar className="text-2xl" />,
            color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
        },
        {
            title: t('revenueInWork'),
            value: data.revenueInWork || 0,
            prefix: '$',
            icon: <PiCurrencyDollar className="text-2xl" />,
            color: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400',
        },
        {
            title: t('averageCheck'),
            value: data.averageCheck || 0,
            prefix: '$',
            icon: <PiCurrencyDollar className="text-2xl" />,
            color: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
        },
        {
            title: t('uniqueClients'),
            value: data.uniqueClients || 0,
            icon: <PiUsers className="text-2xl" />,
            color: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
        },
        {
            title: t('activeSpecialists'),
            value: data.activeSpecialists || 0,
            icon: <PiUserCircle className="text-2xl" />,
            color: 'bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400',
        },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {statsList.map((stat, index) => (
                <Card key={index}>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                {stat.title}
                            </div>
                            <div className="text-2xl font-bold heading-text">
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
                        </div>
                        <div
                            className={`flex items-center justify-center w-12 h-12 rounded-lg ${stat.color}`}
                        >
                            {stat.icon}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )
}


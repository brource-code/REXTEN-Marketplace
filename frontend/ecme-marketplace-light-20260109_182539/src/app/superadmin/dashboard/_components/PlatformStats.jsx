'use client'
import Card from '@/components/ui/Card'
import { PiBuildings, PiUsers, PiCurrencyDollar, PiChartLine } from 'react-icons/pi'
import { NumericFormat } from 'react-number-format'

const PlatformStats = ({ stats }) => {
    const statsList = [
        {
            title: 'Активных бизнесов',
            value: stats?.totalCompanies || 0,
            icon: <PiBuildings className="text-2xl" />,
            color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
        },
        {
            title: 'Всего пользователей',
            value: stats?.totalUsers || 0,
            icon: <PiUsers className="text-2xl" />,
            color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        },
        {
            title: 'Общая выручка',
            value: stats?.totalRevenue || 0,
            prefix: '$',
            icon: <PiCurrencyDollar className="text-2xl" />,
            color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
        },
        {
            title: 'Активных бронирований',
            value: stats?.activeBookings || 0,
            icon: <PiChartLine className="text-2xl" />,
            color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
        },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsList.map((stat, index) => (
                <Card key={index}>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                {stat.title}
                            </div>
                            <div className="text-2xl font-bold">
                                {stat.prefix ? (
                                    <NumericFormat
                                        displayType="text"
                                        value={stat.value}
                                        prefix={stat.prefix}
                                        thousandSeparator={true}
                                    />
                                ) : (
                                    <NumericFormat
                                        displayType="text"
                                        value={stat.value}
                                        thousandSeparator={true}
                                    />
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

export default PlatformStats


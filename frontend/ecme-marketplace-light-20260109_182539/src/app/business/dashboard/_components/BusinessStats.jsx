'use client'
import Card from '@/components/ui/Card'
import { PiCalendarCheck, PiUsers, PiCurrencyDollar, PiClock, PiMegaphone } from 'react-icons/pi'
import { NumericFormat } from 'react-number-format'

const BusinessStats = ({ stats }) => {
    const statsList = [
        {
            title: 'Активных бронирований',
            value: stats?.upcomingBookings || 0,
            icon: <PiCalendarCheck className="text-2xl" />,
            color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
        },
        {
            title: 'Всего клиентов',
            value: stats?.activeClients || 0,
            icon: <PiUsers className="text-2xl" />,
            color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        },
        {
            title: 'Общий доход',
            value: stats?.totalRevenue || 0,
            prefix: '$',
            icon: <PiCurrencyDollar className="text-2xl" />,
            color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
        },
        {
            title: 'Доход в работе',
            value: stats?.revenueInWork || 0,
            prefix: '$',
            icon: <PiCurrencyDollar className="text-2xl" />,
            color: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400',
        },
        {
            title: 'Всего бронирований',
            value: stats?.totalBookings || 0,
            icon: <PiClock className="text-2xl" />,
            color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
        },
        {
            title: 'Активных объявлений',
            value: stats?.activeAdvertisements || 0,
            icon: <PiMegaphone className="text-2xl" />,
            color: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
        },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                                    <>
                                        {stat.value}
                                        {stat.suffix && (
                                            <span className="text-lg text-gray-500">
                                                {stat.suffix}
                                            </span>
                                        )}
                                    </>
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

export default BusinessStats


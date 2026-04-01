'use client'

import Table from '@/components/ui/Table'
import dayjs from 'dayjs'

export default function DailyBalanceTable({ dailyRows = [] }) {
    const formatAmount = (amount) => {
        return (amount || 0).toFixed(2)
    }

    const getStatusClass = (status) => {
        switch (status) {
            case 'danger':
                return 'bg-red-50 dark:bg-red-900/20'
            case 'low':
                return 'bg-yellow-50 dark:bg-yellow-900/20'
            default:
                return ''
        }
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'danger':
                return (
                    <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                        РАЗРЫВ
                    </span>
                )
            case 'low':
                return (
                    <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                        НИЗКИЙ
                    </span>
                )
            default:
                return null
        }
    }

    const getBalanceColor = (balance) => {
        if (balance < 0) return 'text-red-600 dark:text-red-400'
        return 'text-gray-900 dark:text-gray-100'
    }

    if (!dailyRows || dailyRows.length === 0) {
        return (
            <div className="space-y-4">
                <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">
                    Баланс по дням
                </h4>
                <div className="text-center py-8 text-sm font-bold text-gray-500 dark:text-gray-400">
                    Нет данных для отображения. Добавьте события или измените период.
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">
                Баланс по дням ({dailyRows.length} дней)
            </h4>

            {/* Десктопная версия - таблица */}
            <div className="hidden md:block overflow-x-auto">
                <Table>
                    <thead>
                        <tr>
                            <th className="text-left text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">Дата</th>
                            <th className="text-right text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">Доход</th>
                            <th className="text-right text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">Расход</th>
                            <th className="text-right text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">Остаток</th>
                            <th className="text-left text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">События дня</th>
                            <th className="text-center text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dailyRows.map((row) => (
                            <tr
                                key={row.date}
                                className={getStatusClass(row.status)}
                            >
                                <td className="text-xs md:text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {dayjs(row.date).format('DD.MM.YYYY')}
                                </td>
                                <td className="text-right text-xs md:text-sm font-bold text-green-600 dark:text-green-400">
                                    {row.income > 0 ? `+${formatAmount(row.income)}` : '-'}
                                </td>
                                <td className="text-right text-xs md:text-sm font-bold text-red-600 dark:text-red-400">
                                    {row.expense > 0 ? `-${formatAmount(row.expense)}` : '-'}
                                </td>
                                <td className={`text-right text-xs md:text-sm font-bold ${getBalanceColor(row.balance)}`}>
                                    {formatAmount(row.balance)}
                                </td>
                                <td className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">
                                    <div className="space-y-1">
                                        {row.events.length > 0 ? (
                                            row.events.map((event, idx) => (
                                                <div key={idx} className="text-xs">
                                                    {event.name}: {event.amount > 0 ? '+' : ''}{formatAmount(event.amount)}
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-xs">-</span>
                                        )}
                                    </div>
                                </td>
                                <td className="text-center">
                                    {getStatusBadge(row.status)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            {/* Мобильная версия - карточки */}
            <div className="md:hidden space-y-2">
                {dailyRows.map((row) => (
                    <div
                        key={row.date}
                        className={`p-3 rounded-lg border ${getStatusClass(row.status)} border-gray-200 dark:border-gray-700`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {dayjs(row.date).format('DD.MM.YYYY')}
                            </div>
                            {getStatusBadge(row.status)}
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                            <div>
                                <div className="text-gray-500 dark:text-gray-400">Доход</div>
                                <div className="font-bold text-green-600 dark:text-green-400">
                                    {row.income > 0 ? `+${formatAmount(row.income)}` : '-'}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500 dark:text-gray-400">Расход</div>
                                <div className="font-bold text-red-600 dark:text-red-400">
                                    {row.expense > 0 ? `-${formatAmount(row.expense)}` : '-'}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500 dark:text-gray-400">Остаток</div>
                                <div className={`font-bold ${getBalanceColor(row.balance)}`}>
                                    {formatAmount(row.balance)}
                                </div>
                            </div>
                        </div>

                        {row.events.length > 0 && (
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                                {row.events.slice(0, 2).map((event, idx) => (
                                    <div key={idx}>
                                        {event.name}: {event.amount > 0 ? '+' : ''}{formatAmount(event.amount)}
                                    </div>
                                ))}
                                {row.events.length > 2 && (
                                    <div className="text-gray-400">+{row.events.length - 2} ещё</div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

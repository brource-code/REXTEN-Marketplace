'use client'

import Card from '@/components/ui/Card'
import dayjs from 'dayjs'

export default function MonthlySummary({ summary = {}, startDay = 1 }) {
    const formatAmount = (amount) => {
        return (amount || 0).toFixed(2)
    }

    const getAmountColor = (amount) => {
        if (amount >= 0) return 'text-green-600 dark:text-green-400'
        return 'text-red-600 dark:text-red-400'
    }

    return (
        <div className="space-y-4">
            <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">
                Итоги месяца
            </h4>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Стартовый остаток */}
                <Card>
                    <div className="p-3 md:p-4">
                        <div className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                            Остаток на {startDay}-е
                        </div>
                        <div className={`text-xl md:text-2xl font-bold ${getAmountColor(summary.startBalance)}`}>
                            {formatAmount(summary.startBalance)}
                        </div>
                    </div>
                </Card>

                {/* Доходы */}
                <Card>
                    <div className="p-3 md:p-4">
                        <div className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                            Доходы
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">
                            +{formatAmount(summary.totalIncome)}
                        </div>
                    </div>
                </Card>

                {/* Расходы */}
                <Card>
                    <div className="p-3 md:p-4">
                        <div className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                            Расходы
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">
                            -{formatAmount(summary.totalExpense)}
                        </div>
                    </div>
                </Card>

                {/* Финальный остаток */}
                <Card>
                    <div className="p-3 md:p-4">
                        <div className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                            Финальный остаток
                        </div>
                        <div className={`text-xl md:text-2xl font-bold ${getAmountColor(summary.endingBalance)}`}>
                            {formatAmount(summary.endingBalance)}
                        </div>
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                            Изменение: {summary.balanceChange >= 0 ? '+' : ''}{formatAmount(summary.balanceChange)}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Дополнительная информация */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-4">
                {/* Минимальный баланс */}
                <Card>
                    <div className="p-3 md:p-4">
                        <div className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                            Минимальный баланс
                        </div>
                        <div className={`text-lg md:text-xl font-bold ${getAmountColor(summary.minBalance)}`}>
                            {formatAmount(summary.minBalance)}
                        </div>
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {dayjs(summary.dateMinBalance).format('DD.MM.YYYY')}
                        </div>
                    </div>
                </Card>

                {/* Максимальный баланс */}
                <Card>
                    <div className="p-3 md:p-4">
                        <div className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                            Максимальный баланс
                        </div>
                        <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">
                            {formatAmount(summary.maxBalance)}
                        </div>
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {dayjs(summary.dateMaxBalance).format('DD.MM.YYYY')}
                        </div>
                    </div>
                </Card>

                {/* Критические дни */}
                <Card>
                    <div className="p-3 md:p-4">
                        <div className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                            Статус по дням
                        </div>
                        <div className="space-y-2">
                            {/* Кассовые разрывы (баланс < 0) */}
                            {summary.negativeDays && summary.negativeDays.length > 0 ? (
                                <div>
                                    <div className="text-xs md:text-sm font-bold text-red-600 dark:text-red-400">
                                        Кассовый разрыв: {summary.negativeDays.length} дн.
                                    </div>
                                    <div className="text-xs font-bold text-red-500 dark:text-red-400">
                                        {summary.negativeDays.slice(0, 3).map(d => dayjs(d).format('DD.MM')).join(', ')}
                                        {summary.negativeDays.length > 3 && '...'}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs md:text-sm font-bold text-green-600 dark:text-green-400">
                                    Кассовых разрывов нет
                                </div>
                            )}
                            
                            {/* Низкий баланс */}
                            {summary.lowDays && summary.lowDays.length > 0 && (
                                <div>
                                    <div className="text-xs md:text-sm font-bold text-yellow-600 dark:text-yellow-400">
                                        Низкий баланс: {summary.lowDays.length} дн.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}

'use client'
import { useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { NumericFormat } from 'react-number-format'
import { PiBuildings, PiUsers, PiCurrencyDollar, PiCalendarCheck, PiChartLine } from 'react-icons/pi'
import dynamic from 'next/dynamic'
import Loading from '@/components/shared/Loading'
import { useQuery } from '@tanstack/react-query'
import { getCompanyStats, getCompanyChart } from '@/lib/api/superadmin'

const Chart = dynamic(() => import('@/components/shared/Chart'), {
    ssr: false,
    loading: () => (
        <div className="h-[300px] flex items-center justify-center">
            <Loading loading />
        </div>
    ),
})

const CompanyStatsModal = ({ isOpen, onClose, company }) => {
    // Дефолтные значения, если API еще не реализован
    const defaultStats = {
        revenue: {
            thisWeek: 0,
            thisMonth: 0,
            thisYear: 0,
            total: 0,
        },
        bookings: {
            thisWeek: 0,
            thisMonth: 0,
            thisYear: 0,
            total: 0,
        },
        clients: {
            total: 0,
            active: 0,
            new: 0,
        },
        rating: 0,
    }

    // Загрузка данных графика из API - должен быть до условного возврата
    const [chartPeriod, setChartPeriod] = useState('thisWeek')

    // Получаем статистику компании из API
    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['company-stats', company?.id],
        queryFn: () => getCompanyStats(company.id),
        enabled: isOpen && !!company?.id,
        retry: false,
        // Если ошибка, используем дефолтные значения
        onError: (err) => {
            console.error('Failed to fetch company stats:', err)
            console.error('Error details:', {
                message: err?.message,
                response: err?.response?.data,
                status: err?.response?.status,
            })
        },
    })

    const { data: chartDataFromAPI, isLoading: chartLoading, error: chartError } = useQuery({
        queryKey: ['company-chart', company?.id, chartPeriod],
        queryFn: () => getCompanyChart(company.id, chartPeriod),
        enabled: isOpen && !!company?.id,
        retry: false,
    })

    if (!company) return null

    // Используем данные из API или дефолтные значения
    const companyStats = stats && typeof stats === 'object' && stats.clients 
        ? stats 
        : defaultStats
    
    // Debug: логируем данные
    if (stats) {
        console.log('Company Stats from API:', stats)
    }
    if (error) {
        console.error('Company Stats Error:', error)
    }

    // Данные для графика - используем реальные данные или пустые
    const chartData = chartDataFromAPI && chartDataFromAPI.series && chartDataFromAPI.series[0] && chartDataFromAPI.series[0].data && chartDataFromAPI.series[0].data.length > 0
        ? {
            series: chartDataFromAPI.series,
            categories: chartDataFromAPI.categories || chartDataFromAPI.date || [],
        }
        : {
            series: [{ name: 'Выручка', data: [] }],
            categories: [],
        }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={900}>
            <div className="flex flex-col h-full max-h-[85vh]">
                {/* Заголовок - снаружи скролла */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h3 className="text-lg">Статистика бизнеса</h3>
                    <p className="text-xs text-gray-500 mt-1">{company.name}</p>
                </div>

                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <div className="space-y-4">
                        {/* Основные метрики */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <Card className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm text-gray-500">Выручка (всего)</div>
                                    <PiCurrencyDollar className="text-2xl text-amber-500" />
                                </div>
                                <div className="text-2xl font-bold">
                                    {isLoading ? (
                                        <Loading loading />
                                    ) : (
                                        <NumericFormat
                                            displayType="text"
                                            value={companyStats.revenue.total}
                                            prefix={'₽'}
                                            thousandSeparator={true}
                                        />
                                    )}
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm text-gray-500">Бронирований</div>
                                    <PiCalendarCheck className="text-2xl text-blue-500" />
                                </div>
                                <div className="text-2xl font-bold">
                                    {isLoading ? <Loading loading /> : companyStats.bookings.total}
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm text-gray-500">Клиентов</div>
                                    <PiUsers className="text-2xl text-emerald-500" />
                                </div>
                                <div className="text-2xl font-bold">
                                    {isLoading ? <Loading loading /> : companyStats.clients.total}
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm text-gray-500">Рейтинг</div>
                                    <PiChartLine className="text-2xl text-purple-500" />
                                </div>
                                <div className="text-2xl font-bold">
                                    {isLoading ? <Loading loading /> : companyStats.rating}
                                </div>
                            </Card>
                        </div>

                        {/* График выручки */}
                        <Card className="p-3">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold">Выручка</h4>
                                <select
                                    value={chartPeriod}
                                    onChange={(e) => setChartPeriod(e.target.value)}
                                    className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
                                >
                                    <option value="thisWeek">Эта неделя</option>
                                    <option value="thisMonth">Этот месяц</option>
                                    <option value="thisYear">Этот год</option>
                                </select>
                            </div>
                            {chartLoading ? (
                                <div className="h-[300px] flex items-center justify-center">
                                    <Loading loading />
                                </div>
                            ) : chartError ? (
                                <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">
                                    Ошибка загрузки данных графика
                                </div>
                            ) : !chartData.series || !chartData.series[0] || !chartData.series[0].data || chartData.series[0].data.length === 0 ? (
                                <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">
                                    Нет данных для отображения
                                </div>
                            ) : (
                                <Chart
                                    series={chartData.series}
                                    xAxis={chartData.categories}
                                    height={300}
                                />
                            )}
                        </Card>

                        {/* Детальная статистика */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Card className="p-3">
                                <div className="text-xs text-gray-500 mb-1">За эту неделю</div>
                                <div className="text-xl font-bold mb-1">
                                    <NumericFormat
                                        displayType="text"
                                        value={companyStats.revenue.thisWeek}
                                        prefix={'₽'}
                                        thousandSeparator={true}
                                    />
                                </div>
                                <div className="text-xs text-gray-400">
                                    {companyStats.bookings.thisWeek} бронирований
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="text-sm text-gray-500 mb-2">За этот месяц</div>
                                <div className="text-xl font-bold mb-1">
                                    <NumericFormat
                                        displayType="text"
                                        value={companyStats.revenue.thisMonth}
                                        prefix={'₽'}
                                        thousandSeparator={true}
                                    />
                                </div>
                                <div className="text-xs text-gray-400">
                                    {companyStats.bookings.thisMonth} бронирований
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="text-sm text-gray-500 mb-2">За этот год</div>
                                <div className="text-xl font-bold mb-1">
                                    <NumericFormat
                                        displayType="text"
                                        value={companyStats.revenue.thisYear}
                                        prefix={'₽'}
                                        thousandSeparator={true}
                                    />
                                </div>
                                <div className="text-xs text-gray-400">
                                    {companyStats.bookings.thisYear} бронирований
                                </div>
                            </Card>
                        </div>

                        {/* Клиенты */}
                        <Card className="p-3">
                            <h4 className="mb-3 text-sm font-semibold">Клиенты</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Всего</div>
                                    <div className="text-2xl font-bold">{companyStats.clients.total}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Активных</div>
                                    <div className="text-2xl font-bold text-emerald-600">
                                        {companyStats.clients.active}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Новых (месяц)</div>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {companyStats.clients.new}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </Dialog>
    )
}

export default CompanyStatsModal


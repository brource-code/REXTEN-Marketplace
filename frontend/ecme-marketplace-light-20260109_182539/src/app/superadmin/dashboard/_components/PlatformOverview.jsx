'use client'
import { useState, useMemo } from 'react'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import GrowShrinkValue from '@/components/shared/GrowShrinkValue'
import { NumericFormat } from 'react-number-format'
import { PiBuildings, PiCurrencyDollar, PiUsers } from 'react-icons/pi'
import dynamic from 'next/dynamic'
import Loading from '@/components/shared/Loading'
import { useQuery } from '@tanstack/react-query'
import { getChartData } from '@/lib/api/superadmin'

const Chart = dynamic(() => import('@/components/shared/Chart'), {
    ssr: false,
    loading: () => (
        <div className="h-[425px] flex items-center justify-center">
            <Loading loading />
        </div>
    ),
})

const periodOptions = [
    { value: 'thisWeek', label: 'Эта неделя' },
    { value: 'thisMonth', label: 'Этот месяц' },
    { value: 'thisYear', label: 'Этот год' },
]

const PlatformOverview = ({ data }) => {
    const [selectedPeriod, setSelectedPeriod] = useState('thisMonth')
    const [selectedCategory, setSelectedCategory] = useState('revenue')

    const currentData = useMemo(() => {
        if (!data || !data.revenue || !data.businesses || !data.users) return null
        
        const revenue = data.revenue[selectedPeriod]
        const businesses = data.businesses[selectedPeriod]
        const users = data.users[selectedPeriod]
        
        // Проверяем, что это объекты, а не числа
        if (typeof revenue !== 'object' || typeof businesses !== 'object' || typeof users !== 'object') {
            return null
        }
        
        return {
            revenue,
            businesses,
            users,
        }
    }, [data, selectedPeriod])

    // Загрузка данных графика из API
    const { data: apiChartData, isLoading: chartLoading, error: chartError } = useQuery({
        queryKey: ['admin-chart', selectedCategory, selectedPeriod],
        queryFn: () => getChartData(selectedCategory, selectedPeriod),
        enabled: true,
    })

    // Данные для графика
    const chartData = useMemo(() => {
        console.log('Admin Chart Data Processing:', {
            apiChartData,
            selectedCategory,
            selectedPeriod,
        })
        
        if (apiChartData && apiChartData.series && Array.isArray(apiChartData.series) && apiChartData.series.length > 0) {
            // Проверяем, что данные не пустые
            const firstSeries = apiChartData.series[0]
            console.log('First Series:', firstSeries)
            
            if (firstSeries && firstSeries.data && Array.isArray(firstSeries.data)) {
                // Убеждаемся, что есть date или categories
                const xAxisData = apiChartData.date || apiChartData.categories || []
                console.log('X Axis Data:', xAxisData, 'Data Length:', firstSeries.data.length)
                
                // Если данные есть, используем их (даже если длины не совпадают - это может быть нормально)
                if (firstSeries.data.length > 0) {
                    // Если меток меньше, чем данных, создаем метки
                    const finalCategories = xAxisData.length === firstSeries.data.length 
                        ? xAxisData 
                        : firstSeries.data.map((_, index) => index + 1)
                    
                    return {
                        series: apiChartData.series,
                        date: finalCategories,
                        categories: finalCategories,
                    }
                }
            }
        }
        
        console.warn('No valid chart data, returning empty structure')
        return {
            series: [{ name: selectedCategory, data: [] }],
            categories: [],
            date: [],
        }
    }, [apiChartData, selectedCategory, selectedPeriod])

    if (!currentData) {
        return (
            <Card>
                <div className="text-center py-12">
                    <p className="text-gray-500">Загрузка данных...</p>
                </div>
            </Card>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* График */}
            <Card className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                    <h4>Активность платформы</h4>
                    <Select
                        size="sm"
                        options={periodOptions}
                        value={periodOptions.find((opt) => opt.value === selectedPeriod)}
                        onChange={(option) => setSelectedPeriod(option.value)}
                    />
                </div>
                {chartLoading ? (
                    <div className="h-[425px] flex items-center justify-center">
                        <Loading loading />
                    </div>
                ) : chartError ? (
                    <div className="h-[425px] flex items-center justify-center text-gray-500">
                        Ошибка загрузки данных графика
                    </div>
                ) : !chartData.series || !chartData.series[0] || !chartData.series[0].data || chartData.series[0].data.length === 0 ? (
                    <div className="h-[425px] flex items-center justify-center text-gray-500">
                        Нет данных для отображения
                    </div>
                ) : (
                    <Chart
                        series={chartData.series}
                        xAxis={chartData.date || chartData.categories || []}
                        height={425}
                    />
                )}
            </Card>

            {/* Метрики */}
            <div className="flex flex-col gap-4">
                <Card 
                    className={`cursor-pointer transition-all ${selectedCategory === 'revenue' ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => setSelectedCategory('revenue')}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                            <PiCurrencyDollar className="text-xl" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Выручка
                            </div>
                            <div className="text-xl font-bold">
                                <NumericFormat
                                    displayType="text"
                                    value={currentData.revenue.value}
                                    prefix={'₽'}
                                    thousandSeparator={true}
                                />
                            </div>
                        </div>
                    </div>
                    <GrowShrinkValue
                        value={currentData.revenue.growShrink}
                        suffix="%"
                        positiveIcon="+"
                    />
                </Card>

                <Card 
                    className={`cursor-pointer transition-all ${selectedCategory === 'businesses' ? 'ring-2 ring-emerald-500' : ''}`}
                    onClick={() => setSelectedCategory('businesses')}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <PiBuildings className="text-xl" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Бизнесы
                            </div>
                            <div className="text-xl font-bold">
                                {currentData.businesses.value}
                            </div>
                        </div>
                    </div>
                    <GrowShrinkValue
                        value={currentData.businesses.growShrink}
                        suffix="%"
                        positiveIcon="+"
                    />
                </Card>

                <Card 
                    className={`cursor-pointer transition-all ${selectedCategory === 'users' ? 'ring-2 ring-purple-500' : ''}`}
                    onClick={() => setSelectedCategory('users')}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                            <PiUsers className="text-xl" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Пользователи
                            </div>
                            <div className="text-xl font-bold">
                                {currentData.users.value}
                            </div>
                        </div>
                    </div>
                    <GrowShrinkValue
                        value={currentData.users.growShrink}
                        suffix="%"
                        positiveIcon="+"
                    />
                </Card>
            </div>
        </div>
    )
}

export default PlatformOverview


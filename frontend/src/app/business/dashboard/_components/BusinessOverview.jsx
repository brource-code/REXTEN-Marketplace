'use client'
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import GrowShrinkValue from '@/components/shared/GrowShrinkValue'
import AbbreviateNumber from '@/components/shared/AbbreviateNumber'
import Loading from '@/components/shared/Loading'
import useTheme from '@/utils/hooks/useTheme'
import classNames from '@/utils/classNames'
import { COLOR_1, COLOR_2, COLOR_4 } from '@/constants/chart.constant'
import { NumericFormat } from 'react-number-format'
import { PiCalendarCheck, PiCurrencyDollar, PiUsers, PiClock } from 'react-icons/pi'
import { TbProgressBolt, TbCopyCheck, TbArrowDownToArc } from 'react-icons/tb'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { getChartData } from '@/lib/api/business'
import { useTranslations } from 'next-intl'
import { getBusinessDashboardPeriodRange } from '@/utils/businessDashboardPeriodRange'
import useBusinessStore from '@/store/businessStore'

const Chart = dynamic(() => import('@/components/shared/Chart'), {
    ssr: false,
    loading: () => (
        <div className="h-[425px] flex items-center justify-center">
            <Loading loading />
        </div>
    ),
})

const chartColors = {
    revenue: COLOR_1,
    bookings: COLOR_2,
    clients: COLOR_4,
}

const getPeriodOptions = (t) => [
    { value: 'thisWeek', label: t('periods.thisWeek') },
    { value: 'thisMonth', label: t('periods.thisMonth') },
    { value: 'thisYear', label: t('periods.thisYear') },
]

function shouldShowPeriodComparison(growShrink) {
    if (growShrink === null || growShrink === undefined) {
        return false
    }
    const n = Number(growShrink)
    return !Number.isNaN(n)
}

const StatisticCard = memo((props) => {
    const {
        title,
        value,
        label,
        icon,
        growShrink,
        cardClass,
        active,
        compareFrom,
        onClick,
        footnote,
        showPeriodComparison = true,
    } = props

    const handleClick = useCallback(() => {
        onClick(label)
    }, [onClick, label])

    return (
        <button
            className={classNames(
                'p-4 rounded-xl cursor-pointer ltr:text-left rtl:text-right transition duration-150 outline-hidden flex flex-col justify-center',
                cardClass,
                active && 'ring-2 ring-gray-900 dark:ring-gray-100 shadow-md',
            )}
            onClick={handleClick}
        >
            <div className="flex md:flex-col-reverse gap-2 2xl:flex-row justify-between relative">
                <div>
                    <div className="mb-4 text-gray-900 font-bold">{title}</div>
                    <h3 className="mb-1 text-gray-900">{value}</h3>
                    {footnote ? (
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 leading-snug">
                            {footnote}
                        </p>
                    ) : null}
                    {showPeriodComparison ? (
                        <div className="inline-flex items-center flex-wrap gap-1">
                            <GrowShrinkValue
                                className="font-bold"
                                value={growShrink}
                                suffix="%"
                                positiveIcon="+"
                                negativeIcon=""
                            />
                            <span className="text-xs text-gray-500">{compareFrom}</span>
                        </div>
                    ) : null}
                </div>
                <div className="flex items-center justify-center min-h-12 min-w-12 max-h-12 max-w-12 bg-gray-900 text-white rounded-full text-2xl">
                    {icon}
                </div>
            </div>
        </button>
    )
})

StatisticCard.displayName = 'StatisticCard'

// Mock данные для графика - вынесены за пределы компонента для предотвращения пересоздания
const mockChartData = {
        revenue: {
            thisWeek: {
                series: [
                    {
                        name: 'Доходы',
                        data: [1200, 1500, 1800, 2100, 1900, 2200, 2500],
                    },
                ],
                date: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
            },
            thisMonth: {
                series: [
                    {
                        name: 'Доходы',
                        data: [5000, 7500, 6000, 8500, 9000, 11000, 12000, 10000, 13000, 14000, 15000, 16000],
                    },
                ],
                date: ['1', '5', '10', '15', '20', '25', '30'],
            },
            thisYear: {
                series: [
                    {
                        name: 'Доходы',
                        data: [45000, 52000, 48000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000],
                    },
                ],
                date: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
            },
        },
        bookings: {
            thisWeek: {
                series: [
                    {
                        name: 'Бронирования',
                        data: [12, 15, 18, 21, 19, 22, 25],
                    },
                ],
                date: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
            },
            thisMonth: {
                series: [
                    {
                        name: 'Бронирования',
                        data: [50, 75, 60, 85, 90, 110, 120, 100, 130, 140, 150, 160],
                    },
                ],
                date: ['1', '5', '10', '15', '20', '25', '30'],
            },
            thisYear: {
                series: [
                    {
                        name: 'Бронирования',
                        data: [450, 520, 480, 550, 600, 650, 700, 750, 800, 850, 900, 950],
                    },
                ],
                date: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
            },
        },
        clients: {
            thisWeek: {
                series: [
                    {
                        name: 'Новые клиенты',
                        data: [3, 5, 4, 6, 5, 7, 8],
                    },
                ],
                date: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
            },
            thisMonth: {
                series: [
                    {
                        name: 'Новые клиенты',
                        data: [15, 20, 18, 25, 22, 28, 30, 25, 32, 35, 38, 40],
                    },
                ],
                date: ['1', '5', '10', '15', '20', '25', '30'],
            },
            thisYear: {
                series: [
                    {
                        name: 'Новые клиенты',
                        data: [150, 180, 160, 200, 220, 250, 280, 300, 320, 350, 380, 400],
                    },
                ],
                date: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
            },
        },
    }

const BusinessOverview = ({ data }) => {
    const t = useTranslations('business.dashboard')
    const { settings } = useBusinessStore()
    const businessTz = settings?.timezone || 'America/Los_Angeles'
    const [selectedCategory, setSelectedCategory] = useState('revenue')
    const [selectedPeriod, setSelectedPeriod] = useState('thisMonth')
    const [isChartUpdating, setIsChartUpdating] = useState(false)
    const sideNavCollapse = useTheme((state) => state.layout.sideNavCollapse)
    const isFirstRender = useRef(true)
    const resizeTimeoutRef = useRef(null)
    const updateTimeoutRef = useRef(null)
    
    const periodOptions = useMemo(() => getPeriodOptions(t), [t])

    // Загрузка данных графика из API
    const { data: apiChartData, isLoading: chartLoading, error: chartError } = useQuery({
        queryKey: ['business-chart', selectedCategory, selectedPeriod],
        queryFn: () => getChartData(selectedCategory, selectedPeriod),
        enabled: true, // Всегда загружаем, если API доступен
    })

    // Мемоизация данных графика
    // Используем данные из API, если доступны, иначе возвращаем пустую структуру
    const chartData = useMemo(() => {
        if (apiChartData && apiChartData.series && Array.isArray(apiChartData.series) && apiChartData.series.length > 0) {
            const firstSeries = apiChartData.series[0]

            if (firstSeries && firstSeries.data && Array.isArray(firstSeries.data)) {
                const xAxisData = apiChartData.date || apiChartData.categories || []

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

        // Если API не предоставляет данные, возвращаем пустую структуру
        return {
            series: [{ name: selectedCategory, data: [] }],
            categories: [],
            date: [],
        }
    }, [apiChartData, selectedCategory, selectedPeriod])

    // Мемоизация опций графика
    const chartOptions = useMemo(() => ({
        legend: { show: false },
        colors: [chartColors[selectedCategory]],
    }), [selectedCategory])

    // Мемоизация значений для карточек статистики
    const revenueValue = useMemo(() => (
        <NumericFormat
            displayType="text"
            value={data?.revenue?.[selectedPeriod]?.value || 0}
            prefix={'$'}
            thousandSeparator={true}
        />
    ), [data?.revenue, selectedPeriod])

    const bookingsValue = useMemo(() => (
        <NumericFormat
            displayType="text"
            value={data?.bookings?.[selectedPeriod]?.value || 0}
            thousandSeparator={true}
        />
    ), [data?.bookings, selectedPeriod])

    const clientsValue = useMemo(() => (
        <AbbreviateNumber
            value={data?.clients?.[selectedPeriod]?.value || 0}
        />
    ), [data?.clients, selectedPeriod])

    const periodCardsRangeLine = useMemo(() => {
        const { from, to } = getBusinessDashboardPeriodRange(selectedPeriod, businessTz)
        return t('stats.periodCardsRange', { from, to })
    }, [selectedPeriod, t, businessTz])

    // Оптимизированный обработчик изменения категории с debounce
    const handleCategoryChange = useCallback((category) => {
        // Предотвращаем множественные быстрые клики
        if (category === selectedCategory || isChartUpdating) {
            return
        }
        
        // Очищаем предыдущий таймаут
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current)
        }
        
        setIsChartUpdating(true)
        setSelectedCategory(category)
        
        // Сбрасываем флаг обновления после небольшой задержки
        updateTimeoutRef.current = setTimeout(() => {
            setIsChartUpdating(false)
        }, 300)
    }, [selectedCategory, isChartUpdating])

    // Оптимизированный обработчик изменения периода
    const handlePeriodChange = useCallback((option) => {
        if (option?.value) {
            setSelectedPeriod(option.value)
        }
    }, [])

    useEffect(() => {
        if (!sideNavCollapse && isFirstRender.current) {
            isFirstRender.current = false
            return
        }

        if (!isFirstRender.current) {
            // Debounce resize события
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current)
            }
            resizeTimeoutRef.current = setTimeout(() => {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('resize'))
                }
            }, 100)
        }

        return () => {
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current)
            }
        }
    }, [sideNavCollapse])

    // Cleanup для таймаута обновления графика
    useEffect(() => {
        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current)
            }
        }
    }, [])

    return (
        <Card>
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('overview')}</h4>
                <Select
                    instanceId="business-overview-period"
                    className="w-[150px]"
                    size="sm"
                    placeholder={t('selectPeriod')}
                    value={
                        periodOptions.find((option) => option.value === selectedPeriod) ??
                        null
                    }
                    options={periodOptions}
                    isSearchable={false}
                    isOptionEqualToValue={(a, b) => a?.value === b?.value}
                    onChange={handlePeriodChange}
                />
            </div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2">
                {periodCardsRangeLine}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl mt-4">
                <StatisticCard
                    title={t('stats.revenue')}
                    value={revenueValue}
                    footnote={t('stats.revenuePeriodFootnote')}
                    growShrink={data?.revenue?.[selectedPeriod]?.growShrink || 0}
                    showPeriodComparison={shouldShowPeriodComparison(
                        data?.revenue?.[selectedPeriod]?.growShrink,
                    )}
                    cardClass="bg-sky-100 dark:bg-opacity-75"
                    icon={<TbProgressBolt />}
                    label="revenue"
                    active={selectedCategory === 'revenue'}
                    compareFrom={t('stats.comparedToPrevious')}
                    onClick={handleCategoryChange}
                />
                <StatisticCard
                    title={t('stats.bookings')}
                    value={bookingsValue}
                    growShrink={data?.bookings?.[selectedPeriod]?.growShrink || 0}
                    showPeriodComparison={shouldShowPeriodComparison(
                        data?.bookings?.[selectedPeriod]?.growShrink,
                    )}
                    cardClass="bg-emerald-100 dark:bg-opacity-75"
                    icon={<TbCopyCheck />}
                    label="bookings"
                    active={selectedCategory === 'bookings'}
                    compareFrom={t('stats.comparedToPrevious')}
                    onClick={handleCategoryChange}
                />
                <StatisticCard
                    title={t('stats.newClients')}
                    value={clientsValue}
                    growShrink={data?.clients?.[selectedPeriod]?.growShrink || 0}
                    showPeriodComparison={shouldShowPeriodComparison(
                        data?.clients?.[selectedPeriod]?.growShrink,
                    )}
                    cardClass="bg-purple-100 dark:bg-opacity-75"
                    icon={<TbArrowDownToArc />}
                    label="clients"
                    active={selectedCategory === 'clients'}
                    compareFrom={t('stats.comparedToPrevious')}
                    onClick={handleCategoryChange}
                />
            </div>
            <div className="min-h-[425px]">
                {chartLoading ? (
                    <div className="h-[425px] flex items-center justify-center">
                        <Loading loading />
                    </div>
                ) : chartError ? (
                    <div className="h-[425px] flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('chart.error')}
                    </div>
                ) : !chartData.series || !chartData.series[0] || !chartData.series[0].data || chartData.series[0].data.length === 0 ? (
                    <div className="h-[425px] flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('chart.noData')}
                    </div>
                ) : (
                    <Chart
                        key={`${selectedCategory}-${selectedPeriod}`}
                        type="line"
                        series={chartData.series}
                        xAxis={chartData.date || chartData.categories || []}
                        height="410px"
                        customOptions={chartOptions}
                    />
                )}
            </div>
        </Card>
    )
}

export default BusinessOverview


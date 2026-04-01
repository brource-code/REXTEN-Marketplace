'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import Loading from '@/components/shared/Loading'
import GrowShrinkValue from '@/components/shared/GrowShrinkValue'
import { NumericFormat } from 'react-number-format'
import AbbreviateNumber from '@/components/shared/AbbreviateNumber'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { getAdminDashboardChart } from '@/lib/api/superadmin'
import { useTranslations } from 'next-intl'
import classNames from '@/utils/classNames'
import { COLOR_1, COLOR_2, COLOR_3, COLOR_4 } from '@/constants/chart.constant'
import { formatSuperadminChartDayLabel } from '@/utils/dateTime'
import {
    PiBuildings,
    PiUsers,
    PiCalendarCheck,
    PiCurrencyDollar,
} from 'react-icons/pi'

const Chart = dynamic(() => import('@/components/shared/Chart'), {
    ssr: false,
    loading: () => (
        <div className="h-[425px] flex items-center justify-center">
            <Loading loading />
        </div>
    ),
})

const StatisticCard = memo((props) => {
    const {
        title,
        value,
        label,
        icon,
        growShrink,
        iconClass,
        active,
        compareFrom,
        onClick,
    } = props

    const handleClick = useCallback(() => {
        onClick(label)
    }, [onClick, label])

    return (
        <button
            type="button"
            className={classNames(
                'p-4 rounded-2xl cursor-pointer ltr:text-left rtl:text-right transition duration-150 outline-hidden',
                active && 'bg-white dark:bg-gray-900 shadow-md',
            )}
            onClick={handleClick}
        >
            <div className="flex md:flex-col-reverse gap-2 2xl:flex-row justify-between relative">
                <div>
                    <div className="mb-4 text-sm font-bold text-gray-500 dark:text-gray-400">{title}</div>
                    <h3 className="mb-1 text-gray-900 dark:text-gray-100">{value}</h3>
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
                </div>
                <div
                    className={classNames(
                        'flex items-center justify-center min-h-12 min-w-12 max-h-12 max-w-12 text-gray-900 rounded-full text-2xl',
                        iconClass,
                    )}
                >
                    {icon}
                </div>
            </div>
        </button>
    )
})
StatisticCard.displayName = 'StatisticCard'

const sum = (arr) => (Array.isArray(arr) ? arr.reduce((a, b) => a + (Number(b) || 0), 0) : 0)

export default function DashboardOverviewChart() {
    const t = useTranslations('superadmin.dashboard.overviewChart')
    const [days, setDays] = useState(14)
    const [selectedMetric, setSelectedMetric] = useState('bookings')

    const periodOptions = useMemo(
        () => [
            { value: 7, label: t('periods.days7') },
            { value: 14, label: t('periods.days14') },
            { value: 30, label: t('periods.days30') },
        ],
        [t],
    )

    const { data: chartRaw, isLoading, isError } = useQuery({
        queryKey: ['admin-dashboard-chart', days],
        queryFn: () => getAdminDashboardChart(days),
    })

    const byName = useMemo(() => {
        const m = {}
        chartRaw?.series?.forEach((s) => {
            m[s.name] = s.data || []
        })
        return m
    }, [chartRaw])

    const totals = useMemo(
        () => ({
            companies: sum(byName.companies),
            users: sum(byName.users),
            bookings: sum(byName.bookings),
            revenue: sum(byName.revenue),
        }),
        [byName],
    )

    const chartData = useMemo(() => {
        const data = byName[selectedMetric] || []
        const labels = chartRaw?.date || []
        const nameKey =
            selectedMetric === 'companies'
                ? 'seriesCompanies'
                : selectedMetric === 'users'
                  ? 'seriesUsers'
                  : selectedMetric === 'bookings'
                    ? 'seriesBookings'
                    : 'seriesRevenue'
        return {
            series: [{ name: t(nameKey), data: data }],
            date: (labels || []).map((l) =>
                l && String(l).match(/^\d{4}-\d{2}-\d{2}/)
                    ? formatSuperadminChartDayLabel(String(l).slice(0, 10))
                    : l,
            ),
        }
    }, [byName, selectedMetric, chartRaw?.date, t])

    const chartColors = {
        companies: COLOR_1,
        users: COLOR_2,
        bookings: COLOR_3,
        revenue: COLOR_4,
    }

    const chartOptions = useMemo(
        () => ({
            legend: { show: false },
            colors: [chartColors[selectedMetric] || COLOR_1],
        }),
        [selectedMetric, chartColors],
    )

    const companiesVal = useMemo(
        () => <AbbreviateNumber value={totals.companies} />,
        [totals.companies],
    )
    const usersVal = useMemo(
        () => <AbbreviateNumber value={totals.users} />,
        [totals.users],
    )
    const bookingsVal = useMemo(
        () => <AbbreviateNumber value={totals.bookings} />,
        [totals.bookings],
    )
    const revenueVal = useMemo(
        () => (
            <NumericFormat
                displayType="text"
                value={totals.revenue}
                prefix="$"
                thousandSeparator
                decimalScale={0}
            />
        ),
        [totals.revenue],
    )

    const handlePeriodChange = useCallback((option) => {
        if (option?.value != null) setDays(Number(option.value))
    }, [])

    return (
        <Card>
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                <Select
                    instanceId="superadmin-overview-period"
                    className="w-[150px]"
                    size="sm"
                    placeholder={t('selectPeriod')}
                    value={periodOptions.filter((o) => o.value === days)}
                    options={periodOptions}
                    isSearchable={false}
                    onChange={handlePeriodChange}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 rounded-2xl p-3 bg-gray-100 dark:bg-gray-700 mt-4">
                <StatisticCard
                    title={t('stats.companies')}
                    value={companiesVal}
                    growShrink={0}
                    iconClass="bg-blue-200 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                    icon={<PiBuildings />}
                    label="companies"
                    active={selectedMetric === 'companies'}
                    compareFrom={t('periodTotal')}
                    onClick={setSelectedMetric}
                />
                <StatisticCard
                    title={t('stats.users')}
                    value={usersVal}
                    growShrink={0}
                    iconClass="bg-emerald-200 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    icon={<PiUsers />}
                    label="users"
                    active={selectedMetric === 'users'}
                    compareFrom={t('periodTotal')}
                    onClick={setSelectedMetric}
                />
                <StatisticCard
                    title={t('stats.bookings')}
                    value={bookingsVal}
                    growShrink={0}
                    iconClass="bg-purple-200 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400"
                    icon={<PiCalendarCheck />}
                    label="bookings"
                    active={selectedMetric === 'bookings'}
                    compareFrom={t('periodTotal')}
                    onClick={setSelectedMetric}
                />
                <StatisticCard
                    title={t('stats.revenue')}
                    value={revenueVal}
                    growShrink={0}
                    iconClass="bg-amber-200 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    icon={<PiCurrencyDollar />}
                    label="revenue"
                    active={selectedMetric === 'revenue'}
                    compareFrom={t('periodTotal')}
                    onClick={setSelectedMetric}
                />
            </div>
            <div className="min-h-[425px]">
                {isLoading ? (
                    <div className="h-[425px] flex items-center justify-center">
                        <Loading loading />
                    </div>
                ) : isError ? (
                    <div className="h-[425px] flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('chartError')}
                    </div>
                ) : !chartData.series?.[0]?.data?.length ? (
                    <div className="h-[425px] flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('noData')}
                    </div>
                ) : (
                    <Chart
                        key={`${selectedMetric}-${days}`}
                        type="line"
                        series={chartData.series}
                        xAxis={chartData.date}
                        height="410px"
                        customOptions={chartOptions}
                    />
                )}
            </div>
        </Card>
    )
}

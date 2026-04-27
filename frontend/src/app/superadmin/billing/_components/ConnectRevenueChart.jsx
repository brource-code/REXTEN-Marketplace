'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import Loading from '@/components/shared/Loading'
import { NumericFormat } from 'react-number-format'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { getConnectRevenueChart } from '@/lib/api/superadmin-billing'
import { useTranslations } from 'next-intl'
import classNames from '@/utils/classNames'
import { COLOR_2, COLOR_5 } from '@/constants/chart.constant'
import { formatSuperadminChartDayLabel } from '@/utils/dateTime'
import { PiCurrencyDollar, PiReceipt } from 'react-icons/pi'

const Chart = dynamic(() => import('@/components/shared/Chart'), {
    ssr: false,
    loading: () => (
        <div className="h-[380px] flex items-center justify-center">
            <Loading loading />
        </div>
    ),
})

const StatisticCard = memo((props) => {
    const { title, value, icon, iconClass, active, label, onClick } = props
    const handleClick = useCallback(() => onClick(label), [onClick, label])
    return (
        <button
            type="button"
            className={classNames(
                'p-4 rounded-xl cursor-pointer ltr:text-left rtl:text-right transition duration-150 outline-hidden',
                active && 'bg-white dark:bg-gray-900 shadow-md',
            )}
            onClick={handleClick}
        >
            <div className="flex md:flex-col-reverse gap-2 2xl:flex-row justify-between relative">
                <div>
                    <div className="mb-2 text-sm font-bold text-gray-500 dark:text-gray-400">{title}</div>
                    <h3 className="mb-0 text-gray-900 dark:text-gray-100">{value}</h3>
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

export default function ConnectRevenueChart() {
    const t = useTranslations('superadmin.billing.connect.chart')
    const [days, setDays] = useState(14)
    const [metric, setMetric] = useState('revenue')

    const periodOptions = useMemo(
        () => [
            { value: 7, label: t('periods.days7') },
            { value: 14, label: t('periods.days14') },
            { value: 30, label: t('periods.days30') },
            { value: 90, label: t('periods.days90') },
        ],
        [t],
    )

    const { data: chartRaw, isLoading, isError } = useQuery({
        queryKey: ['superadmin-connect-chart', days],
        queryFn: () => getConnectRevenueChart(days),
        staleTime: 90_000,
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
            revenue: sum(byName.revenue),
            fees: sum(byName.fees),
        }),
        [byName],
    )

    const chartData = useMemo(() => {
        const data = byName[metric] || []
        const labels = chartRaw?.date || []
        const nameKey = metric === 'revenue' ? 'seriesRevenue' : 'seriesFees'
        return {
            series: [{ name: t(nameKey), data }],
            date: (labels || []).map((l) =>
                l && String(l).match(/^\d{4}-\d{2}-\d{2}/)
                    ? formatSuperadminChartDayLabel(String(l).slice(0, 10))
                    : l,
            ),
        }
    }, [byName, metric, chartRaw?.date, t])

    const colors = {
        revenue: COLOR_2,
        fees: COLOR_5,
    }

    const chartOptions = useMemo(
        () => ({
            legend: { show: false },
            colors: [colors[metric] || COLOR_2],
        }),
        [metric, colors],
    )

    const fmt = (v) => (
        <NumericFormat displayType="text" value={v} prefix="$" thousandSeparator decimalScale={0} />
    )

    return (
        <Card>
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                <Select
                    instanceId="superadmin-connect-chart-period"
                    className="w-[150px]"
                    size="sm"
                    placeholder={t('selectPeriod')}
                    value={periodOptions.filter((o) => o.value === days)}
                    options={periodOptions}
                    isSearchable={false}
                    onChange={(opt) => opt?.value != null && setDays(Number(opt.value))}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl p-3 bg-gray-100 dark:bg-gray-700 mt-4">
                <StatisticCard
                    title={t('stats.revenue')}
                    value={fmt(totals.revenue)}
                    iconClass="bg-emerald-200 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    icon={<PiCurrencyDollar />}
                    label="revenue"
                    active={metric === 'revenue'}
                    onClick={setMetric}
                />
                <StatisticCard
                    title={t('stats.fees')}
                    value={fmt(totals.fees)}
                    iconClass="bg-purple-200 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400"
                    icon={<PiReceipt />}
                    label="fees"
                    active={metric === 'fees'}
                    onClick={setMetric}
                />
            </div>
            <div className="min-h-[380px]">
                {isLoading ? (
                    <div className="h-[380px] flex items-center justify-center">
                        <Loading loading />
                    </div>
                ) : isError ? (
                    <div className="h-[380px] flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('chartError')}
                    </div>
                ) : !chartData.series?.[0]?.data?.length ? (
                    <div className="h-[380px] flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('noData')}
                    </div>
                ) : (
                    <Chart
                        key={`${metric}-${days}`}
                        type="area"
                        series={chartData.series}
                        xAxis={chartData.date}
                        height="360px"
                        customOptions={chartOptions}
                    />
                )}
            </div>
        </Card>
    )
}

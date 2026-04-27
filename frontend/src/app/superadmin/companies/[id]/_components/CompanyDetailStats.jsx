'use client'

import { useState, useMemo } from 'react'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import { NumericFormat } from 'react-number-format'
import { formatSuperadminChartDayLabel } from '@/utils/dateTime'
import { PiUsers, PiCurrencyDollar, PiCalendarCheck, PiChartLine } from 'react-icons/pi'
import dynamic from 'next/dynamic'
import Loading from '@/components/shared/Loading'
import { useQuery } from '@tanstack/react-query'
import { getCompanyStats, getCompanyChart } from '@/lib/api/superadmin'
import { useTranslations } from 'next-intl'

const Chart = dynamic(() => import('@/components/shared/Chart'), {
    ssr: false,
    loading: () => (
        <div className="h-[300px] flex items-center justify-center">
            <Loading loading />
        </div>
    ),
})

const defaultStats = {
    revenue: { thisWeek: 0, thisMonth: 0, thisYear: 0, total: 0 },
    bookings: { thisWeek: 0, thisMonth: 0, thisYear: 0, total: 0 },
    clients: { total: 0, active: 0, new: 0 },
    rating: 0,
}

export default function CompanyDetailStats({ companyId }) {
    const t = useTranslations('superadmin.companyDetail.stats')
    const [chartPeriod, setChartPeriod] = useState('thisWeek')

    const periodOptions = useMemo(
        () => [
            { value: 'thisWeek', label: t('periodWeek') },
            { value: 'thisMonth', label: t('periodMonth') },
            { value: 'thisYear', label: t('periodYear') },
        ],
        [t],
    )

    const { data: stats, isLoading } = useQuery({
        queryKey: ['company-stats', companyId],
        queryFn: () => getCompanyStats(companyId),
        enabled: !!companyId,
        retry: false,
    })

    const { data: chartDataFromAPI, isLoading: chartLoading, isError: chartError } = useQuery({
        queryKey: ['company-chart', companyId, chartPeriod],
        queryFn: () => getCompanyChart(companyId, chartPeriod),
        enabled: !!companyId,
        retry: false,
    })

    const companyStats =
        stats && typeof stats === 'object' && stats.clients ? stats : defaultStats

    const chartData =
        chartDataFromAPI?.series?.[0]?.data?.length > 0
            ? {
                  series: chartDataFromAPI.series,
                  categories: (chartDataFromAPI.categories || chartDataFromAPI.date || []).map(
                      (d) =>
                          d && String(d).match(/^\d{4}-\d{2}-\d{2}/)
                              ? formatSuperadminChartDayLabel(String(d).slice(0, 10))
                              : d,
                  ),
              }
            : { series: [{ name: t('revenue'), data: [] }], categories: [] }

    const handlePeriodChange = (opt) => opt?.value && setChartPeriod(opt.value)

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('revenueTotal')}
                        </div>
                        <PiCurrencyDollar className="text-2xl text-amber-500" />
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {isLoading ? (
                            <Loading loading />
                        ) : (
                            <NumericFormat
                                displayType="text"
                                value={companyStats.revenue.total}
                                prefix="$"
                                thousandSeparator
                            />
                        )}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('bookingsTotal')}
                        </div>
                        <PiCalendarCheck className="text-2xl text-blue-500" />
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {isLoading ? <Loading loading /> : companyStats.bookings.total}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('clientsTotal')}
                        </div>
                        <PiUsers className="text-2xl text-emerald-500" />
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {isLoading ? <Loading loading /> : companyStats.clients.total}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('rating')}
                        </div>
                        <PiChartLine className="text-2xl text-purple-500" />
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {isLoading ? <Loading loading /> : companyStats.rating}
                    </div>
                </Card>
            </div>

            <Card className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {t('chartTitle')}
                    </h4>
                    <div className="w-full sm:w-44">
                        <Select
                            size="sm"
                            instanceId={`company-chart-${companyId}`}
                            value={periodOptions.find((o) => o.value === chartPeriod)}
                            options={periodOptions}
                            isSearchable={false}
                            onChange={handlePeriodChange}
                        />
                    </div>
                </div>
                {chartLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                        <Loading loading />
                    </div>
                ) : chartError ? (
                    <div className="h-[300px] flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('chartError')}
                    </div>
                ) : !chartData.series[0]?.data?.length ? (
                    <div className="h-[300px] flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('noChartData')}
                    </div>
                ) : (
                    <Chart
                        series={chartData.series}
                        xAxis={chartData.categories}
                        height={300}
                    />
                )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['thisWeek', 'thisMonth', 'thisYear'].map((key) => (
                    <Card key={key} className="p-4">
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                            {key === 'thisWeek'
                                ? t('week')
                                : key === 'thisMonth'
                                  ? t('month')
                                  : t('year')}
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                            <NumericFormat
                                displayType="text"
                                value={companyStats.revenue[key]}
                                prefix="$"
                                thousandSeparator
                            />
                        </div>
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {companyStats.bookings[key]} {t('bookingsWord')}
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="p-4">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                    {t('clientsSection')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                            {t('clientsAll')}
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {companyStats.clients.total}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                            {t('clientsActive')}
                        </div>
                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {companyStats.clients.active}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                            {t('clientsNew')}
                        </div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {companyStats.clients.new}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}

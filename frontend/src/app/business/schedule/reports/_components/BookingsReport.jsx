'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Chart from '@/components/shared/Chart'
import { useBookingsReport } from '@/hooks/api/useBusinessReports'
import Loading from '@/components/shared/Loading'
import useTheme from '@/utils/hooks/useTheme'
import { MODE_DARK } from '@/constants/theme.constant'
import {
    getReportsLineChartOptions,
    statusKeyToChartColor,
} from './reportsChartOptions'
import ReportRankedTable, { RankBadge } from './ReportRankedTable'

function StatusDonutChart({ series = [], labels = [], keys = [], centerLabel = '', isDark = false }) {
    const total = series.reduce((sum, value) => sum + (Number(value) || 0), 0)
    const segments = series.map((rawValue, index) => {
        const value = Number(rawValue) || 0
        const percent = total > 0 ? (value / total) * 100 : 0
        return {
            value,
            percent,
            label: labels[index] || keys[index] || '',
            key: keys[index] || index,
            color: statusKeyToChartColor(keys[index]),
        }
    })
    const donutOptions = {
        colors: segments.map((segment) => segment.color),
        labels,
        chart: {
            fontFamily: 'inherit',
            sparkline: { enabled: false },
            toolbar: { show: false },
            animations: {
                enabled: true,
                speed: 450,
                animateGradually: { enabled: true, delay: 60 },
            },
        },
        plotOptions: {
            pie: {
                expandOnClick: false,
                donut: {
                    size: '73%',
                    labels: { show: false },
                },
            },
        },
        stroke: {
            show: true,
            width: 5,
            colors: [isDark ? '#111827' : '#ffffff'],
        },
        dataLabels: { enabled: false },
        legend: { show: false },
        states: {
            hover: { filter: { type: 'lighten', value: 0.06 } },
            active: { filter: { type: 'none', value: 0 } },
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: { formatter: (val) => `${val}` },
        },
    }

    return (
        <div className="flex min-h-[300px] w-full flex-col items-center justify-center gap-3 xl:flex-row xl:gap-5">
            <div className="relative h-[232px] w-[232px] shrink-0">
                <Chart
                    type="donut"
                    series={series}
                    customOptions={donutOptions}
                    height={232}
                    width={232}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full bg-white/88 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:bg-gray-900/82 dark:shadow-[inset_0_0_0_1px_rgba(148,163,184,0.16)]">
                        <span className="max-w-[86px] truncate text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                            {centerLabel}
                        </span>
                        <span className="mt-1 text-xl font-bold leading-none tabular-nums text-gray-900 dark:text-gray-100">
                            {total}
                        </span>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-[260px] rounded-xl border border-gray-200/80 bg-white/75 p-2.5 shadow-sm ring-1 ring-gray-900/[0.02] backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-900/30 dark:ring-white/[0.04]">
                <div className="grid grid-cols-1 gap-1.5">
                {segments.map((segment) => (
                    <div
                        key={`legend-${segment.key}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-2 transition-colors hover:bg-white dark:border-gray-700/70 dark:bg-gray-800/55 dark:hover:bg-gray-800"
                    >
                        <div className="flex min-w-0 items-center gap-2">
                            <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: segment.color }}
                            />
                            <span className="truncate text-xs font-bold text-gray-600 dark:text-gray-300">
                                {segment.label}
                            </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 text-right tabular-nums">
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                {segment.value}
                            </span>
                            <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-gray-500 shadow-sm dark:bg-gray-900/70 dark:text-gray-400">
                                {Math.round(segment.percent)}%
                            </span>
                        </div>
                    </div>
                ))}
                </div>
            </div>
        </div>
    )
}

export default function BookingsReport({ filters }) {
    const t = useTranslations('nav.business.schedule.reports.bookings')
    const tCommon = useTranslations('nav.business.schedule.reports')
    const tTable = useTranslations('nav.business.schedule.reports.table')
    const tStatuses = useTranslations('business.schedule.statuses')
    const isDark = useTheme((s) => s.mode === MODE_DARK)

    const getStatusLabel = (status) => {
        const statusKey = status?.toLowerCase()
        try {
            return tStatuses(statusKey) || status
        } catch {
            return status ? status.charAt(0).toUpperCase() + status.slice(1) : status
        }
    }

    const { data, isLoading, error } = useBookingsReport(filters)

    const chartData = useMemo(() => {
        if (!data?.byPeriod || data.byPeriod.length === 0) {
            return {
                series: [{ name: t('byPeriod'), data: [] }],
                categories: [],
            }
        }

        return {
            series: [
                {
                    name: t('byPeriod'),
                    data: data.byPeriod.map((item) => item.count),
                },
            ],
            categories: data.byPeriod.map((item) => item.period),
        }
    }, [data, t])

    const statusChartData = useMemo(() => {
        if (!data?.byStatus || data.byStatus.length === 0) {
            return {
                series: [],
                labels: [],
                keys: [],
            }
        }

        return {
            series: data.byStatus.map((item) => item.count),
            labels: data.byStatus.map((item) => getStatusLabel(item.status)),
            keys: data.byStatus.map((item) => item.status),
        }
    }, [data, tStatuses])

    const lineOptions = useMemo(() => getReportsLineChartOptions({ isDark }), [isDark])
    if (isLoading) {
        return (
            <Card>
                <div className="flex min-h-[200px] items-center justify-center">
                    <Loading loading />
                </div>
            </Card>
        )
    }

    if (error || !data) {
        return (
            <Card>
                <div className="py-8 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                    {tCommon('noData')}
                </div>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <Card>
                <div className="mb-4">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="min-w-0 rounded-xl border border-gray-100 bg-gray-50/40 p-3 dark:border-gray-700/80 dark:bg-gray-800/30">
                        <h4 className="mb-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('byPeriod')}
                        </h4>
                        <Chart
                            type="line"
                            series={chartData.series}
                            xAxis={chartData.categories}
                            height={280}
                            customOptions={lineOptions}
                        />
                    </div>
                    <div className="min-w-0 rounded-xl border border-gray-100 bg-gray-50/40 p-3 shadow-inner ring-1 ring-inset ring-gray-900/[0.04] dark:border-gray-700/80 dark:bg-gray-800/30 dark:ring-white/[0.06]">
                        <h4 className="mb-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('byStatus')}
                        </h4>
                        {statusChartData.series.length > 0 ? (
                            <StatusDonutChart
                                series={statusChartData.series}
                                labels={statusChartData.labels}
                                keys={statusChartData.keys}
                                centerLabel={tCommon('donutTotalBookings')}
                                isDark={isDark}
                            />
                        ) : (
                            <div className="flex h-[300px] items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
                                {tCommon('noData')}
                            </div>
                        )}
                    </div>
                </div>

                {data.topServices && data.topServices.length > 0 && (
                    <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                        <h4 className="mb-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('topServices')}
                        </h4>
                        <ReportRankedTable
                            rows={data.topServices}
                            getRowKey={(row) => row.serviceId}
                            columns={[
                                {
                                    header: tTable('number'),
                                    thClassName: 'w-14',
                                    render: (_, index) => <RankBadge rank={index + 1} />,
                                },
                                {
                                    header: tTable('service'),
                                    render: (row) => (
                                        <span className="block max-w-[320px] truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {row.serviceName}
                                        </span>
                                    ),
                                },
                                {
                                    header: tTable('bookings'),
                                    align: 'right',
                                    render: (row) => (
                                        <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                            {row.count}
                                        </span>
                                    ),
                                },
                            ]}
                        />
                    </div>
                )}
            </Card>
        </div>
    )
}

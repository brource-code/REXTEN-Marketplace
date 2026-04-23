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
    getReportsDonutChartOptions,
    getReportsLineChartOptions,
} from './reportsChartOptions'
import ReportRankedTable, { RankBadge } from './ReportRankedTable'

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
    const donutOptions = useMemo(
        () =>
            getReportsDonutChartOptions({
                labels: statusChartData.labels,
                statusKeys: statusChartData.keys,
                isDark,
                totalCenterLabel: tCommon('donutTotalBookings'),
            }),
        [statusChartData.labels, statusChartData.keys, isDark, tCommon],
    )

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
        <div className="space-y-6">
            <Card>
                <div className="mb-4">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                    <div className="min-w-0 rounded-xl border border-gray-100 bg-gray-50/40 p-3 dark:border-gray-700/80 dark:bg-gray-800/30">
                        <h4 className="mb-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('byStatus')}
                        </h4>
                        {statusChartData.series.length > 0 ? (
                            <Chart
                                type="donut"
                                series={statusChartData.series}
                                customOptions={donutOptions}
                                height={280}
                            />
                        ) : (
                            <div className="flex h-[280px] items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
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

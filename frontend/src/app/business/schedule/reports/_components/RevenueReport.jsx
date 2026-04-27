'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Chart from '@/components/shared/Chart'
import { useRevenueReport } from '@/hooks/api/useBusinessReports'
import Loading from '@/components/shared/Loading'
import useTheme from '@/utils/hooks/useTheme'
import { MODE_DARK } from '@/constants/theme.constant'
import {
    getReportsAreaChartOptions,
    getReportsRevenueYAxisFormatter,
} from './reportsChartOptions'
import ReportRankedTable, { RankBadge, MoneyValue } from './ReportRankedTable'

export default function RevenueReport({ filters }) {
    const t = useTranslations('nav.business.schedule.reports.revenue')
    const tCommon = useTranslations('nav.business.schedule.reports')
    const tTable = useTranslations('nav.business.schedule.reports.table')
    const isDark = useTheme((s) => s.mode === MODE_DARK)

    const { data, isLoading, error } = useRevenueReport(filters)

    const revenueChartData = useMemo(() => {
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
                    data: data.byPeriod.map((item) => item.revenue),
                },
            ],
            categories: data.byPeriod.map((item) => item.period),
        }
    }, [data, t])

    const areaOptions = useMemo(() => {
        const fmt = getReportsRevenueYAxisFormatter()
        const base = getReportsAreaChartOptions({ isDark })
        return {
            ...base,
            yaxis: {
                ...base.yaxis,
                labels: {
                    ...base.yaxis?.labels,
                    formatter: fmt,
                },
            },
            tooltip: {
                ...base.tooltip,
                y: {
                    formatter: (val) =>
                        new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                        }).format(Number(val) || 0),
                },
            },
        }
    }, [isDark])

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
        <Card>
            <div className="mb-4">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
            </div>

            <div className="space-y-4">
                {data.byPeriod && data.byPeriod.length > 0 && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-3 dark:border-gray-700/80 dark:bg-gray-800/30">
                        <h4 className="mb-3 text-sm font-bold text-gray-500 dark:text-gray-400">{t('byPeriod')}</h4>
                        <Chart
                            type="area"
                            series={revenueChartData.series}
                            xAxis={revenueChartData.categories}
                            height={280}
                            customOptions={areaOptions}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {data.byService && data.byService.length > 0 && (
                        <div className="min-w-0 border-t border-gray-200 pt-4 dark:border-gray-700 lg:border-t-0 lg:pt-0">
                            <h4 className="mb-3 text-sm font-bold text-gray-500 dark:text-gray-400">{t('byService')}</h4>
                            <ReportRankedTable
                                rows={data.byService}
                                getRowKey={(row) => row.serviceId}
                                mobileValueLabel={tTable('amount')}
                                columns={[
                                    {
                                        header: tTable('number'),
                                        thClassName: 'w-14',
                                        render: (_, index) => <RankBadge rank={index + 1} />,
                                    },
                                    {
                                        header: tTable('service'),
                                        render: (row) => (
                                            <span className="block max-w-[280px] truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {row.serviceName}
                                            </span>
                                        ),
                                    },
                                    {
                                        header: tTable('amount'),
                                        align: 'right',
                                        render: (row) => <MoneyValue value={row.revenue} />,
                                    },
                                ]}
                            />
                        </div>
                    )}

                    {data.bySpecialist && data.bySpecialist.length > 0 && (
                        <div className="min-w-0 border-t border-gray-200 pt-4 dark:border-gray-700 lg:border-t-0 lg:pt-0">
                            <h4 className="mb-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('bySpecialist')}
                            </h4>
                            <ReportRankedTable
                                rows={data.bySpecialist}
                                getRowKey={(row) => row.specialistId}
                                mobileValueLabel={tTable('amount')}
                                columns={[
                                    {
                                        header: tTable('number'),
                                        thClassName: 'w-14',
                                        render: (_, index) => <RankBadge rank={index + 1} />,
                                    },
                                    {
                                        header: tTable('specialist'),
                                        render: (row) => (
                                            <span className="block max-w-[280px] truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {row.specialistName}
                                            </span>
                                        ),
                                    },
                                    {
                                        header: tTable('amount'),
                                        align: 'right',
                                        render: (row) => <MoneyValue value={row.revenue} />,
                                    },
                                ]}
                            />
                        </div>
                    )}
                </div>
            </div>
        </Card>
    )
}

'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Chart from '@/components/shared/Chart'
import { useClientsReport } from '@/hooks/api/useBusinessReports'
import Loading from '@/components/shared/Loading'
import useTheme from '@/utils/hooks/useTheme'
import { MODE_DARK } from '@/constants/theme.constant'
import { getReportsBarChartOptions } from './reportsChartOptions'
import ReportRankedTable, { RankBadge, MoneyValue } from './ReportRankedTable'

export default function ClientsReport({ filters }) {
    const t = useTranslations('nav.business.schedule.reports.clients')
    const tCommon = useTranslations('nav.business.schedule.reports')
    const tTable = useTranslations('nav.business.schedule.reports.table')
    const isDark = useTheme((s) => s.mode === MODE_DARK)

    const { data, isLoading, error } = useClientsReport(filters)

    const newClientsChartData = useMemo(() => {
        if (!data?.newClients || data.newClients.length === 0) {
            return {
                series: [{ name: t('newClients'), data: [] }],
                categories: [],
            }
        }

        return {
            series: [
                {
                    name: t('newClients'),
                    data: data.newClients.map((item) => item.count),
                },
            ],
            categories: data.newClients.map((item) => item.period),
        }
    }, [data, t])

    const barOptions = useMemo(() => getReportsBarChartOptions({ isDark }), [isDark])

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
                {data.newClients && data.newClients.length > 0 && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-3 dark:border-gray-700/80 dark:bg-gray-800/30">
                        <h4 className="mb-3 text-sm font-bold text-gray-500 dark:text-gray-400">{t('newClients')}</h4>
                        <Chart
                            type="bar"
                            series={newClientsChartData.series}
                            xAxis={newClientsChartData.categories}
                            height={280}
                            customOptions={barOptions}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {data.topByBookings && data.topByBookings.length > 0 && (
                        <div className="min-w-0 border-t border-gray-200 pt-4 dark:border-gray-700 lg:border-t-0 lg:pt-0">
                            <h4 className="mb-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('topByBookings')}
                            </h4>
                            <ReportRankedTable
                                rows={data.topByBookings}
                                getRowKey={(row, index) =>
                                    `bookings-${row.clientId ?? 'na'}-${index}`
                                }
                                mobileValueLabel={tTable('bookings')}
                                columns={[
                                    {
                                        header: tTable('number'),
                                        thClassName: 'w-14',
                                        render: (_, index) => <RankBadge rank={index + 1} />,
                                    },
                                    {
                                        header: tTable('client'),
                                        render: (row) => (
                                            <span className="block max-w-[280px] truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {row.clientName}
                                            </span>
                                        ),
                                    },
                                    {
                                        header: tTable('bookings'),
                                        align: 'right',
                                        render: (row) => (
                                            <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                                {row.bookings}
                                            </span>
                                        ),
                                    },
                                ]}
                            />
                        </div>
                    )}

                    {data.topByRevenue && data.topByRevenue.length > 0 && (
                        <div className="min-w-0 border-t border-gray-200 pt-4 dark:border-gray-700 lg:border-t-0 lg:pt-0">
                            <h4 className="mb-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('topByRevenue')}
                            </h4>
                            <ReportRankedTable
                                rows={data.topByRevenue}
                                getRowKey={(row, index) =>
                                    `revenue-${row.clientId ?? 'na'}-${index}`
                                }
                                mobileValueLabel={tTable('amount')}
                                columns={[
                                    {
                                        header: tTable('number'),
                                        thClassName: 'w-14',
                                        render: (_, index) => <RankBadge rank={index + 1} />,
                                    },
                                    {
                                        header: tTable('client'),
                                        render: (row) => (
                                            <span className="block max-w-[280px] truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {row.clientName}
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

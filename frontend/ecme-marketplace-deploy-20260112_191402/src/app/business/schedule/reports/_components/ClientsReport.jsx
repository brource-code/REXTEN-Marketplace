'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Chart from '@/components/shared/Chart'
import { NumericFormat } from 'react-number-format'
import { useClientsReport } from '@/hooks/api/useBusinessReports'
import Loading from '@/components/shared/Loading'
export default function ClientsReport({ filters }) {
    const t = useTranslations('nav.business.schedule.reports.clients')
    const tCommon = useTranslations('nav.business.schedule.reports')
    const tTable = useTranslations('nav.business.schedule.reports.table')
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

    if (isLoading) {
        return (
            <Card>
                <div className="flex items-center justify-center min-h-[200px]">
                    <Loading loading />
                </div>
            </Card>
        )
    }

    if (error || !data) {
        return (
            <Card>
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    {tCommon('noData')}
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <div className="mb-4">
                <h2 className="h4 heading-text">{t('title')}</h2>
            </div>

            <div className="space-y-6">
                {data.newClients && data.newClients.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold heading-text mb-4">{t('newClients')}</h3>
                        <Chart
                            type="bar"
                            series={newClientsChartData.series}
                            xAxis={newClientsChartData.categories}
                            height={300}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {data.topByBookings && data.topByBookings.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold heading-text mb-4">{t('topByBookings')}</h3>
                            <Table>
                            <thead>
                                <tr>
                                    <th>{tTable('number')}</th>
                                    <th>{tCommon('overview.uniqueClients')}</th>
                                    <th>{tCommon('overview.totalBookings')}</th>
                                </tr>
                            </thead>
                                <tbody>
                                    {data.topByBookings.map((client, index) => (
                                        <tr key={client.clientId || `unregistered-${index}`}>
                                            <td>{index + 1}</td>
                                            <td>{client.clientName}</td>
                                            <td>{client.bookings}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}

                    {data.topByRevenue && data.topByRevenue.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold heading-text mb-4">{t('topByRevenue')}</h3>
                            <Table>
                            <thead>
                                <tr>
                                    <th>{tTable('number')}</th>
                                    <th>{tCommon('overview.uniqueClients')}</th>
                                    <th>{tCommon('overview.totalRevenue')}</th>
                                </tr>
                            </thead>
                                <tbody>
                                    {data.topByRevenue.map((client, index) => (
                                        <tr key={client.clientId || `unregistered-${index}`}>
                                            <td>{index + 1}</td>
                                            <td>{client.clientName}</td>
                                            <td>
                                                <NumericFormat
                                                    displayType="text"
                                                    value={client.revenue}
                                                    prefix="$"
                                                    thousandSeparator={true}
                                                    decimalScale={2}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    )
}


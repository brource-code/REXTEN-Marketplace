'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Chart from '@/components/shared/Chart'
import { useBookingsReport } from '@/hooks/api/useBusinessReports'
import Loading from '@/components/shared/Loading'

// Метки статусов как в системе
const bookingStatusLabels = {
    new: 'Новый',
    pending: 'Ожидает',
    confirmed: 'Подтверждено',
    completed: 'Завершено',
    cancelled: 'Отменено',
}

export default function BookingsReport({ filters }) {
    const t = useTranslations('nav.business.schedule.reports.bookings')
    const tCommon = useTranslations('nav.business.schedule.reports')
    const tTable = useTranslations('nav.business.schedule.reports.table')
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
            }
        }

        return {
            series: data.byStatus.map((item) => item.count),
            labels: data.byStatus.map((item) => {
                // Используем метки из системы, если статус найден, иначе оставляем как есть с заглавной буквы
                const statusKey = item.status?.toLowerCase()
                return bookingStatusLabels[statusKey] || (item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : item.status)
            }),
        }
    }, [data])


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
        <div className="space-y-6">
            <Card>
                <div className="mb-4">
                    <h2 className="h4 heading-text">{t('title')}</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div>
                        <h3 className="text-sm font-semibold heading-text mb-4">{t('byPeriod')}</h3>
                        <Chart
                            type="line"
                            series={chartData.series}
                            xAxis={chartData.categories}
                            height={300}
                        />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold heading-text mb-4">{t('byStatus')}</h3>
                        <Chart
                            type="donut"
                            series={statusChartData.series}
                            customOptions={{ 
                                labels: statusChartData.labels,
                                plotOptions: {
                                    pie: {
                                        donut: {
                                            labels: {
                                                show: true,
                                                total: {
                                                    show: true,
                                                    showAlways: true,
                                                    label: '',
                                                    formatter: function (w) {
                                                        return w.globals.seriesTotals.reduce((a, b) => {
                                                            return a + b
                                                        }, 0)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }}
                            height={300}
                        />
                    </div>
                </div>

                {data.topServices && data.topServices.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold heading-text mb-4">{t('topServices')}</h3>
                        <Table>
                            <thead>
                                <tr>
                                    <th>{tTable('number')}</th>
                                    <th>{t('topServices')}</th>
                                    <th>{tCommon('overview.totalBookings')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topServices.map((service, index) => (
                                    <tr key={service.serviceId}>
                                        <td>{index + 1}</td>
                                        <td>{service.serviceName}</td>
                                        <td>{service.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
            </Card>
        </div>
    )
}


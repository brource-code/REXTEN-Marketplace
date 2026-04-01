'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Chart from '@/components/shared/Chart'
import { NumericFormat } from 'react-number-format'
import { useRevenueReport } from '@/hooks/api/useBusinessReports'
import Loading from '@/components/shared/Loading'
export default function RevenueReport({ filters }) {
    const t = useTranslations('nav.business.schedule.reports.revenue')
    const tCommon = useTranslations('nav.business.schedule.reports')
    const tTable = useTranslations('nav.business.schedule.reports.table')
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
                {data.byPeriod && data.byPeriod.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold heading-text mb-4">{t('byPeriod')}</h3>
                        <Chart
                            type="area"
                            series={revenueChartData.series}
                            xAxis={revenueChartData.categories}
                            height={300}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {data.byService && data.byService.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold heading-text mb-4">{t('byService')}</h3>
                            <Table>
                            <thead>
                                <tr>
                                    <th>{tTable('number')}</th>
                                    <th>{t('byService')}</th>
                                    <th>{tCommon('overview.totalRevenue')}</th>
                                </tr>
                            </thead>
                                <tbody>
                                    {data.byService.map((service, index) => (
                                        <tr key={service.serviceId}>
                                            <td>{index + 1}</td>
                                            <td>{service.serviceName}</td>
                                            <td>
                                                <NumericFormat
                                                    displayType="text"
                                                    value={service.revenue}
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

                    {data.bySpecialist && data.bySpecialist.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold heading-text mb-4">{t('bySpecialist')}</h3>
                            <Table>
                            <thead>
                                <tr>
                                    <th>{tTable('number')}</th>
                                    <th>{t('bySpecialist')}</th>
                                    <th>{tCommon('overview.totalRevenue')}</th>
                                </tr>
                            </thead>
                                <tbody>
                                    {data.bySpecialist.map((specialist, index) => (
                                        <tr key={specialist.specialistId}>
                                            <td>{index + 1}</td>
                                            <td>{specialist.specialistName}</td>
                                            <td>
                                                <NumericFormat
                                                    displayType="text"
                                                    value={specialist.revenue}
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


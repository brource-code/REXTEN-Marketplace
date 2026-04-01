'use client'

import { useMemo } from 'react'
import Card from '@/components/ui/Card'
import Loading from '@/components/shared/Loading'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { getSuperadminBillingRevenueStructure } from '@/lib/api/superadmin-billing'
import { useTranslations } from 'next-intl'
import { NumericFormat } from 'react-number-format'

function formatMoney(n) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(n || 0)
}

const Chart = dynamic(() => import('@/components/shared/Chart'), {
    ssr: false,
    loading: () => (
        <div className="h-[280px] flex items-center justify-center">
            <Loading loading />
        </div>
    ),
})

export default function BillingStructureDonut() {
    const t = useTranslations('superadmin.billing.structure')
    const { data, isLoading, isError } = useQuery({
        queryKey: ['superadmin-billing-structure'],
        queryFn: getSuperadminBillingRevenueStructure,
        staleTime: 90_000,
    })

    const series = useMemo(() => {
        if (!data || data.total <= 0) return null
        return [data.advertisement || 0, data.subscription || 0, data.other || 0]
    }, [data])

    const labels = useMemo(
        () => [t('ads'), t('subscriptions'), t('other')],
        [t],
    )

    if (!data?.stripe_configured && !isLoading) {
        return null
    }

    return (
        <Card>
            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('title')}</h4>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">{t('subtitle')}</p>
            {isLoading ? (
                <div className="h-[280px] flex items-center justify-center">
                    <Loading loading />
                </div>
            ) : isError ? (
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('error')}</div>
            ) : !series || data.total <= 0 ? (
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('noData')}</div>
            ) : (
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-1 min-h-[260px] flex justify-center">
                        <Chart
                            type="donut"
                            series={series}
                            height={260}
                            donutTitle={t('total')}
                            donutText={formatMoney(data.total)}
                            customOptions={{
                                labels: labels,
                                legend: { position: 'bottom' },
                            }}
                        />
                    </div>
                    <ul className="flex flex-col gap-3 md:w-48">
                        <li className="flex justify-between text-sm font-bold">
                            <span className="text-gray-500 dark:text-gray-400">{t('ads')}</span>
                            <span className="text-gray-900 dark:text-gray-100">
                                <NumericFormat
                                    displayType="text"
                                    value={data.advertisement}
                                    prefix="$"
                                    thousandSeparator
                                    decimalScale={0}
                                />
                            </span>
                        </li>
                        <li className="flex justify-between text-sm font-bold">
                            <span className="text-gray-500 dark:text-gray-400">{t('subscriptions')}</span>
                            <span className="text-gray-900 dark:text-gray-100">
                                <NumericFormat
                                    displayType="text"
                                    value={data.subscription}
                                    prefix="$"
                                    thousandSeparator
                                    decimalScale={0}
                                />
                            </span>
                        </li>
                        <li className="flex justify-between text-sm font-bold">
                            <span className="text-gray-500 dark:text-gray-400">{t('other')}</span>
                            <span className="text-gray-900 dark:text-gray-100">
                                <NumericFormat
                                    displayType="text"
                                    value={data.other}
                                    prefix="$"
                                    thousandSeparator
                                    decimalScale={0}
                                />
                            </span>
                        </li>
                    </ul>
                </div>
            )}
        </Card>
    )
}

'use client'

import Card from '@/components/ui/Card'
import Loading from '@/components/shared/Loading'
import { useQuery } from '@tanstack/react-query'
import { getSuperadminBillingRevenueByCompany } from '@/lib/api/superadmin-billing'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { NumericFormat } from 'react-number-format'

export default function BillingTopCompanies() {
    const t = useTranslations('superadmin.billing.topCompanies')
    const { data, isLoading, isError } = useQuery({
        queryKey: ['superadmin-billing-top-companies'],
        queryFn: () => getSuperadminBillingRevenueByCompany(10),
        staleTime: 90_000,
    })

    if (!data?.stripe_configured && !isLoading) {
        return null
    }

    return (
        <Card>
            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{t('title')}</h4>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">{t('subtitle')}</p>
            {isLoading ? (
                <div className="py-8 flex justify-center">
                    <Loading loading />
                </div>
            ) : isError ? (
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('error')}</p>
            ) : !data?.companies?.length ? (
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('empty')}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="pb-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                                    #
                                </th>
                                <th className="pb-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {t('company')}
                                </th>
                                <th className="pb-2 text-sm font-bold text-gray-500 dark:text-gray-400 text-right">
                                    {t('count')}
                                </th>
                                <th className="pb-2 text-sm font-bold text-gray-500 dark:text-gray-400 text-right">
                                    {t('amount')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.companies.map((c, i) => (
                                <tr
                                    key={c.company_id}
                                    className="border-b border-gray-100 dark:border-gray-800"
                                >
                                    <td className="py-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {i + 1}
                                    </td>
                                    <td className="py-2">
                                        <Link
                                            href={`/superadmin/companies/${c.company_id}`}
                                            className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            {c.company_name}
                                        </Link>
                                    </td>
                                    <td className="py-2 text-sm font-bold text-gray-900 dark:text-gray-100 text-right">
                                        {c.transaction_count}
                                    </td>
                                    <td className="py-2 text-sm font-bold text-gray-900 dark:text-gray-100 text-right">
                                        <NumericFormat
                                            displayType="text"
                                            value={c.total_amount}
                                            prefix="$"
                                            thousandSeparator
                                            decimalScale={2}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    )
}

'use client'

import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import { useQuery } from '@tanstack/react-query'
import { getSuperadminBillingOverview } from '@/lib/api/superadmin-billing'
import { useTranslations } from 'next-intl'
import BillingStatCards from './_components/BillingStatCards'
import BillingRevenueChart from './_components/BillingRevenueChart'
import BillingStructureDonut from './_components/BillingStructureDonut'
import BillingTransactionsTable from './_components/BillingTransactionsTable'
import BillingTopCompanies from './_components/BillingTopCompanies'
import BillingReportsColumn from './_components/BillingReportsColumn'

export default function SuperadminBillingPage() {
    const t = useTranslations('superadmin.billing')
    const { data: overview, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['superadmin-billing-overview'],
        queryFn: getSuperadminBillingOverview,
        staleTime: 60_000,
    })

    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    if (isError) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400 mt-2">
                            {error?.message || t('loadError')}
                        </p>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="mt-4 text-sm font-bold text-blue-600 dark:text-blue-400"
                        >
                            {t('retry')}
                        </button>
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    const stripeOk = overview?.stripe_configured !== false

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
                    </div>

                    {!stripeOk && (
                        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{t('stripeWarning')}</p>
                        </div>
                    )}

                    <BillingStatCards overview={overview} />

                    <BillingRevenueChart />

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="xl:col-span-2 flex flex-col gap-4 min-w-0">
                            <BillingStructureDonut />
                            <BillingTransactionsTable />
                        </div>
                        <div className="flex flex-col gap-4 min-w-0 xl:max-w-none">
                            <BillingReportsColumn />
                            <BillingTopCompanies />
                        </div>
                    </div>
                </div>
            </AdaptiveCard>
        </Container>
    )
}

'use client'

import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import { useQuery } from '@tanstack/react-query'
import { getSuperadminBillingOverview } from '@/lib/api/superadmin-billing'
import { useTranslations } from 'next-intl'
import Tabs from '@/components/ui/Tabs'
import BillingStatCards from './_components/BillingStatCards'
import BillingRevenueChart from './_components/BillingRevenueChart'
import BillingStructureDonut from './_components/BillingStructureDonut'
import BillingTransactionsTable from './_components/BillingTransactionsTable'
import BillingTopCompanies from './_components/BillingTopCompanies'
import BillingReportsColumn from './_components/BillingReportsColumn'
import ConnectOverviewCards from './_components/ConnectOverviewCards'
import ConnectAccountsTable from './_components/ConnectAccountsTable'
import ConnectPaymentsTable from './_components/ConnectPaymentsTable'
import ConnectRevenueChart from './_components/ConnectRevenueChart'
import { PiChartLine, PiCreditCard } from 'react-icons/pi'

const { TabNav, TabList, TabContent } = Tabs

export default function SuperadminBillingPage() {
    const t = useTranslations('superadmin.billing')

    const { data: overview, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['superadmin-billing-overview'],
        queryFn: getSuperadminBillingOverview,
        staleTime: 60_000,
    })

    const stripeOk = overview?.stripe_configured !== false

    return (
        <Container>
            <AdaptiveCard>
                <div className="mb-6">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
                </div>

                <Tabs defaultValue="platform">
                    <TabList className="overflow-x-auto pb-1 gap-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 rounded">
                        <TabNav value="platform" icon={<PiChartLine />} className="shrink-0">
                            {t('tabs.platform')}
                        </TabNav>
                        <TabNav value="connect" icon={<PiCreditCard />} className="shrink-0">
                            {t('tabs.connect')}
                        </TabNav>
                    </TabList>
                    <div className="p-4 sm:p-6 -mx-4 sm:mx-0">
                        <TabContent value="platform">
                            <div className="flex flex-col gap-4">
                                {isLoading && (
                                    <div className="flex items-center justify-center min-h-[320px]">
                                        <Loading loading />
                                    </div>
                                )}
                                {!isLoading && isError && (
                                    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
                                        <p className="text-sm font-bold text-red-600 dark:text-red-400">
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
                                )}
                                {!isLoading && !isError && (
                                    <>
                                        {!stripeOk && (
                                            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                                                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                                                    {t('stripeWarning')}
                                                </p>
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
                                    </>
                                )}
                            </div>
                        </TabContent>
                        <TabContent value="connect">
                            <div className="flex flex-col gap-4">
                                <ConnectOverviewCards />
                                <ConnectRevenueChart />
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    <ConnectAccountsTable />
                                    <ConnectPaymentsTable />
                                </div>
                            </div>
                        </TabContent>
                    </div>
                </Tabs>
            </AdaptiveCard>
        </Container>
    )
}

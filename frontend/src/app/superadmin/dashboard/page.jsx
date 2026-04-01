'use client'

import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import { useQuery } from '@tanstack/react-query'
import { getAdminDashboardStats } from '@/lib/api/superadmin'
import { useTranslations } from 'next-intl'
import DashboardStatCards from './_components/DashboardStatCards'
import DashboardOverviewChart from './_components/DashboardOverviewChart'
import DashboardTopTables from './_components/DashboardTopTables'
import DashboardActivity from './_components/DashboardActivity'
import DashboardQuickActions from './_components/DashboardQuickActions'

export default function Page() {
    const t = useTranslations('superadmin.dashboard')
    const { data: stats, isLoading, isError, error } = useQuery({
        queryKey: ['admin-dashboard-stats'],
        queryFn: getAdminDashboardStats,
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
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {t('pageTitle')}
                        </h4>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400 mt-2">
                            {error?.message || 'Error'}
                        </p>
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4 max-w-full overflow-x-hidden">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('pageTitle')}</h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                {t('title')}
                            </p>
                        </div>
                    </div>

                    <DashboardStatCards stats={stats} />

                    <DashboardOverviewChart />

                    <DashboardTopTables stats={stats} />

                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 min-w-0">
                            <DashboardActivity />
                        </div>
                        <div className="lg:w-[320px] lg:flex-shrink-0 w-full">
                            <DashboardQuickActions stats={stats} />
                        </div>
                    </div>
                </div>
            </AdaptiveCard>
        </Container>
    )
}

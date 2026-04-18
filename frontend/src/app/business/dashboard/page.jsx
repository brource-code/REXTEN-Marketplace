'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import BusinessOverview from './_components/BusinessOverview'
import RecentBookings from './_components/RecentBookings'
import QuickActions from './_components/QuickActions'
import DashboardInsightsColumn from './_components/DashboardInsightsColumn'
import BusinessStats from './_components/BusinessStats'
import { useQuery } from '@tanstack/react-query'
import { getBusinessStats } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import PermissionGuard from '@/components/shared/PermissionGuard'

/**
 * Дашборд бизнеса
 * Статистика, метрики, последние бронирования, быстрые действия
 */
export default function Page() {
    return (
        <PermissionGuard permission="view_dashboard">
            <DashboardPageContent />
        </PermissionGuard>
    )
}

function DashboardPageContent() {
    const t = useTranslations('business.dashboard')
    const { data: stats, isLoading } = useQuery({
        queryKey: ['business-stats'],
        queryFn: getBusinessStats,
    })

    // Преобразуем данные для BusinessOverview
    // Данные по периодам приходят напрямую с бэкенда
    const overviewData = useMemo(() => {
        if (!stats) return null

        return {
            revenue: {
                thisWeek: stats.revenue?.thisWeek ?? { value: 0, growShrink: 0 },
                thisMonth: stats.revenue?.thisMonth ?? { value: 0, growShrink: 0 },
                thisYear: stats.revenue?.thisYear ?? { value: 0, growShrink: 0 },
            },
            bookings: {
                thisWeek: stats.bookings?.thisWeek ?? { value: 0, growShrink: 0 },
                thisMonth: stats.bookings?.thisMonth ?? { value: 0, growShrink: 0 },
                thisYear: stats.bookings?.thisYear ?? { value: 0, growShrink: 0 },
            },
            clients: {
                thisWeek: stats.clients?.thisWeek ?? { value: 0, growShrink: 0 },
                thisMonth: stats.clients?.thisMonth ?? { value: 0, growShrink: 0 },
                thisYear: stats.clients?.thisYear ?? { value: 0, growShrink: 0 },
            },
        }
    }, [stats])

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

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4 max-w-full overflow-x-hidden" data-tour="page-dashboard-main">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('overview')}</p>
                    </div>

                    <BusinessStats stats={stats} />

                    {overviewData && (
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                            <div className="min-w-0 flex-1">
                                <BusinessOverview data={overviewData} />
                            </div>
                            <DashboardInsightsColumn stats={stats ?? {}} />
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 min-w-0">
                            <RecentBookings />
                        </div>
                        <div className="lg:w-[320px] lg:flex-shrink-0 w-full">
                            <QuickActions />
                        </div>
                    </div>
                </div>
            </AdaptiveCard>
        </Container>
    )
}


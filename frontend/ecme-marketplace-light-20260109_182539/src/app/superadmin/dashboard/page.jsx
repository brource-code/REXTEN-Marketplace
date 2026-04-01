'use client'

import { useMemo } from 'react'
import Container from '@/components/shared/Container'
import PlatformStats from './_components/PlatformStats'
import PlatformOverview from './_components/PlatformOverview'
import RecentActivity from './_components/RecentActivity'
import { useQuery } from '@tanstack/react-query'
import { getPlatformStats } from '@/lib/api/superadmin'
import Loading from '@/components/shared/Loading'

/**
 * Дашборд суперадмина
 * Общая статистика платформы, метрики, графики
 */
export default function Page() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['platform-stats'],
        queryFn: getPlatformStats,
    })

    // Преобразуем данные для PlatformOverview
    const overviewData = useMemo(() => {
        if (!stats) return null

        // Вычисляем периоды из revenueByPeriod
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
        const currentYearMonth = `${currentYear}-${currentMonth}`

        // Суммируем выручку за текущий месяц
        const thisMonthRevenue = stats.revenueByPeriod
            ?.filter(p => p.period === currentYearMonth)
            .reduce((sum, p) => sum + (p.amount || 0), 0) || 0

        // Суммируем выручку за текущий год
        const thisYearRevenue = stats.revenueByPeriod
            ?.filter(p => p.period?.startsWith(String(currentYear)))
            .reduce((sum, p) => sum + (p.amount || 0), 0) || stats.totalRevenue || 0

        // Суммируем выручку за текущую неделю (приблизительно, берем текущий месяц)
        const thisWeekRevenue = thisMonthRevenue || 0

        return {
            revenue: {
                thisWeek: { 
                    value: stats.revenue?.thisWeek || thisWeekRevenue || 0,
                    growShrink: 0 
                },
                thisMonth: { 
                    value: stats.revenue?.thisMonth || thisMonthRevenue || stats.totalRevenue || 0,
                    growShrink: 0 
                },
                thisYear: { 
                    value: stats.revenue?.thisYear || thisYearRevenue || 0,
                    growShrink: 0 
                },
            },
            businesses: {
                thisWeek: { 
                    value: stats.businesses?.thisWeek || 0,
                    growShrink: 0 
                },
                thisMonth: { 
                    value: stats.businesses?.thisMonth || stats.totalCompanies || 0,
                    growShrink: 0 
                },
                thisYear: { 
                    value: stats.businesses?.thisYear || stats.totalCompanies || 0,
                    growShrink: 0 
                },
            },
            users: {
                thisWeek: { 
                    value: stats.users?.thisWeek || 0,
                    growShrink: 0 
                },
                thisMonth: { 
                    value: stats.users?.thisMonth || stats.totalUsers || 0,
                    growShrink: 0 
                },
                thisYear: { 
                    value: stats.users?.thisYear || stats.totalUsers || 0,
                    growShrink: 0 
                },
            },
        }
    }, [stats])

    if (isLoading) {
        return (
            <Container>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loading loading />
                </div>
            </Container>
        )
    }

    return (
        <Container>
            <div className="flex flex-col gap-4 max-w-full overflow-x-hidden">
                {/* Статистика платформы */}
                <PlatformStats stats={stats} />
                
                {/* Основной обзор с графиками */}
                {overviewData && <PlatformOverview data={overviewData} />}
                
                {/* Последняя активность */}
                <RecentActivity />
            </div>
        </Container>
    )
}

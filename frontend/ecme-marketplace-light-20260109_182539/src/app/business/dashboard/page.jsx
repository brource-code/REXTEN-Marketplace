'use client'

import { useMemo } from 'react'
import Container from '@/components/shared/Container'
import BusinessOverview from './_components/BusinessOverview'
import RecentBookings from './_components/RecentBookings'
import QuickActions from './_components/QuickActions'
import BusinessStats from './_components/BusinessStats'
import { useQuery } from '@tanstack/react-query'
import { getBusinessStats } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'

/**
 * Дашборд бизнеса
 * Статистика, метрики, последние бронирования, быстрые действия
 */
export default function Page() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['business-stats'],
        queryFn: getBusinessStats,
    })

    // Debug: логируем данные статистики
    if (stats) {
        console.log('Business Stats:', stats)
        console.log('Total Revenue:', stats.totalRevenue)
    }

    // Преобразуем данные для BusinessOverview
    const overviewData = useMemo(() => {
        if (!stats) return null

        // Вычисляем периоды из revenueByPeriod
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
        const currentYearMonth = `${currentYear}-${currentMonth}`
        
        // Находим начало недели (понедельник)
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay() + 1)
        const weekYear = startOfWeek.getFullYear()
        const weekMonth = String(startOfWeek.getMonth() + 1).padStart(2, '0')
        const weekYearMonth = `${weekYear}-${weekMonth}`

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
            bookings: {
                thisWeek: { 
                    value: stats.bookings?.thisWeek || 0,
                    growShrink: 0 
                },
                thisMonth: { 
                    value: stats.bookings?.thisMonth || stats.totalBookings || 0,
                    growShrink: 0 
                },
                thisYear: { 
                    value: stats.bookings?.thisYear || stats.totalBookings || 0,
                    growShrink: 0 
                },
            },
            clients: {
                thisWeek: { 
                    value: stats.clients?.thisWeek || 0,
                    growShrink: 0 
                },
                thisMonth: { 
                    value: stats.clients?.thisMonth || stats.activeClients || 0,
                    growShrink: 0 
                },
                thisYear: { 
                    value: stats.clients?.thisYear || stats.activeClients || 0,
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
                {/* Статистика */}
                <BusinessStats stats={stats} />
                
                {/* Основной обзор с графиками */}
                {overviewData && <BusinessOverview data={overviewData} />}
                
                {/* Боковая панель с быстрыми действиями и последние бронирования */}
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 min-w-0">
                        <RecentBookings />
                    </div>
                    <div className="lg:w-[320px] lg:flex-shrink-0 w-full">
                        <QuickActions />
                    </div>
                </div>
            </div>
        </Container>
    )
}


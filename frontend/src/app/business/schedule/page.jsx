'use client'

import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ScheduleCalendar from './_components/ScheduleCalendar'
import { useQuery } from '@tanstack/react-query'
import { getScheduleSlots } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import PermissionGuard from '@/components/shared/PermissionGuard'

/**
 * Страница расписания для бизнеса
 * Календарь слотов, управление расписанием, настройка доступности
 */
export default function Page() {
    return (
        <PermissionGuard permission="view_schedule">
            <SchedulePageContent />
        </PermissionGuard>
    )
}

function SchedulePageContent() {
    const { data: slots, isLoading } = useQuery({
        queryKey: ['business-schedule-slots'],
        queryFn: getScheduleSlots,
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

    return (
        <Container>
            <ScheduleCalendar initialSlots={slots || []} />
        </Container>
    )
}

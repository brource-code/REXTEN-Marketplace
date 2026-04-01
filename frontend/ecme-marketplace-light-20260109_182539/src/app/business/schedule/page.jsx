'use client'

import Container from '@/components/shared/Container'
import ScheduleCalendar from './_components/ScheduleCalendar'
import { useQuery } from '@tanstack/react-query'
import { getScheduleSlots } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'

/**
 * Страница расписания для бизнеса
 * Календарь слотов, управление расписанием, настройка доступности
 */
export default function Page() {
    const { data: slots, isLoading } = useQuery({
        queryKey: ['business-schedule-slots'],
        queryFn: getScheduleSlots,
    })

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
            <ScheduleCalendar initialSlots={slots || []} />
        </Container>
    )
}

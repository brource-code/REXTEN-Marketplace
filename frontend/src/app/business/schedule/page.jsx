'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
 * Query: openBookingId — открыть модалку брони после загрузки (например из списка броней)
 */
export default function Page() {
    return (
        <PermissionGuard permission="view_schedule">
            <Suspense
                fallback={
                    <Container>
                        <AdaptiveCard>
                            <div className="flex items-center justify-center min-h-[400px]">
                                <Loading loading />
                            </div>
                        </AdaptiveCard>
                    </Container>
                }
            >
                <SchedulePageContent />
            </Suspense>
        </PermissionGuard>
    )
}

function SchedulePageContent() {
    const searchParams = useSearchParams()
    const openBookingId = searchParams.get('openBookingId')

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
            <div data-tour="page-main" className="w-full min-h-[320px]">
                <ScheduleCalendar initialSlots={slots || []} initialOpenBookingId={openBookingId} />
            </div>
        </Container>
    )
}

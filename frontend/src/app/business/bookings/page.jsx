'use client'

import { Suspense } from 'react'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import PermissionGuard from '@/components/shared/PermissionGuard'
import BookingsList from './_components/BookingsList'

/**
 * Список бронирований бизнеса: фильтры, открытие той же модалки, что и в расписании.
 * Query: bookingId — открыть запись после загрузки (например с дашборда).
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
                <BookingsPageContent />
            </Suspense>
        </PermissionGuard>
    )
}

function BookingsPageContent() {
    return (
        <Container>
                <AdaptiveCard className="overflow-visible">
                    <BookingsList />
                </AdaptiveCard>
            </Container>
    )
}

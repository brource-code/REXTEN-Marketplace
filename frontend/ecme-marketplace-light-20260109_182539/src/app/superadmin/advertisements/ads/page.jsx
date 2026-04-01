'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import AdvertisementsTable from '../_components/AdvertisementsTable'
import AdvertisementsActionTools from '../_components/AdvertisementsActionTools'
import { useQuery } from '@tanstack/react-query'
import { getAdvertisements } from '@/lib/api/superadmin'
import Loading from '@/components/shared/Loading'

/**
 * Управление рекламными объявлениями (суперадмин)
 * Полное управление с модерацией, статистикой и настройками
 */
export default function Page() {
    const searchParams = useSearchParams()
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const status = searchParams.get('status') || ''
    
    const { data: advertisementsData, isLoading } = useQuery({
        queryKey: ['advertisements', pageIndex, pageSize, status, 'advertisement'],
        queryFn: () => getAdvertisements({
            page: pageIndex,
            pageSize,
            status: status || undefined,
            type: 'advertisement',
        }),
    })

    const advertisements = advertisementsData?.data || []
    const total = advertisementsData?.total || 0

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
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                            <h3>Управление рекламными объявлениями</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Модерация, статистика и настройки размещения рекламных объявлений
                            </p>
                        </div>
                        <AdvertisementsActionTools />
                    </div>
                    
                    <AdvertisementsTable
                        advertisements={advertisements}
                        type="advertisement"
                        pageIndex={pageIndex}
                        pageSize={pageSize}
                        total={total}
                    />
                </div>
            </AdaptiveCard>
        </Container>
    )
}











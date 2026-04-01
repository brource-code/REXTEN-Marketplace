'use client'

import { useSearchParams } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ReviewsTable from './_components/ReviewsTable'
import { useQuery } from '@tanstack/react-query'
import { getBusinessReviews } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'

/**
 * Страница отзывов (бизнес)
 * Просмотр и управление отзывами на объявления компании
 */
export default function Page() {
    const searchParams = useSearchParams()
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    
    const { data, isLoading } = useQuery({
        queryKey: ['business-reviews', pageIndex, pageSize],
        queryFn: () => getBusinessReviews({
            page: pageIndex,
            pageSize,
        }),
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
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h3>Отзывы</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Управление отзывами на ваши объявления
                        </p>
                    </div>
                    <ReviewsTable
                        groupedByAdvertisement={data?.groupedByAdvertisement || []}
                        reviewsWithoutAd={data?.reviewsWithoutAd || []}
                        pageIndex={pageIndex}
                        pageSize={pageSize}
                        total={data?.total || 0}
                    />
                </div>
            </AdaptiveCard>
        </Container>
    )
}


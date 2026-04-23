'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ReviewsTable from './_components/ReviewsTable'
import { useQuery } from '@tanstack/react-query'
import { getBusinessReviews } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import PermissionGuard from '@/components/shared/PermissionGuard'

/**
 * Страница отзывов (бизнес)
 * Просмотр и управление отзывами на объявления компании
 */
export default function Page() {
    return (
        <PermissionGuard permission="view_reviews">
            <ReviewsPageContent />
        </PermissionGuard>
    )
}

function ReviewsPageContent() {
    const t = useTranslations('business.reviews')
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
                    <div className="flex min-h-[400px] min-w-0 items-center justify-center">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex min-w-0 flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {t('description')}
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


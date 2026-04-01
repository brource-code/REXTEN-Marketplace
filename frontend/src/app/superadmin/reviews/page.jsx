'use client'

import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { getSuperadminReviewsOverview } from '@/lib/api/superadmin-reviews'
import ReviewsStatCards from './_components/ReviewsStatCards'
import ReviewsRatingChart from './_components/ReviewsRatingChart'
import ReviewsTable from './_components/ReviewsTable'

/**
 * Страница отзывов суперадмина
 */
export default function Page() {
    const t = useTranslations('superadmin.reviews')
    const { data: overview, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['superadmin-reviews-overview'],
        queryFn: getSuperadminReviewsOverview,
        staleTime: 60_000,
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

    if (isError) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {t('title')}
                        </h4>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400 mt-2">
                            {error?.message || t('loadError')}
                        </p>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="mt-4 text-sm font-bold text-blue-600 dark:text-blue-400"
                        >
                            {t('retry')}
                        </button>
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
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {t('title')}
                        </h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {t('description')}
                        </p>
                    </div>

                    <ReviewsStatCards overview={overview} />
                    <ReviewsRatingChart />
                    <ReviewsTable />
                </div>
            </AdaptiveCard>
        </Container>
    )
}

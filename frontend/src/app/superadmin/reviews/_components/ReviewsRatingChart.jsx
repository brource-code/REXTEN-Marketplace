'use client'

import { useMemo } from 'react'
import Card from '@/components/ui/Card'
import Loading from '@/components/shared/Loading'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { getSuperadminReviewsRatingDistribution } from '@/lib/api/superadmin-reviews'
import { useTranslations } from 'next-intl'

const Chart = dynamic(() => import('@/components/shared/Chart'), {
    ssr: false,
    loading: () => (
        <div className="h-[280px] flex items-center justify-center">
            <Loading loading />
        </div>
    ),
})

export default function ReviewsRatingChart() {
    const t = useTranslations('superadmin.reviews.chart')
    const { data, isLoading, isError } = useQuery({
        queryKey: ['superadmin-reviews-rating-distribution'],
        queryFn: getSuperadminReviewsRatingDistribution,
        staleTime: 90_000,
    })

    const series = useMemo(() => {
        if (!data) return null
        return [
            data.counts?.[1] ?? 0,
            data.counts?.[2] ?? 0,
            data.counts?.[3] ?? 0,
            data.counts?.[4] ?? 0,
            data.counts?.[5] ?? 0,
        ]
    }, [data])

    const labels = useMemo(
        () => [
            t('labels.rating_1', { defaultValue: '1' }),
            t('labels.rating_2', { defaultValue: '2' }),
            t('labels.rating_3', { defaultValue: '3' }),
            t('labels.rating_4', { defaultValue: '4' }),
            t('labels.rating_5', { defaultValue: '5' }),
        ],
        [t],
    )

    return (
        <Card>
            <div className="flex items-start justify-between gap-4 mb-4 flex-col md:flex-row md:items-end">
                <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {t('title')}
                    </h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                        {t('subtitle')}
                    </p>
                </div>
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    {t('total')}:{' '}
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {data?.total ?? 0}
                    </span>
                </div>
            </div>

            {isLoading ? (
                <div className="h-[280px] flex items-center justify-center">
                    <Loading loading />
                </div>
            ) : isError ? (
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    {t('error')}
                </div>
            ) : !series || data.total <= 0 ? (
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    {t('noData')}
                </div>
            ) : (
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-h-[260px] flex justify-center">
                        <Chart
                            type="donut"
                            series={series}
                            height={260}
                            donutTitle={t('total')}
                            donutText={String(data.total)}
                            customOptions={{
                                labels,
                                legend: { position: 'bottom' },
                            }}
                        />
                    </div>

                    <ul className="flex flex-col gap-3 md:w-48">
                        {series.map((count, idx) => {
                            const ratingLabel = labels[idx] ?? String(idx + 1)
                            return (
                                <li
                                    key={idx}
                                    className="flex justify-between text-sm font-bold"
                                >
                                    <span className="text-gray-500 dark:text-gray-400">
                                        {ratingLabel}
                                    </span>
                                    <span className="text-gray-900 dark:text-gray-100">
                                        {count}
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}
        </Card>
    )
}


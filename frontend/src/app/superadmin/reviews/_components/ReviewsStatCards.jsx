'use client'

import Card from '@/components/ui/Card'
import { NumericFormat } from 'react-number-format'
import { useTranslations } from 'next-intl'
import {
    PiStar,
    PiEye,
    PiClockCounterClockwise,
    PiChatCircleDuotone,
    PiPencil,
} from 'react-icons/pi'

export default function ReviewsStatCards({ overview }) {
    const t = useTranslations('superadmin.reviews.cards')
    const o = overview || {}

    const items = [
        {
            title: t('totalReviews'),
            value: o.total_reviews ?? 0,
            icon: <PiStar className="text-xl" />,
            color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
        },
        {
            title: t('avgRating'),
            value: o.average_rating ?? 0,
            icon: <PiStar className="text-xl" />,
            color: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
            format: { decimalScale: 2 },
        },
        {
            title: t('publishedReviews'),
            value: o.published_reviews ?? 0,
            icon: <PiEye className="text-xl" />,
            color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        },
        {
            title: t('pendingReviews'),
            value: o.pending_reviews ?? 0,
            icon: <PiClockCounterClockwise className="text-xl" />,
            color: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
        },
        {
            title: t('respondedReviews'),
            value: o.responded_reviews ?? 0,
            icon: <PiChatCircleDuotone className="text-xl" />,
            color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
        },
        {
            title: t('withoutResponseReviews'),
            value: o.without_response_reviews ?? 0,
            icon: <PiPencil className="text-xl" />,
            color: 'bg-gray-100 dark:bg-gray-600/20 text-gray-700 dark:text-gray-300',
        },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {items.map((stat, index) => (
                <Card key={index}>
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                {stat.title}
                            </div>
                            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                <NumericFormat
                                    displayType="text"
                                    value={stat.value}
                                    thousandSeparator
                                    decimalScale={stat.format?.decimalScale ?? 0}
                                    fixedDecimalScale={Boolean(stat.format?.decimalScale)}
                                />
                            </div>
                        </div>
                        <div
                            className={`flex items-center justify-center w-12 h-12 rounded-lg flex-shrink-0 ml-2 ${stat.color}`}
                        >
                            {stat.icon}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )
}


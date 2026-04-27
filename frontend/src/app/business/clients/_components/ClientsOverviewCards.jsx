'use client'

import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import { PiUsers, PiPulse, PiCrown, PiCurrencyDollar } from 'react-icons/pi'
import { NumericFormat } from 'react-number-format'

function StatCard({ title, value, prefix, icon: Icon, color }) {
    return (
        <Card>
            <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="mb-0.5 break-words text-[10px] font-bold text-gray-500 dark:text-gray-400 sm:mb-1 sm:truncate sm:text-sm">
                        {title}
                    </div>
                    <div className="break-words text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100 sm:truncate sm:text-sm md:text-lg">
                        {prefix ? (
                            <NumericFormat
                                displayType="text"
                                value={value}
                                prefix={prefix}
                                thousandSeparator
                                decimalScale={2}
                            />
                        ) : (
                            value
                        )}
                    </div>
                </div>
                <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 md:h-12 md:w-12 ${color}`}
                >
                    <Icon className="text-base sm:text-xl md:text-xl" aria-hidden />
                </div>
            </div>
        </Card>
    )
}

function OverviewSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-4 md:gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="h-[72px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 sm:h-[84px]"
                />
            ))}
        </div>
    )
}

export default function ClientsOverviewCards({ total, summary, isLoading }) {
    const t = useTranslations('business.clients.overview')

    if (isLoading) {
        return <OverviewSkeleton />
    }

    const activeLast30 = summary?.activeLast30 ?? 0
    const permanentVip = summary?.permanentVip ?? 0
    const totalRevenue = summary?.totalRevenue ?? 0

    const cards = [
        {
            title: t('totalClients'),
            value: total ?? 0,
            icon: PiUsers,
            color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
        },
        {
            title: t('activeLast30'),
            value: activeLast30,
            icon: PiPulse,
            color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
        },
        {
            title: t('permanentVip'),
            value: permanentVip,
            icon: PiCrown,
            color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
        },
        {
            title: t('totalRevenue'),
            value: totalRevenue,
            prefix: '$',
            icon: PiCurrencyDollar,
            color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
        },
    ]

    return (
        <div>
            <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-gray-100 sm:text-base">
                {t('sectionTitle')}
            </h4>
            <p className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400 sm:text-sm">
                {t('revenueHint')}
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-4 md:gap-3">
                {cards.map((c) => (
                    <StatCard key={c.title} {...c} />
                ))}
            </div>
        </div>
    )
}

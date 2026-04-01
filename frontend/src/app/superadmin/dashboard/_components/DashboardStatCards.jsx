'use client'

import Card from '@/components/ui/Card'
import {
    PiBuildings,
    PiUsers,
    PiCalendarCheck,
    PiCurrencyDollar,
    PiMegaphone,
    PiStar,
} from 'react-icons/pi'
import { NumericFormat } from 'react-number-format'
import { useTranslations } from 'next-intl'

/**
 * Карточки KPI — тот же паттерн, что BusinessStats
 */
export default function DashboardStatCards({ stats }) {
    const t = useTranslations('superadmin.dashboard.cards')
    const c = stats?.companies ?? {}
    const u = stats?.users ?? {}
    const b = stats?.bookings ?? {}
    const r = stats?.revenue ?? {}
    const a = stats?.advertisements ?? {}

    const bookingDelta = (b.today ?? 0) - (b.yesterday ?? 0)
    const revPrev = r.last_month ?? 0
    const revCur = r.this_month ?? 0
    const revPct =
        revPrev > 0 ? Math.round(((revCur - revPrev) / revPrev) * 1000) / 10 : revCur > 0 ? 100 : null

    const statsList = [
        {
            title: t('companies'),
            value: c.total ?? 0,
            icon: <PiBuildings className="text-2xl" />,
            color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
            extra:
                (c.pending ?? 0) > 0 ? (
                    <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">
                        {c.pending} {t('pendingCompanies')}
                    </div>
                ) : null,
        },
        {
            title: t('users'),
            value: u.total ?? 0,
            icon: <PiUsers className="text-2xl" />,
            color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
            extra: (
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {u.client ?? 0}
                    </span>{' '}
                    {t('clientsWord')} ·{' '}
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {u.business_owner ?? 0}
                    </span>{' '}
                    {t('businessesWord')}
                </div>
            ),
        },
        {
            title: t('bookingsToday'),
            value: b.today ?? 0,
            icon: <PiCalendarCheck className="text-2xl" />,
            color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
            extra: (
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                    {t('vsYesterday')}{' '}
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {b.yesterday ?? 0}
                    </span>
                    {bookingDelta !== 0 && (
                        <span
                            className={
                                bookingDelta > 0
                                    ? ' text-emerald-600 dark:text-emerald-400'
                                    : ' text-red-600 dark:text-red-400'
                            }
                        >
                            {' '}
                            ({bookingDelta > 0 ? '+' : ''}
                            {bookingDelta})
                        </span>
                    )}
                </div>
            ),
        },
        {
            title: t('revenueMonth'),
            prefix: '$',
            value: revCur,
            icon: <PiCurrencyDollar className="text-2xl" />,
            color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
            extra:
                revPct != null ? (
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                        {t('vsLastMonth')}{' '}
                        <span
                            className={
                                revPct >= 0
                                    ? 'text-sm font-bold text-emerald-600 dark:text-emerald-400'
                                    : 'text-sm font-bold text-red-600 dark:text-red-400'
                            }
                        >
                            {revPct >= 0 ? '+' : ''}
                            {revPct}%
                        </span>
                    </div>
                ) : (
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                        {t('vsLastMonth')}{' '}
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">—</span>
                    </div>
                ),
        },
        {
            title: t('adsActive'),
            value: (a.marketplace_active ?? 0) + (a.promo_active ?? 0),
            icon: <PiMegaphone className="text-2xl" />,
            color: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
            extra: (
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                    {t('marketplace')}:{' '}
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {a.marketplace_active ?? 0}
                    </span>
                    {' · '}
                    {t('promo')}:{' '}
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {a.promo_active ?? 0}
                    </span>
                    {(a.pending_moderation ?? 0) > 0 && (
                        <span className="text-amber-600 dark:text-amber-400">
                            {' '}
                            · {a.pending_moderation} {t('onModeration')}
                        </span>
                    )}
                </div>
            ),
        },
        {
            title: t('avgRating'),
            value: (stats?.average_rating ?? 0).toFixed(2),
            icon: <PiStar className="text-2xl" />,
            color: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
        },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {statsList.map((stat, index) => (
                <Card key={index}>
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                {stat.title}
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {stat.prefix ? (
                                    <NumericFormat
                                        displayType="text"
                                        value={stat.value}
                                        prefix={stat.prefix}
                                        thousandSeparator
                                        decimalScale={2}
                                        fixedDecimalScale
                                    />
                                ) : (
                                    stat.value
                                )}
                            </div>
                            {stat.extra}
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

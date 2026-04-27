'use client'

import Card from '@/components/ui/Card'
import Loading from '@/components/shared/Loading'
import {
    PiBuildings,
    PiCheckCircle,
    PiClock,
    PiWarningCircle,
    PiXCircle,
    PiCurrencyDollar,
    PiReceipt,
    PiArrowsCounterClockwise,
} from 'react-icons/pi'
import { NumericFormat } from 'react-number-format'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { getConnectOverview } from '@/lib/api/superadmin-billing'
import GrowShrinkValue from '@/components/shared/GrowShrinkValue'

export default function ConnectOverviewCards() {
    const t = useTranslations('superadmin.billing.connect')
    
    const { data: overview, isLoading } = useQuery({
        queryKey: ['superadmin-connect-overview'],
        queryFn: getConnectOverview,
        staleTime: 60_000,
    })

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loading loading />
            </div>
        )
    }

    const o = overview || {}
    const growth = o.revenue_growth_pct

    const accountStats = [
        {
            title: t('cards.connectedAccounts'),
            value: o.connected_companies ?? 0,
            total: o.total_companies ?? 0,
            icon: <PiBuildings className="text-xl" />,
            color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
        },
        {
            title: t('cards.activeAccounts'),
            value: o.active_companies ?? 0,
            icon: <PiCheckCircle className="text-xl" />,
            color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        },
        {
            title: t('cards.pendingAccounts'),
            value: o.pending_companies ?? 0,
            icon: <PiClock className="text-xl" />,
            color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
        },
        {
            title: t('cards.restrictedAccounts'),
            value: o.restricted_companies ?? 0,
            icon: <PiWarningCircle className="text-xl" />,
            color: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
        },
        {
            title: t('cards.disabledAccounts'),
            value: o.disabled_companies ?? 0,
            icon: <PiXCircle className="text-xl" />,
            color: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
        },
        {
            title: t('cards.disputeAccounts'),
            value: o.dispute_companies ?? 0,
            icon: <PiWarningCircle className="text-xl" />,
            color: 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400',
        },
    ]

    const paymentStats = [
        {
            title: t('cards.revenueMonth'),
            prefix: '$',
            value: o.revenue_this_month ?? 0,
            icon: <PiCurrencyDollar className="text-xl" />,
            color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
            extra:
                growth != null ? (
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 flex-wrap">
                        {t('cards.vsLastMonth')}
                        <GrowShrinkValue
                            className="font-bold"
                            value={growth}
                            suffix="%"
                            positiveIcon="+"
                            negativeIcon=""
                        />
                    </div>
                ) : null,
        },
        {
            title: t('cards.platformFees'),
            prefix: '$',
            value: o.fees_this_month ?? 0,
            icon: <PiReceipt className="text-xl" />,
            color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
        },
        {
            title: t('cards.paymentsMonth'),
            value: o.payments_this_month ?? 0,
            icon: <PiReceipt className="text-xl" />,
            color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
            extra: (
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                    {t('cards.lastMonth')}{' '}
                    <span className="text-gray-900 dark:text-gray-100">{o.payments_last_month ?? 0}</span>
                </div>
            ),
        },
        {
            title: t('cards.pendingCaptures'),
            prefix: '$',
            value: o.pending_captures_amount ?? 0,
            icon: <PiClock className="text-xl" />,
            color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
            extra: (
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                    {t('cards.holds')}{' '}
                    <span className="text-gray-900 dark:text-gray-100">{o.pending_captures ?? 0}</span>
                </div>
            ),
        },
        {
            title: t('cards.refundedMonth'),
            prefix: '$',
            value: o.refunded_this_month ?? 0,
            icon: <PiArrowsCounterClockwise className="text-xl" />,
            color: 'bg-gray-100 dark:bg-gray-600/30 text-gray-700 dark:text-gray-300',
        },
        {
            title: t('cards.disputedMonth'),
            value: o.disputed_this_month ?? 0,
            icon: <PiWarningCircle className="text-xl" />,
            color: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h5 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">{t('sections.accounts')}</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {accountStats.map((stat, index) => (
                        <Card key={index}>
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                        {stat.title}
                                    </div>
                                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {stat.value}
                                        {stat.total !== undefined && (
                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                {' / '}{stat.total}
                                            </span>
                                        )}
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
            </div>

            <div>
                <h5 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">{t('sections.payments')}</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {paymentStats.map((stat, index) => (
                        <Card key={index}>
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                        {stat.title}
                                    </div>
                                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
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
            </div>
        </div>
    )
}

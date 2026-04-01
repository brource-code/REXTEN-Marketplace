'use client'

import Card from '@/components/ui/Card'
import {
    PiCurrencyDollar,
    PiMegaphone,
    PiCreditCard,
    PiReceipt,
    PiArrowsClockwise,
    PiClockCounterClockwise,
} from 'react-icons/pi'
import { NumericFormat } from 'react-number-format'
import { useTranslations } from 'next-intl'
import GrowShrinkValue from '@/components/shared/GrowShrinkValue'

export default function BillingStatCards({ overview }) {
    const t = useTranslations('superadmin.billing.cards')
    const o = overview || {}
    const growth = o.revenue_growth_pct

    const items = [
        {
            title: t('revenueMonth'),
            prefix: '$',
            value: o.revenue_this_month ?? 0,
            icon: <PiCurrencyDollar className="text-2xl" />,
            color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
            extra:
                growth != null ? (
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 flex-wrap">
                        {t('vsLastMonth')}
                        <GrowShrinkValue
                            className="font-bold"
                            value={growth}
                            suffix="%"
                            positiveIcon="+"
                            negativeIcon=""
                        />
                    </div>
                ) : (
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                        {t('vsLastMonth')} <span className="text-gray-900 dark:text-gray-100">—</span>
                    </div>
                ),
        },
        {
            title: t('adRevenue'),
            prefix: '$',
            value: o.revenue_ad_this_month ?? 0,
            icon: <PiMegaphone className="text-2xl" />,
            color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
        },
        {
            title: t('subscriptionRevenue'),
            prefix: '$',
            value: o.revenue_subscription_this_month ?? 0,
            icon: <PiCreditCard className="text-2xl" />,
            color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        },
        {
            title: t('avgCheck'),
            prefix: '$',
            value: o.avg_check_this_month ?? 0,
            icon: <PiReceipt className="text-2xl" />,
            color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
        },
        {
            title: t('today'),
            prefix: '$',
            value: o.amount_today ?? 0,
            icon: <PiArrowsClockwise className="text-2xl" />,
            color: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
            extra: (
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                    {t('transactions')}{' '}
                    <span className="text-gray-900 dark:text-gray-100">{o.transactions_today ?? 0}</span>
                </div>
            ),
        },
        {
            title: t('openCheckouts'),
            prefix: '$',
            value: o.open_checkouts_amount ?? 0,
            icon: <PiClockCounterClockwise className="text-2xl" />,
            color: 'bg-gray-100 dark:bg-gray-600/30 text-gray-700 dark:text-gray-300',
            extra: (
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                    {t('sessions')}{' '}
                    <span className="text-gray-900 dark:text-gray-100">{o.open_checkouts ?? 0}</span>
                </div>
            ),
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
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                <NumericFormat
                                    displayType="text"
                                    value={stat.value}
                                    prefix={stat.prefix}
                                    thousandSeparator
                                    decimalScale={2}
                                    fixedDecimalScale
                                />
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

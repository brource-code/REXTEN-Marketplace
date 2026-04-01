'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { PiArrowRight, PiStorefront } from 'react-icons/pi'
import classNames from '@/utils/classNames'

function formatTierDiscount(tier) {
    if (!tier) return ''
    return tier.discount_type === 'percentage'
        ? `${tier.discount_value}%`
        : String(tier.discount_value)
}

/**
 * @param {object} props
 * @param {'marketplace' | 'business'} props.variant
 * @param {string} [props.companyName]
 * @param {string} [props.companySlug]
 * @param {number} props.loyaltyBookingsCount
 * @param {string} props.loyaltyRule
 * @param {object | null} props.currentTier
 * @param {object | null} props.nextTier
 * @param {number | null} [props.bookingsToNext] — из CRM API; иначе считается из next_tier
 */
export default function LoyaltyProgramBlock({
    variant = 'marketplace',
    companyName,
    companySlug,
    loyaltyBookingsCount,
    loyaltyRule,
    currentTier,
    nextTier,
    bookingsToNext: bookingsToNextProp,
}) {
    const tClient = useTranslations('client.discounts')
    const tBiz = useTranslations('business.clients.loyalty')
    const isBusiness = variant === 'business'

    const bookingsToNext =
        bookingsToNextProp != null
            ? bookingsToNextProp
            : nextTier && typeof nextTier.min_bookings === 'number'
              ? Math.max(0, nextTier.min_bookings - loyaltyBookingsCount)
              : null

    const nextMin = nextTier?.min_bookings ?? 0
    const progressPercent =
        nextTier && nextMin > 0
            ? Math.min(100, Math.round((loyaltyBookingsCount / nextMin) * 100))
            : 0

    const bookingsLabel = isBusiness ? tBiz('bookingsCounted') : tClient('bookingsCount')
    const currentLabel = isBusiness ? tBiz('currentTier') : tClient('currentTier')
    const nextLabel = isBusiness ? tBiz('nextTier') : tClient('nextTier')
    const toNextLabel = isBusiness ? tBiz('bookingsToNext') : tClient('bookingsToNext')
    const tierNone = isBusiness ? tBiz('tierNone') : tClient('tierNone')
    const nextNone = isBusiness ? tBiz('nextNone') : tClient('nextNone')

    return (
        <div
            className={classNames(
                isBusiness
                    ? 'space-y-4'
                    : [
                          'rounded-2xl border overflow-hidden',
                          'border-gray-200/80 dark:border-gray-600/80',
                          'bg-gradient-to-br from-white via-gray-50/80 to-blue-50/30',
                          'dark:from-gray-900 dark:via-gray-900/95 dark:to-blue-950/20',
                          'shadow-sm dark:shadow-none',
                      ],
            )}
        >
            {companyName && variant === 'marketplace' && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-gray-200/80 dark:border-gray-700/80">
                    <div className="flex items-start gap-3 min-w-0">
                        <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
                            aria-hidden
                        >
                            <PiStorefront className="text-xl" />
                        </span>
                        <div className="min-w-0">
                            <h5 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                                {companyName}
                            </h5>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                                {tClient('cardSubtitle')}
                            </p>
                        </div>
                    </div>
                    {companySlug ? (
                        <Link
                            href={`/marketplace/${companySlug}`}
                            className={classNames(
                                'inline-flex items-center justify-center gap-1.5 shrink-0',
                                'rounded-xl px-4 py-2.5 text-sm font-bold',
                                'bg-blue-600 text-white hover:bg-blue-700',
                                'dark:bg-blue-600 dark:hover:bg-blue-500',
                                'transition-colors',
                            )}
                        >
                            {tClient('openBusiness')}
                            <PiArrowRight className="text-base opacity-90" />
                        </Link>
                    ) : null}
                </div>
            )}

            <div className={classNames('space-y-4', !isBusiness && 'p-4 sm:p-5')}>
                <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 px-3 py-1.5">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{bookingsLabel}</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100 ml-1.5 tabular-nums">
                            {loyaltyBookingsCount}
                        </span>
                    </span>
                    {isBusiness && (
                        <span className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 px-3 py-1.5">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {tBiz('ruleLabel')}
                            </span>
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100 ml-1.5">
                                {loyaltyRule === 'completed'
                                    ? tBiz('ruleCompleted')
                                    : tBiz('ruleAll')}
                            </span>
                        </span>
                    )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div
                        className={classNames(
                            'rounded-xl border p-4',
                            'border-emerald-200/90 dark:border-emerald-800/60',
                            'bg-emerald-50/60 dark:bg-emerald-950/25',
                        )}
                    >
                        <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                            {currentLabel}
                        </div>
                        {currentTier ? (
                            <div className="mt-2">
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {currentTier.name}
                                </div>
                                <div className="mt-1 inline-flex rounded-lg bg-white/90 dark:bg-gray-900/80 px-2.5 py-1 text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                                    {formatTierDiscount(currentTier)}
                                </div>
                            </div>
                        ) : (
                            <p className="mt-2 text-sm font-bold text-gray-600 dark:text-gray-400">{tierNone}</p>
                        )}
                    </div>

                    <div
                        className={classNames(
                            'rounded-xl border p-4',
                            'border-blue-200/90 dark:border-blue-800/60',
                            'bg-blue-50/50 dark:bg-blue-950/20',
                        )}
                    >
                        <div className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                            {nextLabel}
                        </div>
                        {nextTier ? (
                            <div className="mt-2">
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {nextTier.name}
                                </div>
                                {bookingsToNext != null && (
                                    <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {toNextLabel}:{' '}
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                                            {bookingsToNext}
                                        </span>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="mt-2 text-sm font-bold text-gray-600 dark:text-gray-400">{nextNone}</p>
                        )}
                    </div>
                </div>

                {nextTier && nextMin > 0 && (
                    <div>
                        <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
                            <span>
                                {isBusiness ? tBiz('progressLabel') : tClient('progressLabel')}
                            </span>
                            <span className="tabular-nums text-gray-900 dark:text-gray-100">{progressPercent}%</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        {bookingsToNext != null && bookingsToNext > 0 && (
                            <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                                {isBusiness
                                    ? tBiz('untilNextHint', {
                                          count: bookingsToNext,
                                          tier: nextTier.name,
                                      })
                                    : tClient('untilNextHint', {
                                          count: bookingsToNext,
                                          tier: nextTier.name,
                                      })}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

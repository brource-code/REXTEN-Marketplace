'use client'

import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/utils/formatCurrency'

/**
 * Строки «субтотал / скидка» в разборе цены бронирования (CRM клиент).
 */
export function ClientBookingDiscountRows({ booking, currency = 'USD' }) {
    const t = useTranslations('business.clients.loyalty')
    const discount = Number(booking.discount_amount || 0)
    if (discount <= 0) return null

    let detail = t('discountLine')
    if (booking.discount_source === 'promo_code' && booking.promo_code?.code) {
        detail = t('appliedPromo', { code: booking.promo_code.code })
    } else if (booking.discount_source === 'loyalty_tier' && booking.discount_tier?.name) {
        detail = t('appliedLoyalty', { tier: booking.discount_tier.name })
    }

    const subtotal = discount + Number(booking.total_price || 0)

    return (
        <>
            <div className="flex justify-between items-center text-sm">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('subtotal')}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(subtotal, currency)}
                </span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{detail}</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    −{formatCurrency(discount, currency)}
                </span>
            </div>
        </>
    )
}

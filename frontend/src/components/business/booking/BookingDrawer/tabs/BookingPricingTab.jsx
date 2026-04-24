'use client'

import { useTranslations } from 'next-intl'
import Input from '@/components/ui/Input'
import AmountInput from '@/components/ui/AmountInput/AmountInput'
import { FormItem } from '@/components/ui/Form'
import BookingAdditionalServices from '@/components/BookingAdditionalServices'
import { formatCurrency } from '@/utils/formatCurrency'
import { LABEL_CLS, VALUE_CLS, HINT_CLS } from '@/components/business/booking/shared/bookingTypography'

function discountLineLabel(slot, tPricing, tLoyalty) {
    const discount = Number(slot?.discount_amount) || 0
    if (discount <= 0) {
        return null
    }
    if (slot?.discount_source === 'promo_code' && slot?.promo_code) {
        return tLoyalty('appliedPromo', { code: slot.promo_code })
    }
    if (slot?.discount_source === 'loyalty_tier' && slot?.discount_tier_name) {
        return tLoyalty('appliedLoyalty', { tier: slot.discount_tier_name })
    }
    return tPricing('discount')
}

export default function BookingPricingTab({
    values,
    setField,
    selectedAdditionalServices,
    setSelectedAdditionalServices,
    slot,
    currency = 'USD',
    readOnly = false,
    dirty = false,
}) {
    const t = useTranslations('business.schedule.drawer.pricing')
    const tLoyalty = useTranslations('business.clients.loyalty')

    const additionalSubtotal = (selectedAdditionalServices || []).reduce(
        (acc, s) => acc + (Number(s.price) || 0) * (Number(s.quantity) || 1),
        0,
    )
    const basePrice = Number(values.price) || 0
    const subtotal = basePrice + additionalSubtotal
    const discount = Number(slot?.discount_amount) || 0
    const computedTotal = Math.max(0, subtotal - discount)
    const serverTotal = Number(slot?.total_price)
    const useServerTotal =
        !dirty && Number.isFinite(serverTotal) && serverTotal >= 0
    const total = useServerTotal ? serverTotal : computedTotal

    return (
        <div className="flex flex-col gap-4">
            <FormItem label={<span className={LABEL_CLS}>{t('basePrice')}</span>}>
                <AmountInput
                    size="sm"
                    value={values.price ?? null}
                    onValueChange={(n) => {
                        setField('price', n == null ? null : Math.max(0, n))
                    }}
                    min={0}
                    disabled={readOnly}
                />
                <div className={`mt-1 ${HINT_CLS}`}>
                    {t('basePriceHint')}
                </div>
            </FormItem>

            <div>
                <div className={`mb-1 ${LABEL_CLS}`}>{t('additionalServices')}</div>
                <BookingAdditionalServices
                    serviceId={values.service_id}
                    advertisementId={slot?.advertisement_id || null}
                    selectedServices={selectedAdditionalServices}
                    onSelectionChange={setSelectedAdditionalServices}
                    basePrice={basePrice}
                    currency={currency}
                    editablePrice
                />
            </div>

            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-1">
                <div className="flex justify-between">
                    <span className={LABEL_CLS}>{t('subtotal')}</span>
                    <span className={VALUE_CLS}>{formatCurrency(subtotal, currency)}</span>
                </div>
                {discount > 0 && (
                    <div className="flex justify-between gap-2 items-start">
                        <span className={`${LABEL_CLS} min-w-0 break-words pr-1`}>
                            {discountLineLabel(slot, t, tLoyalty)}
                        </span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            −{formatCurrency(discount, currency)}
                        </span>
                    </div>
                )}
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
                    <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                        {t('total')}
                    </span>
                    <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(total, currency)}
                    </span>
                </div>
                {dirty && discount > 0 && (
                    <p className={`${HINT_CLS} mt-1`}>{t('discountRecalculateHint')}</p>
                )}
            </div>
        </div>
    )
}

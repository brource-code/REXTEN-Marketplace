'use client'

import { useTranslations } from 'next-intl'
import AmountInput from '@/components/ui/AmountInput/AmountInput'
import { FormItem } from '@/components/ui/Form'

export function AdvertisementCreatePricingSection({ formData, setFormData }) {
    const t = useTranslations('business.advertisements.create')

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('pricing.title')}</h4>
                <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">{t('pricing.hint')}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormItem label={t('pricing.priceFrom')} required>
                    <AmountInput
                        size="sm"
                        value={
                            formData.priceFrom === '' || formData.priceFrom == null ? null : Number(formData.priceFrom)
                        }
                        onValueChange={(n) =>
                            setFormData({
                                ...formData,
                                priceFrom: n == null ? '' : n,
                            })
                        }
                        min={0}
                        placeholder="0"
                    />
                </FormItem>

                <FormItem label={`${t('pricing.priceTo')} (${t('pricing.optional')})`}>
                    <AmountInput
                        size="sm"
                        value={formData.priceTo === '' || formData.priceTo == null ? null : Number(formData.priceTo)}
                        onValueChange={(n) =>
                            setFormData({
                                ...formData,
                                priceTo: n == null ? '' : n,
                            })
                        }
                        min={0}
                        placeholder="0"
                    />
                </FormItem>
            </div>

            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('pricing.allUsd')}</p>
        </div>
    )
}

'use client'

import { useTranslations } from 'next-intl'
import AmountInput from '@/components/ui/AmountInput/AmountInput'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'

export function AdvertisementCreatePricingSection({ formData, setFormData }) {
    const t = useTranslations('business.advertisements.create')

    return (
        <div className="space-y-4">
            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('pricing.title')}</h4>

            <div className="grid grid-cols-2 gap-4">
                <FormItem label={t('pricing.priceFrom')}>
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

                <FormItem label={t('pricing.priceTo')}>
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

            <FormItem label={t('pricing.currency')}>
                <Select
                    size="sm"
                    isSearchable={false}
                    options={[
                        { value: 'USD', label: 'USD ($)' },
                        { value: 'EUR', label: 'EUR (€)' },
                        { value: 'RUB', label: 'RUB ($)' },
                    ]}
                    value={{ value: formData.currency, label: formData.currency }}
                    onChange={(option) => setFormData({ ...formData, currency: option?.value || 'USD' })}
                />
            </FormItem>
        </div>
    )
}

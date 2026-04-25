'use client'

import { useTranslations } from 'next-intl'
import { snapDurationToBookingPresetMinutes } from '@/components/business/booking/shared/bookingDurationPresets'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import BookingClientPicker from '@/components/business/booking/parts/BookingClientPicker'
import BookingServicePicker from '@/components/business/booking/parts/BookingServicePicker'
import { LABEL_CLS } from '@/components/business/booking/shared/bookingTypography'

export default function Step1ClientService({
    values,
    setField,
    setFields,
    errors,
    services = [],
    currency = 'USD',
}) {
    const t = useTranslations('business.schedule.wizard.step1')
    const isGuest = !values.user_id || values.user_id === 'guest'

    return (
        <div className="flex flex-col gap-4">
            <BookingClientPicker
                label={t('client')}
                value={values.user_id ?? 'guest'}
                onChange={(id, client) => {
                    if (id === 'guest') {
                        setFields({ user_id: null })
                        return
                    }
                    setFields({
                        user_id: id,
                        client_name: client?.name || values.client_name,
                        client_email: client?.email || values.client_email,
                        client_phone: client?.phone || values.client_phone,
                    })
                }}
            />

            {isGuest && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-md border border-gray-200 dark:border-gray-700 p-3">
                    <FormItem label={<span className={LABEL_CLS}>{t('guestName')}</span>}>
                        <Input
                            size="sm"
                            value={values.client_name || ''}
                            onChange={(e) => setField('client_name', e.target.value)}
                        />
                    </FormItem>
                    <FormItem label={<span className={LABEL_CLS}>{t('guestEmail')}</span>}>
                        <Input
                            size="sm"
                            value={values.client_email || ''}
                            onChange={(e) => setField('client_email', e.target.value)}
                        />
                    </FormItem>
                    <FormItem label={<span className={LABEL_CLS}>{t('guestPhone')}</span>}>
                        <Input
                            size="sm"
                            value={values.client_phone || ''}
                            onChange={(e) => setField('client_phone', e.target.value)}
                        />
                    </FormItem>
                </div>
            )}

            <BookingServicePicker
                label={t('service')}
                value={values.service_id}
                onChange={(id, service) => {
                    const patch = { service_id: id, service_type: service?.service_type ?? null }
                    if (service) {
                        if (!values.duration_minutes || values.duration_minutes === 60) {
                            patch.duration_minutes = snapDurationToBookingPresetMinutes(
                                service.duration || 60,
                            )
                        }
                        if (values.price == null || values.price === '') {
                            patch.price = service.price
                        }
                        if (service.service_type === 'offsite') {
                            patch.execution_type = 'offsite'
                        } else if (service.service_type === 'onsite') {
                            patch.execution_type = 'onsite'
                        } else if (service.service_type === 'hybrid') {
                            patch.execution_type = values.execution_type || 'onsite'
                        }
                    }
                    setFields(patch)
                }}
                services={services}
                error={errors.service_id}
                currency={currency}
            />

            <FormItem label={<span className={LABEL_CLS}>{t('notes')}</span>}>
                <textarea
                    rows={2}
                    value={values.notes || ''}
                    onChange={(e) => setField('notes', e.target.value)}
                    placeholder={t('notesPlaceholder')}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm font-bold text-gray-900 dark:text-gray-100"
                />
            </FormItem>
        </div>
    )
}

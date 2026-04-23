'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import dayjs from 'dayjs'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { FormItem } from '@/components/ui/Form'
import AddressAutocomplete from '@/components/shared/AddressAutocomplete'
import BookingServicePicker from '@/components/business/booking/parts/BookingServicePicker'
import BookingConflictHint from '@/components/business/booking/parts/BookingConflictHint'
import BookingTimeSuggestions from '@/components/business/booking/parts/BookingTimeSuggestions'
import BookingTimePicker from '@/components/business/booking/parts/BookingTimePicker'
import { useBookingConflicts } from '@/components/business/booking/hooks/useBookingConflicts'
import { useBookingTimeSuggestions } from '@/components/business/booking/hooks/useBookingTimeSuggestions'
import { LABEL_CLS, ERROR_CLS, HINT_CLS } from '@/components/business/booking/shared/bookingTypography'
import { useBookingFormErrorMessage } from '@/components/business/booking/hooks/useBookingFormErrorMessage'
import { TIME_FORMAT_12H } from '@/utils/timeFormat'
import { formatBookingDurationMinutes } from '@/components/business/booking/shared/formatBookingDurationMinutes'
import {
    BOOKING_DURATION_OPTIONS_MINUTES,
    snapDurationToBookingPresetMinutes,
} from '@/components/business/booking/shared/bookingDurationPresets'

const STATUSES = ['new', 'pending', 'confirmed', 'completed', 'cancelled']

export default function BookingDetailsTab({
    values,
    setField,
    setFields,
    errors,
    services,
    teamMembers,
    scheduleSettings,
    slot,
    isCustomEvent,
    currency,
}) {
    const t = useTranslations('business.schedule.drawer.details')
    const tStatuses = useTranslations('business.schedule.statuses')
    const tDur = useTranslations('common.durationMinutes')
    const err = useBookingFormErrorMessage()

    const stepMin = scheduleSettings?.slot_step_minutes || 15
    const timeFormat = scheduleSettings?.time_format || TIME_FORMAT_12H
    const durationOptions = useMemo(
        () =>
            BOOKING_DURATION_OPTIONS_MINUTES.map((m) => ({
                value: m,
                label: formatBookingDurationMinutes(m, tDur),
            })),
        [tDur],
    )
    const statusOptions = useMemo(
        () =>
            STATUSES.map((s) => ({
                value: s,
                label: tStatuses(s, { defaultValue: s }),
            })),
        [tStatuses],
    )
    const teamOptions = useMemo(
        () => [
            { value: '', label: t('anySpecialist') },
            ...(teamMembers || []).map((m) => ({ value: m.id, label: m.name })),
        ],
        [teamMembers, t],
    )

    const dateValue = values.booking_date
        ? new Date(`${values.booking_date}T00:00:00`)
        : null

    const conflict = useBookingConflicts({
        bookingDate: values.booking_date,
        bookingTime: values.booking_time,
        durationMinutes: values.duration_minutes,
        specialistId: values.specialist_id,
        excludeId: values.id,
    })

    const suggestions = useBookingTimeSuggestions({
        bookingDate: values.booking_date,
        durationMinutes: values.duration_minutes,
        specialistId: values.specialist_id,
        excludeId: values.id,
        scheduleSettings,
    })

    const isOffsite = (values.execution_type || 'onsite') === 'offsite'

    const specialistName = useMemo(() => {
        if (values.specialist_id == null) return null
        const found = (teamMembers || []).find(
            (m) => String(m.id) === String(values.specialist_id),
        )
        return found?.name || null
    }, [teamMembers, values.specialist_id])

    return (
        <div className="flex flex-col gap-4">
            {isCustomEvent ? (
                <>
                    <FormItem
                        label={<span className={LABEL_CLS}>{t('eventTitle')}</span>}
                        invalid={Boolean(errors.title)}
                        errorMessage={err(errors.title)}
                    >
                        <Input
                            value={values.title || ''}
                            onChange={(e) => setField('title', e.target.value)}
                            placeholder={t('eventTitlePlaceholder')}
                            size="sm"
                        />
                    </FormItem>
                    <FormItem
                        label={<span className={LABEL_CLS}>{t('price')}</span>}
                        invalid={Boolean(errors.price)}
                        errorMessage={err(errors.price)}
                    >
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            size="sm"
                            value={values.price === null || values.price === undefined ? '' : values.price}
                            onChange={(e) => {
                                const v = e.target.value
                                if (v === '') {
                                    setField('price', null)
                                    return
                                }
                                const n = parseFloat(v)
                                setField('price', Number.isFinite(n) ? Math.max(0, n) : null)
                            }}
                        />
                        <div className={`mt-1 ${HINT_CLS}`}>{t('priceHint', { currency })}</div>
                    </FormItem>
                </>
            ) : (
                <BookingServicePicker
                    label={t('service')}
                    value={values.service_id}
                    onChange={(id, service) => {
                        const patch = { service_id: id }
                        if (service && (!values.duration_minutes || values.duration_minutes === 60)) {
                            patch.duration_minutes = snapDurationToBookingPresetMinutes(
                                service.duration || 60,
                            )
                        }
                        if (service && (values.price == null || values.price === '')) {
                            patch.price = service.price
                        }
                        if (service?.service_type) {
                            patch.execution_type = service.service_type === 'offsite' ? 'offsite' : 'onsite'
                        }
                        setFields(patch)
                    }}
                    services={services}
                    error={errors.service_id}
                    currency={currency}
                />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormItem
                    label={<span className={LABEL_CLS}>{t('date')}</span>}
                    invalid={Boolean(errors.booking_date)}
                    errorMessage={err(errors.booking_date)}
                >
                    <DatePicker
                        value={dateValue}
                        onChange={(d) =>
                            d && setField('booking_date', dayjs(d).format('YYYY-MM-DD'))
                        }
                    />
                </FormItem>
                <FormItem
                    label={<span className={LABEL_CLS}>{t('time')}</span>}
                    invalid={Boolean(errors.booking_time)}
                    errorMessage={err(errors.booking_time)}
                >
                    <BookingTimePicker
                        value={values.booking_time}
                        onChange={(v) => setField('booking_time', v)}
                        stepMinutes={stepMin}
                        format={timeFormat}
                        invalid={Boolean(errors.booking_time)}
                    />
                </FormItem>
                <FormItem
                    label={<span className={LABEL_CLS}>{t('duration')}</span>}
                    invalid={Boolean(errors.duration_minutes)}
                    errorMessage={err(errors.duration_minutes)}
                >
                    <Select
                        options={durationOptions}
                        value={
                            durationOptions.find(
                                (o) => o.value === Number(values.duration_minutes),
                            ) ||
                            durationOptions.find(
                                (o) =>
                                    o.value ===
                                    snapDurationToBookingPresetMinutes(values.duration_minutes),
                            ) ||
                            null
                        }
                        onChange={(opt) =>
                            setField('duration_minutes', Number(opt?.value) || 60)
                        }
                        isSearchable={false}
                    />
                </FormItem>
            </div>

            <BookingConflictHint
                conflicts={conflict.conflicts}
                specialistName={specialistName}
            />
            {conflict.hasConflict && suggestions.length > 0 && (
                <BookingTimeSuggestions
                    suggestions={suggestions}
                    onPick={(s) =>
                        setFields({ booking_date: s.date, booking_time: s.time })
                    }
                    hint={t('conflictPickHint')}
                    format={timeFormat}
                />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormItem label={<span className={LABEL_CLS}>{t('specialist')}</span>}>
                    <Select
                        options={teamOptions}
                        value={
                            teamOptions.find(
                                (o) => String(o.value) === String(values.specialist_id || ''),
                            ) || teamOptions[0]
                        }
                        onChange={(opt) =>
                            setField('specialist_id', opt?.value === '' ? null : opt?.value)
                        }
                        isSearchable={false}
                    />
                </FormItem>
                <FormItem label={<span className={LABEL_CLS}>{t('status')}</span>}>
                    <Select
                        options={statusOptions}
                        value={
                            statusOptions.find((o) => o.value === values.status) ||
                            statusOptions[0]
                        }
                        onChange={(opt) => setField('status', opt?.value || 'new')}
                        isSearchable={false}
                    />
                </FormItem>
            </div>

            {!isCustomEvent && (
                <FormItem label={<span className={LABEL_CLS}>{t('executionType')}</span>}>
                    <Select
                        options={[
                            { value: 'onsite', label: t('onsite') },
                            { value: 'offsite', label: t('offsite') },
                        ]}
                        value={
                            (values.execution_type || 'onsite') === 'offsite'
                                ? { value: 'offsite', label: t('offsite') }
                                : { value: 'onsite', label: t('onsite') }
                        }
                        onChange={(opt) => setField('execution_type', opt?.value || 'onsite')}
                        isSearchable={false}
                    />
                </FormItem>
            )}

            {!isCustomEvent && isOffsite && (
                <div className="flex flex-col gap-3 rounded-md border border-gray-200 dark:border-gray-700 p-3">
                    <div className={LABEL_CLS}>{t('addressBlock')}</div>
                    <FormItem label={<span className={LABEL_CLS}>{t('addressLine1')}</span>}>
                        <AddressAutocomplete
                            value={values.address_line1 || ''}
                            onChange={(v) => setField('address_line1', v)}
                            onAddressParsed={(parsed) => {
                                setFields({
                                    address_line1: parsed.address_line1 || values.address_line1,
                                    city: parsed.city || values.city,
                                    state: parsed.state || values.state,
                                    zip: parsed.zip || values.zip,
                                })
                            }}
                            placeholder={t('addressPlaceholder')}
                        />
                    </FormItem>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <FormItem label={<span className={LABEL_CLS}>{t('city')}</span>}>
                            <Input
                                size="sm"
                                value={values.city || ''}
                                onChange={(e) => setField('city', e.target.value)}
                            />
                        </FormItem>
                        <FormItem label={<span className={LABEL_CLS}>{t('state')}</span>}>
                            <Input
                                size="sm"
                                value={values.state || ''}
                                onChange={(e) => setField('state', e.target.value)}
                            />
                        </FormItem>
                        <FormItem label={<span className={LABEL_CLS}>{t('zip')}</span>}>
                            <Input
                                size="sm"
                                value={values.zip || ''}
                                onChange={(e) => setField('zip', e.target.value)}
                            />
                        </FormItem>
                    </div>
                </div>
            )}

            <FormItem label={<span className={LABEL_CLS}>{t('notes')}</span>}>
                <textarea
                    rows={3}
                    value={values.notes || ''}
                    onChange={(e) => setField('notes', e.target.value)}
                    placeholder={t('notesPlaceholder')}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm font-bold text-gray-900 dark:text-gray-100"
                />
            </FormItem>

            {errors.specialist_id && (
                <div className={ERROR_CLS}>{err(errors.specialist_id)}</div>
            )}
        </div>
    )
}

'use client'

import { useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import dayjs from 'dayjs'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import AddressAutocomplete from '@/components/shared/AddressAutocomplete'
import BookingConflictHint from '@/components/business/booking/parts/BookingConflictHint'
import BookingTimeSuggestions from '@/components/business/booking/parts/BookingTimeSuggestions'
import BookingTimePicker from '@/components/business/booking/parts/BookingTimePicker'
import { useBookingConflicts } from '@/components/business/booking/hooks/useBookingConflicts'
import { useBookingTimeSuggestions } from '@/components/business/booking/hooks/useBookingTimeSuggestions'
import { LABEL_CLS, HINT_CLS } from '@/components/business/booking/shared/bookingTypography'
import { useBookingFormErrorMessage } from '@/components/business/booking/hooks/useBookingFormErrorMessage'
import { TIME_FORMAT_12H } from '@/utils/timeFormat'
import { formatBookingDurationMinutes } from '@/components/business/booking/shared/formatBookingDurationMinutes'
import {
    BOOKING_DURATION_OPTIONS_MINUTES,
    snapDurationToBookingPresetMinutes,
} from '@/components/business/booking/shared/bookingDurationPresets'

export default function Step2TimeAssignment({
    values,
    setField,
    setFields,
    errors,
    services = [],
    teamMembers = [],
    scheduleSettings,
}) {
    const t = useTranslations('business.schedule.wizard.step2')
    const tModalLabels = useTranslations('business.schedule.modal.labels')
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
    })

    const suggestions = useBookingTimeSuggestions({
        bookingDate: values.booking_date,
        durationMinutes: values.duration_minutes,
        specialistId: values.specialist_id,
        scheduleSettings,
    })

    const isOffsite = (values.execution_type || 'onsite') === 'offsite'

    const selectedService = useMemo(() => {
        if (values.service_id == null) return null
        const sid = String(values.service_id)
        return (services || []).find((s) => String(s.id) === sid) || null
    }, [services, values.service_id])

    const resolvedServiceType = selectedService?.service_type || values.service_type || null

    const onsiteLabel =
        resolvedServiceType === 'hybrid' ? tModalLabels('hybridOnsite') : t('onsite')
    const offsiteLabel =
        resolvedServiceType === 'hybrid' ? tModalLabels('hybridOffsite') : t('offsite')

    const executionOptions = useMemo(() => {
        const base = [
            { value: 'onsite', label: onsiteLabel },
            { value: 'offsite', label: offsiteLabel },
        ]
        if (resolvedServiceType === 'onsite') return [base[0]]
        if (resolvedServiceType === 'offsite') return [base[1]]
        return base
    }, [resolvedServiceType, onsiteLabel, offsiteLabel])

    useEffect(() => {
        if (!resolvedServiceType || resolvedServiceType === 'hybrid') return
        const forced = resolvedServiceType === 'offsite' ? 'offsite' : 'onsite'
        if ((values.execution_type || 'onsite') !== forced) {
            setField('execution_type', forced)
        }
    }, [resolvedServiceType, values.execution_type, setField])

    return (
        <div className="flex flex-col gap-4">
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

            <BookingConflictHint conflicts={conflict.conflicts} />
            {suggestions.length > 0 && (
                <BookingTimeSuggestions
                    suggestions={suggestions}
                    onPick={(s) =>
                        setFields({ booking_date: s.date, booking_time: s.time })
                    }
                    hint={conflict.hasConflict ? t('conflictPickHint') : t('quickPickHint')}
                    format={timeFormat}
                />
            )}

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

            <FormItem
                label={<span className={LABEL_CLS}>{t('executionType')}</span>}
                invalid={Boolean(errors.execution_type)}
                errorMessage={err(errors.execution_type)}
            >
                <Select
                    options={executionOptions}
                    value={
                        executionOptions.find(
                            (o) => o.value === (values.execution_type || 'onsite'),
                        ) || executionOptions[0]
                    }
                    onChange={(opt) => setField('execution_type', opt?.value || 'onsite')}
                    isSearchable={false}
                />
                {resolvedServiceType === 'onsite' && (
                    <div className={`mt-1 ${HINT_CLS}`}>{t('executionFixedOnsite')}</div>
                )}
                {resolvedServiceType === 'offsite' && (
                    <div className={`mt-1 ${HINT_CLS}`}>{t('executionFixedOffsite')}</div>
                )}
            </FormItem>

            {isOffsite && (
                <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-3">
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
        </div>
    )
}

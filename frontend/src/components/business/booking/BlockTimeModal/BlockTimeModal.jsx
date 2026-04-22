'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import dayjs from 'dayjs'
import Drawer from '@/components/ui/Drawer'
import Button from '@/components/ui/Button'
import CloseButton from '@/components/ui/CloseButton'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { FormItem } from '@/components/ui/Form'
import { useScheduleReferenceData } from '@/hooks/api/useScheduleReferenceData'
import { useBookingFormState } from '@/components/business/booking/hooks/useBookingFormState'
import { TITLE_CLS, MUTED_CLS, LABEL_CLS } from '@/components/business/booking/shared/bookingTypography'
import { useBookingFormErrorMessage } from '@/components/business/booking/hooks/useBookingFormErrorMessage'
import BookingTimePicker from '@/components/business/booking/parts/BookingTimePicker'
import { TIME_FORMAT_12H } from '@/utils/timeFormat'
import { formatBookingDurationMinutes } from '@/components/business/booking/shared/formatBookingDurationMinutes'
import {
    BOOKING_DURATION_OPTIONS_MINUTES,
    snapDurationToBookingPresetMinutes,
} from '@/components/business/booking/shared/bookingDurationPresets'

const STATUSES = ['new', 'pending', 'confirmed', 'completed', 'cancelled']

/** Из seed (API): ISO или HH:mm → HH:mm */
function parseTimeFromSeed(seed) {
    if (!seed?.booking_time) return '09:00'
    const s = String(seed.booking_time)
    if (s.includes('T')) {
        const d = dayjs(s)
        return d.isValid() ? d.format('HH:mm') : '09:00'
    }
    const sub = s.substring(0, 5)
    return /^\d{2}:\d{2}$/.test(sub) ? sub : '09:00'
}

/** Время к ближайшему слоту сетки (вниз), чтобы Select всегда имел совпадающее value */
function snapTimeToGrid(timeStr, stepMinutes) {
    if (!stepMinutes || stepMinutes < 1) return '09:00'
    if (!timeStr || typeof timeStr !== 'string') return '09:00'
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/)
    if (!match) return '09:00'
    let h = Number(match[1])
    let min = Number(match[2])
    if (!Number.isFinite(h) || !Number.isFinite(min)) return '09:00'
    h = ((h % 24) + 24) % 24
    const total = h * 60 + min
    const snapped = Math.floor(total / stepMinutes) * stepMinutes
    const nh = Math.floor(snapped / 60) % 24
    const nm = snapped % 60
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

function normalizeStatus(s) {
    const allowed = new Set(STATUSES)
    return allowed.has(s) ? s : 'confirmed'
}

function buildInitial(seed, stepMin) {
    const today = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const rawTime = parseTimeFromSeed(seed)
    const bookingTime = snapTimeToGrid(rawTime, stepMin)

    return {
        id: seed?.id,
        title: seed?.title || '',
        booking_date:
            seed?.booking_date ||
            `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
        booking_time: bookingTime,
        duration_minutes: snapDurationToBookingPresetMinutes(Number(seed?.duration_minutes) || 60),
        specialist_id: seed?.specialist_id ?? null,
        status: normalizeStatus(seed?.status),
        notes: seed?.notes || '',
    }
}

export default function BlockTimeModal({
    open,
    seed,
    onClose,
    onSubmit,
    saving = false,
}) {
    const t = useTranslations('business.schedule.block')
    const tDetails = useTranslations('business.schedule.drawer.details')
    const tStatuses = useTranslations('business.schedule.statuses')
    const tCommon = useTranslations('business.common')
    const tDur = useTranslations('business.schedule.bookingDuration')
    const err = useBookingFormErrorMessage()

    const { teamMembers, scheduleSettings } = useScheduleReferenceData()
    const stepMin = scheduleSettings?.slot_step_minutes || 15
    const timeFormat = scheduleSettings?.time_format || TIME_FORMAT_12H

    const initial = useMemo(() => buildInitial(seed, stepMin), [seed, stepMin])
    const formState = useBookingFormState({ initialValues: initial, schema: 'block' })
    const { values, setField, reset, errors, isValid, touched, touchField } = formState
    const [submitAttempted, setSubmitAttempted] = useState(false)

    const showTitleError =
        Boolean(errors.title) && (Boolean(touched.title) || submitAttempted)

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
    const statusOptions = useMemo(
        () =>
            STATUSES.map((s) => ({
                value: s,
                label: tStatuses(s, { defaultValue: s }),
            })),
        [tStatuses],
    )

    useEffect(() => {
        if (open) {
            reset(initial)
            setSubmitAttempted(false)
        }
    }, [open, initial, reset])

    const handleSave = async () => {
        if (!isValid) {
            setSubmitAttempted(true)
            return
        }
        const payload = {
            event_type: 'block',
            title: values.title,
            booking_date: values.booking_date,
            booking_time: values.booking_time,
            duration_minutes: Number(values.duration_minutes) || 60,
            specialist_id: values.specialist_id || null,
            notes: values.notes || null,
            status: values.status,
            price: 0,
        }
        await onSubmit?.(payload)
    }

    const dateValue = values.booking_date
        ? new Date(`${values.booking_date}T00:00:00`)
        : null

    const durationSelectValue =
        durationOptions.find((o) => o.value === Number(values.duration_minutes)) ||
        durationOptions[0] ||
        null

    const statusSelectValue =
        statusOptions.find((o) => o.value === values.status) || statusOptions[0]

    return (
        <Drawer
            isOpen={open}
            onClose={onClose}
            placement="right"
            width={420}
            title={null}
            closable={false}
            bodyClass="p-0"
        >
            <div className="flex flex-col h-full min-h-0 max-h-[100dvh] overflow-hidden">
                <div className="flex shrink-0 items-start justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="min-w-0">
                        <h4 className={`${TITLE_CLS} truncate`}>{t('title')}</h4>
                        <div className={`mt-1 ${MUTED_CLS}`}>{t('subtitle')}</div>
                    </div>
                    <CloseButton onClick={onClose} />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-4">
                    <FormItem
                        label={<span className={LABEL_CLS}>{t('eventTitle')}</span>}
                        invalid={showTitleError}
                        errorMessage={showTitleError ? err(errors.title) : undefined}
                    >
                        <Input
                            size="sm"
                            value={values.title || ''}
                            onChange={(e) => setField('title', e.target.value)}
                            onBlur={() => touchField('title')}
                            placeholder={t('eventTitlePlaceholder')}
                        />
                    </FormItem>

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
                                onChange={(v) =>
                                    setField('booking_time', v || '09:00')
                                }
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
                                value={durationSelectValue}
                                onChange={(opt) =>
                                    setField('duration_minutes', Number(opt?.value) || 60)
                                }
                                isSearchable={false}
                            />
                        </FormItem>
                    </div>

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

                    <FormItem label={<span className={LABEL_CLS}>{tDetails('status')}</span>}>
                        <Select
                            options={statusOptions}
                            value={statusSelectValue}
                            onChange={(opt) =>
                                setField('status', opt?.value || 'confirmed')
                            }
                            isSearchable={false}
                        />
                    </FormItem>

                    <FormItem label={<span className={LABEL_CLS}>{t('notes')}</span>}>
                        <textarea
                            rows={3}
                            value={values.notes || ''}
                            onChange={(e) => setField('notes', e.target.value)}
                            placeholder={t('notesPlaceholder')}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm font-bold text-gray-900 dark:text-gray-100"
                        />
                    </FormItem>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2 shrink-0 bg-white dark:bg-gray-900">
                    <Button
                        size="sm"
                        variant="default"
                        className="w-full sm:w-auto justify-center"
                        onClick={onClose}
                        disabled={saving}
                    >
                        {tCommon('cancel')}
                    </Button>
                    <Button
                        size="sm"
                        variant="solid"
                        className="w-full sm:w-auto justify-center"
                        loading={saving}
                        disabled={saving}
                        onClick={handleSave}
                    >
                        {tCommon('save')}
                    </Button>
                </div>
            </div>
        </Drawer>
    )
}

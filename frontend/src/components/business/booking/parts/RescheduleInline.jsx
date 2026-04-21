'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import dayjs from 'dayjs'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { FormItem } from '@/components/ui/Form'
import BookingTimeSuggestions from './BookingTimeSuggestions'
import BookingTimePicker from './BookingTimePicker'
import { useBookingTimeSuggestions } from '@/components/business/booking/hooks/useBookingTimeSuggestions'
import { LABEL_CLS } from '@/components/business/booking/shared/bookingTypography'
import { TIME_FORMAT_12H } from '@/utils/timeFormat'

const DURATIONS = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240, 300]

export default function RescheduleInline({
    initialDate,
    initialTime,
    initialDuration,
    specialistId,
    excludeId,
    scheduleSettings,
    onApply,
    onCancel,
    saving = false,
}) {
    const t = useTranslations('business.schedule.drawer.reschedule')

    const [date, setDate] = useState(initialDate ? new Date(`${initialDate}T00:00:00`) : new Date())
    const [time, setTime] = useState(initialTime || '09:00')
    const [duration, setDuration] = useState(initialDuration || 60)

    useEffect(() => {
        if (initialDate) setDate(new Date(`${initialDate}T00:00:00`))
        if (initialTime) setTime(initialTime)
        if (initialDuration) setDuration(initialDuration)
    }, [initialDate, initialTime, initialDuration])

    const stepMin = scheduleSettings?.slot_step_minutes || 15
    const timeFormat = scheduleSettings?.time_format || TIME_FORMAT_12H
    const dOptions = useMemo(
        () => DURATIONS.map((m) => ({ value: m, label: `${m} min` })),
        [],
    )
    const dateStr = useMemo(() => dayjs(date).format('YYYY-MM-DD'), [date])

    const suggestions = useBookingTimeSuggestions({
        bookingDate: dateStr,
        durationMinutes: duration,
        specialistId,
        excludeId,
        scheduleSettings,
    })

    const apply = () => {
        onApply?.({
            booking_date: dateStr,
            booking_time: time,
            duration_minutes: duration,
        })
    }

    return (
        <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/40">
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                {t('title')}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <FormItem label={<span className={LABEL_CLS}>{t('dateLabel')}</span>}>
                    <DatePicker value={date} onChange={(d) => d && setDate(d)} />
                </FormItem>
                <FormItem label={<span className={LABEL_CLS}>{t('timeLabel')}</span>}>
                    <BookingTimePicker
                        value={time}
                        onChange={(v) => setTime(v || '')}
                        stepMinutes={stepMin}
                        format={timeFormat}
                    />
                </FormItem>
                <FormItem label={<span className={LABEL_CLS}>{t('durationLabel')}</span>}>
                    <Select
                        options={dOptions}
                        value={dOptions.find((o) => o.value === duration) || null}
                        onChange={(opt) => setDuration(Number(opt?.value) || 60)}
                        isSearchable={false}
                    />
                </FormItem>
            </div>

            <BookingTimeSuggestions
                suggestions={suggestions}
                onPick={(s) => {
                    setDate(new Date(`${s.date}T00:00:00`))
                    setTime(s.time)
                }}
                format={timeFormat}
            />

            <div className="flex justify-end gap-2 mt-3">
                <Button size="sm" variant="default" onClick={onCancel} disabled={saving}>
                    {t('cancel')}
                </Button>
                <Button size="sm" variant="solid" loading={saving} onClick={apply}>
                    {t('apply')}
                </Button>
            </div>
        </div>
    )
}

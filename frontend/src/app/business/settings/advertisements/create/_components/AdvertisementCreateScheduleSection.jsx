'use client'

import { useTranslations } from 'next-intl'
import BookingTimePicker from '@/components/business/booking/parts/BookingTimePicker'
import MobileTimePicker from '@/components/business/booking/parts/MobileTimePicker'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import Switcher from '@/components/ui/Switcher'
import { TIME_FORMAT_12H } from '@/utils/timeFormat'

const SLOT_OPTIONS = [60, 90, 120, 180, 240]

function slotLabel(t, minutes) {
    if (minutes === 90) return t('schedule.hours15')
    if (minutes === 120) return t('schedule.hours2')
    if (minutes === 180) return t('schedule.hours3')
    if (minutes === 240) return t('schedule.hours4')
    return t('schedule.hour1')
}

export function AdvertisementCreateScheduleSection({ formData, setFormData, updateSchedule }) {
    const t = useTranslations('business.advertisements.create')
    const step = SLOT_OPTIONS.includes(formData.slot_step_minutes) ? formData.slot_step_minutes : 60
    const scheduleStepMinutes = Number(formData.slot_step_minutes) || 60

    return (
        <div className="space-y-4">
            <div>
                <h4 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">{t('schedule.title')}</h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('schedule.subtitle')}</p>
            </div>

            <FormItem label={t('schedule.slotStep')}>
                <Select
                    size="sm"
                    isSearchable={false}
                    options={SLOT_OPTIONS.map((value) => ({
                        value,
                        label: slotLabel(t, value),
                    }))}
                    value={{
                        value: step,
                        label: slotLabel(t, step),
                    }}
                    onChange={(option) =>
                        setFormData({ ...formData, slot_step_minutes: option?.value || 60 })
                    }
                />
                <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                    {t('schedule.slotStepHint')}
                </p>
            </FormItem>

            <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                <h5 className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100">{t('schedule.workDays')}</h5>
                <div className="divide-y divide-gray-200 dark:divide-gray-700 sm:space-y-3 sm:divide-y-0">
                    {Object.entries(formData.schedule || {}).map(([day, schedule]) => {
                        if (!schedule) return null
                        const dayLabels = {
                            monday: t('schedule.monday'),
                            tuesday: t('schedule.tuesday'),
                            wednesday: t('schedule.wednesday'),
                            thursday: t('schedule.thursday'),
                            friday: t('schedule.friday'),
                            saturday: t('schedule.saturday'),
                            sunday: t('schedule.sunday'),
                        }
                        return (
                            <div
                                key={day}
                                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4 sm:rounded-lg sm:border sm:border-gray-200 sm:p-3 sm:py-3 dark:sm:border-gray-700"
                            >
                                <div className="flex w-full shrink-0 items-center sm:w-40">
                                    <Switcher
                                        checked={schedule.enabled}
                                        onChange={(checked) => updateSchedule(day, 'enabled', checked)}
                                    />
                                    <span className="ml-2 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {dayLabels[day]}
                                    </span>
                                </div>
                                {schedule.enabled ? (
                                    <div className="flex w-full flex-1 items-center gap-2 sm:w-auto">
                                        <div className="min-w-0 flex-1 sm:hidden">
                                            <MobileTimePicker
                                                value={schedule.from || '09:00'}
                                                onChange={(v) => updateSchedule(day, 'from', v)}
                                                stepMinutes={scheduleStepMinutes}
                                                format={TIME_FORMAT_12H}
                                                size="sm"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1 hidden sm:block">
                                            <BookingTimePicker
                                                value={schedule.from || '09:00'}
                                                onChange={(v) => updateSchedule(day, 'from', v)}
                                                stepMinutes={scheduleStepMinutes}
                                                format={TIME_FORMAT_12H}
                                                size="sm"
                                            />
                                        </div>
                                        <span className="shrink-0 text-sm font-bold text-gray-400 dark:text-gray-500">
                                            —
                                        </span>
                                        <div className="min-w-0 flex-1 sm:hidden">
                                            <MobileTimePicker
                                                value={schedule.to || '18:00'}
                                                onChange={(v) => updateSchedule(day, 'to', v)}
                                                stepMinutes={scheduleStepMinutes}
                                                format={TIME_FORMAT_12H}
                                                size="sm"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1 hidden sm:block">
                                            <BookingTimePicker
                                                value={schedule.to || '18:00'}
                                                onChange={(v) => updateSchedule(day, 'to', v)}
                                                stepMinutes={scheduleStepMinutes}
                                                format={TIME_FORMAT_12H}
                                                size="sm"
                                            />
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

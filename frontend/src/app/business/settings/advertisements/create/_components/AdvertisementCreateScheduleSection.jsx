'use client'

import { useTranslations } from 'next-intl'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import Card from '@/components/ui/Card'
import Switcher from '@/components/ui/Switcher'

export function AdvertisementCreateScheduleSection({ formData, setFormData, updateSchedule }) {
    const t = useTranslations('business.advertisements.create')

    return (
        <div className="space-y-6">
            <div>
                <h4 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">{t('schedule.title')}</h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('schedule.subtitle')}</p>
            </div>

            <FormItem label={t('schedule.slotStep')}>
                <Select
                    size="sm"
                    isSearchable={false}
                    options={[
                        { value: 15, label: t('schedule.minutes15') },
                        { value: 30, label: t('schedule.minutes30') },
                        { value: 60, label: t('schedule.hour1') },
                        { value: 90, label: t('schedule.hours15') },
                        { value: 120, label: t('schedule.hours2') },
                        { value: 180, label: t('schedule.hours3') },
                        { value: 240, label: t('schedule.hours4') },
                    ]}
                    value={{
                        value: formData.slot_step_minutes || 60,
                        label:
                            formData.slot_step_minutes === 15
                                ? t('schedule.minutes15')
                                : formData.slot_step_minutes === 30
                                  ? t('schedule.minutes30')
                                  : formData.slot_step_minutes === 90
                                    ? t('schedule.hours15')
                                    : formData.slot_step_minutes === 120
                                      ? t('schedule.hours2')
                                      : formData.slot_step_minutes === 180
                                        ? t('schedule.hours3')
                                        : formData.slot_step_minutes === 240
                                          ? t('schedule.hours4')
                                          : t('schedule.hour1'),
                    }}
                    onChange={(option) =>
                        setFormData({ ...formData, slot_step_minutes: option?.value || 60 })
                    }
                />
                <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                    {t('schedule.slotStepHint')}
                </p>
            </FormItem>

            <Card className="p-4">
                <h5 className="mb-4 text-sm font-bold text-gray-900 dark:text-gray-100">{t('schedule.workDays')}</h5>
                <div className="space-y-3">
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
                                className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:flex-row sm:items-center sm:gap-4"
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
                                        <Input
                                            size="sm"
                                            type="time"
                                            value={schedule.from || '09:00'}
                                            onChange={(e) => updateSchedule(day, 'from', e.target.value)}
                                            className="w-full sm:w-auto"
                                        />
                                        <span className="flex-shrink-0 text-sm font-bold text-gray-900 dark:text-gray-100">
                                            —
                                        </span>
                                        <Input
                                            size="sm"
                                            type="time"
                                            value={schedule.to || '18:00'}
                                            onChange={(e) => updateSchedule(day, 'to', e.target.value)}
                                            className="w-full sm:w-auto"
                                        />
                                    </div>
                                ) : null}
                            </div>
                        )
                    })}
                </div>
            </Card>
        </div>
    )
}

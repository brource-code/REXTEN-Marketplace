'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import BookingTimePicker from '@/components/business/booking/parts/BookingTimePicker'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Switcher from '@/components/ui/Switcher'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    getScheduleSettingsFromSettings, 
    updateScheduleSettingsFromSettings 
} from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import useDebounce from '@/utils/hooks/useDebounce'
import { TIME_FORMAT_12H } from '@/utils/timeFormat'

const ScheduleTab = () => {
    const t = useTranslations('business.settings.schedule')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()
    const [schedule, setSchedule] = useState({
        // Рабочие дни
        monday: { enabled: true, from: '09:00', to: '18:00' },
        tuesday: { enabled: true, from: '09:00', to: '18:00' },
        wednesday: { enabled: true, from: '09:00', to: '18:00' },
        thursday: { enabled: true, from: '09:00', to: '18:00' },
        friday: { enabled: true, from: '09:00', to: '18:00' },
        saturday: { enabled: true, from: '10:00', to: '16:00' },
        sunday: { enabled: false, from: '10:00', to: '16:00' },
        // Перерывы
        breakEnabled: true,
        breakFrom: '13:00',
        breakTo: '14:00',
        // Дополнительные настройки
        blockPastSlots: true,
        minBookingHours: 2,
        maxBookingDays: 30,
        weekStartsOn: 1, // 0 = воскресенье, 1 = понедельник
    })
    const isInitialMount = useRef(true)
    const hasChanges = useRef(false)

    const { data: scheduleSettings, isLoading } = useQuery({
        queryKey: ['business-schedule-settings'],
        queryFn: getScheduleSettingsFromSettings,
    })

    const updateSettingsMutation = useMutation({
        mutationFn: updateScheduleSettingsFromSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-schedule-settings'] })
            hasChanges.current = false
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.saved')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.saveError')}
                </Notification>,
            )
        },
    })

    // Автосохранение с debounce — используем ref для актуальных данных (избегаем stale closure)
    const scheduleRef = useRef(schedule)
    scheduleRef.current = schedule
    const mutationRef = useRef(updateSettingsMutation)
    mutationRef.current = updateSettingsMutation

    const debouncedSave = useMemo(
        () =>
            useDebounce(() => {
                if (hasChanges.current && !isInitialMount.current) {
                    const data = { ...scheduleRef.current }
                    // Приводим к ожидаемым типам для API
                    data.minBookingHours = Number(data.minBookingHours) || 2
                    data.maxBookingDays = Number(data.maxBookingDays) || 30
                    mutationRef.current.mutate(data)
                }
            }, 1000),
        [],
    )

    useEffect(() => {
        if (scheduleSettings) {
            setSchedule({
                monday: scheduleSettings.monday || { enabled: true, from: '09:00', to: '18:00' },
                tuesday: scheduleSettings.tuesday || { enabled: true, from: '09:00', to: '18:00' },
                wednesday: scheduleSettings.wednesday || { enabled: true, from: '09:00', to: '18:00' },
                thursday: scheduleSettings.thursday || { enabled: true, from: '09:00', to: '18:00' },
                friday: scheduleSettings.friday || { enabled: true, from: '09:00', to: '18:00' },
                saturday: scheduleSettings.saturday || { enabled: true, from: '10:00', to: '16:00' },
                sunday: scheduleSettings.sunday || { enabled: false, from: '10:00', to: '16:00' },
                breakEnabled: scheduleSettings.breakEnabled ?? true,
                breakFrom: scheduleSettings.breakFrom || '13:00',
                breakTo: scheduleSettings.breakTo || '14:00',
                blockPastSlots: scheduleSettings.blockPastSlots ?? true,
                minBookingHours: scheduleSettings.minBookingHours || 2,
                maxBookingDays: scheduleSettings.maxBookingDays || 30,
                weekStartsOn: scheduleSettings.weekStartsOn ?? 1,
            })
            isInitialMount.current = true
            hasChanges.current = false
            setTimeout(() => {
                isInitialMount.current = false
            }, 150)
        }
    }, [scheduleSettings])

    // Автосохранение при изменении данных
    useEffect(() => {
        if (!isInitialMount.current && hasChanges.current) {
            debouncedSave()
        }
    }, [schedule, debouncedSave])

    const days = [
        { key: 'monday', label: t('days.monday') },
        { key: 'tuesday', label: t('days.tuesday') },
        { key: 'wednesday', label: t('days.wednesday') },
        { key: 'thursday', label: t('days.thursday') },
        { key: 'friday', label: t('days.friday') },
        { key: 'saturday', label: t('days.saturday') },
        { key: 'sunday', label: t('days.sunday') },
    ]

    const handleDayChange = (dayKey, field, value) => {
        hasChanges.current = true
        setSchedule((prev) => ({
            ...prev,
            [dayKey]: {
                ...prev[dayKey],
                [field]: value,
            },
        }))
    }

    const handleScheduleChange = (field, value) => {
        hasChanges.current = true
        setSchedule((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const breakStepMinutes = Number(scheduleSettings?.slot_step_minutes) || 15

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loading loading />
            </div>
        )
    }

    return (
        <FormContainer>
            <div className="flex flex-col gap-4 w-full">
                    {/* Рабочие дни */}
                    <Card className="p-4 sm:p-4 w-full">
                        <h4 className="mb-4">{t('workDays')}</h4>
                        <div className="space-y-4">
                            {days.map((day) => (
                                <div
                                    key={day.key}
                                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 w-full"
                                >
                                    <div className="flex items-center gap-2 sm:w-40 flex-shrink-0 w-full sm:w-auto">
                                        <Switcher
                                            checked={schedule[day.key].enabled}
                                            onChange={(checked) =>
                                                handleDayChange(day.key, 'enabled', checked)
                                            }
                                        />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{day.label}</span>
                                    </div>
                                    {schedule[day.key].enabled && (
                                        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                                            <div className="flex-1 min-w-0">
                                                <BookingTimePicker
                                                    value={schedule[day.key].from}
                                                    onChange={(v) => handleDayChange(day.key, 'from', v)}
                                                    stepMinutes={breakStepMinutes}
                                                    format={TIME_FORMAT_12H}
                                                    size="sm"
                                                />
                                            </div>
                                            <span className="text-gray-400 dark:text-gray-500 shrink-0">—</span>
                                            <div className="flex-1 min-w-0">
                                                <BookingTimePicker
                                                    value={schedule[day.key].to}
                                                    onChange={(v) => handleDayChange(day.key, 'to', v)}
                                                    stepMinutes={breakStepMinutes}
                                                    format={TIME_FORMAT_12H}
                                                    size="sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Перерывы */}
                    <Card className="p-4 sm:p-4 w-full">
                        <h4 className="mb-4">{t('breaks')}</h4>
                        <div className="space-y-4">
                            <FormItem label={t('enableBreaks')}>
                                <Switcher
                                    checked={schedule.breakEnabled}
                                    onChange={(checked) =>
                                        handleScheduleChange('breakEnabled', checked)
                                    }
                                />
                            </FormItem>
                            {schedule.breakEnabled && (
                                <div className="flex items-center gap-2 w-full">
                                    <div className="flex-1 min-w-0">
                                        <BookingTimePicker
                                            value={schedule.breakFrom}
                                            onChange={(v) => handleScheduleChange('breakFrom', v)}
                                            stepMinutes={breakStepMinutes}
                                            format={TIME_FORMAT_12H}
                                            size="sm"
                                        />
                                    </div>
                                    <span className="text-gray-400 dark:text-gray-500 shrink-0">—</span>
                                    <div className="flex-1 min-w-0">
                                        <BookingTimePicker
                                            value={schedule.breakTo}
                                            onChange={(v) => handleScheduleChange('breakTo', v)}
                                            stepMinutes={breakStepMinutes}
                                            format={TIME_FORMAT_12H}
                                            size="sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Начало недели */}
                    <Card className="p-4 sm:p-4 w-full">
                        <h4 className="mb-4">{t('weekStart.title')}</h4>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                variant={schedule.weekStartsOn === 1 ? 'solid' : 'plain'}
                                onClick={() => handleScheduleChange('weekStartsOn', 1)}
                                className="w-full sm:w-auto"
                            >
                                {t('weekStart.monday')}
                            </Button>
                            <Button
                                variant={schedule.weekStartsOn === 0 ? 'solid' : 'plain'}
                                onClick={() => handleScheduleChange('weekStartsOn', 0)}
                                className="w-full sm:w-auto"
                            >
                                {t('weekStart.sunday')}
                            </Button>
                        </div>
                    </Card>

                    {/* Дополнительные настройки */}
                    <Card className="p-4 sm:p-4 w-full">
                        <h4 className="mb-4">{t('additionalSettings')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormItem label={t('minBookingHours')}>
                                <Input
                                    type="number"
                                    value={schedule.minBookingHours}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        handleScheduleChange('minBookingHours', value === '' ? '' : value)
                                    }}
                                    min="0"
                                />
                            </FormItem>
                            <FormItem label={t('maxBookingDays')}>
                                <Input
                                    type="number"
                                    value={schedule.maxBookingDays}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        handleScheduleChange('maxBookingDays', value === '' ? '' : value)
                                    }}
                                    min="1"
                                />
                            </FormItem>
                            <FormItem label={t('blockPastSlots')}>
                                <Switcher
                                    checked={schedule.blockPastSlots}
                                    onChange={(checked) =>
                                        handleScheduleChange('blockPastSlots', checked)
                                    }
                                />
                            </FormItem>
                        </div>
                    </Card>
                </div>
        </FormContainer>
    )
}

export default ScheduleTab

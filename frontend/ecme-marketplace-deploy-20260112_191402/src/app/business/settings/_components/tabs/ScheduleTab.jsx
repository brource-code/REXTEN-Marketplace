'use client'
import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
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

const ScheduleTab = () => {
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
    })

    const { data: scheduleSettings, isLoading } = useQuery({
        queryKey: ['business-schedule-settings'],
        queryFn: getScheduleSettingsFromSettings,
    })

    const updateSettingsMutation = useMutation({
        mutationFn: updateScheduleSettingsFromSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-schedule-settings'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Настройки расписания успешно сохранены
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось сохранить настройки
                </Notification>,
            )
        },
    })

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
            })
        }
    }, [scheduleSettings])

    const days = [
        { key: 'monday', label: 'Понедельник' },
        { key: 'tuesday', label: 'Вторник' },
        { key: 'wednesday', label: 'Среда' },
        { key: 'thursday', label: 'Четверг' },
        { key: 'friday', label: 'Пятница' },
        { key: 'saturday', label: 'Суббота' },
        { key: 'sunday', label: 'Воскресенье' },
    ]

    const handleDayChange = (dayKey, field, value) => {
        setSchedule((prev) => ({
            ...prev,
            [dayKey]: {
                ...prev[dayKey],
                [field]: value,
            },
        }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        updateSettingsMutation.mutate(schedule)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loading loading />
            </div>
        )
    }

    return (
        <FormContainer>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6 w-full">
                    {/* Рабочие дни */}
                    <Card className="p-4 sm:p-6 w-full">
                        <h4 className="mb-4">Рабочие дни</h4>
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
                                            <Input
                                                type="time"
                                                size="sm"
                                                value={schedule[day.key].from}
                                                onChange={(e) =>
                                                    handleDayChange(day.key, 'from', e.target.value)
                                                }
                                                className="flex-1 min-w-0"
                                            />
                                            <span className="text-gray-400 dark:text-gray-500 shrink-0">—</span>
                                            <Input
                                                type="time"
                                                size="sm"
                                                value={schedule[day.key].to}
                                                onChange={(e) =>
                                                    handleDayChange(day.key, 'to', e.target.value)
                                                }
                                                className="flex-1 min-w-0"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Перерывы */}
                    <Card className="p-4 sm:p-6 w-full">
                        <h4 className="mb-4">Перерывы</h4>
                        <div className="space-y-4">
                            <FormItem label="Включить перерывы">
                                <Switcher
                                    checked={schedule.breakEnabled}
                                    onChange={(checked) =>
                                        setSchedule((prev) => ({
                                            ...prev,
                                            breakEnabled: checked,
                                        }))
                                    }
                                />
                            </FormItem>
                            {schedule.breakEnabled && (
                                <div className="flex items-center gap-2 w-full">
                                    <Input
                                        type="time"
                                        value={schedule.breakFrom}
                                        onChange={(e) =>
                                            setSchedule((prev) => ({
                                                ...prev,
                                                breakFrom: e.target.value,
                                            }))
                                        }
                                        className="flex-1 min-w-0"
                                    />
                                    <span className="text-gray-400 dark:text-gray-500 shrink-0">—</span>
                                    <Input
                                        type="time"
                                        value={schedule.breakTo}
                                        onChange={(e) =>
                                            setSchedule((prev) => ({
                                                ...prev,
                                                breakTo: e.target.value,
                                            }))
                                        }
                                        className="flex-1 min-w-0"
                                    />
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Дополнительные настройки */}
                    <Card className="p-4 sm:p-6 w-full">
                        <h4 className="mb-4">Дополнительные настройки</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormItem label="Минимальное время до бронирования (часов)">
                                <Input
                                    type="number"
                                    value={schedule.minBookingHours}
                                    onChange={(e) =>
                                        setSchedule((prev) => ({
                                            ...prev,
                                            minBookingHours: parseInt(e.target.value) || 2,
                                        }))
                                    }
                                    min="0"
                                />
                            </FormItem>
                            <FormItem label="Максимальное бронирование на (дней вперед)">
                                <Input
                                    type="number"
                                    value={schedule.maxBookingDays}
                                    onChange={(e) =>
                                        setSchedule((prev) => ({
                                            ...prev,
                                            maxBookingDays: parseInt(e.target.value) || 30,
                                        }))
                                    }
                                    min="1"
                                />
                            </FormItem>
                            <FormItem label="Блокировать прошедшие слоты">
                                <Switcher
                                    checked={schedule.blockPastSlots}
                                    onChange={(checked) =>
                                        setSchedule((prev) => ({
                                            ...prev,
                                            blockPastSlots: checked,
                                        }))
                                    }
                                />
                            </FormItem>
                        </div>
                    </Card>

                    <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button 
                            type="button" 
                            variant="plain"
                            className="w-full sm:w-auto"
                            onClick={() => {
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
                                    })
                                }
                            }}
                        >
                            Отмена
                        </Button>
                        <Button 
                            type="submit" 
                            variant="solid"
                            className="w-full sm:w-auto"
                            loading={updateSettingsMutation.isPending}
                        >
                            Сохранить
                        </Button>
                    </div>
                </div>
            </form>
        </FormContainer>
    )
}

export default ScheduleTab

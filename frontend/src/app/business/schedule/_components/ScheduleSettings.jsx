'use client'
import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import BookingTimePicker from '@/components/business/booking/parts/BookingTimePicker'
import { FormItem } from '@/components/ui/Form'
import Switcher from '@/components/ui/Switcher'
import Drawer from '@/components/ui/Drawer'
import { PiGear, PiClock, PiCalendarX, PiLock } from 'react-icons/pi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getScheduleSettings, updateScheduleSettings } from '@/lib/api/business'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { TIME_FORMAT_12H } from '@/utils/timeFormat'

const ScheduleSettings = () => {
    const queryClient = useQueryClient()
    const [isOpen, setIsOpen] = useState(false)
    const [settings, setSettings] = useState({
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
        // Блокировка слотов
        blockPastSlots: true,
        minBookingHours: 2,
        maxBookingDays: 30,
    })

    const { data: scheduleSettings } = useQuery({
        queryKey: ['business-schedule-settings'],
        queryFn: getScheduleSettings,
        enabled: isOpen,
    })

    const updateSettingsMutation = useMutation({
        mutationFn: updateScheduleSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-schedule-settings'] })
            setIsOpen(false)
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
        if (scheduleSettings && isOpen) {
            setSettings({
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
    }, [scheduleSettings, isOpen])

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
        setSettings((prev) => ({
            ...prev,
            [dayKey]: {
                ...prev[dayKey],
                [field]: value,
            },
        }))
    }

    const handleSave = () => {
        updateSettingsMutation.mutate(settings)
    }

    const breakStepMinutes = Number(scheduleSettings?.slot_step_minutes) || 15

    return (
        <>
            <Button
                variant="outline"
                icon={<PiGear />}
                onClick={() => setIsOpen(true)}
            >
                Настройки расписания
            </Button>

            <Drawer
                title="Настройки расписания"
                isOpen={isOpen}
                placement="right"
                width={500}
                onClose={() => setIsOpen(false)}
            >
                <div className="p-4 space-y-4">
                    {/* Рабочие дни */}
                    <Card className="p-4">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <PiClock />
                            Рабочие дни
                        </h4>
                        <div className="space-y-4">
                            {days.map((day) => (
                                <div
                                    key={day.key}
                                    className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                                >
                                    <div className="w-32">
                                        <Switcher
                                            checked={settings[day.key].enabled}
                                            onChange={(checked) =>
                                                handleDayChange(day.key, 'enabled', checked)
                                            }
                                        />
                                        <span className="ml-2 text-sm">{day.label}</span>
                                    </div>
                                    {settings[day.key].enabled && (
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="flex-1 min-w-0">
                                                <BookingTimePicker
                                                    value={settings[day.key].from}
                                                    onChange={(v) => handleDayChange(day.key, 'from', v)}
                                                    stepMinutes={breakStepMinutes}
                                                    format={TIME_FORMAT_12H}
                                                    size="sm"
                                                />
                                            </div>
                                            <span className="text-gray-400 shrink-0">—</span>
                                            <div className="flex-1 min-w-0">
                                                <BookingTimePicker
                                                    value={settings[day.key].to}
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
                    <Card className="p-4">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <PiCalendarX />
                            Перерывы
                        </h4>
                        <div className="space-y-4">
                            <FormItem label="Включить перерывы">
                                <Switcher
                                    checked={settings.breakEnabled}
                                    onChange={(checked) =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            breakEnabled: checked,
                                        }))
                                    }
                                />
                            </FormItem>
                            {settings.breakEnabled && (
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                        <BookingTimePicker
                                            value={settings.breakFrom}
                                            onChange={(v) =>
                                                setSettings((prev) => ({
                                                    ...prev,
                                                    breakFrom: v,
                                                }))
                                            }
                                            stepMinutes={breakStepMinutes}
                                            format={TIME_FORMAT_12H}
                                            size="sm"
                                        />
                                    </div>
                                    <span className="text-gray-400">—</span>
                                    <div className="flex-1 min-w-0">
                                        <BookingTimePicker
                                            value={settings.breakTo}
                                            onChange={(v) =>
                                                setSettings((prev) => ({
                                                    ...prev,
                                                    breakTo: v,
                                                }))
                                            }
                                            stepMinutes={breakStepMinutes}
                                            format={TIME_FORMAT_12H}
                                            size="sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Блокировка слотов */}
                    <Card className="p-4">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <PiLock />
                            Блокировка слотов
                        </h4>
                        <div className="space-y-4">
                            <FormItem label="Блокировать прошедшие слоты">
                                <Switcher
                                    checked={settings.blockPastSlots}
                                    onChange={(checked) =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            blockPastSlots: checked,
                                        }))
                                    }
                                />
                            </FormItem>
                            <FormItem label="Минимальное время до бронирования (часов)">
                                <Input
                                    type="number"
                                    value={settings.minBookingHours}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        setSettings((prev) => ({
                                            ...prev,
                                            minBookingHours: value === '' ? '' : value,
                                        }))
                                    }}
                                />
                            </FormItem>
                            <FormItem label="Максимальное время для бронирования (дней)">
                                <Input
                                    type="number"
                                    value={settings.maxBookingDays}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        setSettings((prev) => ({
                                            ...prev,
                                            maxBookingDays: value === '' ? '' : value,
                                        }))
                                    }}
                                />
                            </FormItem>
                        </div>
                    </Card>

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button 
                            variant="plain" 
                            onClick={() => setIsOpen(false)}
                        >
                            Отмена
                        </Button>
                        <Button 
                            variant="solid" 
                            onClick={handleSave}
                            loading={updateSettingsMutation.isPending}
                        >
                            Сохранить
                        </Button>
                    </div>
                </div>
            </Drawer>
        </>
    )
}

export default ScheduleSettings


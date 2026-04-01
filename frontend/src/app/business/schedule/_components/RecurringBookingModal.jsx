'use client'
import { useState, useEffect, useMemo } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getBusinessServices,
    getBusinessClients,
    getTeamMembers,
    createRecurringBooking,
    updateRecurringBooking
} from '@/lib/api/business'
import { useTranslations, useLocale } from 'next-intl'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ClientCreateModal from '@/app/business/clients/_components/ClientCreateModal'
import { createPortal } from 'react-dom'
import { formatTime } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'

const RecurringBookingModal = ({ isOpen, onClose, chain = null }) => {
    const intlLocale = useLocale()
    const t = useTranslations('business.schedule.recurring')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()
    const { settings } = useBusinessStore()
    const timezone = settings?.timezone || 'America/Los_Angeles'
    const [mounted, setMounted] = useState(false)
    const [clientMode, setClientMode] = useState('select')
    const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false)

    const [formData, setFormData] = useState({
        service_id: null,
        user_id: null,
        specialist_id: null,
        frequency: 'weekly',
        interval_days: null,
        days_of_week: [],
        day_of_month: null,
        days_of_month: [],
        booking_time: '09:00',
        duration_minutes: 60,
        price: 0,
        start_date: dayjs().format('YYYY-MM-DD'),
        end_date: null,
        client_name: '',
        client_email: '',
        client_phone: '',
        notes: '',
    })

    useEffect(() => {
        setMounted(true)
    }, [])

    // Загружаем данные
    const { data: services = [] } = useQuery({
        queryKey: ['business-services'],
        queryFn: getBusinessServices,
        enabled: isOpen,
    })

    const { data: clientsData } = useQuery({
        queryKey: ['business-clients-select'],
        queryFn: () => getBusinessClients({ pageSize: 1000 }),
        enabled: isOpen && clientMode === 'select',
    })

    const clients = clientsData?.data || []

    const { data: teamMembers = [] } = useQuery({
        queryKey: ['business-team'],
        queryFn: getTeamMembers,
        enabled: isOpen,
    })

    // Заполняем форму при редактировании
    useEffect(() => {
        if (chain && isOpen) {
            setFormData({
                service_id: chain.service_id,
                user_id: chain.user_id,
                specialist_id: chain.specialist_id,
                frequency: chain.frequency,
                interval_days: chain.interval_days || null,
                days_of_week: chain.days_of_week || [],
                day_of_month: chain.day_of_month,
                days_of_month: chain.days_of_month || [],
                booking_time: chain.booking_time,
                duration_minutes: chain.duration_minutes,
                price: chain.price,
                start_date: chain.start_date,
                end_date: chain.end_date || null,
                client_name: chain.client_name || '',
                client_email: chain.client_email || '',
                client_phone: chain.client_phone || '',
                notes: chain.notes || '',
            })
            setClientMode(chain.user_id ? 'select' : 'manual')
        } else if (isOpen && !chain) {
            setFormData({
                service_id: null,
                user_id: null,
                specialist_id: null,
                frequency: 'weekly',
                interval_days: null,
                days_of_week: [],
                day_of_month: null,
                days_of_month: [],
                booking_time: '09:00',
                duration_minutes: 60,
                price: 0,
                start_date: dayjs().format('YYYY-MM-DD'),
                end_date: null,
                client_name: '',
                client_email: '',
                client_phone: '',
                notes: '',
            })
            setClientMode('select')
        }
    }, [chain, isOpen])

    const createMutation = useMutation({
        mutationFn: (data) => createRecurringBooking(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring-bookings'] })
            queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('created')}
                </Notification>,
            )
            onClose()
        },
        onError: (error) => {
            const errorMessage = error?.response?.data?.message || error?.message || t('createError')
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {errorMessage}
                </Notification>,
            )
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateRecurringBooking(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring-bookings'] })
            queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('updated')}
                </Notification>,
            )
            onClose()
        },
        onError: (error) => {
            const errorMessage = error?.response?.data?.message || error?.message || t('updateError')
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {errorMessage}
                </Notification>,
            )
        },
    })

    const handleClientCreated = async (newClient) => {
        setClientMode('select')
        await queryClient.refetchQueries({ queryKey: ['business-clients-select'] })
        setFormData(prev => ({
            ...prev,
            user_id: newClient.id,
            client_name: newClient.name || '',
            client_email: newClient.email || '',
            client_phone: newClient.phone || '',
        }))
        setIsCreateClientModalOpen(false)
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        // Валидация в зависимости от frequency
        if (formData.frequency === 'every_n_days') {
            if (!formData.interval_days || formData.interval_days < 1) {
                toast.push(
                    <Notification title={tCommon('error')} type="danger">
                        {t('intervalDaysRequired')}
                    </Notification>,
                )
                return
            }
        } else if (formData.frequency === 'weekly' || formData.frequency === 'biweekly' || formData.frequency === 'every_2_weeks' || formData.frequency === 'every_3_weeks') {
            if (!formData.days_of_week || formData.days_of_week.length === 0) {
                toast.push(
                    <Notification title={tCommon('error')} type="danger">
                        {t('daysOfWeekRequired')}
                    </Notification>,
                )
                return
            }
        } else if (formData.frequency === 'monthly' || formData.frequency === 'every_2_months' || formData.frequency === 'every_3_months') {
            if (!formData.day_of_month) {
                toast.push(
                    <Notification title={tCommon('error')} type="danger">
                        {t('dayOfMonthRequired')}
                    </Notification>,
                )
                return
            }
        } else if (formData.frequency === 'bimonthly') {
            if (!formData.days_of_month || formData.days_of_month.length !== 2) {
                toast.push(
                    <Notification title={tCommon('error')} type="danger">
                        {t('daysOfMonthRequired')}
                    </Notification>,
                )
                return
            }
        }

        const data = {
            ...formData,
            service_id: formData.service_id || null,
            user_id: formData.user_id || null,
            specialist_id: formData.specialist_id || null,
            client_name: clientMode === 'manual' ? formData.client_name : null,
            client_email: clientMode === 'manual' ? formData.client_email : null,
            client_phone: clientMode === 'manual' ? formData.client_phone : null,
            end_date: formData.end_date || null,
        }

        if (chain) {
            updateMutation.mutate({ id: chain.id, data })
        } else {
            createMutation.mutate(data)
        }
    }

    // Опции для дней недели
    const dayOfWeekOptions = [
        { value: 0, label: t('days.sunday') },
        { value: 1, label: t('days.monday') },
        { value: 2, label: t('days.tuesday') },
        { value: 3, label: t('days.wednesday') },
        { value: 4, label: t('days.thursday') },
        { value: 5, label: t('days.friday') },
        { value: 6, label: t('days.saturday') },
    ]

    // Опции для чисел месяца
    const dayOfMonthOptions = Array.from({ length: 31 }, (_, i) => ({
        value: i + 1,
        label: String(i + 1),
    }))

    // Генерация опций времени
    const timeOptions = useMemo(() => {
        const options = []
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                const timeLabel = formatTime(timeStr, timezone, intlLocale)
                options.push({ value: timeStr, label: timeLabel })
            }
        }
        return options
    }, [timezone])

    // Кастомный Input компонент для предотвращения открытия клавиатуры на мобильных
    const MobileInput = ({
        getStyles,
        getClassNames,
        getValue,
        hasValue,
        isMulti,
        isRtl,
        selectOption,
        selectProps,
        setValue,
        clearValue,
        innerRef,
        isDisabled,
        isHidden,
        cx,
        ...inputProps
    }) => (
        <input
            {...inputProps}
            ref={innerRef}
            inputMode="none"
            readOnly
            style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
        />
    )

    if (!isOpen) return null

    return (
        <>
            <div className="flex flex-col h-full">
                <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {chain ? t('edit') : t('create')}
                    </h4>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Услуга */}
                        <FormItem label={t('service')} required>
                            <Select
                                options={services.map(s => ({ value: s.id, label: s.name }))}
                                value={services.find(s => s.id === formData.service_id)
                                    ? { value: formData.service_id, label: services.find(s => s.id === formData.service_id)?.name }
                                    : null}
                                onChange={(option) => {
                                    const selectedService = services.find(s => s.id === option?.value)
                                    setFormData(prev => ({
                                        ...prev,
                                        service_id: option?.value || null,
                                        price: selectedService?.price || 0,
                                    }))
                                }}
                                placeholder={t('selectService')}
                                components={{ Input: MobileInput }}
                            />
                        </FormItem>

                        {/* Клиент */}
                        <FormItem label={t('client')}>
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={clientMode === 'select' ? 'solid' : 'plain'}
                                        size="sm"
                                        onClick={() => setClientMode('select')}
                                    >
                                        {t('selectClient')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={clientMode === 'manual' ? 'solid' : 'plain'}
                                        size="sm"
                                        onClick={() => setClientMode('manual')}
                                    >
                                        {t('enterManually')}
                                    </Button>
                                </div>

                                {clientMode === 'select' && (
                                    <div className="space-y-2">
                                        <Select
                                            options={clients.map(c => ({
                                                value: c.id,
                                                label: `${c.name}${c.phone ? ` (${c.phone})` : ''}${c.email ? ` - ${c.email}` : ''}`
                                            }))}
                                            value={clients.find(c => c.id === formData.user_id)
                                                ? {
                                                    value: formData.user_id,
                                                    label: `${clients.find(c => c.id === formData.user_id)?.name || ''}${clients.find(c => c.id === formData.user_id)?.phone ? ` (${clients.find(c => c.id === formData.user_id)?.phone})` : ''}${clients.find(c => c.id === formData.user_id)?.email ? ` - ${clients.find(c => c.id === formData.user_id)?.email}` : ''}`
                                                }
                                                : null}
                                            onChange={(option) => {
                                                const selectedClient = clients.find(c => c.id === option?.value)
                                                setFormData(prev => ({
                                                    ...prev,
                                                    user_id: option?.value || null,
                                                    client_name: selectedClient?.name || '',
                                                    client_email: selectedClient?.email || '',
                                                    client_phone: selectedClient?.phone || '',
                                                }))
                                            }}
                                            placeholder={t('selectClient')}
                                            components={{ Input: MobileInput }}
                                        />
                                        <Button
                                            type="button"
                                            variant="plain"
                                            size="sm"
                                            onClick={() => setIsCreateClientModalOpen(true)}
                                        >
                                            {t('createNewClient')}
                                        </Button>
                                    </div>
                                )}

                                {clientMode === 'manual' && (
                                    <div className="space-y-3">
                                        <Input
                                            value={formData.client_name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                                            placeholder={t('clientName')}
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                value={formData.client_phone}
                                                onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                                                placeholder={t('clientPhone')}
                                            />
                                            <Input
                                                type="email"
                                                value={formData.client_email}
                                                onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                                                placeholder={t('clientEmail')}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </FormItem>

                        {/* Специалист */}
                        <FormItem label={t('specialist')}>
                            <Select
                                options={teamMembers
                                    .filter(m => m.status === 'active')
                                    .map(m => ({ value: m.id, label: m.name }))}
                                value={formData.specialist_id && teamMembers.find(m => m.id === formData.specialist_id)
                                    ? { value: formData.specialist_id, label: teamMembers.find(m => m.id === formData.specialist_id)?.name }
                                    : null}
                                onChange={(option) => setFormData(prev => ({ ...prev, specialist_id: option?.value || null }))}
                                placeholder={t('selectSpecialist')}
                                components={{ Input: MobileInput }}
                            />
                        </FormItem>

                        {/* Частота повторения */}
                        <FormItem label={t('frequency')} required>
                            <Select
                                options={[
                                    { value: 'daily', label: t('frequencies.daily') },
                                    { value: 'every_n_days', label: t('frequencies.every_n_days') },
                                    { value: 'weekly', label: t('frequencies.weekly') },
                                    { value: 'biweekly', label: t('frequencies.biweekly') },
                                    { value: 'every_2_weeks', label: t('frequencies.every_2_weeks') },
                                    { value: 'every_3_weeks', label: t('frequencies.every_3_weeks') },
                                    { value: 'monthly', label: t('frequencies.monthly') },
                                    { value: 'bimonthly', label: t('frequencies.bimonthly') },
                                    { value: 'every_2_months', label: t('frequencies.every_2_months') },
                                    { value: 'every_3_months', label: t('frequencies.every_3_months') },
                                ]}
                                value={{ value: formData.frequency, label: t(`frequencies.${formData.frequency}`) }}
                                onChange={(option) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        frequency: option.value,
                                        interval_days: null,
                                        days_of_week: [],
                                        day_of_month: null,
                                        days_of_month: [],
                                    }))
                                }}
                                components={{ Input: MobileInput }}
                            />
                        </FormItem>

                        {/* Интервал дней для every_n_days */}
                        {formData.frequency === 'every_n_days' && (
                            <FormItem label={t('intervalDays')} required>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.interval_days || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, interval_days: parseInt(e.target.value) || null }))}
                                    placeholder={t('intervalDaysPlaceholder')}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('intervalDaysHint')}</p>
                            </FormItem>
                        )}

                        {/* Дни недели */}
                        {(formData.frequency === 'weekly' || formData.frequency === 'biweekly' || formData.frequency === 'every_2_weeks' || formData.frequency === 'every_3_weeks') && (
                            <FormItem label={t('daysOfWeek')} required>
                                <Select
                                    isMulti
                                    options={dayOfWeekOptions}
                                    value={dayOfWeekOptions.filter(opt => formData.days_of_week?.includes(opt.value))}
                                    onChange={(options) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            days_of_week: options ? options.map(opt => opt.value) : [],
                                        }))
                                    }}
                                    placeholder={t('selectDaysOfWeek')}
                                    components={{ Input: MobileInput }}
                                />
                            </FormItem>
                        )}

                        {/* День месяца */}
                        {(formData.frequency === 'monthly' || formData.frequency === 'every_2_months' || formData.frequency === 'every_3_months') && (
                            <FormItem label={t('dayOfMonth')} required>
                                <Select
                                    options={dayOfMonthOptions}
                                    value={formData.day_of_month
                                        ? { value: formData.day_of_month, label: String(formData.day_of_month) }
                                        : null}
                                    onChange={(option) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            day_of_month: option?.value || null,
                                        }))
                                    }}
                                    placeholder={t('selectDayOfMonth')}
                                    components={{ Input: MobileInput }}
                                />
                            </FormItem>
                        )}

                        {/* Два дня месяца для bimonthly */}
                        {formData.frequency === 'bimonthly' && (
                            <FormItem label={t('daysOfMonth')} required>
                                <Select
                                    isMulti
                                    options={dayOfMonthOptions}
                                    value={dayOfMonthOptions.filter(opt => formData.days_of_month?.includes(opt.value))}
                                    onChange={(options) => {
                                        const values = options ? options.map(opt => opt.value) : []
                                        if (values.length <= 2) {
                                            setFormData(prev => ({
                                                ...prev,
                                                days_of_month: values,
                                            }))
                                        }
                                    }}
                                    placeholder={t('selectDaysOfMonth')}
                                    components={{ Input: MobileInput }}
                                />
                                {formData.days_of_month && formData.days_of_month.length > 0 && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t('selectTwoDays')}
                                    </p>
                                )}
                            </FormItem>
                        )}

                        {/* Время и длительность */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormItem label={t('time')} required>
                                <Select
                                    options={timeOptions}
                                    value={timeOptions.find(opt => opt.value === formData.booking_time) || null}
                                    onChange={(option) => setFormData(prev => ({ ...prev, booking_time: option?.value || '09:00' }))}
                                    placeholder={t('selectTime')}
                                    isSearchable={false}
                                    components={{ Input: MobileInput }}
                                />
                            </FormItem>

                            <FormItem label={t('duration')}>
                                <Input
                                    type="number"
                                    value={formData.duration_minutes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                                    placeholder="60"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('durationInMinutes')}</p>
                            </FormItem>
                        </div>

                        {/* Даты */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormItem label={t('startDate')} required>
                                <DatePicker
                                    clearable={false}
                                    value={formData.start_date ? dayjs(formData.start_date).toDate() : null}
                                    onChange={(date) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            start_date: date ? dayjs(date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
                                        }))
                                    }}
                                />
                            </FormItem>

                            <FormItem label={t('endDate')}>
                                <DatePicker
                                    clearable
                                    value={formData.end_date ? dayjs(formData.end_date).toDate() : null}
                                    onChange={(date) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            end_date: date ? dayjs(date).format('YYYY-MM-DD') : null,
                                        }))
                                    }}
                                    minDate={formData.start_date ? dayjs(formData.start_date).toDate() : new Date()}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('endDateOptional')}</p>
                            </FormItem>
                        </div>

                        {/* Цена */}
                        <FormItem label={t('price')}>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                placeholder="0"
                            />
                        </FormItem>

                        {/* Примечания */}
                        <FormItem label={t('notes')}>
                            <Input
                                as="textarea"
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder={t('notesPlaceholder')}
                            />
                        </FormItem>

                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={onClose}>
                                {tCommon('cancel')}
                            </Button>
                            <Button type="submit" variant="solid" loading={createMutation.isPending || updateMutation.isPending}>
                                {chain ? tCommon('save') : t('create')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {mounted && typeof document !== 'undefined' && createPortal(
                <ClientCreateModal
                    isOpen={isCreateClientModalOpen}
                    onClose={() => setIsCreateClientModalOpen(false)}
                    onSuccess={handleClientCreated}
                />,
                document.body
            )}
        </>
    )
}

export default RecurringBookingModal

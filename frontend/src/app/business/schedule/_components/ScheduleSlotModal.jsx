'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Select from '@/components/ui/Select'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import DatePicker from '@/components/ui/DatePicker'
import { TbTrash, TbUser, TbPhone, TbMail, TbCalendar, TbClock, TbCurrencyDollar, TbNotes, TbCopy, TbStar, TbMapPin, TbTruck } from 'react-icons/tb'
import dayjs from 'dayjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBusinessServices, getBusinessClients, createClient, getTeamMembers, getScheduleSettings } from '@/lib/api/business'
import ClientCreateModal from '@/app/business/clients/_components/ClientCreateModal'
import BookingAdditionalServices from '@/components/BookingAdditionalServices'
import { formatCurrency } from '@/utils/formatCurrency'
import { useTranslations, useLocale } from 'next-intl'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import AddressAutocomplete from '@/components/shared/AddressAutocomplete'
import { formatTime } from '@/utils/dateTime'
import { resolveSlotServiceName, isGenericServiceName } from '@/utils/schedule/resolveSlotServiceName'
import useBusinessStore from '@/store/businessStore'
import { captureBookingPayment } from '@/lib/api/stripe'

const ScheduleSlotModal = ({ isOpen, onClose, slot, onSave, onDelete, readOnly = false }) => {
    const intlLocale = useLocale()
    const t = useTranslations('business.schedule.modal')
    const tDuration = useTranslations('business.schedule.modal.durationPicker')
    const tCommon = useTranslations('business.common')
    const tStatuses = useTranslations('business.schedule.statuses')
    const queryClient = useQueryClient()
    const { settings } = useBusinessStore()
    const timezone = settings?.timezone || 'America/Los_Angeles'
    // Используем валюту из slot или дефолтную USD
    const currency = slot?.currency || slot?.advertisement?.currency || 'USD'
    const [clientMode, setClientMode] = useState('select') // 'select' или 'manual'
    /** Для гибридных услуг: выезд к клиенту или приём у вас */
    const [hybridExecutionType, setHybridExecutionType] = useState('onsite')
    const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [isCapturing, setIsCapturing] = useState(false)
    const [selectedAdditionalServices, setSelectedAdditionalServices] = useState([])
    
    useEffect(() => {
        setMounted(true)
    }, [])
    const [formData, setFormData] = useState({
        service_id: null,
        booking_date: '',
        booking_time: '',
        duration_minutes: 60,
        status: 'new',
        notes: '',
        title: '', // Название для произвольных событий
        user_id: null, // ID выбранного клиента
        client_name: '',
        client_email: '',
        client_phone: '',
        advertisement_id: null, // ID объявления для загрузки доп. услуг
        specialist_id: null, // ID специалиста
        execution_type: null, // Тип исполнения услуги (onsite/offsite)
        price: null, // Базовая цена услуги (редактируемая для EDIT)
        // Поля адреса клиента для offsite бронирований
        address_line1: '',
        city: '',
        state: '',
        zip: '',
    })
    const [isCustomEvent, setIsCustomEvent] = useState(false) // Флаг для произвольных событий

    // Загружаем список услуг (только когда модалка открыта)
    const { data: services = [], isLoading: isLoadingServices } = useQuery({
        queryKey: ['business-services'],
        queryFn: getBusinessServices,
        enabled: isOpen,
    })

    // Загружаем настройки расписания
    const { data: scheduleSettings } = useQuery({
        queryKey: ['business-schedule-settings'],
        queryFn: getScheduleSettings,
        enabled: isOpen,
    })

    // Загружаем список клиентов
    const { data: clientsData, refetch: refetchClients } = useQuery({
        queryKey: ['business-clients-select'],
        queryFn: () => getBusinessClients({ pageSize: 1000 }),
        enabled: isOpen && slot?.type === 'NEW' && clientMode === 'select',
    })

    const clients = clientsData?.data || []

    const selectedService = useMemo(() => services.find((s) => s.id === formData.service_id), [services, formData.service_id])
    const serviceType = selectedService?.service_type ?? 'onsite'

    const needsOffsiteAddressFields = useMemo(() => {
        if (slot?.type === 'EDIT') {
            return (slot.execution_type || 'onsite') === 'offsite'
        }
        if (serviceType === 'offsite') return true
        if (serviceType === 'hybrid') return hybridExecutionType === 'offsite'
        return false
    }, [slot?.type, slot?.execution_type, serviceType, hybridExecutionType])

    const selectedClientForAddress = useMemo(() => {
        if (slot?.type !== 'NEW' || clientMode !== 'select') return null
        return clients.find((c) => c.id === formData.user_id) ?? null
    }, [slot?.type, clientMode, clients, formData.user_id])

    const crmHasClientAddress = !!(
        selectedClientForAddress &&
        (selectedClientForAddress.address ||
            selectedClientForAddress.city ||
            selectedClientForAddress.state ||
            selectedClientForAddress.zip_code)
    )

    const editHasResolvedAddress = useMemo(
        () => !!(slot?.location?.address_line1 || slot?.client?.address),
        [slot?.location?.address_line1, slot?.client?.address],
    )

    // Загружаем список исполнителей
    const { data: teamMembers = [] } = useQuery({
        queryKey: ['business-team'],
        queryFn: getTeamMembers,
        enabled: isOpen,
    })

    // Обработчик успешного создания клиента
    const handleClientCreated = async (newClient) => {
        if (newClient && newClient.id) {
            // Сначала переключаемся на режим выбора клиента
            setClientMode('select')
            
            // Обновляем список клиентов и ждем обновления
            await queryClient.refetchQueries({ queryKey: ['business-clients-select'] })
            
            // Подставляем нового клиента в форму бронирования
            setFormData(prev => ({ 
                ...prev, 
                user_id: newClient.id,
                client_name: newClient.name || '',
                client_email: newClient.email || '',
                client_phone: newClient.phone || '',
            }))
        }
        
        setIsCreateClientModalOpen(false)
    }

    useEffect(() => {
        if (slot) {
            if (slot.type === 'EDIT') {
                // Используем booking_date и booking_time, если они есть, иначе вычисляем из start
                const bookingDate = slot.booking_date || (slot.start ? dayjs(slot.start).format('YYYY-MM-DD') : '')
                let bookingTime = slot.booking_time || (slot.start ? dayjs(slot.start).format('HH:mm') : '')
                // Нормализуем формат времени (убираем секунды, если есть)
                if (bookingTime && bookingTime.length === 8 && bookingTime.includes(':')) {
                    bookingTime = bookingTime.substring(0, 5) // Берем только HH:mm
                }
                // Используем duration_minutes напрямую, если он есть, иначе вычисляем из start и end
                let duration = slot.duration_minutes
                if (!duration && slot.start && slot.end) {
                    duration = dayjs(slot.end).diff(dayjs(slot.start), 'minute')
                }
                // Если все еще нет длительности, используем дефолт 60 минут
                if (!duration || duration <= 0) {
                    duration = 60
                }
                
                // Загружаем существующие дополнительные услуги при редактировании
                const existingAdditionalServices = slot.additional_services?.map(item => {
                    const service = item.additional_service || item
                    return {
                        id: service.id,
                        name: service.name,
                        description: service.description,
                        price: parseFloat(item.pivot?.price || service.price || 0),
                        quantity: parseInt(item.pivot?.quantity || item.quantity || 1),
                        duration: service.duration,
                        duration_unit: service.duration_unit,
                    }
                }) || []
                
                // Проверяем, является ли это произвольным событием (есть title, но нет service_id и service?.id)
                const isCustom = !!(slot.title && !slot.service_id && !slot.service?.id)
                
                setFormData({
                    service_id: slot.service_id || slot.service?.id || null,
                    booking_date: bookingDate,
                    booking_time: bookingTime,
                    duration_minutes: duration,
                    status: slot.status || 'new',
                    notes: slot.notes || '',
                    title: slot.title || '',
                    user_id: slot.client?.id || slot.user_id || null,
                    client_name: slot.client?.name || '',
                    client_email: slot.client?.email || '',
                    client_phone: slot.client?.phone || '',
                    advertisement_id: slot.advertisement_id || null,
                    specialist_id: slot.specialist_id || slot.specialist?.id || null,
                    execution_type: slot.execution_type || null,
                    price: slot.price ?? null,
                    // Используем адрес из location, если нет - из карточки клиента
                    address_line1: slot.location?.address_line1 || slot.client?.address || '',
                    city: slot.location?.city || slot.client?.city || '',
                    state: slot.location?.state || slot.client?.state || '',
                    zip: slot.location?.zip || slot.client?.zip_code || '',
                })
                setSelectedAdditionalServices(existingAdditionalServices)
                setIsCustomEvent(isCustom)
            } else {
                // Для нового бронирования используем start из slot
                const startDate = slot.start ? dayjs(slot.start) : dayjs()
                // Если время 00:00 или не указано, используем текущее время или 09:00
                let bookingTime = startDate.format('HH:mm')
                if (bookingTime === '00:00' || !slot.start) {
                    const now = dayjs()
                    if (startDate.isSame(now, 'day')) {
                        // Если выбран сегодня, используем текущее время (округленное до ближайшего часа)
                        bookingTime = now.minute(0).second(0).millisecond(0).format('HH:mm')
                    } else {
                        // Если выбран другой день, используем 09:00
                        bookingTime = '09:00'
                    }
                }
                
                setFormData({
                    service_id: null,
                    booking_date: startDate.format('YYYY-MM-DD'),
                    booking_time: bookingTime,
                    duration_minutes: 60,
                    status: 'new',
                    notes: '',
                    title: '',
                    user_id: null,
                    client_name: '',
                    client_email: '',
                    client_phone: '',
                    advertisement_id: null,
                    specialist_id: slot.specialist_id || slot.specialist?.id || slot.extendedProps?.specialist_id || null,
                    execution_type: 'onsite',
                    address_line1: '',
                    city: '',
                    state: '',
                    zip: '',
                    price: null,
                })
                setClientMode('select')
                setHybridExecutionType('onsite')
                setSelectedAdditionalServices([])
                setIsCustomEvent(false)
            }
        }
    }, [slot])

    const handleSubmit = (e) => {
        e.preventDefault()
        
        // Для нового бронирования требуется service_id ИЛИ title (для произвольных событий)
        if (slot?.type === 'NEW' && !formData.service_id && !formData.title && !isCustomEvent) {
            return
        }
        
        // Для произвольных событий требуется title
        if (isCustomEvent && !formData.title.trim()) {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('titleRequired') || 'Укажите название события'}
                </Notification>,
            )
            return
        }
        
        // Проверяем обязательные поля
        if (!formData.booking_date || !formData.booking_time) {
            return
        }
        
        // Вычисляем start и end для обратной совместимости
        const start = dayjs(`${formData.booking_date}T${formData.booking_time}`).toISOString()
        const end = dayjs(start).add(formData.duration_minutes, 'minute').toISOString()
        
        onSave({
            ...formData,
            start,
            end,
            id: slot?.id,
            price: formData.price ?? undefined,
            additional_services: selectedAdditionalServices.map(s => ({
                id: s.id,
                quantity: s.quantity || 1,
                price: parseFloat(s.price) || undefined,
            })),
        }, slot?.type || 'NEW')
    }

    const statusOptions = [
        { value: 'new', label: tStatuses('new') },
        { value: 'pending', label: tStatuses('pending') },
        { value: 'confirmed', label: tStatuses('confirmed') },
        { value: 'completed', label: tStatuses('completed') },
        { value: 'cancelled', label: tStatuses('cancelled') },
    ]

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

    // Генерируем опции времени на основе настроек расписания
    const generateTimeOptions = () => {
        if (!scheduleSettings || !formData.booking_date) {
            // Если нет настроек или даты, возвращаем дефолтные опции
            const options = []
            for (let hour = 0; hour < 24; hour++) {
                for (let minute = 0; minute < 60; minute += 15) {
                    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                    const timeLabel = formatTime(timeStr, timezone, intlLocale)
                    options.push({ value: timeStr, label: timeLabel })
                }
            }
            return options
        }

        // Определяем день недели (0 = воскресенье, 1 = понедельник, ..., 6 = суббота)
        const selectedDate = dayjs(formData.booking_date)
        const dayOfWeek = selectedDate.day() // 0-6
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        const dayKey = dayNames[dayOfWeek]
        
        // Получаем настройки для этого дня
        const daySettings = scheduleSettings[dayKey]
        
        // Если день не активен, возвращаем пустой массив
        if (!daySettings || !daySettings.enabled) {
            return []
        }

        // Получаем рабочие часы
        const workStart = daySettings.from || '09:00'
        const workEnd = daySettings.to || '18:00'
        
        // Получаем шаг слотов из выбранной услуги (по умолчанию 15 минут)
        let slotStepMinutes = 15
        if (formData.service_id) {
            const selectedService = services.find(s => s.id === formData.service_id)
            if (selectedService?.advertisement_id) {
                // Пытаемся получить slot_step_minutes из объявления
                // Пока используем дефолт, можно добавить загрузку объявления если нужно
                slotStepMinutes = 15
            }
        }

        const options = []
        const [startHour, startMinute] = workStart.split(':').map(Number)
        const [endHour, endMinute] = workEnd.split(':').map(Number)
        
        let currentHour = startHour
        let currentMinute = startMinute
        
        // Проверяем перерывы
        const breakEnabled = scheduleSettings.breakEnabled
        const breakFrom = scheduleSettings.breakFrom || '13:00'
        const breakTo = scheduleSettings.breakTo || '14:00'
        const [breakStartHour, breakStartMinute] = breakFrom.split(':').map(Number)
        const [breakEndHour, breakEndMinute] = breakTo.split(':').map(Number)
        
        while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
            // Пропускаем время перерыва
            if (breakEnabled) {
                const isInBreak = 
                    (currentHour > breakStartHour || (currentHour === breakStartHour && currentMinute >= breakStartMinute)) &&
                    (currentHour < breakEndHour || (currentHour === breakEndHour && currentMinute < breakEndMinute))
                
                if (isInBreak) {
                    // Переходим к концу перерыва
                    currentHour = breakEndHour
                    currentMinute = breakEndMinute
                    continue
                }
            }
            
            const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
            const timeLabel = formatTime(timeStr, timezone, intlLocale)
            options.push({ value: timeStr, label: timeLabel })
            
            // Увеличиваем время на шаг слотов
            currentMinute += slotStepMinutes
            while (currentMinute >= 60) {
                currentMinute -= 60
                currentHour += 1
            }
        }
        
        return options
    }

    // Используем useMemo для пересчета опций времени при изменении зависимостей
    const timeOptions = useMemo(() => generateTimeOptions(), [
        scheduleSettings,
        formData.booking_date,
        formData.service_id,
        services,
        timezone,
        intlLocale,
    ])

    const durationOptions = useMemo(() => {
        const options = []
        options.push({ value: 15, label: tDuration('min15') })
        options.push({ value: 30, label: tDuration('min30') })
        options.push({ value: 45, label: tDuration('min45') })
        for (let hours = 1; hours <= 8; hours++) {
            options.push({
                value: hours * 60,
                label: tDuration('hoursWhole', { count: hours }),
            })
            if (hours < 8) {
                for (const m of [15, 30, 45]) {
                    options.push({
                        value: hours * 60 + m,
                        label: tDuration('hourMinutes', { hours, minutes: m }),
                    })
                }
            }
        }
        return options
    }, [tDuration, intlLocale])

    const renderVisitAddressFields = () => (
        <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('labels.clientAddress')}
            </h5>
            <FormItem label={t('labels.address')}>
                <AddressAutocomplete
                    value={formData.address_line1}
                    onChange={(address) => setFormData((prev) => ({ ...prev, address_line1: address }))}
                    onAddressParsed={(parsed) => {
                        setFormData((prev) => ({
                            ...prev,
                            address_line1: parsed.address_line1 || prev.address_line1,
                            city: parsed.city || prev.city,
                            state: parsed.state || prev.state,
                            zip: parsed.zip || prev.zip,
                        }))
                    }}
                    placeholder={t('labels.addressPlaceholder')}
                    size="sm"
                />
            </FormItem>
            <div className="grid grid-cols-3 gap-3">
                <FormItem label={t('labels.city')}>
                    <Input
                        value={formData.city}
                        onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                        placeholder={t('labels.city')}
                        size="sm"
                    />
                </FormItem>
                <FormItem label={t('labels.state')}>
                    <Input
                        value={formData.state}
                        onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                        placeholder={t('labels.state')}
                        size="sm"
                    />
                </FormItem>
                <FormItem label={t('labels.zip')}>
                    <Input
                        value={formData.zip}
                        onChange={(e) => setFormData((prev) => ({ ...prev, zip: e.target.value }))}
                        placeholder={t('labels.zip')}
                        size="sm"
                    />
                </FormItem>
            </div>
        </div>
    )

    // Предотвращаем рендеринг модалки, если она не открыта (для избежания проблем с React-Modal)
    if (!isOpen) {
        return null
    }

    return (
        <>
        <Dialog 
            isOpen={isOpen} 
            onClose={onClose} 
            width={600}
        >
            <div className="flex flex-col h-full max-h-[85vh]">
                {/* Заголовок */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {slot?.type === 'NEW' ? t('newBooking') : t('editBooking')}
                    </h4>
                </div>
                
                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    {/* Предупреждение о занятом времени */}
                    {slot?.isOccupied && slot?.type === 'NEW' && (
                        <div className="mb-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h5 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                                        {t('timeOverlapWarning')}
                                    </h5>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                        {t('timeOverlapDescription')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-6" id="schedule-slot-form">
                        {/* Информация о бронировании (только для просмотра при редактировании) */}
                        {slot?.type === 'EDIT' && (
                            <div className="space-y-5 pb-6 border-b border-gray-200 dark:border-gray-700">
                                {/* Услуга */}
                                {(slot.service || formData.service_id || slot.service_id) && (() => {
                                    let serviceName = null
                                    if (isLoadingServices) {
                                        serviceName = t('labels.serviceLoading')
                                    } else {
                                        serviceName =
                                            resolveSlotServiceName(
                                                { ...slot, service_id: formData.service_id || slot.service_id },
                                                services,
                                            ) || slot.service?.name
                                        if (!serviceName || isGenericServiceName(serviceName)) {
                                            serviceName = t('labels.serviceFallback')
                                        }
                                    }

                                    return (
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                            <TbCalendar className="text-blue-600 dark:text-blue-400 text-lg" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                                                {t('labels.service')}
                                            </label>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {serviceName}
                                            </div>
                                        </div>
                                    </div>
                                    )
                                })()}

                                {/* Оплата онлайн — бейдж + кнопка capture */}
                                {(slot.payment_status === 'authorized' || slot.payment_status === 'paid') && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                            <TbCurrencyDollar className="text-emerald-600 dark:text-emerald-400 text-lg" />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                                            <Tag className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 !text-sm !px-2.5 !py-0.5 font-bold">
                                                {slot.payment_status === 'paid'
                                                    ? t('labels.paymentCaptured', { defaultValue: 'Payment captured' })
                                                    : t('labels.onlinePaymentBadge')}
                                            </Tag>
                                            {slot.payment_status === 'authorized' && (
                                                <Button
                                                    size="xs"
                                                    variant="solid"
                                                    loading={isCapturing}
                                                    onClick={async () => {
                                                        setIsCapturing(true)
                                                        try {
                                                            await captureBookingPayment(slot.id)
                                                            toast.push(
                                                                <Notification type="success" title={t('labels.captureSuccess', { defaultValue: 'Payment captured' })} />,
                                                                { placement: 'top-end' }
                                                            )
                                                            queryClient.invalidateQueries({ queryKey: ['schedule'] })
                                                            queryClient.invalidateQueries({ queryKey: ['booking-payments'] })
                                                        } catch (e) {
                                                            toast.push(
                                                                <Notification type="danger" title={t('labels.captureError', { defaultValue: 'Capture failed' })} />,
                                                                { placement: 'top-end' }
                                                            )
                                                        } finally {
                                                            setIsCapturing(false)
                                                        }
                                                    }}
                                                >
                                                    {t('labels.capturePayment', { defaultValue: 'Capture payment' })}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Клиент */}
                                {slot.client && (
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                            <TbUser className="text-emerald-600 dark:text-emerald-400 text-lg" />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                                                {t('labels.client')}
                                            </label>
                                            <div className="space-y-1.5">
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {slot.client.name}
                                                </div>
                                                {slot.client.phone && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <TbPhone className="text-gray-400 shrink-0 text-base" />
                                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{slot.client.phone}</span>
                                                    </div>
                                                )}
                                                {slot.client.email && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <TbMail className="text-gray-400 shrink-0 text-base" />
                                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 break-all">{slot.client.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Исполнитель */}
                                {(slot.specialist || slot.specialistName || slot.specialist_id) && (
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                                            <TbUser className="text-purple-600 dark:text-purple-400 text-lg" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                                                {t('labels.specialist')}
                                            </label>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {slot.specialist?.name || slot.specialistName || (slot.specialist_id ? `ID: ${slot.specialist_id}` : t('notSpecified'))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Тип исполнения услуги */}
                                {slot.execution_type && (
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                            <TbCalendar className="text-indigo-600 dark:text-indigo-400 text-lg" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                                                {t('labels.executionType')}
                                            </label>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {slot.execution_type === 'offsite' ? (
                                                    <span className="flex items-center gap-2">
                                                        <TbTruck className="text-lg" />
                                                        <span>{t('labels.executionTypeOffsite')}</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2">
                                                        <TbCalendar className="text-lg" />
                                                        <span>{t('labels.executionTypeOnsite')}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Адрес для выездных услуг */}
                                {slot.execution_type === 'offsite' && (
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                                            <TbMapPin className="text-orange-600 dark:text-orange-400 text-lg" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                                                {t('labels.address')}
                                            </label>
                                            <div className="text-sm text-gray-900 dark:text-white space-y-1">
                                                {/* Приоритет: slot.location, затем адрес клиента */}
                                                {(slot.location?.address_line1 || slot.client?.address) && (
                                                    <div className="font-medium">
                                                        {slot.location?.address_line1 || slot.client?.address}
                                                    </div>
                                                )}
                                                {(slot.location?.city || slot.location?.state || slot.location?.zip || 
                                                  slot.client?.city || slot.client?.state || slot.client?.zip_code) && (
                                                    <div className="text-gray-600 dark:text-gray-400">
                                                        {[
                                                            slot.location?.city || slot.client?.city,
                                                            slot.location?.state || slot.client?.state,
                                                            slot.location?.zip || slot.client?.zip_code
                                                        ].filter(Boolean).join(', ')}
                                                    </div>
                                                )}
                                                {slot.location?.notes && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                                                        {slot.location.notes}
                                                    </div>
                                                )}
                                                {/* Если адреса нет вообще */}
                                                {!slot.location?.address_line1 && !slot.client?.address && (
                                                    <div className="text-gray-500 dark:text-gray-400 italic">
                                                        Адрес не указан
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Цена — только отображение, редактирование в полях ниже */}
                                {slot.price !== undefined && (
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                            <TbCurrencyDollar className="text-amber-600 dark:text-amber-400 text-lg" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                                                {t('labels.price')}
                                            </label>
                                            {slot.net_amount != null && (slot.payment_status === 'authorized' || slot.payment_status === 'paid') ? (
                                                <>
                                                    <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                                                        {formatCurrency(slot.net_amount, currency)}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        {t('labels.netAfterFee', {
                                                            total: formatCurrency(slot.total_price || slot.price, currency),
                                                            fee: formatCurrency(slot.platform_fee, currency),
                                                        })}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                                                        {formatCurrency(slot.total_price || slot.price, currency)}
                                                    </div>
                                                    {slot.total_price && slot.total_price !== slot.price && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            {t('labels.basePriceNote', { price: formatCurrency(slot.price, currency) })}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Итого */}
                                {(slot.additional_services && slot.additional_services.length > 0) || (slot.price !== undefined && slot.price > 0) ? (
                                    <div className="mt-4">
                                        <Card className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                            <h5 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">
                                                {t('labels.total')}
                                            </h5>
                                            <div className="space-y-2">
                                                {/* Базовая стоимость услуги */}
                                                {slot.price !== undefined && slot.price > 0 && (
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                            {t('labels.baseServicePrice')}
                                                        </span>
                                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                            {formatCurrency(slot.price, currency)}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {/* Дополнительные услуги */}
                                                {slot.additional_services && slot.additional_services.length > 0 && (
                                                    <>
                                                        {slot.additional_services.map((addService, idx) => {
                                                            const service = addService.additional_service || addService;
                                                            const price = addService.pivot?.price || service.price || 0;
                                                            const quantity = addService.pivot?.quantity || addService.quantity || 1;
                                                            const total = price * quantity;
                                                            return (
                                                                <div key={idx} className="flex justify-between items-center text-sm">
                                                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                                        {service.name} × <span className="text-gray-900 dark:text-gray-100">{quantity}</span>
                                                                    </span>
                                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                                        {formatCurrency(total, currency)}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </>
                                                )}

                                                {Number(slot.discount_amount) > 0 && (
                                                    <>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                                {t('labels.subtotal')}
                                                            </span>
                                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                                {formatCurrency(
                                                                    Number(slot.discount_amount) +
                                                                        Number(slot.total_price || slot.price || 0),
                                                                    currency,
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                                {slot.discount_source === 'promo_code' && slot.promo_code
                                                                    ? t('labels.discountPromo', { code: slot.promo_code })
                                                                    : slot.discount_source === 'loyalty_tier' &&
                                                                        slot.discount_tier_name
                                                                      ? t('labels.discountLoyalty', {
                                                                            tier: slot.discount_tier_name,
                                                                        })
                                                                      : t('labels.discount')}
                                                            </span>
                                                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                                −{formatCurrency(Number(slot.discount_amount), currency)}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                                
                                                {/* Итого общий */}
                                                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 flex justify-between items-center">
                                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('labels.total')}</span>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {formatCurrency(slot.total_price || slot.price || 0, currency)}
                                                    </span>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {/* Ссылка на отзыв для клиентов без клиентского аккаунта */}
                        {(() => {
                            // ВАЖНО: Проверяем наличие has_client_account в slot
                            // Если его нет, вычисляем на клиенте на основе user_id и email
                            let hasClientAccount = slot?.has_client_account === true
                            
                            // Если has_client_account не пришёл из API, вычисляем на клиенте
                            if (slot?.has_client_account === undefined && slot?.user_id) {
                                // Если есть user_id, но нет has_client_account, проверяем email
                                const clientEmail = slot?.client?.email || slot?.client_email
                                // Если email содержит @local.local, значит это CRM клиент без аккаунта
                                hasClientAccount = clientEmail && !clientEmail.includes('@local.local')
                            }
                            
                            const statusIsCompleted = slot?.status === 'completed'
                            const hasReviewToken = !!slot?.review_token
                            const allConditionsMet = statusIsCompleted && !hasClientAccount && hasReviewToken
                            
                            return allConditionsMet
                        })() && (
                            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                        <TbStar className="text-blue-600 dark:text-blue-400 text-xl mt-0.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                            {t('reviewLink.title')}
                                        </h5>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Input
                                                readOnly
                                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/review/${slot.review_token}`}
                                                className="flex-1 text-sm"
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                icon={<TbCopy />}
                                                onClick={async () => {
                                                    const reviewUrl = `${window.location.origin}/review/${slot.review_token}`
                                                    
                                                    // Пробуем использовать современный Clipboard API
                                                    if (navigator.clipboard && navigator.clipboard.writeText) {
                                                        try {
                                                            await navigator.clipboard.writeText(reviewUrl)
                                                            toast.push(
                                                                <Notification title={t('reviewLink.copied')} type="success">
                                                                    {t('reviewLink.linkCopied')}
                                                                </Notification>,
                                                            )
                                                            return
                                                        } catch (err) {
                                                            console.error('Failed to copy using clipboard API:', err)
                                                        }
                                                    }
                                                    
                                                    // Fallback: используем старый метод
                                                    try {
                                                        const textArea = document.createElement('textarea')
                                                        textArea.value = reviewUrl
                                                        textArea.style.position = 'fixed'
                                                        textArea.style.left = '-999999px'
                                                        textArea.style.top = '-999999px'
                                                        document.body.appendChild(textArea)
                                                        textArea.focus()
                                                        textArea.select()
                                                        const successful = document.execCommand('copy')
                                                        document.body.removeChild(textArea)
                                                        
                                                        if (successful) {
                                                            toast.push(
                                                                <Notification title={t('reviewLink.copied')} type="success">
                                                                    {t('reviewLink.linkCopied')}
                                                                </Notification>,
                                                            )
                                                        } else {
                                                            throw new Error('Copy command failed')
                                                        }
                                                    } catch (err) {
                                                        console.error('Failed to copy:', err)
                                                        toast.push(
                                                            <Notification title={tCommon('error')} type="danger">
                                                                {t('reviewLink.copyError')}
                                                            </Notification>,
                                                        )
                                                    }
                                                }}
                                            >
                                                {t('reviewLink.copy')}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                            {t('reviewLink.sendToClient')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Редактируемые поля */}
                        <div className="space-y-5">
                            {slot?.type === 'NEW' && (
                                <>
                                    {/* Переключатель: услуга или произвольное событие */}
                                    <FormItem label={t('labels.eventType') || 'Тип события'}>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant={!isCustomEvent ? 'solid' : 'plain'}
                                                size="sm"
                                                onClick={() => {
                                                    setIsCustomEvent(false)
                                                    setFormData(prev => ({ ...prev, title: '', service_id: null }))
                                                }}
                                            >
                                                {t('labels.service') || 'Услуга'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={isCustomEvent ? 'solid' : 'plain'}
                                                size="sm"
                                                onClick={() => {
                                                    setIsCustomEvent(true)
                                                    setFormData(prev => ({ ...prev, service_id: null, advertisement_id: null, price: null }))
                                                    setSelectedAdditionalServices([])
                                                }}
                                            >
                                                {t('labels.customEvent') || 'Произвольное событие'}
                                            </Button>
                                        </div>
                                    </FormItem>

                                    {/* Поле для произвольного события */}
                                    {isCustomEvent && (
                                        <>
                                            <FormItem label={t('labels.title') || 'Название события'} required>
                                                <Input
                                                    value={formData.title}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                                    placeholder={t('labels.titlePlaceholder') || 'Введите название события'}
                                                />
                                            </FormItem>
                                            <FormItem label={t('labels.price')}>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step={0.01}
                                                    value={formData.price ?? ''}
                                                    onChange={(e) => {
                                                        const raw = e.target.value
                                                        if (raw === '') {
                                                            setFormData((prev) => ({ ...prev, price: null }))
                                                            return
                                                        }
                                                        const num = parseFloat(raw)
                                                        if (Number.isNaN(num)) return
                                                        // Округляем до 2 знаков, чтобы избежать 99.97000001 и т.п.
                                                        const rounded = Math.round(num * 100) / 100
                                                        setFormData((prev) => ({ ...prev, price: rounded }))
                                                    }}
                                                    placeholder={t('labels.price')}
                                                />
                                            </FormItem>
                                        </>
                                    )}

                                    {/* Выбор услуги (только если не произвольное событие) */}
                                    {!isCustomEvent && (
                                        <FormItem label={t('labels.service')} required>
                                            <Select
                                                options={services.map(s => ({ value: s.id, label: s.name }))}
                                                value={services.find(s => s.id === formData.service_id) ? { value: formData.service_id, label: services.find(s => s.id === formData.service_id)?.name } : null}
                                                onChange={(option) => {
                                                    const sel = services.find((s) => s.id === option?.value)
                                                    const st = sel?.service_type ?? 'onsite'
                                                    let exec = 'onsite'
                                                    if (st === 'offsite') exec = 'offsite'
                                                    else if (st === 'hybrid') exec = hybridExecutionType
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        service_id: option?.value || null,
                                                        advertisement_id: sel?.advertisement_id || null,
                                                        execution_type: exec,
                                                    }))
                                                    setSelectedAdditionalServices([])
                                                }}
                                                placeholder={t('selectService')}
                                                components={{
                                                    Input: MobileInput,
                                                }}
                                            />
                                        </FormItem>
                                    )}
                                    {!isCustomEvent && formData.service_id && serviceType === 'hybrid' && (
                                        <FormItem label={t('labels.hybridWhere')}>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant={hybridExecutionType === 'onsite' ? 'solid' : 'plain'}
                                                    onClick={() => {
                                                        setHybridExecutionType('onsite')
                                                        setFormData((prev) => ({ ...prev, execution_type: 'onsite' }))
                                                    }}
                                                >
                                                    {t('labels.hybridOnsite')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant={hybridExecutionType === 'offsite' ? 'solid' : 'plain'}
                                                    onClick={() => {
                                                        setHybridExecutionType('offsite')
                                                        setFormData((prev) => ({ ...prev, execution_type: 'offsite' }))
                                                    }}
                                                >
                                                    {t('labels.hybridOffsite')}
                                                </Button>
                                            </div>
                                        </FormItem>
                                    )}
                                </>
                            )}
                            
                            {slot?.type === 'NEW' && (
                                <>
                                    <FormItem label={t('labels.client')}>
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant={clientMode === 'select' ? 'solid' : 'plain'}
                                                    size="sm"
                                                    onClick={() => setClientMode('select')}
                                                >
                                                    {t('client.selectFromExisting')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={clientMode === 'manual' ? 'solid' : 'plain'}
                                                    size="sm"
                                                    onClick={() => {
                                                        setClientMode('manual')
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            user_id: null,
                                                            address_line1: '',
                                                            city: '',
                                                            state: '',
                                                            zip: '',
                                                        }))
                                                    }}
                                                >
                                                    {t('client.enterManually')}
                                                </Button>
                                            </div>
                                            
                                            {clientMode === 'select' && (
                                                <div className="space-y-2">
                                                    <Select
                                                        options={clients.map(c => ({ 
                                                            value: c.id, 
                                                            label: `${c.name}${c.phone ? ` (${c.phone})` : ''}${c.email ? ` - ${c.email}` : ''}` 
                                                        }))}
                                                        value={clients.find(c => c.id === formData.user_id) ? { 
                                                            value: formData.user_id, 
                                                            label: `${clients.find(c => c.id === formData.user_id)?.name || ''}${clients.find(c => c.id === formData.user_id)?.phone ? ` (${clients.find(c => c.id === formData.user_id)?.phone})` : ''}${clients.find(c => c.id === formData.user_id)?.email ? ` - ${clients.find(c => c.id === formData.user_id)?.email}` : ''}` 
                                                        } : null}
                                                        onChange={(option) => {
                                                            const selectedClient = clients.find(c => c.id === option?.value)
                                                            setFormData(prev => ({ 
                                                                ...prev, 
                                                                user_id: option?.value || null,
                                                                client_name: selectedClient?.name || '',
                                                                client_email: selectedClient?.email || '',
                                                                client_phone: selectedClient?.phone || '',
                                                                // Заполняем адрес клиента для offsite бронирований
                                                                address_line1: selectedClient?.address || '',
                                                                city: selectedClient?.city || '',
                                                                state: selectedClient?.state || '',
                                                                zip: selectedClient?.zip_code || '',
                                                            }))
                                                        }}
                                                        placeholder={t('client.selectClient')}
                                                        components={{
                                                            Input: MobileInput,
                                                        }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setIsCreateClientModalOpen(true)}
                                                    >
                                                        {t('client.createNew')}
                                                    </Button>
                                                </div>
                                            )}
                                            
                                            {clientMode === 'manual' && (
                                                <div className="space-y-3">
                                                    <Input
                                                        value={formData.client_name}
                                                        onChange={(e) => setFormData((prev) => ({ ...prev, client_name: e.target.value }))}
                                                        placeholder={t('client.name')}
                                                    />
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Input
                                                            value={formData.client_phone}
                                                            onChange={(e) => setFormData((prev) => ({ ...prev, client_phone: e.target.value }))}
                                                            placeholder={t('client.phone')}
                                                        />
                                                        <Input
                                                            type="email"
                                                            value={formData.client_email}
                                                            onChange={(e) => setFormData((prev) => ({ ...prev, client_email: e.target.value }))}
                                                            placeholder={t('client.email')}
                                                        />
                                                    </div>
                                                    {needsOffsiteAddressFields && renderVisitAddressFields()}
                                                </div>
                                            )}
                                        </div>
                                    </FormItem>
                                    {slot?.type === 'NEW' &&
                                        clientMode === 'select' &&
                                        needsOffsiteAddressFields &&
                                        !crmHasClientAddress &&
                                        renderVisitAddressFields()}
                                </>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4">
                                <FormItem label={t('labels.date')} required>
                                    <DatePicker
                                        clearable
                                        value={formData.booking_date ? dayjs(formData.booking_date).toDate() : null}
                                        onChange={(date) => {
                                            const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : ''
                                            setFormData((prev) => ({ ...prev, booking_date: dateStr }))
                                        }}
                                        placeholder={t('labels.date')}
                                        size="sm"
                                    />
                                </FormItem>
                                <FormItem label={t('labels.time')} required>
                                    <Select
                                        options={timeOptions}
                                        value={timeOptions.find(opt => opt.value === formData.booking_time) || null}
                                        onChange={(option) => {
                                            setFormData((prev) => ({ ...prev, booking_time: option?.value || '' }))
                                        }}
                                        placeholder={t('labels.time')}
                                        isSearchable={false}
                                        size="sm"
                                        components={{
                                            Input: MobileInput,
                                        }}
                                    />
                                </FormItem>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormItem label={t('labels.duration')}>
                                    <Select
                                        options={durationOptions}
                                        value={durationOptions.find(opt => opt.value === formData.duration_minutes) || durationOptions.find(opt => opt.value === 60)}
                                        onChange={(option) => setFormData((prev) => ({ ...prev, duration_minutes: option?.value || 60 }))}
                                        isSearchable={false}
                                        size="sm"
                                        components={{
                                            Input: MobileInput,
                                        }}
                                    />
                                </FormItem>

                                <FormItem label={t('labels.status')}>
                                    <Select
                                        options={statusOptions}
                                        value={statusOptions.find((opt) => opt.value === formData.status)}
                                        onChange={(option) => setFormData((prev) => ({ ...prev, status: option.value }))}
                                        isSearchable={false}
                                        components={{
                                            Input: MobileInput,
                                        }}
                                    />
                                </FormItem>
                            </div>

                            <FormItem label={t('labels.specialist')}>
                                <Select
                                    options={teamMembers
                                        .filter(member => member.status === 'active')
                                        .map(member => ({ 
                                            value: member.id, 
                                            label: member.name 
                                        }))
                                    }
                                    value={formData.specialist_id && teamMembers.find(m => m.id === formData.specialist_id)
                                        ? { 
                                            value: formData.specialist_id, 
                                            label: teamMembers.find(m => m.id === formData.specialist_id)?.name || t('labels.specialist') 
                                        }
                                        : null
                                    }
                                    onChange={(option) => setFormData((prev) => ({ 
                                        ...prev, 
                                        specialist_id: option?.value || null 
                                    }))}
                                    placeholder={t('selectSpecialist')}
                                    components={{
                                        Input: MobileInput,
                                    }}
                                />
                            </FormItem>

                            {/* Цена (редактируемая для EDIT) */}
                            {slot?.type === 'EDIT' && (
                                <FormItem label={t('labels.price')}>
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={formData.price ?? ''}
                                        onChange={(e) => {
                                            const raw = e.target.value
                                            if (raw === '') {
                                                setFormData((prev) => ({ ...prev, price: null }))
                                                return
                                            }
                                            const num = parseFloat(raw)
                                            if (Number.isNaN(num)) return
                                            const rounded = Math.round(num * 100) / 100
                                            setFormData((prev) => ({ ...prev, price: rounded }))
                                        }}
                                        placeholder={t('labels.price')}
                                    />
                                </FormItem>
                            )}

                            {slot?.type === 'EDIT' && needsOffsiteAddressFields && !editHasResolvedAddress && renderVisitAddressFields()}

                            <FormItem label={t('labels.notes')}>
                                <Input
                                    as="textarea"
                                    rows={3}
                                    value={formData.notes || ''}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                                    placeholder={t('labels.notesPlaceholder')}
                                />
                            </FormItem>

                            {/* Дополнительные услуги — для NEW и EDIT с выбранной услугой */}
                            {formData.service_id && !isCustomEvent && (
                                <div>
                                    <BookingAdditionalServices
                                        serviceId={formData.service_id}
                                        advertisementId={formData.advertisement_id || null}
                                        selectedServices={selectedAdditionalServices}
                                        onSelectionChange={setSelectedAdditionalServices}
                                        basePrice={formData.price ?? slot?.price ?? 0}
                                        currency={currency}
                                        editablePrice={slot?.type === 'EDIT'}
                                    />
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Кнопки - зафиксированы снизу */}
                <div className="flex-shrink-0 px-6 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <Button type="button" variant="plain" onClick={onClose}>
                        {readOnly ? t('buttons.close') : t('buttons.cancel')}
                    </Button>
                    {!readOnly && slot?.type === 'EDIT' && onDelete && (
                        <Button
                            type="button"
                            variant="plain"
                            color="red"
                            icon={<TbTrash />}
                            onClick={() => {
                                onClose()
                                onDelete()
                            }}
                        >
                            {t('buttons.delete')}
                        </Button>
                    )}
                    {!readOnly && onSave && (
                        <Button 
                            type="button"
                            variant="solid"
                            onClick={(e) => {
                                e.preventDefault()
                                handleSubmit(e)
                            }}
                        >
                            {t('buttons.save')}
                        </Button>
                    )}
                </div>
            </div>
        </Dialog>
        
        {/* Модалка создания клиента — рендерим через Portal в document.body */}
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

export default ScheduleSlotModal




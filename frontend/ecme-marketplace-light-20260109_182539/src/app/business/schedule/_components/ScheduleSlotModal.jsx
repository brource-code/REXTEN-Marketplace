'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Select from '@/components/ui/Select'
import Card from '@/components/ui/Card'
import { TbTrash, TbUser, TbPhone, TbMail, TbCalendar, TbClock, TbCurrencyDollar, TbNotes, TbCopy, TbStar } from 'react-icons/tb'
import dayjs from 'dayjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBusinessServices, getBusinessClients, createClient, getTeamMembers } from '@/lib/api/business'
import ClientCreateModal from '@/app/business/clients/_components/ClientCreateModal'
import BookingAdditionalServices from '@/components/BookingAdditionalServices'
import { formatCurrency } from '@/utils/formatCurrency'

const ScheduleSlotModal = ({ isOpen, onClose, slot, onSave, onDelete }) => {
    const queryClient = useQueryClient()
    // Используем валюту из slot или дефолтную USD
    const currency = slot?.currency || slot?.advertisement?.currency || 'USD'
    const [clientMode, setClientMode] = useState('select') // 'select' или 'manual'
    const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
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
        user_id: null, // ID выбранного клиента
        client_name: '',
        client_email: '',
        client_phone: '',
        advertisement_id: null, // ID объявления для загрузки доп. услуг
        specialist_id: null, // ID специалиста
    })

    // Загружаем список услуг
    const { data: services = [] } = useQuery({
        queryKey: ['business-services'],
        queryFn: getBusinessServices,
    })

    // Загружаем список клиентов
    const { data: clientsData, refetch: refetchClients } = useQuery({
        queryKey: ['business-clients-select'],
        queryFn: () => getBusinessClients({ pageSize: 1000 }),
        enabled: isOpen && slot?.type === 'NEW' && clientMode === 'select',
    })

    const clients = clientsData?.data || []

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
            console.log('[ScheduleSlotModal] Slot data:', {
                id: slot.id,
                type: slot.type,
                status: slot.status,
                user_id: slot.user_id,
                review_token: slot.review_token,
                client: slot.client,
            })
            
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
                
                setFormData({
                    service_id: slot.service?.id || null,
                    booking_date: bookingDate,
                    booking_time: bookingTime,
                    duration_minutes: duration,
                    status: slot.status || 'new',
                    notes: slot.notes || '',
                    user_id: slot.client?.id || slot.user_id || null,
                    client_name: slot.client?.name || '',
                    client_email: slot.client?.email || '',
                    client_phone: slot.client?.phone || '',
                    advertisement_id: slot.advertisement_id || null,
                    specialist_id: slot.specialist_id || slot.specialist?.id || null,
                })
                setSelectedAdditionalServices(existingAdditionalServices)
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
                    user_id: null,
                    client_name: '',
                    client_email: '',
                    client_phone: '',
                    advertisement_id: null,
                    specialist_id: slot.specialist_id || slot.specialist?.id || slot.extendedProps?.specialist_id || null,
                })
                setClientMode('select')
                setSelectedAdditionalServices([])
            }
        }
    }, [slot])

    const handleSubmit = (e) => {
        e.preventDefault()
        
        // Для нового бронирования требуется service_id
        if (slot?.type === 'NEW' && !formData.service_id) {
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
            additional_services: selectedAdditionalServices.map(s => ({
                id: s.id,
                quantity: s.quantity || 1,
            })),
        }, slot?.type || 'NEW')
    }

    const statusOptions = [
        { value: 'new', label: 'Новый' },
        { value: 'pending', label: 'Ожидает' },
        { value: 'confirmed', label: 'Подтверждено' },
        { value: 'completed', label: 'Завершено' },
        { value: 'cancelled', label: 'Отменено' },
    ]

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
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {slot?.type === 'NEW' ? 'Новое бронирование' : 'Редактировать бронирование'}
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
                                        Внимание: Выбранное время пересекается с существующим бронированием
                                    </h5>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                        Проверьте расписание перед сохранением. Возможно, потребуется выбрать другое время.
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
                                {slot.service && (
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                            <TbCalendar className="text-blue-600 dark:text-blue-400 text-lg" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                                                Услуга
                                            </label>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {slot.service.name || 'Не указана'}
                                            </div>
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
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                                                Клиент
                                            </label>
                                            <div className="space-y-1.5">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {slot.client.name}
                                                </div>
                                                {slot.client.phone && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                        <TbPhone className="text-gray-400 shrink-0 text-base" />
                                                        <span>{slot.client.phone}</span>
                                                    </div>
                                                )}
                                                {slot.client.email && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                        <TbMail className="text-gray-400 shrink-0 text-base" />
                                                        <span className="break-all">{slot.client.email}</span>
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
                                                Исполнитель
                                            </label>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {slot.specialist?.name || slot.specialistName || (slot.specialist_id ? `ID: ${slot.specialist_id}` : 'Не указан')}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Цена */}
                                {slot.price !== undefined && (
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                            <TbCurrencyDollar className="text-amber-600 dark:text-amber-400 text-lg" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                                                Цена
                                            </label>
                                            <div className="text-base font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(slot.total_price || slot.price, currency)}
                                            </div>
                                            {slot.total_price && slot.total_price !== slot.price && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Базовая цена: {formatCurrency(slot.price, currency)} + дополнительные услуги
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Итого */}
                                {(slot.additional_services && slot.additional_services.length > 0) || (slot.price !== undefined && slot.price > 0) ? (
                                    <div className="mt-4">
                                        <Card className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                            <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                                Итого:
                                            </h5>
                                            <div className="space-y-2">
                                                {/* Базовая стоимость услуги */}
                                                {slot.price !== undefined && slot.price > 0 && (
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-gray-700 dark:text-gray-300">
                                                            Базовая стоимость услуги
                                                        </span>
                                                        <span className="font-semibold text-gray-900 dark:text-white">
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
                                                                    <span className="text-gray-700 dark:text-gray-300">
                                                                        {service.name} × {quantity}
                                                                    </span>
                                                                    <span className="font-semibold text-gray-900 dark:text-white">
                                                                        {formatCurrency(total, currency)}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                                
                                                {/* Итого общий */}
                                                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 flex justify-between items-center">
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Итого:</span>
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {formatCurrency(slot.total_price || slot.price || 0, currency)}
                                                    </span>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {/* Ссылка на отзыв для незарегистрированных клиентов */}
                        {slot?.status === 'completed' && (slot?.user_id === null || slot?.user_id === undefined) && slot?.review_token && (
                            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                        <TbStar className="text-blue-600 dark:text-blue-400 text-xl mt-0.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                            Ссылка на отзыв для клиента:
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
                                                onClick={() => {
                                                    const reviewUrl = `${window.location.origin}/review/${slot.review_token}`
                                                    navigator.clipboard.writeText(reviewUrl)
                                                    toast.push(
                                                        <Notification title="Скопировано" type="success">
                                                            Ссылка скопирована в буфер обмена
                                                        </Notification>,
                                                    )
                                                }}
                                            >
                                                Копировать
                                            </Button>
                                        </div>
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                            Отправьте эту ссылку клиенту для оставления отзыва
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Редактируемые поля */}
                        <div className="space-y-5">
                            {slot?.type === 'NEW' && (
                                <FormItem label="Услуга" required>
                                    <Select
                                        options={services.map(s => ({ value: s.id, label: s.name }))}
                                        value={services.find(s => s.id === formData.service_id) ? { value: formData.service_id, label: services.find(s => s.id === formData.service_id)?.name } : null}
                                        onChange={(option) => {
                                            const selectedService = services.find(s => s.id === option?.value)
                                            setFormData((prev) => ({ 
                                                ...prev, 
                                                service_id: option?.value || null,
                                                advertisement_id: selectedService?.advertisement_id || null,
                                            }))
                                            // Сбрасываем выбранные дополнительные услуги при смене услуги
                                            setSelectedAdditionalServices([])
                                        }}
                                        placeholder="Выберите услугу"
                                    />
                                </FormItem>
                            )}
                            
                            {slot?.type === 'NEW' && (
                                <>
                                    <FormItem label="Клиент">
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant={clientMode === 'select' ? 'solid' : 'plain'}
                                                    size="sm"
                                                    onClick={() => setClientMode('select')}
                                                >
                                                    Выбрать из существующих
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={clientMode === 'manual' ? 'solid' : 'plain'}
                                                    size="sm"
                                                    onClick={() => setClientMode('manual')}
                                                >
                                                    Ввести вручную
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
                                                            }))
                                                        }}
                                                        placeholder="Выберите клиента"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setIsCreateClientModalOpen(true)}
                                                    >
                                                        Создать нового клиента
                                                    </Button>
                                                </div>
                                            )}
                                            
                                            {clientMode === 'manual' && (
                                                <div className="space-y-3">
                                                    <Input
                                                        value={formData.client_name}
                                                        onChange={(e) => setFormData((prev) => ({ ...prev, client_name: e.target.value }))}
                                                        placeholder="Имя клиента"
                                                    />
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Input
                                                            value={formData.client_phone}
                                                            onChange={(e) => setFormData((prev) => ({ ...prev, client_phone: e.target.value }))}
                                                            placeholder="Телефон"
                                                        />
                                                        <Input
                                                            type="email"
                                                            value={formData.client_email}
                                                            onChange={(e) => setFormData((prev) => ({ ...prev, client_email: e.target.value }))}
                                                            placeholder="Email"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </FormItem>
                                </>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4">
                                <FormItem label="Дата" required>
                                    <Input
                                        type="date"
                                        value={formData.booking_date}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, booking_date: e.target.value }))}
                                        required
                                    />
                                </FormItem>
                                <FormItem label="Время" required>
                                    <Input
                                        type="time"
                                        value={formData.booking_time}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, booking_time: e.target.value }))}
                                        required
                                    />
                                </FormItem>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormItem label="Длительность (минуты)">
                                    <Input
                                        type="number"
                                        min="15"
                                        step="15"
                                        value={formData.duration_minutes}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                                    />
                                </FormItem>

                                <FormItem label="Статус">
                                    <Select
                                        options={statusOptions}
                                        value={statusOptions.find((opt) => opt.value === formData.status)}
                                        onChange={(option) => setFormData((prev) => ({ ...prev, status: option.value }))}
                                        isSearchable={false}
                                        components={{
                                            Input: (props) => (
                                                <input
                                                    {...props}
                                                    inputMode="none"
                                                    readOnly
                                                    style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
                                                />
                                            ),
                                        }}
                                    />
                                </FormItem>
                            </div>

                            <FormItem label="Исполнитель">
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
                                            label: teamMembers.find(m => m.id === formData.specialist_id)?.name || 'Исполнитель' 
                                        }
                                        : null
                                    }
                                    onChange={(option) => setFormData((prev) => ({ 
                                        ...prev, 
                                        specialist_id: option?.value || null 
                                    }))}
                                    placeholder="Выберите исполнителя"
                                />
                            </FormItem>

                            <FormItem label="Примечания">
                                <Input
                                    as="textarea"
                                    rows={3}
                                    value={formData.notes || ''}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Внутренние примечания к бронированию"
                                />
                            </FormItem>

                            {/* Дополнительные услуги - только если выбрана услуга */}
                            {formData.service_id && (
                                <div>
                                    <BookingAdditionalServices
                                        serviceId={formData.service_id}
                                        advertisementId={formData.advertisement_id || null}
                                        selectedServices={selectedAdditionalServices}
                                        onSelectionChange={setSelectedAdditionalServices}
                                    />
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Кнопки - зафиксированы снизу */}
                <div className="flex-shrink-0 px-6 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <Button type="button" variant="plain" onClick={onClose}>
                        Отмена
                    </Button>
                    {slot?.type === 'EDIT' && onDelete && (
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
                            Удалить
                        </Button>
                    )}
                    <Button 
                        type="button"
                        variant="solid"
                        onClick={(e) => {
                            e.preventDefault()
                            handleSubmit(e)
                        }}
                    >
                        Сохранить
                    </Button>
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


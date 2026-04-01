'use client'
import { useState, useEffect } from 'react'
import CalendarView from '@/components/shared/CalendarView'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { PiCalendarPlus, PiClock, PiUser } from 'react-icons/pi'
import dayjs from 'dayjs'
import cloneDeep from 'lodash/cloneDeep'
import ScheduleSlotModal from './ScheduleSlotModal'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    getScheduleSlots, 
    createScheduleSlot, 
    updateScheduleSlot, 
    deleteScheduleSlot,
    getBusinessServices
} from '@/lib/api/business'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import Loading from '@/components/shared/Loading'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

const bookingStatusColor = {
    new: {
        label: 'Новый',
        color: 'blue',
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    },
    pending: {
        label: 'Ожидает',
        color: 'yellow',
        badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    confirmed: {
        label: 'Подтверждено',
        color: 'orange',
        badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    },
    completed: {
        label: 'Завершено',
        color: 'green',
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    cancelled: {
        label: 'Отменено',
        color: 'red',
        badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
}

const ScheduleCalendar = ({ initialSlots = [] }) => {
    const queryClient = useQueryClient()
    const [selectedSlot, setSelectedSlot] = useState(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [slotToDelete, setSlotToDelete] = useState(null)

    const { data: slots = [], isLoading, refetch: refetchSlots } = useQuery({
        queryKey: ['business-schedule-slots'],
        queryFn: getScheduleSlots,
        initialData: initialSlots,
    })

    // Загружаем список услуг для получения цен
    const { data: services = [] } = useQuery({
        queryKey: ['business-services'],
        queryFn: getBusinessServices,
    })

    const createSlotMutation = useMutation({
        mutationFn: createScheduleSlot,
        onSuccess: async () => {
            // Немедленно обновляем данные календаря
            await refetchSlots()
            // Также инвалидируем кеш для надежности
            queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
            setDialogOpen(false)
            setSelectedSlot(null)
            toast.push(
                <Notification title="Успешно" type="success">
                    Бронирование успешно создано
                </Notification>,
            )
        },
        onError: (error) => {
            const errorCode = error?.response?.data?.error
            const errorMessage = error?.response?.data?.message || error?.message || 'Не удалось создать бронирование'
            
            // Показываем уведомление для всех ошибок, включая занятое время
            if (errorCode === 'past_date') {
                toast.push(
                    <Notification title="Ошибка" type="danger">
                        {errorMessage}
                    </Notification>,
                )
                setDialogOpen(false)
                setSelectedSlot(null)
            } else if (errorCode === 'slot_occupied') {
                // Для занятых слотов показываем предупреждение, но НЕ закрываем модалку
                // Пользователь может изменить время в модалке
                toast.push(
                    <Notification title="Внимание" type="warning">
                        {errorMessage}. Измените время или дату в форме.
                    </Notification>,
                )
                // НЕ закрываем модалку - пользователь может исправить время
            } else {
                // Показываем ошибку для других типов ошибок
                toast.push(
                    <Notification title="Ошибка" type="danger">
                        {errorMessage}
                    </Notification>,
                )
                setDialogOpen(false)
                setSelectedSlot(null)
            }
        },
    })

    const updateSlotMutation = useMutation({
        mutationFn: ({ id, data }) => updateScheduleSlot(id, data),
        onSuccess: async (response) => {
            // Получаем данные из ответа (может быть response.data или просто response)
            const responseData = response?.data || response
            
            console.log('[ScheduleCalendar] Update success response:', {
                response,
                responseData,
                status: responseData?.status,
                review_token: responseData?.review_token,
                user_id: responseData?.user_id,
                selectedSlotId: selectedSlot?.id,
            })
            
            // Немедленно обновляем данные календаря
            const result = await refetchSlots()
            const updatedSlots = result?.data || []
            console.log('[ScheduleCalendar] Refetched slots:', {
                slotsCount: updatedSlots.length,
                updatedSlots: updatedSlots.map(s => ({ id: s.id, status: s.status, review_token: s.review_token, user_id: s.user_id })),
            })
            
            // Также инвалидируем кеш для надежности
            queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
            
            // Проверяем, был ли изменен статус на completed
            const isCompleted = responseData?.status === 'completed'
            const hasReviewToken = !!responseData?.review_token
            const isUnregisteredClient = !responseData?.user_id || responseData?.user_id === null
            
            console.log('[ScheduleCalendar] Update conditions:', {
                isCompleted,
                hasReviewToken,
                isUnregisteredClient,
                selectedSlot: !!selectedSlot,
            })
            
            // Если статус изменился на completed и есть review_token, обновляем выбранный слот
            if (isCompleted && hasReviewToken && selectedSlot) {
                // Находим обновленный слот в списке
                const updatedSlot = updatedSlots.find(s => String(s.id) === String(selectedSlot.id))
                console.log('[ScheduleCalendar] Found updated slot:', updatedSlot)
                
                if (updatedSlot) {
                    // Обновляем данные слота в модалке с полными данными из API
                    setSelectedSlot({
                        ...updatedSlot,
                        type: 'EDIT', // Сохраняем тип для модалки
                    })
                    console.log('[ScheduleCalendar] Updated selectedSlot from list')
                } else {
                    // Если не нашли в списке, обновляем из ответа
                    setSelectedSlot(prev => ({
                        ...prev,
                        status: 'completed',
                        review_token: responseData.review_token,
                        user_id: responseData.user_id,
                    }))
                    console.log('[ScheduleCalendar] Updated selectedSlot from response')
                }
                
                // Не закрываем модалку, если был сгенерирован токен для незарегистрированного клиента
                if (isUnregisteredClient) {
                    console.log('[ScheduleCalendar] Keeping modal open for review link')
                    toast.push(
                        <Notification title="Успешно" type="success">
                            Бронирование завершено. Ссылка на отзыв сгенерирована.
                        </Notification>,
                    )
                    return // Не закрываем модалку, чтобы показать ссылку
                }
            }
            
            console.log('[ScheduleCalendar] Closing modal')
            setDialogOpen(false)
            toast.push(
                <Notification title="Успешно" type="success">
                    Бронирование успешно обновлено
                </Notification>,
            )
        },
        onError: (error) => {
            const errorCode = error?.response?.data?.error
            const errorMessage = error?.response?.data?.message || error?.message || 'Не удалось обновить бронирование'
            
            // Показываем уведомление для ошибок прошедшей даты
            if (errorCode === 'past_date') {
                toast.push(
                    <Notification title="Ошибка" type="danger">
                        {errorMessage}
                    </Notification>,
                )
            } else if (errorCode !== 'slot_occupied') {
                // Показываем ошибку для других типов ошибок (кроме занятого времени)
                toast.push(
                    <Notification title="Ошибка" type="danger">
                        {errorMessage}
                    </Notification>,
                )
            }
            // Для занятых слотов просто закрываем модалку без сообщения
            setDialogOpen(false)
            setSelectedSlot(null)
        },
    })

    const deleteSlotMutation = useMutation({
        mutationFn: deleteScheduleSlot,
        onSuccess: async () => {
            // Немедленно обновляем данные календаря
            await refetchSlots()
            // Также инвалидируем кеш для надежности
            queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
            setIsDeleteDialogOpen(false)
            setSlotToDelete(null)
            setDialogOpen(false)
            setSelectedSlot(null)
            toast.push(
                <Notification title="Успешно" type="success">
                    Бронирование успешно удалено
                </Notification>,
            )
        },
        onError: () => {
            setIsDeleteDialogOpen(false)
            setSlotToDelete(null)
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось удалить бронирование
                </Notification>,
            )
        },
    })

    const handleCellSelect = (event) => {
        const { start, end, allDay } = event
        
        // Проверяем, не занят ли этот слот
        const selectedStart = dayjs(start)
        let selectedEnd = dayjs(end)
        
        // Если время не указано (allDay или время 00:00), используем текущее время или время начала рабочего дня
        let finalStart = selectedStart
        if (allDay || selectedStart.format('HH:mm') === '00:00') {
            // Если это весь день или время не указано, используем текущее время или 09:00
            const now = dayjs()
            if (selectedStart.isSame(now, 'day')) {
                // Если выбран сегодня, используем текущее время (округленное до ближайшего часа)
                finalStart = now.minute(0).second(0).millisecond(0)
            } else {
                // Если выбран другой день, используем 09:00
                finalStart = selectedStart.hour(9).minute(0).second(0).millisecond(0)
            }
        }
        
        // Если end равен start или не указан (простой клик без перетаскивания), устанавливаем дефолтную длительность 1 час
        if (selectedEnd.isSame(selectedStart) || selectedEnd.diff(selectedStart, 'minute') < 1) {
            selectedEnd = finalStart.add(1, 'hour')
        }
        
        // Проверяем пересечение только если выбранный интервал действительно пересекается с существующими
        // Используем строгую проверку: начало выбранного < конец существующего И конец выбранного > начало существующего
        // И проверяем, что это не одно и то же время (не касается границ)
        const isOccupied = slots.some((slot) => {
            const slotStart = dayjs(slot.start)
            const slotEnd = dayjs(slot.end)
            
            // Проверяем пересечение: начало выбранного < конец существующего И конец выбранного > начало существующего
            // Но разрешаем касание границ (когда одно бронирование заканчивается, а другое начинается)
            const hasOverlap = finalStart.isBefore(slotEnd) && selectedEnd.isAfter(slotStart)
            
            // Если есть пересечение, проверяем, что это не просто касание границ
            if (hasOverlap) {
                // Разрешаем, если выбранное время начинается ровно когда заканчивается существующее
                // или заканчивается ровно когда начинается существующее
                const touchesStart = finalStart.isSame(slotEnd)
                const touchesEnd = selectedEnd.isSame(slotStart)
                
                // Если это просто касание границ, разрешаем
                if (touchesStart || touchesEnd) {
                    return false
                }
                
                // Иначе это реальное пересечение
                return true
            }
            
            return false
        })
        
        // Всегда открываем модалку, даже если время занято
        // Пользователь увидит предупреждение в модалке и сможет решить, хочет ли он продолжить
        if (isOccupied) {
            // Показываем предупреждение, но все равно открываем модалку
            toast.push(
                <Notification title="Внимание" type="warning">
                    Выбранное время пересекается с существующим бронированием. Проверьте расписание.
                </Notification>,
            )
        }
        
        setSelectedSlot({
            type: 'NEW',
            start: finalStart.format(),
            end: selectedEnd.format(),
            isOccupied: isOccupied, // Передаем информацию о занятости в модалку
        })
        setDialogOpen(true)
    }

    const handleEventClick = (arg) => {
        const slot = slots.find((s) => s.id === arg.event.id)
        if (slot) {
            // Передаем все данные слота, включая service, client, specialist и т.д.
            // slot уже содержит все данные из API, включая specialist и specialist_id
            setSelectedSlot({
                type: 'EDIT',
                ...slot, // Передаем все данные слота напрямую
            })
            setDialogOpen(true)
        }
    }

    const handleEventChange = (arg) => {
        const slot = slots.find((s) => s.id === arg.event.id)
        if (slot) {
            updateSlotMutation.mutate({
                id: slot.id,
                data: {
                    start: dayjs(arg.event.start).toISOString(),
                    end: dayjs(arg.event.end).toISOString(),
                    title: arg.event.title,
                },
            })
        }
    }

    const handleSubmit = (data, type) => {
        if (type === 'NEW') {
            // Находим выбранную услугу для получения цены
            const selectedService = services.find(s => s.id === data.service_id)
            const servicePrice = selectedService?.price || 0
            
            // Логируем данные перед отправкой для отладки
            console.log('Creating booking:', {
                booking_date: data.booking_date,
                booking_time: data.booking_time,
                duration_minutes: data.duration_minutes,
                specialist_id: data.specialist_id,
            })
            
            createSlotMutation.mutate({
                service_id: data.service_id,
                booking_date: data.booking_date,
                booking_time: data.booking_time,
                duration_minutes: data.duration_minutes,
                status: data.status,
                notes: data.notes || null,
                user_id: data.user_id || null,
                client_name: data.client_name || null,
                client_email: data.client_email || null,
                client_phone: data.client_phone || null,
                advertisement_id: data.advertisement_id || null,
                specialist_id: data.specialist_id || null, // Передаем specialist_id
                price: servicePrice, // Передаем цену услуги
                additional_services: data.additional_services || [],
            })
        } else if (type === 'EDIT') {
            updateSlotMutation.mutate({
                id: data.id,
                data: {
                    booking_date: data.booking_date,
                    booking_time: data.booking_time,
                    duration_minutes: data.duration_minutes,
                    status: data.status,
                    notes: data.notes || null,
                    additional_services: data.additional_services || [],
                },
            })
        }
    }

    const handleDelete = (slotId) => {
        setSlotToDelete(slotId)
        setIsDeleteDialogOpen(true)
    }

    const handleConfirmDelete = () => {
        if (slotToDelete) {
            deleteSlotMutation.mutate(slotToDelete)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loading loading />
            </div>
        )
    }

    // Преобразуем слоты в формат для FullCalendar
    const events = slots.map((slot) => {
        // Цвет определяется только по статусу
        const status = slot.status || 'new'
        const statusConfig = bookingStatusColor[status]
        const eventColor = statusConfig ? statusConfig.color : 'blue'
        
        return {
            id: slot.id,
            title: slot.title,
            start: slot.start,
            end: slot.end,
            extendedProps: {
                eventColor: eventColor,
                status: status,
                specialist: slot.specialist,
                specialistName: slot.specialist?.name || slot.specialistName || null,
                specialist_id: slot.specialist_id || slot.specialist?.id || null,
            },
        }
    })

    return (
        <div className="flex flex-col gap-4">
            <Card>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <h3>Расписание</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Управление бронированиями и доступностью
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="solid"
                                onClick={() => {
                                    setSelectedSlot({ type: 'NEW' })
                                    setDialogOpen(true)
                                }}
                                icon={<PiCalendarPlus />}
                            >
                                Новое бронирование
                            </Button>
                        </div>
                    </div>

                {/* Легенда статусов */}
                <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    {Object.entries(bookingStatusColor).map(([status, config]) => (
                        <div key={status} className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.badgeClass}`}>
                                {config.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Календарь */}
                <div className="calendar-wrapper min-h-[600px] md:min-h-[700px]">
                    <CalendarView
                        editable
                        selectable
                        selectOverlap={true} // Разрешаем выбор даже если есть события - проверку делаем в handleCellSelect
                        events={events}
                        eventClick={handleEventClick}
                        select={handleCellSelect}
                        eventDrop={handleEventChange}
                        selectAllow={() => {
                            // Всегда разрешаем выбор - проверку пересечений делаем в handleCellSelect
                            // Это позволяет открыть модалку даже если время занято, чтобы пользователь мог увидеть предупреждение
                            return true
                        }}
                    />
                </div>
            </Card>

            {/* Модалка для создания/редактирования бронирования */}
            <ScheduleSlotModal
                isOpen={dialogOpen}
                onClose={() => {
                    setDialogOpen(false)
                    setSelectedSlot(null)
                }}
                slot={selectedSlot}
                onSave={handleSubmit}
                onDelete={selectedSlot?.id ? () => handleDelete(selectedSlot.id) : null}
            />
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                type="danger"
                title="Удалить бронирование?"
                onCancel={() => {
                    setIsDeleteDialogOpen(false)
                    setSlotToDelete(null)
                }}
                onConfirm={handleConfirmDelete}
                confirmText="Удалить"
                cancelText="Отмена"
            >
                <p>Вы уверены, что хотите удалить это бронирование?</p>
            </ConfirmDialog>
        </div>
    )
}

export default ScheduleCalendar


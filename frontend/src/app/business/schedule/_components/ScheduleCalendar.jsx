'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import CalendarView from '@/components/shared/CalendarView'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Dialog from '@/components/ui/Dialog'
import { PiCalendarPlus, PiClock, PiUser, PiRepeat } from 'react-icons/pi'
import dayjs from 'dayjs'
import cloneDeep from 'lodash/cloneDeep'
import ScheduleSlotModal from './ScheduleSlotModal'
import RecurringBookingModal from './RecurringBookingModal'
import RecurringBookingsList from './RecurringBookingsList'
import ScheduleStats from './ScheduleStats'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getScheduleSlots, getBusinessServices, getScheduleSettings } from '@/lib/api/business'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import Loading from '@/components/shared/Loading'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useTranslations } from 'next-intl'
import useBusinessStore from '@/store/businessStore'
import { usePermission } from '@/hooks/usePermission'
import { useBusinessScheduleSlotModalController } from '@/hooks/useBusinessScheduleSlotModalController'
import { getScheduleSlotMonetaryTotal } from '@/utils/schedule/slotMonetaryTotal'
import { resolveSlotServiceName } from '@/utils/schedule/resolveSlotServiceName'

const getBookingStatusColor = (t) => ({
    new: {
        label: t('statuses.new'),
        color: 'blue',
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    },
    pending: {
        label: t('statuses.pending'),
        color: 'yellow',
        badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    confirmed: {
        label: t('statuses.confirmed'),
        color: 'orange',
        badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    },
    completed: {
        label: t('statuses.completed'),
        color: 'green',
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    cancelled: {
        label: t('statuses.cancelled'),
        color: 'red',
        badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
})

const ScheduleCalendar = ({ initialSlots = [], initialOpenBookingId = null }) => {
    const t = useTranslations('business.schedule')
    const tCommon = useTranslations('business.common')
    const bookingStatusColor = getBookingStatusColor(t)
    const queryClient = useQueryClient()
    const router = useRouter()
    const [recurringModalOpen, setRecurringModalOpen] = useState(false)
    const [recurringModalTab, setRecurringModalTab] = useState('list') // 'list' или 'create'
    const [selectedChain, setSelectedChain] = useState(null)
    const [dateRange, setDateRange] = useState(null)
    /** Статистика: календарный месяц (по умолчанию) или видимый диапазон сетки */
    const [statsMode, setStatsMode] = useState('calendarMonth')

    const statsDateRange = useMemo(() => {
        if (statsMode === 'calendarMonth') {
            const start = dayjs().startOf('month').startOf('day')
            const endExclusive = dayjs().add(1, 'month').startOf('month')
            return { start: start.toDate(), end: endExclusive.toDate(), view: 'month' }
        }
        return dateRange
    }, [statsMode, dateRange])
    
    // Проверка прав на управление расписанием
    const canManageSchedule = usePermission('manage_schedule')
    
    // Обновление диапазона дат при изменении вида календаря
    const handleDatesSet = useCallback((dateInfo) => {
        setDateRange({
            start: dateInfo.start,
            end: dateInfo.end,
            view: dateInfo.view.type
        })
    }, [])

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

    // Загружаем настройки расписания для получения weekStartsOn
    const { data: scheduleSettings } = useQuery({
        queryKey: ['business-schedule-settings'],
        queryFn: getScheduleSettings,
    })

    const {
        dialogOpen,
        setDialogOpen,
        selectedSlot,
        setSelectedSlot,
        isDeleteDialogOpen,
        handleSubmit,
        handleDelete,
        handleConfirmDelete,
        cancelDelete,
        closeModal,
        updateSlotMutation,
    } = useBusinessScheduleSlotModalController({ refetchSlots })

    const scheduleOpenFromUrlHandled = useRef(false)
    useEffect(() => {
        if (!initialOpenBookingId) {
            scheduleOpenFromUrlHandled.current = false
            return
        }
        if (!slots.length || scheduleOpenFromUrlHandled.current) return
        const id = String(initialOpenBookingId)
        const slot = slots.find((s) => String(s.id) === id)
        if (slot) {
            scheduleOpenFromUrlHandled.current = true
            setSelectedSlot({ type: 'EDIT', ...slot })
            setDialogOpen(true)
            router.replace('/business/schedule', { scroll: false })
        }
    }, [initialOpenBookingId, slots, router, setSelectedSlot, setDialogOpen])

    const handleCellSelect = (event) => {
        // Если нет прав на управление расписанием - не открываем модалку создания
        if (!canManageSchedule) return
        
        const { start, end, allDay } = event
        
        // Проверяем, не занят ли этот слот
        const selectedStart = dayjs(start)
        let selectedEnd = dayjs(end)
        
        // Если время не указано (allDay или время 00:00), используем текущее время или время начала рабочего дня
        let finalStart = selectedStart
        if (allDay || selectedStart.format('HH:mm') === '00:00') {
            // Если это весь день или время не указано, используем текущее время или 00:00 (12 am)
            const now = dayjs()
            if (selectedStart.isSame(now, 'day')) {
                // Если выбран сегодня, используем текущее время (округленное до ближайшего часа)
                finalStart = now.minute(0).second(0).millisecond(0)
            } else {
                // Если выбран другой день, используем 00:00 (12 am)
                finalStart = selectedStart.hour(0).minute(0).second(0).millisecond(0)
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
                <Notification title={tCommon('warning')} type="warning">
                    {t('notifications.timeOverlap')}
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
        const slot = slots.find((s) => String(s.id) === String(arg.event.id))
        if (!slot) {
            arg.revert()
            return
        }

        const startDate = dayjs(arg.event.start)
        const endDate = arg.event.end ? dayjs(arg.event.end) : startDate.add(slot.duration_minutes || 60, 'minute')
        
        if (!startDate.isValid()) {
            arg.revert()
            return
        }

        const durationMinutes = endDate.isValid() 
            ? Math.max(15, endDate.diff(startDate, 'minute')) 
            : (slot.duration_minutes || 60)

        // Используем тот же формат, что и в модалке (handleSubmit EDIT)
        updateSlotMutation.mutate(
            {
                id: slot.id,
                data: {
                    booking_date: startDate.format('YYYY-MM-DD'),
                    booking_time: startDate.format('HH:mm'),
                    duration_minutes: durationMinutes,
                    status: slot.status,
                    title: slot.title || null,
                    notes: slot.notes || null,
                    specialist_id: slot.specialist_id || null,
                },
            },
            {
                onError: () => arg.revert(),
            },
        )
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loading loading />
            </div>
        )
    }

    const clientFallback = t('modal.labels.client')
    const isPlaceholderServiceTitle = (title) =>
        !title || ['Услуга', 'Service', 'Servicio', 'Ծառայություն', 'Послуга'].some((p) =>
            String(title).includes(p),
        )

    // Преобразуем слоты в формат для FullCalendar
    const events = slots.map((slot) => {
        // Цвет определяется только по статусу
        const status = slot.status || 'new'
        const statusConfig = bookingStatusColor[status]
        const eventColor = statusConfig ? statusConfig.color : 'blue'
        
        // Формируем title из данных услуги и клиента
        let eventTitle = slot.title
        const isCustomEvent = !!(slot.title && !slot.service_id && !slot.service?.id)

        if (isCustomEvent) {
            eventTitle = slot.title
        } else {
            const serviceName = resolveSlotServiceName(slot, services)
            if (serviceName && (isPlaceholderServiceTitle(slot.title) || !slot.title)) {
                const clientName = slot.client?.name || slot.client_name || clientFallback
                eventTitle = `${clientName} - ${serviceName}`
            } else if (!eventTitle && serviceName) {
                const clientName = slot.client?.name || slot.client_name || clientFallback
                eventTitle = `${clientName} - ${serviceName}`
            }
        }
        
        const totalAmount = getScheduleSlotMonetaryTotal(slot)
        const amountLabel = totalAmount > 0
            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(totalAmount)
            : null

        const isPaidOnline = slot.payment_status === 'authorized' || slot.payment_status === 'paid'
        if (isPaidOnline) {
            eventTitle = `${t('paidOnlineShort')} · ${eventTitle}`
        }

        return {
            id: slot.id,
            title: eventTitle,
            start: slot.start,
            end: slot.end,
            extendedProps: {
                eventColor: eventColor,
                status: status,
                specialist: slot.specialist,
                specialistName: slot.specialist?.name || slot.specialistName || null,
                specialist_id: slot.specialist_id || slot.specialist?.id || null,
                amountLabel,
                payment_status: slot.payment_status,
            },
        }
    })

    return (
        <div className="flex flex-col gap-4">
            <Card>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                {t('description')}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 sm:flex-none"
                                onClick={() => {
                                    setRecurringModalTab('list')
                                    setRecurringModalOpen(true)
                                }}
                                icon={<PiRepeat />}
                            >
                                {t('recurringBookings')}
                            </Button>
                            {canManageSchedule && (
                                <Button
                                    variant="solid"
                                    size="sm"
                                    className="flex-1 sm:flex-none"
                                    onClick={() => {
                                        setSelectedSlot({ type: 'NEW' })
                                        setDialogOpen(true)
                                    }}
                                    icon={<PiCalendarPlus />}
                                >
                                    {t('newBooking')}
                                </Button>
                            )}
                        </div>
                    </div>

                {/* Статистика: период / календарный месяц */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 md:mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('stats.statsModeLabel')}
                    </p>
                    <div
                        className="inline-flex self-start sm:self-auto rounded-lg border border-gray-200 dark:border-gray-600 p-0.5 bg-gray-50 dark:bg-gray-800/60"
                        role="group"
                        aria-label={t('stats.statsModeLabel')}
                    >
                        <button
                            type="button"
                            onClick={() => setStatsMode('calendarMonth')}
                            className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors ${
                                statsMode === 'calendarMonth'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                            }`}
                        >
                            {t('stats.modeCalendarMonth')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatsMode('visibleRange')}
                            className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors ${
                                statsMode === 'visibleRange'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                            }`}
                        >
                            {t('stats.modeVisibleRange')}
                        </button>
                    </div>
                </div>

                <ScheduleStats slots={slots} dateRange={statsDateRange} statsMode={statsMode} />

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
                <div className="calendar-wrapper min-h-[600px] md:min-h-[700px] w-full max-w-full overflow-x-auto">
                    <CalendarView
                        editable
                        selectable
                        eventResize={handleEventChange}
                        selectOverlap={true} // Разрешаем выбор даже если есть события - проверку делаем в handleCellSelect
                        events={events}
                        eventClick={handleEventClick}
                        select={handleCellSelect}
                        eventDrop={handleEventChange}
                        slotMinTime="00:00:00" // Начинаем календарь с 00:00 (12 am)
                        firstDay={scheduleSettings?.weekStartsOn ?? 1} // Начало недели из настроек (по умолчанию понедельник)
                        datesSet={handleDatesSet} // Отслеживаем изменение периода для статистики
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
                onClose={closeModal}
                slot={selectedSlot}
                onSave={canManageSchedule ? handleSubmit : null}
                onDelete={canManageSchedule && selectedSlot?.id ? () => handleDelete(selectedSlot.id) : null}
                readOnly={!canManageSchedule}
            />
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                type="danger"
                title={t('deleteConfirm.title')}
                onCancel={cancelDelete}
                onConfirm={handleConfirmDelete}
                confirmText={t('deleteConfirm.confirm')}
                cancelText={t('deleteConfirm.cancel')}
            >
                <p>{t('deleteConfirm.message')}</p>
            </ConfirmDialog>

            {/* Модалка регулярных бронирований */}
            <Dialog
                isOpen={recurringModalOpen}
                onClose={() => {
                    setRecurringModalOpen(false)
                    setSelectedChain(null)
                    setRecurringModalTab('list')
                }}
                width={900}
            >
                <div className="flex flex-col h-full max-h-[85vh]">
                    {/* Заголовок */}
                    <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            {t('recurringBookings')}
                        </h4>
                        <div className="flex gap-2">
                            <Button
                                variant={recurringModalTab === 'list' ? 'solid' : 'plain'}
                                size="sm"
                                onClick={() => {
                                    setRecurringModalTab('list')
                                    setSelectedChain(null)
                                }}
                            >
                                {t('recurring.list')}
                            </Button>
                            <Button
                                variant={recurringModalTab === 'create' ? 'solid' : 'plain'}
                                size="sm"
                                onClick={() => {
                                    setRecurringModalTab('create')
                                    setSelectedChain(null)
                                }}
                                icon={<PiCalendarPlus />}
                            >
                                {t('recurring.create')}
                            </Button>
                        </div>
                    </div>

                    {/* Скроллируемый контент */}
                    <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                        {recurringModalTab === 'list' ? (
                            <RecurringBookingsList
                                onEdit={(chain) => {
                                    setSelectedChain(chain)
                                    setRecurringModalTab('create')
                                }}
                            />
                        ) : (
                            <RecurringBookingModal
                                isOpen={true}
                                onClose={() => {
                                    setSelectedChain(null)
                                    setRecurringModalTab('list')
                                    queryClient.invalidateQueries({ queryKey: ['recurring-bookings'] })
                                }}
                                chain={selectedChain}
                            />
                        )}
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default ScheduleCalendar


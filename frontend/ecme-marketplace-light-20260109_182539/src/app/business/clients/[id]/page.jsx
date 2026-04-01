'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Tabs from '@/components/ui/Tabs'
import Tag from '@/components/ui/Tag'
import Card from '@/components/ui/Card'
import { NumericFormat } from 'react-number-format'
import { PiPhone, PiEnvelope, PiCalendar, PiClock, PiNote, PiArrowLeft, PiUser, PiCheckCircle, PiXCircle } from 'react-icons/pi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClientDetails, addClientNote } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { formatCurrency } from '@/utils/formatCurrency'

const { TabNav, TabList, TabContent } = Tabs

const statusColors = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    confirmed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

const statusLabels = {
    new: 'Новый',
    pending: 'Ожидает',
    confirmed: 'Подтверждено',
    completed: 'Завершено',
    cancelled: 'Отменено',
}

const formatPrice = (price) => {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
    }).format(price || 0)
}

export default function ClientDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const clientId = parseInt(params.id)
    const [newNote, setNewNote] = useState('')

    const { data: clientDetails, isLoading } = useQuery({
        queryKey: ['client-details', clientId],
        queryFn: () => getClientDetails(clientId),
        enabled: !!clientId,
    })

    const addNoteMutation = useMutation({
        mutationFn: (note) => addClientNote(clientId, note),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-details', clientId] })
            setNewNote('')
            toast.push(
                <Notification title="Успешно" type="success">
                    Заметка успешно добавлена
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось добавить заметку
                </Notification>,
            )
        },
    })

    const bookings = clientDetails?.bookings || []
    const notes = clientDetails?.notes || []
    const client = clientDetails?.client || clientDetails
    
    // Получаем статус клиента из списка клиентов или из деталей
    const clientStatus = client?.status || clientDetails?.status || 'regular'

    const handleAddNote = () => {
        if (newNote.trim()) {
            addNoteMutation.mutate(newNote)
        }
    }

    // Вычисляем статистику по бронированиям
    const bookingsStats = {
        total: bookings.length,
        pending: bookings.filter(b => b.status === 'pending' || b.status === 'new').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
    }

    // Вычисляем общую сумму потраченную на завершенные бронирования
    const totalSpent = bookings
        .filter(b => b.status === 'completed')
        .reduce((sum, booking) => {
            return sum + (parseFloat(booking.total_price || booking.price || 0))
        }, 0)

    // Статус клиента
    const statusColorMap = {
        regular: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
        permanent: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100',
        vip: 'bg-orange-200 dark:bg-orange-700 text-orange-900 dark:text-orange-100',
    }
    const statusLabelMap = {
        regular: 'Обычный',
        permanent: 'Постоянный',
        vip: 'VIP',
    }

    // Получаем инициалы для аватара
    const getInitials = (name) => {
        if (!name) return 'U'
        const parts = name.trim().split(' ')
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        }
        return name[0].toUpperCase()
    }

    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    if (!clientDetails || !client) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="text-center py-12">
                        <p className="text-gray-500">Клиент не найден</p>
                        <Button
                            className="mt-4"
                            variant="solid"
                            onClick={() => router.push('/business/clients')}
                        >
                            Вернуться к списку клиентов
                        </Button>
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    {/* Заголовок */}
                    <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <Button
                            variant="plain"
                            icon={<PiArrowLeft />}
                            onClick={() => router.push('/business/clients')}
                        >
                            Назад
                        </Button>
                        <div>
                            <h3>Детали клиента</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Просмотр информации о клиенте
                            </p>
                        </div>
                    </div>

                    {/* Контент с вкладками */}
                    <Tabs defaultValue="info">
                        <TabList>
                            <TabNav value="info">Информация</TabNav>
                            <TabNav value="bookings">Бронирования</TabNav>
                            <TabNav value="notes">Заметки</TabNav>
                        </TabList>
                        
                        <div className="mt-6">
                            <TabContent value="info">
                                <div className="space-y-6">
                                    {/* Основная информация */}
                                    <Card className="p-6">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            <div className="flex-shrink-0">
                                                <Avatar 
                                                    size={80} 
                                                    shape="circle" 
                                                    src={client.avatar || client.img || undefined}
                                                    className="mb-3"
                                                >
                                                    {!client.avatar && !client.img && getInitials(client.name)}
                                                </Avatar>
                                                <Tag className={statusColorMap[clientStatus] || statusColorMap.regular}>
                                                    {statusLabelMap[clientStatus] || 'Обычный'}
                                                </Tag>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                                                    {client.name || 'N/A'}
                                                </h4>
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <PiEnvelope className="text-gray-400" />
                                                        <span className="text-gray-900 dark:text-white">{client.email}</span>
                                                    </div>
                                                    {client.phone && (
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <PiPhone className="text-gray-400" />
                                                            <span className="text-gray-900 dark:text-white">{client.phone}</span>
                                                        </div>
                                                    )}
                                                    {client.lastVisit && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                            <PiClock className="text-gray-400" />
                                                            <span>
                                                                Последний визит: {new Date(client.lastVisit).toLocaleDateString('ru-RU')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Статистика по бронированиям */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Текущие</div>
                                            <div className="text-xl font-semibold text-gray-900 dark:text-white">
                                                {bookingsStats.pending + bookingsStats.confirmed}
                                            </div>
                                        </div>

                                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Завершено</div>
                                            <div className="text-xl font-semibold text-gray-900 dark:text-white">
                                                {bookingsStats.completed}
                                            </div>
                                        </div>

                                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Отменено</div>
                                            <div className="text-xl font-semibold text-gray-900 dark:text-white">
                                                {bookingsStats.cancelled}
                                            </div>
                                        </div>

                                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Потрачено</div>
                                            <div className="text-xl font-semibold text-gray-900 dark:text-white">
                                                <NumericFormat
                                                    displayType="text"
                                                    value={totalSpent}
                                                    prefix={'₽'}
                                                    thousandSeparator={true}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabContent>

                            <TabContent value="bookings">
                                <div className="space-y-4">
                                    {bookings.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            Нет бронирований
                                        </div>
                                    ) : (
                                        bookings.map((booking) => {
                                            const specialistName = booking.specialist?.profile 
                                                ? `${booking.specialist.profile.first_name || ''} ${booking.specialist.profile.last_name || ''}`.trim()
                                                : null
                                            const additionalServices = booking.additional_services || []
                                            const basePrice = parseFloat(booking.price || 0)
                                            const additionalTotal = additionalServices.reduce((sum, item) => {
                                                const price = parseFloat(item.pivot?.price || item.additional_service?.price || item.price || 0)
                                                const quantity = parseInt(item.pivot?.quantity || item.quantity || 1)
                                                return sum + price * quantity
                                            }, 0)
                                            const totalPrice = parseFloat(booking.total_price || (basePrice + additionalTotal))

                                            return (
                                                <Card key={booking.id} className="p-5 border border-gray-200 dark:border-gray-700">
                                                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                                                        <div className="flex-1 space-y-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex-1">
                                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                                                        {booking.service?.name || 'Услуга не указана'}
                                                                    </h4>
                                                                </div>
                                                                <Tag className={statusColors[booking.status] || statusColors.pending}>
                                                                    {statusLabels[booking.status] || booking.status || 'Неизвестно'}
                                                                </Tag>
                                                            </div>
                                                            
                                                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                                    <PiCalendar className="text-base text-gray-400 shrink-0" />
                                                                    <span className="font-medium">
                                                                        {booking.booking_date 
                                                                            ? new Date(booking.booking_date).toLocaleDateString('ru-RU', {
                                                                                day: 'numeric',
                                                                                month: 'long',
                                                                                year: 'numeric'
                                                                            })
                                                                            : 'Дата не указана'}
                                                                    </span>
                                                                </div>
                                                                {booking.booking_time && (
                                                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                                        <PiClock className="text-base text-gray-400 shrink-0" />
                                                                        <span>{booking.booking_time}</span>
                                                                    </div>
                                                                )}
                                                                {specialistName && (
                                                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                                        <PiUser className="text-base text-gray-400 shrink-0" />
                                                                        <span>
                                                                            <span className="font-medium">Специалист:</span>{' '}
                                                                            {specialistName}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Итого */}
                                                            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2">
                                                                    {/* Базовая стоимость услуги */}
                                                                    {basePrice > 0 && (
                                                                        <div className="flex justify-between items-center text-sm">
                                                                            <span className="text-gray-700 dark:text-gray-300">
                                                                                Базовая стоимость услуги
                                                                            </span>
                                                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                                                {formatCurrency(basePrice, booking.currency || 'USD')}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* Дополнительные услуги */}
                                                                    {additionalServices.length > 0 && (
                                                                        <>
                                                                            {additionalServices.map((item, index) => {
                                                                                const service = item.additional_service || item
                                                                                const price = parseFloat(item.pivot?.price || service.price || item.price || 0)
                                                                                const quantity = parseInt(item.pivot?.quantity || item.quantity || 1)
                                                                                const total = price * quantity

                                                                                return (
                                                                                    <div key={item.id || index} className="flex justify-between items-center text-sm">
                                                                                        <span className="text-gray-700 dark:text-gray-300">
                                                                                            {service.name || item.name} × {quantity}
                                                                                        </span>
                                                                                        <span className="font-semibold text-gray-900 dark:text-white">
                                                                                            {formatCurrency(total, booking.currency || 'USD')}
                                                                                        </span>
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                        </>
                                                                    )}
                                                                    
                                                                    {/* Итого общий */}
                                                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 flex justify-between items-center">
                                                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Итого:</span>
                                                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                            {formatCurrency(totalPrice, booking.currency || 'USD')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            )
                                        })
                                    )}
                                </div>
                            </TabContent>

                            <TabContent value="notes">
                                <div className="space-y-4">
                                    <FormItem label="Добавить заметку">
                                        <div className="flex gap-2">
                                            <Input
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                placeholder="Введите заметку о клиенте..."
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleAddNote()
                                                    }
                                                }}
                                                disabled={addNoteMutation.isPending}
                                            />
                                            <Button
                                                variant="solid"
                                                onClick={handleAddNote}
                                                loading={addNoteMutation.isPending}
                                            >
                                                Добавить
                                            </Button>
                                        </div>
                                    </FormItem>

                                    <div className="space-y-3">
                                        {notes.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                Нет заметок
                                            </div>
                                        ) : (
                                            notes.map((note) => (
                                                <Card key={note.id} className="p-4">
                                                    <div className="flex items-start gap-3">
                                                        <PiNote className="text-gray-400 mt-1" />
                                                        <div className="flex-1">
                                                            <div className="text-sm mb-1">
                                                                {note.note}
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                Добавлено {new Date(note.createdAt).toLocaleDateString('ru-RU', {
                                                                    day: 'numeric',
                                                                    month: 'long',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </TabContent>
                        </div>
                    </Tabs>
                </div>
            </AdaptiveCard>
        </Container>
    )
}


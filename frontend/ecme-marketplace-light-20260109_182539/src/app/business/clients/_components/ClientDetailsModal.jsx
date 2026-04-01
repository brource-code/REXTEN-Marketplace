'use client'
import { useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Tabs from '@/components/ui/Tabs'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { NumericFormat } from 'react-number-format'
import { PiPhone, PiEnvelope, PiCalendar, PiClock, PiNote } from 'react-icons/pi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClientDetails, addClientNote } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

const { TabNav, TabList, TabContent } = Tabs

const ClientDetailsModal = ({ isOpen, onClose, client }) => {
    const queryClient = useQueryClient()
    const [newNote, setNewNote] = useState('')

    const { data: clientDetails, isLoading } = useQuery({
        queryKey: ['client-details', client?.id],
        queryFn: () => getClientDetails(client.id),
        enabled: !!client?.id && isOpen,
    })

    const addNoteMutation = useMutation({
        mutationFn: (note) => addClientNote(client.id, note),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-details', client.id] })
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

    if (!client) return null

    const bookings = clientDetails?.bookings || []
    const orders = clientDetails?.orders || []
    const notes = clientDetails?.notes || []

    const handleAddNote = () => {
        if (newNote.trim()) {
            addNoteMutation.mutate(newNote)
        }
    }

    if (isLoading) {
        return (
            <Dialog isOpen={isOpen} onClose={onClose} width={900}>
                <div className="flex items-center justify-center py-12">
                    <Loading loading />
                </div>
            </Dialog>
        )
    }

    const totalSpent = orders
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={900}>
            <div className="flex flex-col h-full max-h-[85vh]">
                {/* Заголовок */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h3 className="text-lg font-semibold">Детали клиента</h3>
                </div>
                
                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <Tabs defaultValue="info">
                        <TabList>
                            <TabNav value="info">Информация</TabNav>
                            <TabNav value="bookings">Бронирования</TabNav>
                            <TabNav value="orders">Заказы</TabNav>
                            <TabNav value="notes">Заметки</TabNav>
                        </TabList>
                        
                        <div className="mt-4">
                            <TabContent value="info">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-shrink-0">
                                        <Avatar 
                                            size={100} 
                                            shape="circle" 
                                            src={clientDetails?.client?.avatar || client.img} 
                                        />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h4 className="text-xl font-semibold mb-4">
                                                {clientDetails?.client?.name || client.name}
                                            </h4>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <PiEnvelope className="text-gray-400" />
                                                    <span>{clientDetails?.client?.email || client.email}</span>
                                                </div>
                                                {(clientDetails?.client?.phone || client.phone) && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <PiPhone className="text-gray-400" />
                                                        <span>{clientDetails?.client?.phone || client.phone}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 text-sm">
                                                    <PiCalendar className="text-gray-400" />
                                                    <span>Бронирований: {bookings.length}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-semibold">Потрачено:</span>
                                                    <NumericFormat
                                                        displayType="text"
                                                        value={totalSpent}
                                                        prefix={'₽'}
                                                        thousandSeparator={true}
                                                        className="font-semibold"
                                                    />
                                                </div>
                                                {client.lastVisit && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <PiClock className="text-gray-400" />
                                                        <span>
                                                            Последний визит:{' '}
                                                            {new Date(client.lastVisit).toLocaleDateString('ru-RU')}
                                                        </span>
                                                    </div>
                                                )}
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
                                        bookings.map((booking) => (
                                            <Card key={booking.id} className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="font-semibold mb-1">
                                                            {booking.service?.name || 'Услуга не указана'}
                                                        </div>
                                                        <div className="text-sm text-gray-500 mb-1">
                                                            {booking.booking_date 
                                                                ? new Date(booking.booking_date).toLocaleDateString('ru-RU') 
                                                                : 'Дата не указана'}
                                                            {booking.booking_time && ` в ${booking.booking_time}`}
                                                        </div>
                                                        {booking.specialist && (
                                                            <div className="text-xs text-gray-400">
                                                                Специалист: {booking.specialist.profile?.first_name} {booking.specialist.profile?.last_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-right ml-4">
                                                        <NumericFormat
                                                            displayType="text"
                                                            value={booking.total_price || booking.price || 0}
                                                            prefix={'₽'}
                                                            thousandSeparator={true}
                                                            className="font-semibold"
                                                        />
                                                        <Badge
                                                            className={
                                                                booking.status === 'completed' || booking.status === 'confirmed'
                                                                    ? 'bg-emerald-500 mt-2'
                                                                    : booking.status === 'cancelled'
                                                                    ? 'bg-red-500 mt-2'
                                                                    : 'bg-gray-500 mt-2'
                                                            }
                                                        >
                                                            {booking.status === 'completed' ? 'Завершен' :
                                                             booking.status === 'confirmed' ? 'Подтвержден' :
                                                             booking.status === 'cancelled' ? 'Отменен' :
                                                             booking.status === 'pending' ? 'Ожидает' :
                                                             booking.status || 'Неизвестно'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </TabContent>

                            <TabContent value="orders">
                                <div className="space-y-4">
                                    {orders.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            Нет заказов
                                        </div>
                                    ) : (
                                        orders.map((order) => (
                                            <Card key={order.id} className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-semibold mb-1">
                                                            Заказ #{order.order_number || order.id}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {order.created_at 
                                                                ? new Date(order.created_at).toLocaleDateString('ru-RU') 
                                                                : 'Дата не указана'}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <NumericFormat
                                                            displayType="text"
                                                            value={order.total || 0}
                                                            prefix={'₽'}
                                                            thousandSeparator={true}
                                                            className="font-semibold"
                                                        />
                                                        <Badge
                                                            className={
                                                                order.payment_status === 'paid'
                                                                    ? 'bg-emerald-500 mt-2'
                                                                    : order.status === 'completed'
                                                                    ? 'bg-blue-500 mt-2'
                                                                    : 'bg-gray-500 mt-2'
                                                            }
                                                        >
                                                            {order.payment_status === 'paid' ? 'Оплачен' :
                                                             order.status === 'completed' ? 'Завершен' :
                                                             order.status || 'В обработке'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
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
                                                                Добавлено {new Date(note.createdAt).toLocaleDateString('ru-RU')}
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
            </div>
        </Dialog>
    )
}

export default ClientDetailsModal


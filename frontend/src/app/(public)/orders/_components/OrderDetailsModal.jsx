'use client'
import Dialog from '@/components/ui/Dialog'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { NumericFormat } from 'react-number-format'
import { TbX } from 'react-icons/tb'
import { PiCalendar, PiClock, PiMapPin, PiCreditCard } from 'react-icons/pi'
import classNames from '@/utils/classNames'
import { formatDate, formatDateTime } from '@/utils/dateTime'

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
}

const statusLabels = {
    pending: 'Ожидает',
    confirmed: 'Подтвержден',
    completed: 'Завершен',
    cancelled: 'Отменен',
}

const OrderDetailsModal = ({ isOpen, onClose, order }) => {
    if (!order) return null

    // Mock данные для истории платежей
    const paymentHistory = [
        {
            id: 1,
            date: order.createdAt,
            amount: order.price,
            method: 'Карта',
            status: 'completed',
            transactionId: 'TXN-123456',
        },
    ]

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={800}>
            <div className="flex flex-col h-full max-h-[85vh]">
                {/* Заголовок - зафиксирован сверху */}
                <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Детали заказа</h3>
                    <Button
                        variant="plain"
                        size="sm"
                        icon={<TbX />}
                        onClick={onClose}
                    />
                </div>

                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <Card>
                    <div className="space-y-6">
                        {/* Основная информация */}
                        <div>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h4 className="text-xl font-semibold mb-2">
                                        {order.serviceName}
                                    </h4>
                                    <p className="text-gray-500">{order.businessName}</p>
                                </div>
                                <Badge
                                    className={classNames(
                                        statusColors[order.status],
                                        'ml-2'
                                    )}
                                >
                                    {statusLabels[order.status]}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <PiCalendar className="text-gray-400" />
                                    <div>
                                        <div className="text-xs text-gray-500">Дата</div>
                                        <div className="font-semibold">
                                            {formatDate(order.date, 'America/Los_Angeles', 'short')}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <PiClock className="text-gray-400" />
                                    <div>
                                        <div className="text-xs text-gray-500">Время</div>
                                        <div className="font-semibold">{order.time}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <PiCreditCard className="text-gray-400" />
                                    <div>
                                        <div className="text-xs text-gray-500">Сумма</div>
                                        <div className="font-semibold">
                                            <NumericFormat
                                                displayType="text"
                                                value={order.price}
                                                prefix={'$'}
                                                thousandSeparator={true}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Номер заказа</div>
                                    <div className="font-semibold">#{order.bookingId}</div>
                                </div>
                            </div>
                        </div>

                        {/* История платежей */}
                        <div>
                            <h4 className="mb-4">История платежей</h4>
                            <div className="space-y-3">
                                {paymentHistory.map((payment) => (
                                    <Card key={payment.id} className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-semibold mb-1">
                                                    <NumericFormat
                                                        displayType="text"
                                                        value={payment.amount}
                                                        prefix={'$'}
                                                        thousandSeparator={true}
                                                    />
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {payment.method} • {payment.transactionId}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {formatDateTime(payment.date, null, 'America/Los_Angeles', 'short')}
                                                </div>
                                            </div>
                                            <Badge
                                                className={
                                                    payment.status === 'completed'
                                                        ? 'bg-emerald-500'
                                                        : 'bg-gray-500'
                                                }
                                            >
                                                {payment.status === 'completed'
                                                    ? 'Оплачено'
                                                    : payment.status}
                                            </Badge>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                    </Card>
                </div>
            </div>
        </Dialog>
    )
}

export default OrderDetailsModal


'use client'

import { useState } from 'react'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useQuery } from '@tanstack/react-query'
import { getClientOrders } from '@/lib/api/client'
import { TbFilter, TbSearch, TbCalendar, TbEye, TbClock } from 'react-icons/tb'
import { PiShoppingBag } from 'react-icons/pi'
import Link from 'next/link'
import classNames from '@/utils/classNames'
import DatePicker from '@/components/ui/DatePicker'
import OrderDetailsModal from './_components/OrderDetailsModal'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { CLIENT } from '@/constants/roles.constant'
import Skeleton from '@/components/ui/Skeleton'
import { formatDate as formatDateUS } from '@/utils/dateTime'

// Статусы заказов
const orderStatuses = [
    { value: 'all', label: 'Все статусы' },
    { value: 'pending', label: 'Ожидает подтверждения' },
    { value: 'confirmed', label: 'Подтвержден' },
    { value: 'completed', label: 'Завершен' },
    { value: 'cancelled', label: 'Отменен' },
]

// Цвета статусов
const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
}

// Лейблы статусов
const statusLabels = {
    pending: 'Ожидает',
    confirmed: 'Подтвержден',
    completed: 'Завершен',
    cancelled: 'Отменен',
}

export default function ClientOrdersPage() {
    const [statusFilter, setStatusFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [dateFrom, setDateFrom] = useState(null)
    const [dateTo, setDateTo] = useState(null)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
    
    // Загрузка заказов
    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['client-orders', statusFilter, dateFrom, dateTo],
        queryFn: () => getClientOrders({
            status: statusFilter !== 'all' ? statusFilter : undefined,
            dateFrom: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
            dateTo: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
        }),
    })
    
    // Фильтрация по поисковому запросу
    const filteredOrders = orders.filter((order) => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            order.serviceName.toLowerCase().includes(query) ||
            order.businessName.toLowerCase().includes(query)
        )
    })
    
    // Форматирование даты
    const formatDate = (dateString) => {
        return formatDateUS(dateString, 'America/Los_Angeles', 'long')
    }
    
    // Форматирование времени
    const formatTime = (timeString) => {
        return timeString
    }
    
    // Форматирование цены
    const formatPrice = (price) => {
        return `$${price.toFixed(2)}`
    }
    
    return (
        <ProtectedRoute allowedRoles={[CLIENT]} redirectTo="/sign-in">
            <Container className="pt-20 pb-8 md:pt-24 md:pb-12 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
                    {/* Хлебные крошки */}
                    <div className="mb-4">
                        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Link href="/profile" className="hover:text-primary transition-colors">
                                Профиль
                            </Link>
                            <span>/</span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Мои заказы</span>
                        </nav>
                    </div>
                    
                    {/* Пояснение */}
                    <Card className="mb-4">
                        <div className="p-3 sm:p-4">
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                Здесь отображаются все оплаченные и активные заказы. Для работы с будущими записями используйте раздел «Бронирования».
                            </p>
                        </div>
                    </Card>
                    
                    {/* Фильтры */}
                    <Card>
                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1">
                                        <Input
                                            placeholder="Поиск по услуге или бизнесу..."
                                            prefix={<TbSearch className="text-lg" />}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="md:w-64">
                                        <Select
                                            placeholder="Статус"
                                            options={orderStatuses}
                                            value={orderStatuses.find((s) => s.value === statusFilter)}
                                            onChange={(option) => setStatusFilter(option.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="md:w-64">
                                        <DatePicker
                                            placeholder="Дата от"
                                            value={dateFrom}
                                            onChange={setDateFrom}
                                            inputtable
                                            inputtableBlurClose={false}
                                        />
                                    </div>
                                    <div className="md:w-64">
                                        <DatePicker
                                            placeholder="Дата до"
                                            value={dateTo}
                                            onChange={setDateTo}
                                            inputtable
                                            inputtableBlurClose={false}
                                        />
                                    </div>
                                    {(dateFrom || dateTo) && (
                                        <Button
                                            variant="plain"
                                            onClick={() => {
                                                setDateFrom(null)
                                                setDateTo(null)
                                            }}
                                        >
                                            Сбросить даты
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                    
                    {/* Список заказов */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 gap-4">
                            {Array.from({ length: 3 }).map((_, idx) => (
                                <Card key={idx} className="p-5 sm:p-6">
                                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                                        <div className="flex-1 space-y-3">
                                            <Skeleton variant="block" width="60%" height={24} />
                                            <Skeleton variant="block" width="40%" height={16} />
                                            <div className="flex flex-wrap gap-4">
                                                <Skeleton variant="block" width={120} height={16} />
                                                <Skeleton variant="block" width={80} height={16} />
                                                <Skeleton variant="block" width={100} height={16} />
                                            </div>
                                            <Skeleton variant="block" width="50%" height={14} />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Skeleton variant="block" width={100} height={36} />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <Card>
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="mb-6">
                                    <PiShoppingBag className="text-5xl sm:text-6xl text-gray-300 dark:text-gray-600 mx-auto" />
                                </div>
                                <h4 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                                    {searchQuery || statusFilter !== 'all' || dateFrom || dateTo
                                        ? 'Заказов не найдено'
                                        : 'У вас пока нет заказов'}
                                </h4>
                                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                                    {searchQuery || statusFilter !== 'all' || dateFrom || dateTo
                                        ? 'Попробуйте изменить фильтры или поисковый запрос'
                                        : 'Найдите услуги и сделайте свой первый заказ'}
                                </p>
                                {searchQuery || statusFilter !== 'all' || dateFrom || dateTo ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setSearchQuery('')
                                            setStatusFilter('all')
                                            setDateFrom(null)
                                            setDateTo(null)
                                        }}
                                    >
                                        Сбросить фильтры
                                    </Button>
                                ) : (
                                    <Link href="/services">
                                        <Button variant="solid" size="sm">
                                            Найти услуги
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredOrders.map((order) => (
                                <Card key={order.id} className="hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700">
                                    <div className="p-5 sm:p-6">
                                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                                            {/* Левая часть - информация о заказе */}
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1">
                                                        <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1.5">
                                                            {order.serviceName}
                                                        </h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                                            <PiShoppingBag className="text-base text-gray-400" />
                                                            {order.businessName}
                                                        </p>
                                                        {/* Локация, если есть */}
                                                        {order.city || order.state ? (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                                <TbMapPin className="text-xs" />
                                                                {order.city && order.state ? `${order.city}, ${order.state}` : order.city || order.state}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <Badge
                                                        className={classNames(
                                                            statusColors[order.status],
                                                            'ml-2 shrink-0'
                                                        )}
                                                    >
                                                        {statusLabels[order.status]}
                                                    </Badge>
                                                </div>
                                                
                                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                        <TbCalendar className="text-base text-gray-400 shrink-0" />
                                                        <span className="font-medium">{formatDate(order.date)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                        <TbClock className="text-base text-gray-400 shrink-0" />
                                                        <span>{formatTime(order.time)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-600 dark:text-gray-400">Цена:</span>
                                                        <span className="text-gray-900 dark:text-white font-semibold text-base">
                                                            {formatPrice(order.price)}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                                        <span>Заказ #{order.bookingId}</span>
                                                        <span className="text-gray-300 dark:text-gray-600">•</span>
                                                        <span>Создан {formatDate(order.createdAt)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Правая часть - действия */}
                                            <div className="flex flex-col gap-2 md:items-end pt-2 md:pt-0">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    icon={<TbEye />}
                                                    onClick={() => {
                                                        setSelectedOrder(order)
                                                        setIsDetailsModalOpen(true)
                                                    }}
                                                >
                                                    Детали
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </Container>
            <OrderDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false)
                    setSelectedOrder(null)
                }}
                order={selectedOrder}
            />
        </ProtectedRoute>
    )
}


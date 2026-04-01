'use client'

import { useState } from 'react'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useQuery } from '@tanstack/react-query'
import { getClientOrders } from '@/lib/api/client'
import { TbFilter, TbSearch, TbCalendar, TbEye, TbArrowLeft } from 'react-icons/tb'
import { PiShoppingBag } from 'react-icons/pi'
import Link from 'next/link'
import classNames from '@/utils/classNames'
import DatePicker from '@/components/ui/DatePicker'
import OrderDetailsModal from './_components/OrderDetailsModal'
import { formatCurrency } from '@/utils/formatCurrency'

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
        const date = new Date(dateString)
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
    }
    
    // Форматирование времени
    const formatTime = (timeString) => {
        return timeString
    }
    
    // Форматирование цены с валютой из заказа или дефолтной USD
    const formatPrice = (price, currency = 'USD') => {
        return formatCurrency(price, currency)
    }
    
    return (
        <Container>
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
            
            <div className="flex flex-col gap-4">
                {/* Заголовок */}
                <AdaptiveCard>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link href="/profile">
                                <Button
                                    variant="plain"
                                    size="sm"
                                    icon={<TbArrowLeft />}
                                    className="flex-shrink-0"
                                >
                                    <span className="hidden sm:inline">Назад</span>
                                </Button>
                            </Link>
                            <div>
                                <h3>Мои заказы</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">
                                    История всех ваших заказов и бронирований
                                </p>
                            </div>
                        </div>
                    </div>
                </AdaptiveCard>
                
                {/* Фильтры */}
                <AdaptiveCard>
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
                </AdaptiveCard>
                
                {/* Список заказов */}
                {isLoading ? (
                    <AdaptiveCard>
                        <div className="flex items-center justify-center py-12">
                            <div className="text-gray-500">Загрузка заказов...</div>
                        </div>
                    </AdaptiveCard>
                ) : filteredOrders.length === 0 ? (
                    <AdaptiveCard>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <TbCalendar className="text-4xl text-gray-400 mb-4" />
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Заказов не найдено
                            </h4>
                            <p className="text-gray-500 dark:text-gray-400">
                                {searchQuery || statusFilter !== 'all'
                                    ? 'Попробуйте изменить фильтры'
                                    : 'У вас пока нет заказов'}
                            </p>
                        </div>
                    </AdaptiveCard>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredOrders.map((order) => (
                            <AdaptiveCard key={order.id} className="hover:shadow-md transition-shadow">
                                <div className="flex flex-col md:flex-row md:items-start gap-4">
                                    {/* Левая часть - информация о заказе */}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                                    {order.serviceName}
                                                </h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {order.businessName}
                                                </p>
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
                                        
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <TbCalendar className="text-base" />
                                                <span>{formatDate(order.date)}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">Время:</span>{' '}
                                                {formatTime(order.time)}
                                            </div>
                                            <div>
                                                <span className="font-medium">Цена:</span>{' '}
                                                <span className="text-gray-900 dark:text-white font-semibold">
                                                    {formatPrice(order.price, order.currency)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Правая часть - действия */}
                                    <div className="flex flex-col gap-2 md:items-end">
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            Заказ #{order.bookingId}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatDate(order.createdAt)}
                                        </div>
                                        <Button
                                            variant="plain"
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
                            </AdaptiveCard>
                        ))}
                    </div>
                )}
            </div>
            <OrderDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false)
                    setSelectedOrder(null)
                }}
                order={selectedOrder}
            />
        </Container>
    )
}

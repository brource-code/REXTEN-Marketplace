'use client'

import { useState } from 'react'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClientBookings, cancelBooking, createReview, getPendingReviews } from '@/lib/api/client'
import { TbCalendar, TbClock, TbX, TbMapPin, TbRepeat, TbArrowLeft, TbStar } from 'react-icons/tb'
import ReviewModal from '@/components/reviews/ReviewModal'
import Notification from '@/components/ui/Notification'
import Link from 'next/link'
import classNames from '@/utils/classNames'
import toast from '@/components/ui/toast'
import { HiCheckCircle } from 'react-icons/hi'
import CalendarView from '@/components/shared/CalendarView'
import Card from '@/components/ui/Card'
import dayjs from 'dayjs'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { formatCurrency } from '@/utils/formatCurrency'

// Цвета статусов
const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
}

// Лейблы статусов
const statusLabels = {
    pending: 'Ожидает подтверждения',
    confirmed: 'Подтвержден',
    completed: 'Завершен',
    cancelled: 'Отменен',
}

export default function ClientBookingPage() {
    const [showUpcoming, setShowUpcoming] = useState(true)
    const [showCalendar, setShowCalendar] = useState(false)
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
    const [bookingToCancel, setBookingToCancel] = useState(null)
    const [reviewModal, setReviewModal] = useState({ isOpen: false, booking: null })
    const queryClient = useQueryClient()
    
    // Загрузка бронирований
    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ['client-bookings', showUpcoming],
        queryFn: () => getClientBookings({
            upcoming: showUpcoming,
        }),
    })
    
    // Загрузка ожидающих отзывов для проверки, можно ли оставить отзыв
    const { data: pendingReviews = [] } = useQuery({
        queryKey: ['client-pending-reviews'],
        queryFn: getPendingReviews,
    })
    
    // Мутация для отмены бронирования
    const cancelBookingMutation = useMutation({
        mutationFn: cancelBooking,
        onSuccess: () => {
            // Обновляем список бронирований
            queryClient.invalidateQueries({ queryKey: ['client-bookings'] })
            
            toast.push(
                <div className="flex items-center gap-2">
                    <HiCheckCircle className="text-emerald-500" />
                    <span>Бронирование отменено</span>
                </div>,
                {
                    placement: 'top-center',
                }
            )
            setIsCancelDialogOpen(false)
            setBookingToCancel(null)
        },
        onError: () => {
            toast.push(
                <div className="flex items-center gap-2">
                    <span>Ошибка при отмене бронирования</span>
                </div>,
                {
                    placement: 'top-center',
                    type: 'danger',
                }
            )
        },
    })

    // Мутация для создания отзыва
    const createReviewMutation = useMutation({
        mutationFn: createReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-reviews'] })
            queryClient.invalidateQueries({ queryKey: ['client-pending-reviews'] })
            queryClient.invalidateQueries({ queryKey: ['client-bookings'] })
            setReviewModal({ isOpen: false, booking: null })
            toast.push(
                <Notification type="success" title="Успешно">
                    Отзыв успешно добавлен!
                </Notification>,
                {
                    placement: 'top-end',
                }
            )
        },
        onError: (error) => {
            toast.push(
                <Notification type="error" title="Ошибка">
                    {error?.response?.data?.message || 'Ошибка при создании отзыва'}
                </Notification>,
                {
                    placement: 'top-end',
                }
            )
        },
    })
    
    // Разделение на предстоящие и прошедшие
    const upcomingBookings = bookings.filter(
        (booking) => booking.status !== 'completed' && booking.status !== 'cancelled'
    )
    const pastBookings = bookings.filter(
        (booking) => booking.status === 'completed' || booking.status === 'cancelled'
    )
    
    const displayedBookings = showUpcoming ? upcomingBookings : pastBookings
    
    // Форматирование даты
    const formatDate = (dateString) => {
        const date = new Date(dateString)
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        if (date.toDateString() === today.toDateString()) {
            return 'Сегодня'
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Завтра'
        } else {
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            })
        }
    }
    
    // Форматирование цены с валютой из бронирования или дефолтной USD
    const formatPrice = (price, currency = 'USD') => {
        return formatCurrency(price, currency)
    }
    
    // Можно ли отменить бронирование
    const canCancel = (booking) => {
        return booking.status === 'pending' || booking.status === 'confirmed'
    }
    
    const handleCancel = (bookingId) => {
        setBookingToCancel(bookingId)
        setIsCancelDialogOpen(true)
    }

    const handleOpenReview = (booking) => {
        // Преобразуем booking в формат для ReviewModal
        const reviewOrder = {
            orderId: booking.orderId || null,
            bookingId: booking.id,
            serviceName: booking.serviceName || 'Услуга',
            businessName: booking.businessName || 'Бизнес',
            businessSlug: booking.businessSlug || '',
            date: booking.date || booking.bookingDate || new Date().toISOString(),
            time: booking.time || booking.bookingTime || '',
            price: booking.price || booking.totalPrice || 0,
        }
        setReviewModal({ isOpen: true, booking: reviewOrder })
    }

    const canLeaveReview = (booking) => {
        if (booking.status !== 'completed') return false
        // Проверяем, есть ли этот booking в списке ожидающих отзывов
        return pendingReviews.some(
            (pending) => pending.bookingId === booking.id || pending.orderId === booking.orderId
        )
    }

    const handleConfirmCancel = () => {
        if (bookingToCancel) {
            cancelBookingMutation.mutate(bookingToCancel)
        }
    }
    
    return (
        <>
        <Container>
            {/* Хлебные крошки */}
            <div className="mb-4">
                <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Link href="/profile" className="hover:text-primary transition-colors">
                        Профиль
                    </Link>
                    <span>/</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">Мои бронирования</span>
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
                                <h3>Мои бронирования</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">
                                    Управление активными и будущими записями
                                </p>
                            </div>
                        </div>
                        
                        {/* Переключатель */}
                        <div className="flex gap-2">
                            <Button
                                variant={showUpcoming ? 'solid' : 'plain'}
                                onClick={() => setShowUpcoming(true)}
                            >
                                Предстоящие ({upcomingBookings.length})
                            </Button>
                            <Button
                                variant={!showUpcoming ? 'solid' : 'plain'}
                                onClick={() => setShowUpcoming(false)}
                            >
                                Прошедшие ({pastBookings.length})
                            </Button>
                            <Button
                                variant={showCalendar ? 'solid' : 'plain'}
                                icon={<TbCalendar />}
                                onClick={() => setShowCalendar(!showCalendar)}
                            >
                                Календарь
                            </Button>
                        </div>
                    </div>
                </AdaptiveCard>

                {/* Календарь */}
                {showCalendar && (
                    <AdaptiveCard>
                        <div className="mb-4">
                            <h4>Календарь предстоящих записей</h4>
                            <p className="text-sm text-gray-500 mt-1">
                                Все ваши бронирования на календаре
                            </p>
                        </div>
                        <div className="calendar-wrapper">
                            <CalendarView
                                events={upcomingBookings.map((booking) => ({
                                    id: booking.id.toString(),
                                    title: `${booking.serviceName} - ${booking.businessName}`,
                                    start: `${booking.date}T${booking.time}`,
                                    end: dayjs(`${booking.date}T${booking.time}`)
                                        .add(60, 'minutes')
                                        .toISOString(),
                                    extendedProps: {
                                        eventColor: booking.status === 'confirmed' ? 'orange' : 'orange',
                                        status: booking.status,
                                    },
                                }))}
                            />
                        </div>
                    </AdaptiveCard>
                )}
                
                {/* Список бронирований */}
                {isLoading ? (
                    <AdaptiveCard>
                        <div className="flex items-center justify-center py-12">
                            <div className="text-gray-500">Загрузка бронирований...</div>
                        </div>
                    </AdaptiveCard>
                ) : displayedBookings.length === 0 ? (
                    <AdaptiveCard>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <TbCalendar className="text-4xl text-gray-400 mb-4" />
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {showUpcoming ? 'Нет предстоящих бронирований' : 'Нет прошедших бронирований'}
                            </h4>
                            <p className="text-gray-500 dark:text-gray-400">
                                {showUpcoming
                                    ? 'Запишитесь на услугу, чтобы увидеть её здесь'
                                    : 'Здесь будут отображаться завершенные записи'}
                            </p>
                        </div>
                    </AdaptiveCard>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {displayedBookings.map((booking) => (
                            <AdaptiveCard key={booking.id} className="hover:shadow-md transition-shadow">
                                <div className="flex flex-col md:flex-row md:items-start gap-4">
                                    {/* Левая часть - информация о бронировании */}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                                    {booking.serviceName}
                                                </h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    <TbMapPin className="text-base" />
                                                    {booking.businessName}
                                                </p>
                                            </div>
                                            <Badge
                                                className={classNames(
                                                    statusColors[booking.status],
                                                    'ml-2'
                                                )}
                                            >
                                                {statusLabels[booking.status]}
                                            </Badge>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                                            <div className="flex items-center gap-2">
                                                <TbCalendar className="text-base" />
                                                <span className="font-medium">{formatDate(booking.date)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <TbClock className="text-base" />
                                                <span>{booking.time}</span>
                                            </div>
                                            {booking.specialist && (
                                                <div>
                                                    <span className="font-medium">Мастер:</span>{' '}
                                                    {booking.specialist}
                                                </div>
                                            )}
                                            <div>
                                                <span className="font-medium">Цена:</span>{' '}
                                                <span className="text-gray-900 dark:text-white font-semibold">
                                                    {formatPrice(booking.price, booking.currency)}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {booking.notes && (
                                            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mt-2">
                                                <span className="font-medium">Примечания:</span> {booking.notes}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Правая часть - действия */}
                                    <div className="flex flex-col gap-2 md:items-end">
                                        {canCancel(booking) && (
                                            <Button
                                                variant="plain"
                                                color="red"
                                                size="sm"
                                                icon={<TbX />}
                                                onClick={() => handleCancel(booking.id)}
                                                loading={cancelBookingMutation.isPending}
                                            >
                                                Отменить
                                            </Button>
                                        )}
                                        {booking.status === 'completed' && canLeaveReview(booking) && (
                                            <Button
                                                variant="solid"
                                                size="sm"
                                                icon={<TbStar />}
                                                onClick={() => handleOpenReview(booking)}
                                            >
                                                Оставить отзыв
                                            </Button>
                                        )}
                                        {booking.status === 'completed' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                icon={<TbRepeat />}
                                                onClick={() => {
                                                    window.location.href = `/marketplace/${booking.businessSlug}?service=${booking.serviceName}`
                                                }}
                                            >
                                                Забронировать снова
                                            </Button>
                                        )}
                                        <Button
                                            variant="plain"
                                            size="sm"
                                            onClick={() => {
                                                window.location.href = `/marketplace/${booking.businessSlug}`
                                            }}
                                        >
                                            Перейти к бизнесу
                                        </Button>
                                    </div>
                                </div>
                            </AdaptiveCard>
                        ))}
                    </div>
                )}
            </div>
        </Container>
        
        {/* Модалка для отзыва */}
        {reviewModal.isOpen && reviewModal.booking && (
            <ReviewModal
                isOpen={reviewModal.isOpen}
                onClose={() => setReviewModal({ isOpen: false, booking: null })}
                order={reviewModal.booking}
                onSubmit={(data) => createReviewMutation.mutate(data)}
                isLoading={createReviewMutation.isPending}
            />
        )}

        <ConfirmDialog
            isOpen={isCancelDialogOpen}
            type="warning"
            title="Отменить бронирование?"
            onCancel={() => {
                setIsCancelDialogOpen(false)
                setBookingToCancel(null)
            }}
            onConfirm={handleConfirmCancel}
            confirmText="Отменить"
            cancelText="Нет"
        >
            <p>Вы уверены, что хотите отменить это бронирование?</p>
        </ConfirmDialog>
        </>
    )
}

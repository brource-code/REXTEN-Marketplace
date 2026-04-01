'use client'

import { useState } from 'react'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClientBookings, cancelBooking } from '@/lib/api/client'
import { TbCalendar, TbClock, TbX, TbMapPin, TbRepeat } from 'react-icons/tb'
import Link from 'next/link'
import classNames from '@/utils/classNames'
import toast from '@/components/ui/toast'
import { HiCheckCircle } from 'react-icons/hi'
import CalendarView from '@/components/shared/CalendarView'
import dayjs from 'dayjs'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { CLIENT } from '@/constants/roles.constant'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Skeleton from '@/components/ui/Skeleton'
import { useTranslations } from 'next-intl'
import { formatDateWithRelative, formatTime } from '@/utils/dateTime'

// Цвета статусов
const statusColors = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    confirmed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export default function ClientBookingPage() {
    const t = useTranslations('client.booking')
    const tCommon = useTranslations('common')
    const [showUpcoming, setShowUpcoming] = useState(true)
    const [showCalendar, setShowCalendar] = useState(false)
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
    const [bookingToCancel, setBookingToCancel] = useState(null)
    const queryClient = useQueryClient()
    
    // Лейблы статусов
    const statusLabels = {
        new: tCommon('status.pending'),
        pending: tCommon('status.pending'),
        confirmed: tCommon('status.confirmed'),
        completed: tCommon('status.completed'),
        cancelled: tCommon('status.cancelled'),
    }
    
    // Загружаем предстоящие и прошедшие бронирования отдельно для правильного отображения счетчиков
    const { data: upcomingBookings = [], isLoading: upcomingLoading } = useQuery({
        queryKey: ['client-bookings', true],
        queryFn: () => getClientBookings({ upcoming: true }),
    })
    
    const { data: pastBookings = [], isLoading: pastLoading } = useQuery({
        queryKey: ['client-bookings', false],
        queryFn: () => getClientBookings({ upcoming: false }),
    })
    
    const isLoading = upcomingLoading || pastLoading
    const displayedBookings = showUpcoming ? upcomingBookings : pastBookings
    
    // Мутация для отмены бронирования
    const cancelBookingMutation = useMutation({
        mutationFn: cancelBooking,
        onSuccess: () => {
            // Обновляем список бронирований
            queryClient.invalidateQueries({ queryKey: ['client-bookings'] })
            
            toast.push(
                <div className="flex items-center gap-2">
                    <HiCheckCircle className="text-emerald-500" />
                    <span>{t('bookingCancelled')}</span>
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
                    <span>{t('cancelBookingError')}</span>
                </div>,
                {
                    placement: 'top-center',
                    type: 'danger',
                }
            )
        },
    })
    
    // Используем дефолтную таймзону для клиентских бронирований
    // В будущем можно добавить timezone в API ответы бронирований
    const defaultTimezone = 'America/Los_Angeles'
    
    // Форматирование даты с учетом таймзоны
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        return formatDateWithRelative(dateString, defaultTimezone, {
            today: t('today'),
            tomorrow: t('tomorrow'),
        })
    }
    
    // Форматирование цены
    const formatPrice = (price) => {
        const numericPrice = typeof price === 'number' ? price : (typeof price === 'string' ? parseFloat(price) : 0);
        const finalPrice = isNaN(numericPrice) ? 0 : numericPrice;
        return `$${finalPrice.toFixed(2)}`
    }
    
    // Можно ли отменить бронирование
    const canCancel = (booking) => {
        // Нельзя отменять прошедшие бронирования
        if (!showUpcoming) {
            return false
        }
        // Можно отменять только активные статусы
        return ['new', 'pending', 'confirmed'].includes(booking.status)
    }
    
    const handleCancel = (bookingId) => {
        setBookingToCancel(bookingId)
        setIsCancelDialogOpen(true)
    }

    const handleConfirmCancel = () => {
        if (bookingToCancel) {
            cancelBookingMutation.mutate(bookingToCancel)
        }
    }
    
    return (
        <ProtectedRoute allowedRoles={[CLIENT]} redirectTo="/sign-in">
            <Container className="pt-20 pb-8 md:pt-24 md:pb-12 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
                    {/* Хлебные крошки */}
                    <div className="mb-4">
                        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Link href="/profile" className="hover:text-primary transition-colors">
                                {t('profile')}
                            </Link>
                            <span>/</span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">{t('myBookings')}</span>
                        </nav>
                    </div>
                    
                    {/* Пояснение */}
                    <Card className="mb-4">
                        <div className="p-3 sm:p-4">
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {t('description')}
                            </p>
                        </div>
                    </Card>
                    
                    {/* Переключатель */}
                    <Card>
                        <div className="p-4 sm:p-6">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant={showUpcoming ? 'solid' : 'plain'}
                                    size="sm"
                                    onClick={() => setShowUpcoming(true)}
                                >
                                    {t('upcoming')} ({upcomingBookings.length})
                                </Button>
                                <Button
                                    variant={!showUpcoming ? 'solid' : 'plain'}
                                    size="sm"
                                    onClick={() => setShowUpcoming(false)}
                                >
                                    {t('past')} ({pastBookings.length})
                                </Button>
                                <Button
                                    variant={showCalendar ? 'solid' : 'plain'}
                                    size="sm"
                                    icon={<TbCalendar />}
                                    onClick={() => setShowCalendar(!showCalendar)}
                                >
                                    {t('calendar')}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Календарь */}
                    {showCalendar && (
                        <Card>
                            <div className="p-4 sm:p-6">
                                <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {t('calendarTitle')}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {t('calendarDescription')}
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
                            </div>
                        </Card>
                    )}
                    
                    {/* Список бронирований */}
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
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Skeleton variant="block" width={100} height={36} />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : displayedBookings.length === 0 ? (
                        <Card>
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="mb-6">
                                    <TbCalendar className="text-5xl sm:text-6xl text-gray-300 dark:text-gray-600 mx-auto" />
                                </div>
                                <h4 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                                    {showUpcoming ? t('noUpcomingBookings') : t('noPastBookings')}
                                </h4>
                                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                                    {showUpcoming
                                        ? t('noUpcomingBookingsDescription')
                                        : t('noPastBookingsDescription')}
                                </p>
                                {showUpcoming && (
                                    <Link href="/services">
                                        <Button variant="solid" size="sm">
                                            {t('findServices')}
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {displayedBookings.map((booking) => (
                                <Card key={booking.id} className="hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700">
                                    <div className="p-5 sm:p-6">
                                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                                            {/* Левая часть - информация о бронировании */}
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1">
                                                        <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1.5">
                                                            {booking.serviceName}
                                                        </h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                                            <TbMapPin className="text-base text-gray-400 shrink-0" />
                                                            {booking.businessName}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={classNames(
                                                            'text-xs font-medium px-2.5 py-1 rounded-full',
                                                            statusColors[booking.status],
                                                            'ml-2 shrink-0'
                                                        )}
                                                    >
                                                        {statusLabels[booking.status]}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                        <TbCalendar className="text-base text-gray-400 shrink-0" />
                                                        <span className="font-medium">{formatDate(booking.date)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                        <TbClock className="text-base text-gray-400 shrink-0" />
                                                        <span>{formatTime(booking.time, defaultTimezone)}</span>
                                                    </div>
                                                    {booking.specialist && (
                                                        <div className="text-gray-600 dark:text-gray-400">
                                                            <span className="font-medium">{t('master')}:</span>{' '}
                                                            <span>{booking.specialist}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-gray-600 dark:text-gray-400">{tCommon('labels.price')}:</span>
                                                            <span className="text-gray-900 dark:text-white font-semibold text-base">
                                                                {formatPrice(booking.total_price || booking.price)}
                                                            </span>
                                                            {booking.total_price && booking.total_price !== booking.price && !Number(booking.discount_amount) && (
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    ({t('basePrice')}: {formatPrice(booking.price)})
                                                                </span>
                                                            )}
                                                        </div>
                                                        {Number(booking.discount_amount) > 0 && (
                                                            <div className="text-sm space-y-0.5 pl-0">
                                                                <div className="flex justify-between gap-4 max-w-md">
                                                                    <span className="text-gray-600 dark:text-gray-400">{t('subtotalBeforeDiscount')}</span>
                                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                                        {formatPrice(
                                                                            Number(booking.discount_amount) +
                                                                                Number(booking.total_price || booking.price),
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between gap-4 max-w-md">
                                                                    <span className="text-gray-600 dark:text-gray-400">
                                                                        {booking.discount_source === 'promo_code' && booking.promo_code
                                                                            ? t('discountDetailPromo', { code: booking.promo_code })
                                                                            : booking.discount_source === 'loyalty_tier' && booking.discount_tier_name
                                                                              ? t('discountDetailLoyalty', { tier: booking.discount_tier_name })
                                                                              : t('discount')}
                                                                    </span>
                                                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                                                        −{formatPrice(booking.discount_amount)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Дополнительные услуги */}
                                                {booking.additional_services && booking.additional_services.length > 0 && (
                                                    <div className="mt-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            {t('additionalServices')}:
                                                        </div>
                                                        <div className="space-y-2">
                                                            {booking.additional_services.map((item, index) => {
                                                                const service = item.additional_service || item;
                                                                const price = parseFloat(item.pivot?.price || service.price || item.price || 0);
                                                                const quantity = parseInt(item.pivot?.quantity || item.quantity || 1);
                                                                const total = price * quantity;

                                                                return (
                                                                    <div key={item.id || index} className="flex justify-between items-start text-sm">
                                                                        <div className="flex-1">
                                                                            <div className="font-medium text-gray-900 dark:text-white">
                                                                                {service.name || item.name}
                                                                            </div>
                                                                            {service.description && (
                                                                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                                                                    {service.description}
                                                                                </div>
                                                                            )}
                                                                            {quantity > 1 && (
                                                                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                                                                    {t('quantity')}: {quantity} × {formatPrice(price)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-right ml-4">
                                                                            <div className="font-semibold text-gray-900 dark:text-white">
                                                                                {formatPrice(total)}
                                                                            </div>
                                                                            {quantity > 1 && (
                                                                                <div className="text-xs text-gray-500 dark:text-gray-500">
                                                                                    {formatPrice(price)} {t('perItem')}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {booking.total_price && booking.total_price !== booking.price && (
                                                            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                    {t('totalAdditionalServices')}:
                                                                </span>
                                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                    {formatPrice((booking.total_price || booking.price) - booking.price)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {booking.notes && (
                                                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700 mt-3">
                                                        <span className="font-medium text-gray-700 dark:text-gray-300">{tCommon('labels.notes')}:</span>{' '}
                                                        <span>{booking.notes}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Правая часть - действия */}
                                            <div className="flex flex-col gap-2 md:items-end pt-2 md:pt-0">
                                                {canCancel(booking) && (
                                                    <Button
                                                        variant="outline"
                                                        color="red"
                                                        size="sm"
                                                        icon={<TbX />}
                                                        onClick={() => handleCancel(booking.id)}
                                                        loading={cancelBookingMutation.isPending}
                                                    >
                                                        {t('cancel')}
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
                                                        {t('bookAgain')}
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        window.location.href = `/marketplace/${booking.businessSlug}`
                                                    }}
                                                >
                                                    {t('goToBusiness')}
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
            <ConfirmDialog
                isOpen={isCancelDialogOpen}
                type="warning"
                title={t('cancelBookingTitle')}
                onCancel={() => {
                    setIsCancelDialogOpen(false)
                    setBookingToCancel(null)
                }}
                onConfirm={handleConfirmCancel}
                confirmText={t('cancel')}
                cancelText={tCommon('buttons.no')}
            >
                <p>{t('cancelBookingConfirm')}</p>
            </ConfirmDialog>
        </ProtectedRoute>
    )
}


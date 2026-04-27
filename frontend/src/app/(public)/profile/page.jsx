'use client'

import { useState, useMemo } from 'react'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Switcher from '@/components/ui/Switcher'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useCurrentUser } from '@/hooks/api/useAuth'
import { useUserStore } from '@/store'
import { CLIENT } from '@/constants/roles.constant'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/dateTime'
import { CLIENT_DEFAULT_TIMEZONE, resolveClientBookingTimezone } from '@/constants/client-datetime.constant'
import {
    getClientReviews,
    getPendingReviews,
    createReview,
    getFavoriteServices,
    getFavoriteAdvertisements,
    getFavoriteBusinesses,
    getClientDiscounts,
    getClientBonuses,
    applyDiscount,
    applyBonus,
    getNotificationSettings,
    updateNotificationSettings,
    getClientBookings,
    getClientLoyaltyProgress,
    removeFromFavorites,
} from '@/lib/api/client'
import {
    PiUser,
    PiStarFill,
    PiStar,
    PiHeart,
    PiHeartFill,
    PiBell,
    PiGear,
    PiMapPinFill,
    PiCalendar,
    PiTrash,
    PiCheck,
    PiEnvelope,
    PiPaperPlaneTilt,
    PiTicket,
    PiGift,
    PiCopy,
} from 'react-icons/pi'
import { TbSettings } from 'react-icons/tb'
import Link from 'next/link'
import Image from 'next/image'
import { normalizeImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils'
import { NumericFormat } from 'react-number-format'
import classNames from '@/utils/classNames'
import Loading from '@/components/shared/Loading'
import LoyaltyProgramBlock from '@/components/loyalty/LoyaltyProgramBlock'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ReviewModal from '@/components/reviews/ReviewModal'
import { useTranslations } from 'next-intl'

const { TabNav, TabList, TabContent } = Tabs

// Компонент профиля — двухколоночный layout с мини-картами статистики
const ProfileHeader = ({ user, bookingsCount, favoritesCount }) => {
    const t = useTranslations('public.profile')
    const avatarUrl = user?.avatar || user?.image
    const fullName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()

    return (
        <div className="flex flex-col gap-4">
            {/* Основная карточка профиля */}
            <Card>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Аватар */}
                    <Avatar
                        src={avatarUrl}
                        alt={fullName || 'User'}
                        size={72}
                        shape="circle"
                        icon={<PiUser />}
                    />
                    
                    {/* Информация */}
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                            {fullName || t('user')}
                        </h4>
                        {user?.email && (
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                {user.email}
                            </p>
                        )}
                        {user?.city && user?.state ? (
                            <div className="flex items-center gap-1.5 mt-1.5 text-sm font-bold text-gray-500 dark:text-gray-400">
                                <PiMapPinFill size={14} className="shrink-0" />
                                <span className="truncate">{user.city}, {user.state}</span>
                            </div>
                        ) : (
                            <Link
                                href="/profile/settings"
                                className="inline-flex items-center gap-1.5 mt-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                <PiMapPinFill size={14} />
                                {t('setLocation')}
                            </Link>
                        )}
                    </div>

                    {/* Кнопки действий */}
                    <div className="flex gap-2 shrink-0">
                        <Link href="/booking">
                            <Button variant="outline" size="sm" icon={<PiCalendar />}>
                                <span className="hidden sm:inline">{t('bookings')}</span>
                                <span className="sm:hidden">{t('bookingsShort')}</span>
                            </Button>
                        </Link>
                        <Link href="/profile/settings">
                            <Button variant="outline" size="sm" icon={<TbSettings />}>
                                {t('settings')}
                            </Button>
                        </Link>
                    </div>
                </div>
            </Card>

            {/* Статистика — мини-карточки как в BusinessStats */}
            <div className="grid grid-cols-2 gap-3">
                <Card>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                {t('bookings')}
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {bookingsCount || 0}
                            </div>
                        </div>
                        <div className="flex items-center justify-center w-11 h-11 rounded-lg shrink-0 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                            <PiCalendar className="text-2xl" />
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                {t('favorites')}
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {favoritesCount || 0}
                            </div>
                        </div>
                        <div className="flex items-center justify-center w-11 h-11 rounded-lg shrink-0 bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400">
                            <PiHeart className="text-2xl" />
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}

// Компонент бронирований
const BookingsTab = () => {
    const t = useTranslations('public.profile')
    // Загружаем только предстоящие бронирования для профиля
    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ['client-bookings', true],
        queryFn: () => getClientBookings({ upcoming: true }),
    })

    if (isLoading) {
        return (
            <div className="min-h-[320px] flex items-center justify-center">
                <Loading loading />
            </div>
        )
    }

    if (bookings.length === 0) {
        return (
            <div className="p-4 sm:p-4 text-center min-h-[320px] flex flex-col items-center justify-center w-full">
                <PiCalendar className="text-3xl sm:text-4xl text-gray-400 mx-auto mb-3 sm:mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {t('noBookings')}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {t('noBookingsDescription')}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Link href="/services">
                        <Button variant="outline" size="sm">
                            {t('findServices')}
                        </Button>
                    </Link>
                    <Link href="/booking">
                        <Button variant="outline" size="sm">
                            {t('allBookings')}
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-3 sm:space-y-4 w-full">
            {bookings.length > 0 && (
                <>
                {bookings.slice(0, 5).map((booking) => {
                    // Рассчитываем стоимость дополнительных услуг
                    const additionalServices = booking.additional_services || []
                    const additionalTotal = additionalServices.reduce((sum, item) => {
                        const price = parseFloat(item.pivot?.price || item.price || 0)
                        const quantity = parseInt(item.pivot?.quantity || item.quantity || 1)
                        return sum + price * quantity
                    }, 0)
                    
                    // Общая стоимость = цена услуги + дополнительные услуги
                    const basePrice = parseFloat(booking.price || 0)
                    const totalPrice = booking.total_price || (basePrice + additionalTotal)
                    
                    return (
                        <Card key={booking.id} className="p-4 sm:p-4 hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                                        {booking.serviceName}
                                    </h4>
                                    {booking.businessSlug ? (
                                        <Link 
                                            href={`/marketplace/${booking.businessSlug}`}
                                            className="text-sm text-gray-500 dark:text-gray-400 mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-block"
                                        >
                                            {booking.businessName}
                                        </Link>
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                            {booking.businessName}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        <span>
                                            {booking.date
                                                ? formatDate(
                                                      booking.date,
                                                      resolveClientBookingTimezone(booking),
                                                      'long',
                                                  )
                                                : t('notAvailable')}
                                        </span>
                                        <span>•</span>
                                        <span>{booking.time}</span>
                                        {booking.specialist && (
                                            <>
                                                <span>•</span>
                                                <span>{t('master')}: {booking.specialist}</span>
                                            </>
                                        )}
                                    </div>
                                    
                                    {/* Итого */}
                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2">
                                            {/* Базовая стоимость услуги */}
                                            {basePrice > 0 && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-700 dark:text-gray-300">
                                                        {t('baseServicePrice')}
                                                    </span>
                                                    <span className="font-semibold text-gray-900 dark:text-white">
                                                        {formatCurrency(basePrice, booking.currency || 'USD')}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {/* Дополнительные услуги */}
                                            {additionalServices.length > 0 && (
                                                <>
                                                    {additionalServices.map((addService, idx) => {
                                                        const service = addService
                                                        const price = parseFloat(addService.pivot?.price || addService.price || 0)
                                                        const quantity = parseInt(addService.pivot?.quantity || addService.quantity || 1)
                                                        const itemTotal = price * quantity
                                                        
                                                        return (
                                                            <div key={addService.id || idx} className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-700 dark:text-gray-300">
                                                                    {service.name} × {quantity}
                                                                </span>
                                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                                    {formatCurrency(itemTotal, booking.currency || 'USD')}
                                                                </span>
                                                            </div>
                                                        )
                                                    })}
                                                </>
                                            )}

                                            {Number(booking.discount_amount) > 0 && (() => {
                                                const subtotalBeforeDiscount =
                                                    Number(booking.discount_amount) + Number(booking.total_price ?? totalPrice)
                                                const hasAdditionalServices = additionalServices.length > 0
                                                const subtotalDiffersFromBase =
                                                    Math.abs(subtotalBeforeDiscount - basePrice) > 0.01
                                                const showSubtotal = hasAdditionalServices || subtotalDiffersFromBase

                                                return (
                                                    <>
                                                        {showSubtotal && (
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-700 dark:text-gray-300">
                                                                    {t('subtotalBeforeDiscount')}
                                                                </span>
                                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                                    {formatCurrency(subtotalBeforeDiscount, booking.currency || 'USD')}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-gray-700 dark:text-gray-300">
                                                                {booking.discount_source === 'promo_code' &&
                                                                booking.promo_code
                                                                    ? t('discountDetailPromo', {
                                                                          code: booking.promo_code,
                                                                      })
                                                                    : booking.discount_source === 'loyalty_tier' &&
                                                                        booking.discount_tier_name
                                                                      ? t('discountDetailLoyalty', {
                                                                            tier: booking.discount_tier_name,
                                                                        })
                                                                      : t('discount')}
                                                            </span>
                                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                                −
                                                                {formatCurrency(
                                                                    Number(booking.discount_amount),
                                                                    booking.currency || 'USD',
                                                                )}
                                                            </span>
                                                        </div>
                                                    </>
                                                )
                                            })()}
                                            
                                            {/* Итого общий */}
                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 flex justify-between items-center">
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('total')}:</span>
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {formatCurrency(totalPrice, booking.currency || 'USD')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={classNames(
                                            'text-xs font-medium px-2.5 py-1 rounded-full',
                                            booking.status === 'new' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                                            booking.status === 'pending' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
                                            booking.status === 'confirmed' && 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
                                            booking.status === 'completed' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
                                            booking.status === 'cancelled' && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                                        )}
                                    >
                                        {t(`bookingStatus.${['new', 'pending', 'confirmed', 'completed', 'cancelled'].includes(booking.status) ? booking.status : 'pending'}`)}
                                    </span>
                                    <Link href="/booking">
                                        <Button variant="plain" size="sm">
                                            {t('detailsCta')}
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    )
                })}
                </>
            )}
            {bookings.length > 5 && (
                <div className="text-center pt-2">
                    <Link href="/booking">
                        <Button variant="outline" size="sm">
                            {t('showAllBookings', { count: bookings.length })}
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    )
}

// Компонент отзывов
const ReviewsTab = () => {
    const t = useTranslations('public.profile')
    const tCommon = useTranslations('common')
    const queryClient = useQueryClient()
    const [reviewModal, setReviewModal] = useState({ isOpen: false, order: null })

    // Загрузка ожидающих отзывов
    const { data: pendingReviews = [], isLoading: pendingLoading } = useQuery({
        queryKey: ['client-pending-reviews'],
        queryFn: getPendingReviews,
    })

    // Загрузка готовых отзывов
    const { data: completedReviews = [], isLoading: completedLoading } = useQuery({
        queryKey: ['client-reviews'],
        queryFn: getClientReviews,
    })

    // Мутация для создания отзыва
    const createReviewMutation = useMutation({
        mutationFn: createReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-reviews'] })
            queryClient.invalidateQueries({ queryKey: ['client-pending-reviews'] })
            setReviewModal({ isOpen: false, order: null })
            toast.push(
                <Notification type="success" title={tCommon('messages.success')}>
                    {t('reviewAdded')}
                </Notification>,
                {
                    placement: 'top-end',
                }
            )
        },
        onError: (error) => {
            toast.push(
                <Notification type="error" title={tCommon('messages.error')}>
                    {t('reviewError')}
                </Notification>,
                {
                    placement: 'top-end',
                }
            )
        },
    })

    const isLoading = pendingLoading || completedLoading

    if (isLoading) {
        return (
            <div className="min-h-[320px] flex items-center justify-center">
                <Loading loading />
            </div>
        )
    }

    const hasPending = pendingReviews.length > 0
    const hasCompleted = completedReviews.length > 0

    if (!hasPending && !hasCompleted) {
        return (
            <div className="p-4 sm:p-4 text-center min-h-[320px] flex flex-col items-center justify-center w-full">
                <PiStar className="text-3xl sm:text-4xl text-gray-400 mx-auto mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-gray-500">{t('reviewsEmptyTitle')}</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-2">
                    {t('reviewsEmptyHint')}
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4 min-h-[320px] w-full">
            {/* Ожидающие отзывы */}
            {hasPending && (
                <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        {t('pendingReviews')}
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500 dark:bg-yellow-600 text-white">
                            {pendingReviews.length}
                        </span>
                    </h3>
                    <div className="space-y-3">
                        {pendingReviews.map((order) => (
                            <Card key={order.id} className="p-4 sm:p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className="flex-1 min-w-0">
                                                <Link
                                                    href={`/marketplace/${order.businessSlug}`}
                                                    className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white hover:text-primary block mb-1"
                                                >
                                                    {order.businessName}
                                                </Link>
                                                <p className="text-xs sm:text-sm text-gray-500 mb-2">
                                                    {order.serviceName}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-500">
                                                    <span>
                                                    {formatDate(
                                                        order.date,
                                                        resolveClientBookingTimezone(order),
                                                        'short',
                                                    )}
                                                </span>
                                                    <span>•</span>
                                                    <span>{order.time}</span>
                                                    <span>•</span>
                                                    <span className="font-semibold text-gray-900 dark:text-white">
                                                        <NumericFormat
                                                            displayType="text"
                                                            value={order.price}
                                                            prefix="$"
                                                            thousandSeparator={true}
                                                        />
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="solid"
                                        size="sm"
                                        onClick={() => setReviewModal({ isOpen: true, order })}
                                        className="flex-shrink-0"
                                    >
                                        {t('leaveReview')}
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Готовые отзывы */}
            <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        {t('myReviews')}
                        {hasCompleted && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500 dark:bg-blue-600 text-white">
                                {completedReviews.length}
                            </span>
                        )}
                    </h3>
                {!hasCompleted ? (
                    <div className="p-4 sm:p-12 text-center">
                        <PiStar className="text-3xl sm:text-4xl text-gray-400 mx-auto mb-3 sm:mb-4" />
                        <p className="text-sm sm:text-base text-gray-500">{t('noReviews')}</p>
                    </div>
                ) : (
                    <div className="space-y-3 sm:space-y-4">
                        {completedReviews.map((review) => (
                            <Card key={review.id} className="p-4 sm:p-4">
                                <div className="flex items-start gap-3 sm:gap-4">
                                    <Avatar
                                        src={review.businessAvatar}
                                        size={40}
                                        shape="circle"
                                        className="flex-shrink-0 sm:w-[50px] sm:h-[50px]"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-2">
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/marketplace/${review.businessSlug}`}
                                                    className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white hover:text-primary truncate block"
                                                >
                                                    {review.businessName}
                                                </Link>
                                                <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                                                    {review.serviceName}
                                                </p>
                                                {review.specialistName && (
                                                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                                                        {t('specialist')}: {review.specialistName}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {[...Array(5)].map((_, i) => (
                                                    <PiStarFill
                                                        key={i}
                                                        className={classNames(
                                                            'text-sm sm:text-lg',
                                                            i < review.rating
                                                                ? 'text-yellow-400'
                                                                : 'text-gray-300 dark:text-gray-600'
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                                            {review.comment}
                                        </p>
                                        {review.response && (
                                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                                    {t('businessResponse', { name: review.businessName })}
                                                </p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                                    {review.response}
                                                </p>
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-400 mt-2">
                                            {formatDate(review.createdAt, CLIENT_DEFAULT_TIMEZONE, 'long')}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Модалка для отзыва */}
            {reviewModal.isOpen && reviewModal.order && (
                <ReviewModal
                    isOpen={reviewModal.isOpen}
                    onClose={() => setReviewModal({ isOpen: false, order: null })}
                    order={reviewModal.order}
                    onSubmit={(data) => createReviewMutation.mutate(data)}
                    isLoading={createReviewMutation.isPending}
                />
            )}
        </div>
    )
}

// Компонент избранного (сервисы, объявления и бизнесы)
const FavoritesTab = () => {
    const t = useTranslations('public.profile')
    const tCommon = useTranslations('common')
    const queryClient = useQueryClient()

    const { data: services = [], isLoading: servicesLoading } = useQuery({
        queryKey: ['client-favorite-services'],
        queryFn: getFavoriteServices,
    })

    const { data: advertisements = [], isLoading: advertisementsLoading } = useQuery({
        queryKey: ['client-favorite-advertisements'],
        queryFn: getFavoriteAdvertisements,
    })

    const { data: businesses = [], isLoading: businessesLoading } = useQuery({
        queryKey: ['client-favorite-businesses'],
        queryFn: getFavoriteBusinesses,
    })

    const removeFavoriteMutation = useMutation({
        mutationFn: ({ type, id }) => 
            removeFromFavorites(type, id),
        onSuccess: (_, variables) => {
            // Обновляем соответствующий кэш в зависимости от типа
            if (variables.type === 'service') {
                queryClient.invalidateQueries({ queryKey: ['client-favorite-services'] })
            } else if (variables.type === 'advertisement') {
                queryClient.invalidateQueries({ queryKey: ['client-favorite-advertisements'] })
            } else if (variables.type === 'business') {
                queryClient.invalidateQueries({ queryKey: ['client-favorite-businesses'] })
            }
            toast.push({
                title: tCommon('messages.success'),
                message: t('removedFromFavorites'),
                type: 'success',
            })
        },
        onError: (error) => {
            toast.push({
                title: tCommon('messages.error'),
                message: error?.response?.data?.message || t('removeFromFavoritesError'),
                type: 'danger',
            })
        },
    })

    // Дедупликация по serviceId для услуг, по id для бизнесов
    const finalServices = useMemo(() => {
        const map = new Map()
        services.forEach((service) => {
            // Используем serviceId как основной ключ, если он есть
            // Это гарантирует, что мы не показываем дубликаты одной и той же услуги
            const key = service.serviceId || service.id
            if (key && !map.has(key)) {
                map.set(key, service)
            } else if (key && map.has(key)) {
                // Если уже есть запись с таким ключом, логируем для отладки
                console.warn('Duplicate favorite service found:', {
                    existing: map.get(key),
                    duplicate: service,
                    key: key
                })
            }
        })
        return Array.from(map.values())
    }, [services])

    const finalBusinesses = useMemo(() => {
        const map = new Map()
        businesses.forEach((business) => {
            if (!map.has(business.id)) {
                map.set(business.id, business)
            }
        })
        return Array.from(map.values())
    }, [businesses])

    // Дедупликация объявлений
    const finalAdvertisements = useMemo(() => {
        const map = new Map()
        advertisements.forEach((ad) => {
            // Используем advertisementId или id как ключ
            const key = ad.advertisementId || ad.id
            if (key && !map.has(key)) {
                map.set(key, ad)
            }
        })
        return Array.from(map.values())
    }, [advertisements])

    const isLoading = servicesLoading || advertisementsLoading || businessesLoading
    const hasFavorites = finalServices.length > 0 || finalAdvertisements.length > 0 || finalBusinesses.length > 0

    const handleRemoveFavorite = (e, type, id) => {
        e.preventDefault()
        e.stopPropagation()
        removeFavoriteMutation.mutate({ type, id })
    }

    // Показываем загрузку, но сохраняем структуру для предотвращения дергания
    if (isLoading) {
        return (
            <div className="min-h-[320px] flex items-center justify-center">
                <Loading loading />
            </div>
        )
    }

    if (!hasFavorites) {
        return (
            <div className="p-4 sm:p-4 text-center min-h-[320px] flex flex-col items-center justify-center w-full">
                <PiHeart className="text-3xl sm:text-4xl text-gray-400 mx-auto mb-3 sm:mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {t('noFavorites')}
                </h4>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4">
                    {t('noFavoritesDescription')}
                </p>
                <Link href="/services">
                    <Button variant="outline" size="sm" className="mt-2 sm:mt-4">
                        {t('findServices')}
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-4 min-h-[320px] w-full">
            {/* Избранные сервисы */}
            {finalServices.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4">{t('favoriteServices')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {finalServices.map((service) => {
                            const serviceSlug = service.serviceSlug || service.businessSlug || ''
                            const serviceUrl = serviceSlug ? `/marketplace/${serviceSlug}` : `/services`
                            const imageUrl = service.image || (service.businessImage || null)
                            const normalizedImageUrl = imageUrl ? normalizeImageUrl(imageUrl) : null
                            
                            return (
                                <Card key={`service-${service.serviceId || service.id}`} className="p-0 overflow-hidden group hover:shadow-lg transition-shadow">
                                    <Link href={serviceUrl} className="block">
                                        <div className="relative h-48 sm:h-56 bg-gray-100 dark:bg-gray-800">
                                            {normalizedImageUrl ? (
                                                <Image
                                                    src={normalizedImageUrl}
                                                    alt={service.serviceName || t('altServiceImage')}
                                                    fill
                                                    className="object-cover"
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    <PiCalendar className="text-4xl text-gray-400" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 z-10">
                                                <Button
                                                    variant="plain"
                                                    size="sm"
                                                    className="bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-sm"
                                                    icon={<PiHeartFill className="text-red-500" />}
                                                    onClick={(e) => handleRemoveFavorite(e, 'service', service.serviceId || service.id)}
                                                    disabled={removeFavoriteMutation.isPending}
                                                />
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            {/* Категория */}
                                            {service.category && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                    {service.category}
                                                </p>
                                            )}
                                            
                                            {/* Название услуги */}
                                            <h4 className="font-semibold text-base text-gray-900 dark:text-white mb-1 line-clamp-1">
                                                {service.serviceName || t('altServiceImage')}
                                            </h4>
                                            
                                            {/* Название бизнеса */}
                                            {service.businessName && service.businessName !== 'N/A' && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
                                                    {service.businessName}
                                                </p>
                                            )}
                                            
                                            {/* Описание */}
                                            {service.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                                                    {service.description}
                                                </p>
                                            )}
                                            
                                            {/* Локация */}
                                            {(service.city || service.state) && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">
                                                    <PiMapPinFill className="text-xs" />
                                                    {service.city && service.state ? `${service.city}, ${service.state}` : service.city || service.state}
                                                </p>
                                            )}
                                            
                                            {/* Рейтинг и цена */}
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                                                {/* Показываем рейтинг только если он есть и больше 0 */}
                                                {service.rating !== null && service.rating !== undefined && service.rating > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        <PiStarFill className="text-yellow-400 text-sm" />
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {service.rating.toFixed(1)}
                                                        </span>
                                                        {service.reviewsCount !== undefined && service.reviewsCount > 0 && (
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                ({service.reviewsCount})
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div></div> // Пустой div для выравнивания
                                                )}
                                                {service.priceLabel && (
                                                    <span className="text-base font-semibold text-gray-900 dark:text-white">
                                                        {service.priceLabel}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Избранные объявления */}
            {finalAdvertisements.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4">{t('favoriteAdvertisements')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {finalAdvertisements.map((ad) => {
                            const adId = ad.advertisementId || ad.id
                            // Используем slug из link объявления, если есть
                            // Приоритет: slug > advertisementSlug > link (без префикса) > fallback
                            let adSlug = ad.slug || ad.advertisementSlug || ''
                            
                            // Если есть link, извлекаем slug из него
                            if (!adSlug && ad.link) {
                                // Убираем префикс /marketplace/ если есть
                                adSlug = ad.link.replace(/^\/marketplace\//, '').replace(/^marketplace\//, '')
                                // Убираем ведущий слеш
                                adSlug = adSlug.trim().replace(/^\//, '')
                                // Если это полный URL, извлекаем только путь
                                if (adSlug.startsWith('http://') || adSlug.startsWith('https://')) {
                                    try {
                                        const url = new URL(adSlug)
                                        adSlug = url.pathname.replace(/^\//, '')
                                    } catch {
                                        // Если не удалось распарсить URL, используем как есть
                                    }
                                }
                            }
                            
                            // Fallback: если slug все еще пустой, используем формат ad_ID
                            if (!adSlug) {
                                adSlug = `ad_${adId}`
                            }
                            
                            const adUrl = `/marketplace/${adSlug}`
                            const imageUrl = ad.image || ad.imageUrl || null
                            const normalizedImageUrl = imageUrl ? normalizeImageUrl(imageUrl) : null
                            
                            return (
                                <Card key={`advertisement-${adId}`} className="p-0 overflow-hidden group hover:shadow-lg transition-shadow">
                                    <Link href={adUrl} className="block">
                                        <div className="relative h-48 sm:h-56 bg-gray-100 dark:bg-gray-800">
                                            {normalizedImageUrl ? (
                                                <Image
                                                    src={normalizedImageUrl}
                                                    alt={ad.title || ad.name || ad.advertisementName || t('altAdvertisementImage')}
                                                    fill
                                                    className="object-cover"
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                    onError={(e) => {
                                                        // Заменяем битое изображение на fallback
                                                        e.target.src = FALLBACK_IMAGE
                                                        e.target.onerror = null
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    <PiCalendar className="text-4xl text-gray-400" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 z-10">
                                                <Button
                                                    variant="plain"
                                                    size="sm"
                                                    className="bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-sm"
                                                    icon={<PiHeartFill className="text-red-500" />}
                                                    onClick={(e) => handleRemoveFavorite(e, 'advertisement', adId)}
                                                    disabled={removeFavoriteMutation.isPending}
                                                />
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            {/* Категория */}
                                            {ad.category && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                    {ad.category}
                                                </p>
                                            )}
                                            
                                            {/* Название объявления */}
                                            <h4 className="font-semibold text-base text-gray-900 dark:text-white mb-1 line-clamp-1">
                                                {ad.title || ad.name || ad.advertisementName || t('altAdvertisementImage')}
                                            </h4>
                                            
                                            {/* Название бизнеса */}
                                            {ad.businessName && ad.businessName !== 'N/A' && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
                                                    {ad.businessName}
                                                </p>
                                            )}
                                            
                                            {/* Описание */}
                                            {ad.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                                                    {ad.description}
                                                </p>
                                            )}
                                            
                                            {/* Локация */}
                                            {(ad.city || ad.state) && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">
                                                    <PiMapPinFill className="text-xs" />
                                                    {ad.city && ad.state ? `${ad.city}, ${ad.state}` : ad.city || ad.state}
                                                </p>
                                            )}
                                            
                                            {/* Рейтинг и цена */}
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                                                {/* Показываем рейтинг только если он есть и больше 0 */}
                                                {ad.rating !== null && ad.rating !== undefined && ad.rating > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <PiStarFill className="text-yellow-400 text-sm" />
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {ad.rating.toFixed(1)}
                                                        </span>
                                                        {ad.reviewsCount !== undefined && ad.reviewsCount > 0 && (
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                ({ad.reviewsCount})
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {ad.priceLabel && (
                                                    <span className={`text-base font-semibold text-gray-900 dark:text-white ${(!ad.rating || ad.rating === 0) ? 'ml-0' : ''}`}>
                                                        {ad.priceLabel}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Избранные бизнесы */}
            {finalBusinesses.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4">{t('favoriteBusinesses')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {finalBusinesses.map((business) => (
                            <Card key={`business-${business.id}`} className="p-0 overflow-hidden group hover:shadow-lg transition-shadow">
                                <Link href={`/marketplace/${business.businessSlug}`}>
                                    <div className="relative h-40 sm:h-48 bg-gray-100 dark:bg-gray-800">
                                        {business.image ? (
                                            <Image
                                                src={business.image}
                                                alt={business.businessName}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <PiUser className="text-4xl text-gray-400" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2">
                                            <Button
                                                variant="plain"
                                                size="sm"
                                                className="bg-white/90 hover:bg-white"
                                                icon={<PiHeartFill className="text-red-500" />}
                                                onClick={(e) => handleRemoveFavorite(e, 'business', business.businessId || business.id)}
                                                disabled={removeFavoriteMutation.isPending}
                                            />
                                        </div>
                                    </div>
                                    <div className="p-3 sm:p-4">
                                        <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-1 truncate">
                                            {business.businessName}
                                        </h4>
                                        <p className="text-xs sm:text-sm text-gray-500 mb-2 truncate">
                                            {business.category}
                                        </p>
                                        {/* Показываем рейтинг только если он есть и больше 0 */}
                                        {business.rating !== null && business.rating !== undefined && business.rating > 0 && (
                                            <div className="flex items-center gap-1">
                                                <PiStarFill className="text-yellow-400 text-sm sm:text-base" />
                                                <span className="text-xs sm:text-sm font-semibold">{business.rating.toFixed(1)}</span>
                                                {business.reviewsCount !== undefined && business.reviewsCount > 0 && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        ({business.reviewsCount})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// Компонент уведомлений (только настройки)
const NotificationsTab = () => {
    const t = useTranslations('public.profile')
    const queryClient = useQueryClient()

    const { data: settings = { email: true, sms: false, telegram: false, push: true }, isLoading: settingsLoading } = useQuery({
        queryKey: ['client-notification-settings'],
        queryFn: getNotificationSettings,
    })

    const updateSettingsMutation = useMutation({
        mutationFn: updateNotificationSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-notification-settings'] })
        },
    })

    const handleSettingChange = (key, value) => {
        const newSettings = {
            ...settings,
            [key]: value,
        }
        updateSettingsMutation.mutate(newSettings)
    }

    if (settingsLoading) {
        return <Loading loading />
    }

    return (
        <div className="w-full">
            <h4 className="text-lg font-semibold mb-4">{t('notificationSettings')}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('notificationSettingsDescription')}
            </p>
            <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <PiBell className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <div className="font-semibold text-sm sm:text-base">{t('notifications.push')}</div>
                            <div className="text-xs sm:text-sm text-gray-500">
                                {t('notifications.browser')}
                            </div>
                        </div>
                    </div>
                    <Switcher
                        checked={settings.push}
                        onChange={(checked) => handleSettingChange('push', checked)}
                        disabled={settingsLoading || updateSettingsMutation.isPending}
                    />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                            <PiEnvelope className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <div className="font-semibold text-sm sm:text-base">{t('notifications.email')}</div>
                            <div className="text-xs sm:text-sm text-gray-500">
                                {t('notifications.emailDescription')}
                            </div>
                        </div>
                    </div>
                    <Switcher
                        checked={settings.email}
                        onChange={(checked) => handleSettingChange('email', checked)}
                        disabled={settingsLoading || updateSettingsMutation.isPending}
                    />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/20 flex items-center justify-center">
                            <PiPaperPlaneTilt className="text-sky-600 dark:text-sky-400" />
                        </div>
                        <div>
                            <div className="font-semibold text-sm sm:text-base">{t('notifications.telegram')}</div>
                            <div className="text-xs sm:text-sm text-gray-500">
                                {t('notifications.telegramDescription')}
                            </div>
                        </div>
                    </div>
                    <Switcher
                        checked={settings.telegram}
                        onChange={(checked) => handleSettingChange('telegram', checked)}
                        disabled={settingsLoading || updateSettingsMutation.isPending}
                    />
                </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>{t('telegramFutureTitle')}</strong>{' '}
                    {t('telegramFutureBody')}
                </p>
            </div>
        </div>
    )
}

// Компонент скидок и бонусов (лояльность по бронированиям + промо/бонусы платформы)
const DiscountsAndBonusesTab = () => {
    const t = useTranslations('public.profile')
    const tLoyalty = useTranslations('client.discounts')
    const queryClient = useQueryClient()

    const { data: loyaltyItems = [], isLoading: loyaltyLoading } = useQuery({
        queryKey: ['client-loyalty-discounts'],
        queryFn: getClientLoyaltyProgress,
    })

    const { data: discounts = [], isLoading: discountsLoading } = useQuery({
        queryKey: ['client-discounts'],
        queryFn: getClientDiscounts,
    })

    const { data: bonuses = [], isLoading: bonusesLoading } = useQuery({
        queryKey: ['client-bonuses'],
        queryFn: getClientBonuses,
    })

    const applyDiscountMutation = useMutation({
        mutationFn: applyDiscount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-discounts'] })
        },
    })

    const applyBonusMutation = useMutation({
        mutationFn: applyBonus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-bonuses'] })
        },
    })

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code)
        // TODO: Показать toast уведомление
    }

    const handleApplyDiscount = (discountId) => {
        applyDiscountMutation.mutate(discountId)
        // TODO: Перенаправить на страницу бронирования с примененной скидкой
    }

    const handleApplyBonus = (bonusId) => {
        applyBonusMutation.mutate(bonusId)
        // TODO: Применить бонус
    }

    const activeDiscounts = discounts.filter((d) => d.isActive && !d.isUsed)
    const usedDiscounts = discounts.filter((d) => d.isUsed)
    const activeBonuses = bonuses.filter((b) => b.isActive && !b.isUsed)
    const usedBonuses = bonuses.filter((b) => b.isUsed)

    const allItems = [
        ...activeDiscounts.map((d) => ({ ...d, type: 'discount' })),
        ...activeBonuses.map((b) => ({ ...b, type: 'bonus' })),
    ]

    const hasLegacyContent =
        allItems.length > 0 || usedDiscounts.length > 0 || usedBonuses.length > 0
    const hasLoyaltyContent = loyaltyItems.length > 0
    const legacyStillLoading = discountsLoading || bonusesLoading

    const showFullEmpty =
        !loyaltyLoading &&
        !legacyStillLoading &&
        !hasLoyaltyContent &&
        !hasLegacyContent

    if (loyaltyLoading && legacyStillLoading && !hasLegacyContent) {
        return (
            <div className="min-h-[320px] flex items-center justify-center">
                <Loading loading />
            </div>
        )
    }

    if (showFullEmpty) {
        return (
            <div className="p-4 sm:p-4 text-center min-h-[320px] flex flex-col items-center justify-center w-full">
                <PiTicket className="text-3xl sm:text-4xl text-gray-400 mx-auto mb-3 sm:mb-4" />
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 max-w-md">
                    {t('noDiscountsAndBonuses')}
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4 sm:space-y-6 min-h-[320px] w-full">
            {/* Лояльность у бизнесов — только если у бизнеса есть активные уровни (API не возвращает остальные) */}
            {(loyaltyLoading || hasLoyaltyContent) && (
                <div className="space-y-3">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tLoyalty('title')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {tLoyalty('description')}
                        </p>
                    </div>
                    {loyaltyLoading ? (
                        <div className="min-h-[120px] flex items-center justify-center">
                            <Loading loading />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {loyaltyItems.map((row) => (
                                <LoyaltyProgramBlock
                                    key={row.company_id}
                                    variant="marketplace"
                                    companyName={row.company_name}
                                    companySlug={row.company_slug}
                                    loyaltyBookingsCount={row.loyalty_bookings_count}
                                    loyaltyRule={row.loyalty_rule}
                                    currentTier={row.current_tier}
                                    nextTier={row.next_tier}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Промо и бонусы платформы (legacy API) */}
            {legacyStillLoading && !hasLegacyContent ? (
                <div className="min-h-[120px] flex items-center justify-center">
                    <Loading loading />
                </div>
            ) : hasLegacyContent ? (
                <div className="space-y-3 sm:space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('platformOffersTitle')}</h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('platformOffersDescription')}</p>
            {/* Активные скидки и бонусы */}
            {allItems.map((item) => {
                const isValid = new Date(item.validUntil) > new Date()
                const isDiscount = item.type === 'discount'
                
                return (
                    <Card key={`${item.type}-${item.id}`} className="p-4 sm:p-4">
                        <div className="flex items-start gap-3 sm:gap-4">
                            {item.businessImage && (
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0">
                                    <Image
                                        src={item.businessImage}
                                        alt={item.businessName}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                                                {item.title}
                                            </h4>
                                            <span
                                                className={classNames(
                                                    'text-xs font-medium px-2.5 py-1 rounded-full',
                                                    isDiscount
                                                        ? 'bg-primary text-white'
                                                        : 'bg-emerald-500 text-white'
                                                )}
                                            >
                                                {isDiscount
                                                    ? item.discountType === 'percentage'
                                                        ? t('discountPercentOff', {
                                                              value: item.discountValue,
                                                          })
                                                        : t('discountMoneyOff', {
                                                              amount: `$${item.discountValue}`,
                                                          })
                                                    : item.bonusType === 'points'
                                                      ? t('pointsReward', {
                                                            value: item.bonusValue,
                                                        })
                                                      : item.bonusType === 'cashback'
                                                        ? t('cashbackReward', {
                                                              value: item.bonusValue,
                                                          })
                                                        : t('bonusValueLabel', {
                                                              value: item.bonusValue,
                                                          })}
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            {item.description}
                                        </p>
                                        <Link
                                            href={`/marketplace/${item.businessSlug}`}
                                            className="text-xs sm:text-sm text-primary hover:underline"
                                        >
                                            {item.businessName}
                                        </Link>
                                    </div>
                                </div>
                                {isDiscount && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs sm:text-sm font-mono font-semibold bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                            {item.code}
                                        </span>
                                        <Button
                                            variant="plain"
                                            size="sm"
                                            icon={<PiCopy />}
                                            onClick={() => handleCopyCode(item.code)}
                                            title={t('copyCodeTitle')}
                                            className="h-6 w-6 p-0"
                                        />
                                        {item.minPurchaseAmount && (
                                            <span className="text-xs text-gray-500">
                                                {t('minPurchaseFrom', {
                                                    amount: `$${item.minPurchaseAmount}`,
                                                })}
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                        {t('validUntil')}{' '}
                                        {formatDate(item.validUntil, CLIENT_DEFAULT_TIMEZONE, 'short')}
                                    </span>
                                    {isValid && (
                                        <Button
                                            size="sm"
                                            variant="solid"
                                            onClick={() =>
                                                isDiscount
                                                    ? handleApplyDiscount(item.id)
                                                    : handleApplyBonus(item.id)
                                            }
                                            loading={
                                                isDiscount
                                                    ? applyDiscountMutation.isPending
                                                    : applyBonusMutation.isPending
                                            }
                                        >
                                            {isDiscount ? t('apply') : t('get')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                )
            })}

            {/* Использованные скидки и бонусы */}
            {(usedDiscounts.length > 0 || usedBonuses.length > 0) && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
                        {t('usedItems')}
                    </h4>
                    <div className="space-y-2">
                        {[...usedDiscounts, ...usedBonuses].map((item) => {
                            const isDiscount = 'code' in item
                            return (
                                <Card key={`used-${isDiscount ? 'discount' : 'bonus'}-${item.id}`} className="p-3 opacity-60">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-semibold text-sm">{item.title}</span>
                                            <span className="text-xs text-gray-500 ml-2">
                                                {t('used')}:{' '}
                                                {item.usedAt
                                                    ? formatDate(item.usedAt, CLIENT_DEFAULT_TIMEZONE, 'short')
                                                    : '-'}
                                            </span>
                                        </div>
                                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-400 text-white">
                                            {isDiscount
                                                ? item.discountType === 'percentage'
                                                    ? t('discountPercentOff', {
                                                          value: item.discountValue,
                                                      })
                                                    : t('discountMoneyOff', {
                                                          amount: `$${item.discountValue}`,
                                                      })
                                                : item.bonusType === 'points'
                                                  ? t('pointsReward', {
                                                        value: item.bonusValue,
                                                    })
                                                  : item.bonusType === 'cashback'
                                                    ? t('cashbackReward', {
                                                          value: item.bonusValue,
                                                      })
                                                    : t('bonusValueLabel', {
                                                          value: item.bonusValue,
                                                      })}
                                        </span>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}
                </div>
            ) : null}
        </div>
    )
}

// Основной компонент страницы
export default function ClientProfilePage() {
    const t = useTranslations('public.profile')
    const { data: user, isLoading: userLoading } = useCurrentUser()
    const { user: userStore } = useUserStore()
    const [activeTab, setActiveTab] = useState('bookings')

    const displayUser = user || userStore

    // Загружаем данные для статистики
    const { data: upcomingBookingsForBadge = [] } = useQuery({
        queryKey: ['client-bookings', true],
        queryFn: () => getClientBookings({ upcoming: true }),
        staleTime: 30000,
    })
    
    const { data: favoriteServices = [] } = useQuery({
        queryKey: ['client-favorite-services'],
        queryFn: getFavoriteServices,
    })
    
    const { data: favoriteAdvertisements = [] } = useQuery({
        queryKey: ['client-favorite-advertisements'],
        queryFn: getFavoriteAdvertisements,
    })
    
    const { data: favoriteBusinesses = [] } = useQuery({
        queryKey: ['client-favorite-businesses'],
        queryFn: getFavoriteBusinesses,
    })
    
    const { data: pendingReviewsForBadge = [] } = useQuery({
        queryKey: ['client-pending-reviews'],
        queryFn: getPendingReviews,
        staleTime: 30000,
    })
    
    const upcomingBookingsCount = upcomingBookingsForBadge?.length || 0
    const favoritesCount =
        (favoriteServices?.length || 0) +
        (favoriteAdvertisements?.length || 0) +
        (favoriteBusinesses?.length || 0)
    const pendingReviewsCount = pendingReviewsForBadge?.length || 0

    if (userLoading) {
        return (
            <Container className="pt-20 pb-8 md:pt-24 md:pb-12 px-4 sm:px-6">
                <div className="flex items-center justify-center min-h-[320px]">
                    <Loading loading />
                </div>
            </Container>
        )
    }

    return (
        <ProtectedRoute allowedRoles={[CLIENT]} redirectTo="/sign-in">
            <Container className="pt-20 pb-8 md:pt-24 md:pb-12 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
                    <ProfileHeader 
                        user={displayUser} 
                        bookingsCount={upcomingBookingsCount}
                        favoritesCount={favoritesCount}
                    />

                    <Card bodyClass="!p-2 sm:!p-5">
                        <Tabs value={activeTab} onChange={setActiveTab}>
                            <TabList className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                <TabNav value="bookings" icon={<PiCalendar />} className="whitespace-nowrap">
                                    <span className="hidden sm:inline">{t('bookings')}</span>
                                    <span className="sm:hidden">{t('bookingsShort')}</span>
                                    {upcomingBookingsCount > 0 && (
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500 dark:bg-blue-600 text-white ml-2">
                                            {upcomingBookingsCount}
                                        </span>
                                    )}
                                </TabNav>
                                <TabNav value="reviews" icon={<PiStar />} className="whitespace-nowrap">
                                    <span className="hidden sm:inline">{t('myReviews')}</span>
                                    <span className="sm:hidden">{t('reviews')}</span>
                                    {pendingReviewsCount > 0 && (
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500 dark:bg-yellow-600 text-white ml-2">
                                            {pendingReviewsCount}
                                        </span>
                                    )}
                                </TabNav>
                                <TabNav value="favorites" icon={<PiHeart />} className="whitespace-nowrap">
                                    {t('favorites')}
                                    {favoritesCount > 0 && (
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500 dark:bg-blue-600 text-white ml-2">
                                            {favoritesCount}
                                        </span>
                                    )}
                                </TabNav>
                                <TabNav value="discounts" icon={<PiTicket />} className="whitespace-nowrap">
                                    <span className="hidden sm:inline">{t('discountsAndBonuses')}</span>
                                    <span className="sm:hidden">{t('discounts')}</span>
                                </TabNav>
                                <TabNav value="notifications" icon={<PiBell />} className="whitespace-nowrap">
                                    {t('notificationsTab')}
                                </TabNav>
                            </TabList>
                            <div className="pt-2 sm:p-4 min-h-[320px]">
                                <TabContent value="bookings">
                                    <BookingsTab />
                                </TabContent>
                                <TabContent value="reviews">
                                    <ReviewsTab />
                                </TabContent>
                                <TabContent value="favorites">
                                    <FavoritesTab />
                                </TabContent>
                                <TabContent value="discounts">
                                    <DiscountsAndBonusesTab />
                                </TabContent>
                                <TabContent value="notifications">
                                    <NotificationsTab />
                                </TabContent>
                            </div>
                        </Tabs>
                    </Card>
                </div>
            </Container>
        </ProtectedRoute>
    )
}

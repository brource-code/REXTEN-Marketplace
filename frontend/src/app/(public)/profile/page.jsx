'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import classNames from '@/utils/classNames'
import Loading from '@/components/shared/Loading'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import Switcher from '@/components/ui/Switcher'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useCurrentUser } from '@/hooks/api/useAuth'
import { useUserStore } from '@/store'
import { CLIENT } from '@/constants/roles.constant'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/dateTime'
import { CLIENT_DEFAULT_TIMEZONE, resolveClientBookingTimezone } from '@/constants/client-datetime.constant'
import { normalizeImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils'
import { NumericFormat } from 'react-number-format'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ReviewModal from '@/components/reviews/ReviewModal'
import LoyaltyProgramBlock from '@/components/loyalty/LoyaltyProgramBlock'
import { PUBLIC_MARKETPLACE_CONTENT_MAX } from '@/constants/public-marketplace-layout.constant'
import { getCategoryName } from '@/utils/categoryUtils'
import { getCategories } from '@/lib/api/marketplace'
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
    PiMapPinFill,
    PiCalendar,
    PiEnvelope,
    PiPaperPlaneTilt,
    PiTicket,
    PiCopy,
    PiCamera,
    PiMapPin,
    PiBroom,
    PiCar,
    PiSparkle,
    PiScissors,
    PiFlower,
    PiHammer,
    PiLightning,
    PiDrop,
    PiWind,
    PiTree,
    PiSnowflake,
    PiBaby,
    PiDog,
    PiStudent,
    PiTranslate,
    PiMusicNote,
    PiCamera as PiCameraAlt,
    PiTag,
    PiClock,
} from 'react-icons/pi'
import { TbSettings } from 'react-icons/tb'
import dayjs from 'dayjs'

const { TabNav, TabList, TabContent } = Tabs

// Иконки категорий для сайдбара
const CATEGORY_ICON_BY_SLUG = {
    cleaning: PiBroom,
    'auto-service': PiCar,
    beauty: PiSparkle,
    'hair-services': PiScissors,
    barbershop: PiScissors,
    'massage-spa': PiFlower,
    'repair-construction': PiHammer,
    electrical: PiLightning,
    plumbing: PiDrop,
    hvac: PiWind,
    landscaping: PiTree,
    'snow-removal': PiSnowflake,
    childcare: PiBaby,
    eldercare: PiHeart,
    'pet-care': PiDog,
    tutoring: PiStudent,
    'language-learning': PiTranslate,
    'music-lessons': PiMusicNote,
    photography: PiCameraAlt,
}

function CategoryGlyph({ category }) {
    const raw = category?.icon != null && String(category.icon).trim()
    if (raw) {
        return (
            <span className="select-none text-[1.125rem] leading-none" aria-hidden>
                {String(category.icon).trim()}
            </span>
        )
    }
    const slug = (category?.slug || '').toLowerCase().trim()
    const Icon = CATEGORY_ICON_BY_SLUG[slug] || PiTag
    return <Icon className="h-5 w-5 shrink-0" aria-hidden />
}

// Заголовок профиля
const ProfileHeader = ({ user }) => {
    const t = useTranslations('public.profile')
    const avatarUrl = user?.avatar || user?.image
    const fullName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
    const memberSince = user?.created_at
        ? dayjs(user.created_at).format('MMM YYYY')
        : null
    const hasLocation = user?.city && user?.state

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row gap-5">
                {/* Аватар с иконкой камеры */}
                <div className="relative shrink-0 self-start">
                    <Avatar
                        src={avatarUrl}
                        alt={fullName || 'User'}
                        size={100}
                        shape="circle"
                        icon={<PiUser />}
                    />
                    <Link
                        href="/profile/settings"
                        className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md border border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        title={t('settings')}
                    >
                        <PiCamera className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </Link>
                </div>

                {/* Основная информация */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                            {/* Имя + бейдж роли */}
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                                    {fullName || t('user')}
                                </h4>
                                <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300 shrink-0">
                                    {t('bookings') === 'Bookings' ? 'Client' : 'Клиент'}
                                </span>
                            </div>

                            {/* Email */}
                            {user?.email && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-gray-500 dark:text-gray-400">
                                    <PiEnvelope className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{user.email}</span>
                                </div>
                            )}

                            {/* Локация */}
                            <div className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-gray-500 dark:text-gray-400">
                                <PiMapPin className="h-3.5 w-3.5 shrink-0" />
                                {hasLocation ? (
                                    <span className="truncate">{user.city}, {user.state}, USA</span>
                                ) : (
                                    <span className="text-gray-400 dark:text-gray-500 italic text-xs">
                                        {t('setLocation')}
                                    </span>
                                )}
                                <Link
                                    href="/profile/settings"
                                    className="shrink-0 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline ml-1"
                                >
                                    {t('changeLocationLink')}
                                </Link>
                            </div>

                            {/* Мета-строка: дата, язык, таймзон */}
                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-bold text-gray-500 dark:text-gray-400">
                                {memberSince && (
                                    <span className="flex items-center gap-1.5">
                                        <PiCalendar className="h-3.5 w-3.5 shrink-0" />
                                        <span>{t('memberSince')}</span>
                                        <span className="text-gray-900 dark:text-gray-100">{memberSince}</span>
                                    </span>
                                )}
                                {user?.locale && (
                                    <span className="flex items-center gap-1.5">
                                        <PiTranslate className="h-3.5 w-3.5 shrink-0" />
                                        <span className="text-gray-900 dark:text-gray-100 capitalize">{user.locale}</span>
                                    </span>
                                )}
                                {user?.timezone && (
                                    <span className="flex items-center gap-1.5">
                                        <PiClock className="h-3.5 w-3.5 shrink-0" />
                                        <span className="text-gray-900 dark:text-gray-100">{user.timezone}</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Кнопки действий */}
                        <div className="flex gap-2 shrink-0">
                            <Link href="/profile/settings">
                                <Button variant="outline" size="sm" icon={<TbSettings />}>
                                    <span className="hidden sm:inline">{t('profileSettingsBtn')}</span>
                                </Button>
                            </Link>
                            <Link href="/booking">
                                <Button variant="solid" size="sm" icon={<PiCalendar />}>
                                    <span className="hidden sm:inline">{t('myBookingsBtn')}</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Блок статистики (4 карточки)
const StatsGrid = ({ bookingsCount, recentBookingsCount, favoritesCount, reviewsCount, activeDiscountsCount }) => {
    const t = useTranslations('public.profile')
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 truncate">
                            {t('bookings')}
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {bookingsCount}
                        </div>
                        {recentBookingsCount > 0 && (
                            <div className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {t('lastMonthSub', { count: recentBookingsCount })}
                            </div>
                        )}
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                        <PiCalendar className="text-2xl" />
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 truncate">
                            {t('favorites')}
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {favoritesCount}
                        </div>
                        <div className="mt-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                            {t('savedServicesSub')}
                        </div>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400">
                        <PiHeart className="text-2xl" />
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 truncate">
                            {t('reviews')}
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {reviewsCount}
                        </div>
                        <div className="mt-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                            {t('reviewsLeftSub')}
                        </div>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                        <PiStarFill className="text-2xl" />
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 truncate">
                            {t('discounts')}
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {activeDiscountsCount}
                        </div>
                        <div className="mt-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                            {t('activeOffersSub')}
                        </div>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
                        <PiTicket className="text-2xl" />
                    </div>
                </div>
            </div>
        </div>
    )
}

// Карточка бронирования
const BookingCard = ({ booking, onLeaveReview }) => {
    const t = useTranslations('public.profile')
    const isPast = booking.status === 'completed' || booking.status === 'cancelled'
    const image = booking.image || booking.serviceImage || booking.businessImage || null
    const normalizedImage = image ? normalizeImageUrl(image) : null

    const totalPrice = booking.total_price || parseFloat(booking.price || 0)

    return (
        <div className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow dark:border-white/10 dark:bg-gray-900">
            {/* Миниатюра */}
            <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                {normalizedImage ? (
                    <Image
                        src={normalizedImage}
                        alt={booking.serviceName || ''}
                        fill
                        className="object-cover"
                        sizes="96px"
                        onError={(e) => { e.target.src = FALLBACK_IMAGE; e.target.onerror = null }}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <PiCalendar className="text-2xl text-gray-400 dark:text-gray-600" />
                    </div>
                )}
                {/* Статус бейдж */}
                <span
                    className={classNames(
                        'absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                        booking.status === 'new' && 'bg-blue-500 text-white',
                        booking.status === 'pending' && 'bg-yellow-500 text-white',
                        booking.status === 'confirmed' && 'bg-emerald-500 text-white',
                        booking.status === 'completed' && 'bg-gray-500 text-white',
                        booking.status === 'cancelled' && 'bg-red-500 text-white',
                    )}
                >
                    {t(`bookingStatus.${['new', 'pending', 'confirmed', 'completed', 'cancelled'].includes(booking.status) ? booking.status : 'pending'}`)}
                </span>
            </div>

            {/* Контент */}
            <div className="flex flex-1 min-w-0 flex-col justify-between gap-1">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        {booking.businessSlug ? (
                            <Link
                                href={`/marketplace/${booking.businessSlug}`}
                                className="text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-primary transition-colors truncate block"
                            >
                                {booking.businessName}
                            </Link>
                        ) : (
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                {booking.businessName}
                            </p>
                        )}
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {booking.serviceName}
                        </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(totalPrice, booking.currency || 'USD')}
                    </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                        {booking.date && (
                            <span className="flex items-center gap-1">
                                <PiClock className="h-3 w-3 shrink-0" />
                                {formatDate(booking.date, resolveClientBookingTimezone(booking), 'short')}{booking.time ? `, ${booking.time}` : ''}
                            </span>
                        )}
                        {(booking.city || booking.state) && (
                            <span className="flex items-center gap-1">
                                <PiMapPin className="h-3 w-3 shrink-0" />
                                {[booking.city, booking.state].filter(Boolean).join(', ')}
                            </span>
                        )}
                    </div>
                    {isPast && booking.status === 'completed' ? (
                        <Button
                            variant="outline"
                            size="xs"
                            onClick={() => onLeaveReview && onLeaveReview(booking)}
                            className="shrink-0"
                        >
                            {t('leaveReview')}
                        </Button>
                    ) : !isPast ? (
                        <Link href="/booking" className="shrink-0">
                            <Button variant="plain" size="xs">
                                {t('detailsCta')}
                            </Button>
                        </Link>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

// Вкладка бронирований
const BookingsTab = () => {
    const t = useTranslations('public.profile')
    const tCommon = useTranslations('common')
    const queryClient = useQueryClient()
    const [reviewModal, setReviewModal] = useState({ isOpen: false, order: null })

    const { data: upcoming = [], isLoading: upcomingLoading } = useQuery({
        queryKey: ['client-bookings', 'upcoming'],
        queryFn: () => getClientBookings({ upcoming: true }),
    })

    const { data: past = [], isLoading: pastLoading } = useQuery({
        queryKey: ['client-bookings', 'past'],
        queryFn: () => getClientBookings({ upcoming: false }),
    })

    const { data: pendingReviews = [] } = useQuery({
        queryKey: ['client-pending-reviews'],
        queryFn: getPendingReviews,
    })

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
                { placement: 'top-end' }
            )
        },
    })

    const isLoading = upcomingLoading || pastLoading

    if (isLoading) {
        return (
            <div className="min-h-[320px] flex items-center justify-center">
                <Loading loading />
            </div>
        )
    }

    const hasUpcoming = upcoming.length > 0
    const hasPast = past.length > 0
    const hasAny = hasUpcoming || hasPast

    if (!hasAny) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[320px] text-center py-8">
                <PiCalendar className="text-4xl text-gray-400 mb-3" />
                <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {t('noBookings')}
                </h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">
                    {t('noBookingsDescription')}
                </p>
                <Link href="/services">
                    <Button variant="outline" size="sm">{t('findServices')}</Button>
                </Link>
            </div>
        )
    }

    const handleLeaveReview = (booking) => {
        const pending = pendingReviews.find(
            (r) => r.bookingId === booking.id || r.id === booking.id
        )
        setReviewModal({ isOpen: true, order: pending || booking })
    }

    return (
        <div className="space-y-5">
            {/* Предстоящие */}
            {hasUpcoming && (
                <div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                        {t('upcomingSection')}
                    </h3>
                    <div className="space-y-3">
                        {upcoming.slice(0, 3).map((booking) => (
                            <BookingCard key={booking.id} booking={booking} />
                        ))}
                    </div>
                </div>
            )}

            {/* Прошлые */}
            {hasPast && (
                <div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                        {t('pastSection')}
                    </h3>
                    <div className="space-y-3">
                        {past.slice(0, 3).map((booking) => (
                            <BookingCard key={booking.id} booking={booking} onLeaveReview={handleLeaveReview} />
                        ))}
                    </div>
                </div>
            )}

            {/* Ссылка на все бронирования */}
            <div className="text-center pt-1">
                <Link href="/booking" className="text-sm font-bold text-primary hover:underline">
                    {t('viewAllBookingsLink')}
                </Link>
            </div>

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

// Вкладка отзывов (сохранена из оригинала)
const ReviewsTab = () => {
    const t = useTranslations('public.profile')
    const tCommon = useTranslations('common')
    const queryClient = useQueryClient()
    const [reviewModal, setReviewModal] = useState({ isOpen: false, order: null })

    const { data: pendingReviews = [], isLoading: pendingLoading } = useQuery({
        queryKey: ['client-pending-reviews'],
        queryFn: getPendingReviews,
    })

    const { data: completedReviews = [], isLoading: completedLoading } = useQuery({
        queryKey: ['client-reviews'],
        queryFn: getClientReviews,
    })

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
                { placement: 'top-end' }
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
            <div className="flex flex-col items-center justify-center min-h-[320px] text-center py-8">
                <PiStar className="text-4xl text-gray-400 mb-3" />
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('reviewsEmptyTitle')}</p>
                <p className="text-xs font-bold text-gray-400 mt-2">{t('reviewsEmptyHint')}</p>
            </div>
        )
    }

    return (
        <div className="space-y-5 min-h-[320px]">
            {hasPending && (
                <div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                        {t('pendingReviews')}
                        <span className="rounded-full bg-yellow-500 dark:bg-yellow-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            {pendingReviews.length}
                        </span>
                    </h3>
                    <div className="space-y-3">
                        {pendingReviews.map((order) => (
                            <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-4 shadow-sm">
                                <div className="flex-1 min-w-0">
                                    <Link
                                        href={`/marketplace/${order.businessSlug}`}
                                        className="text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-primary block truncate"
                                    >
                                        {order.businessName}
                                    </Link>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                        {order.serviceName}
                                    </p>
                                    <div className="flex gap-3 mt-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                        <span>{formatDate(order.date, resolveClientBookingTimezone(order), 'short')}</span>
                                        <span>•</span>
                                        <span className="text-gray-900 dark:text-gray-100">
                                            <NumericFormat displayType="text" value={order.price} prefix="$" thousandSeparator />
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    variant="solid"
                                    size="sm"
                                    onClick={() => setReviewModal({ isOpen: true, order })}
                                    className="shrink-0"
                                >
                                    {t('leaveReview')}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {hasCompleted && (
                <div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                        {t('myReviews')}
                        <span className="rounded-full bg-blue-500 dark:bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            {completedReviews.length}
                        </span>
                    </h3>
                    <div className="space-y-3">
                        {completedReviews.map((review) => (
                            <div key={review.id} className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <Avatar src={review.businessAvatar} size={40} shape="circle" className="shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/marketplace/${review.businessSlug}`}
                                                    className="text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-primary truncate block"
                                                >
                                                    {review.businessName}
                                                </Link>
                                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                                    {review.serviceName}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-0.5 shrink-0">
                                                {[...Array(5)].map((_, i) => (
                                                    <PiStarFill
                                                        key={i}
                                                        className={classNames(
                                                            'text-sm',
                                                            i < review.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            {review.comment}
                                        </p>
                                        {review.response && (
                                            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                                                    {t('businessResponse', { name: review.businessName })}
                                                </p>
                                                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                    {review.response}
                                                </p>
                                            </div>
                                        )}
                                        <div className="mt-2 text-xs font-bold text-gray-400">
                                            {formatDate(review.createdAt, CLIENT_DEFAULT_TIMEZONE, 'long')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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

// Вкладка избранного (сохранена из оригинала, стиль обновлён)
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
        mutationFn: ({ type, id }) => removeFromFavorites(type, id),
        onSuccess: (_, variables) => {
            if (variables.type === 'service') queryClient.invalidateQueries({ queryKey: ['client-favorite-services'] })
            else if (variables.type === 'advertisement') queryClient.invalidateQueries({ queryKey: ['client-favorite-advertisements'] })
            else if (variables.type === 'business') queryClient.invalidateQueries({ queryKey: ['client-favorite-businesses'] })
        },
    })

    const finalServices = useMemo(() => {
        const map = new Map()
        services.forEach((s) => { const k = s.serviceId || s.id; if (k && !map.has(k)) map.set(k, s) })
        return Array.from(map.values())
    }, [services])

    const finalAdvertisements = useMemo(() => {
        const map = new Map()
        advertisements.forEach((a) => { const k = a.advertisementId || a.id; if (k && !map.has(k)) map.set(k, a) })
        return Array.from(map.values())
    }, [advertisements])

    const finalBusinesses = useMemo(() => {
        const map = new Map()
        businesses.forEach((b) => { if (!map.has(b.id)) map.set(b.id, b) })
        return Array.from(map.values())
    }, [businesses])

    const isLoading = servicesLoading || advertisementsLoading || businessesLoading
    const hasFavorites = finalServices.length > 0 || finalAdvertisements.length > 0 || finalBusinesses.length > 0

    const handleRemoveFavorite = (e, type, id) => {
        e.preventDefault(); e.stopPropagation()
        removeFavoriteMutation.mutate({ type, id })
    }

    if (isLoading) {
        return <div className="min-h-[320px] flex items-center justify-center"><Loading loading /></div>
    }

    if (!hasFavorites) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[320px] text-center py-8">
                <PiHeart className="text-4xl text-gray-400 mb-3" />
                <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">{t('noFavorites')}</h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">{t('noFavoritesDescription')}</p>
                <Link href="/services"><Button variant="outline" size="sm">{t('findServices')}</Button></Link>
            </div>
        )
    }

    const FavGrid = ({ items, renderCard }) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{items.map(renderCard)}</div>
    )

    return (
        <div className="space-y-5 min-h-[320px]">
            {finalServices.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">{t('favoriteServices')}</h3>
                    <FavGrid items={finalServices} renderCard={(service) => {
                        const url = service.serviceSlug || service.businessSlug ? `/marketplace/${service.serviceSlug || service.businessSlug}` : '/services'
                        const img = service.image || service.businessImage || null
                        return (
                            <div key={`service-${service.serviceId || service.id}`} className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                                <Link href={url} className="block">
                                    <div className="relative h-40 bg-gray-100 dark:bg-gray-800">
                                        {img ? <Image src={normalizeImageUrl(img)} alt={service.serviceName || ''} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" /> : <div className="flex h-full items-center justify-center"><PiCalendar className="text-4xl text-gray-400" /></div>}
                                        <div className="absolute top-2 right-2">
                                            <Button variant="plain" size="sm" className="bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-sm" icon={<PiHeartFill className="text-red-500" />} onClick={(e) => handleRemoveFavorite(e, 'service', service.serviceId || service.id)} disabled={removeFavoriteMutation.isPending} />
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1">{service.serviceName || t('altServiceImage')}</h4>
                                        {service.businessName && <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{service.businessName}</p>}
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                            {service.rating > 0 ? <span className="flex items-center gap-1 text-xs font-bold text-gray-900 dark:text-gray-100"><PiStarFill className="text-yellow-400" />{service.rating.toFixed(1)}</span> : <span />}
                                            {service.priceLabel && <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{service.priceLabel}</span>}
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        )
                    }} />
                </div>
            )}

            {finalAdvertisements.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">{t('favoriteAdvertisements')}</h3>
                    <FavGrid items={finalAdvertisements} renderCard={(ad) => {
                        const adId = ad.advertisementId || ad.id
                        let adSlug = ad.slug || ad.advertisementSlug || ''
                        if (!adSlug && ad.link) adSlug = ad.link.replace(/^\/marketplace\//, '').replace(/^\//, '')
                        if (!adSlug) adSlug = `ad_${adId}`
                        const img = ad.image || ad.imageUrl || null
                        return (
                            <div key={`advertisement-${adId}`} className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                                <Link href={`/marketplace/${adSlug}`} className="block">
                                    <div className="relative h-40 bg-gray-100 dark:bg-gray-800">
                                        {img ? <Image src={normalizeImageUrl(img)} alt={ad.title || ''} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" onError={(e) => { e.target.src = FALLBACK_IMAGE; e.target.onerror = null }} /> : <div className="flex h-full items-center justify-center"><PiCalendar className="text-4xl text-gray-400" /></div>}
                                        <div className="absolute top-2 right-2">
                                            <Button variant="plain" size="sm" className="bg-white/90 dark:bg-gray-900/90 hover:bg-white backdrop-blur-sm" icon={<PiHeartFill className="text-red-500" />} onClick={(e) => handleRemoveFavorite(e, 'advertisement', adId)} disabled={removeFavoriteMutation.isPending} />
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1">{ad.title || ad.name || t('altAdvertisementImage')}</h4>
                                        {ad.businessName && <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{ad.businessName}</p>}
                                    </div>
                                </Link>
                            </div>
                        )
                    }} />
                </div>
            )}

            {finalBusinesses.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">{t('favoriteBusinesses')}</h3>
                    <FavGrid items={finalBusinesses} renderCard={(business) => (
                        <div key={`business-${business.id}`} className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                            <Link href={`/marketplace/${business.businessSlug}`} className="block">
                                <div className="relative h-40 bg-gray-100 dark:bg-gray-800">
                                    {business.image ? <Image src={business.image} alt={business.businessName} fill className="object-cover" /> : <div className="flex h-full items-center justify-center"><PiUser className="text-4xl text-gray-400" /></div>}
                                    <div className="absolute top-2 right-2">
                                        <Button variant="plain" size="sm" className="bg-white/90 hover:bg-white" icon={<PiHeartFill className="text-red-500" />} onClick={(e) => handleRemoveFavorite(e, 'business', business.businessId || business.id)} disabled={removeFavoriteMutation.isPending} />
                                    </div>
                                </div>
                                <div className="p-3">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{business.businessName}</h4>
                                    {business.category && <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5 truncate">{business.category}</p>}
                                    {business.rating > 0 && <div className="flex items-center gap-1 mt-1.5 text-xs font-bold text-gray-900 dark:text-gray-100"><PiStarFill className="text-yellow-400" />{business.rating.toFixed(1)}</div>}
                                </div>
                            </Link>
                        </div>
                    )} />
                </div>
            )}
        </div>
    )
}

// Вкладка скидок (сохранена из оригинала)
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

    const applyDiscountMutation = useMutation({ mutationFn: applyDiscount })
    const applyBonusMutation = useMutation({ mutationFn: applyBonus })

    const handleCopyCode = (code) => navigator.clipboard.writeText(code)

    const activeDiscounts = discounts.filter((d) => d.isActive && !d.isUsed)
    const usedDiscounts = discounts.filter((d) => d.isUsed)
    const activeBonuses = bonuses.filter((b) => b.isActive && !b.isUsed)
    const usedBonuses = bonuses.filter((b) => b.isUsed)
    const allItems = [...activeDiscounts.map((d) => ({ ...d, type: 'discount' })), ...activeBonuses.map((b) => ({ ...b, type: 'bonus' }))]

    const hasLegacyContent = allItems.length > 0 || usedDiscounts.length > 0 || usedBonuses.length > 0
    const hasLoyaltyContent = loyaltyItems.length > 0
    const legacyStillLoading = discountsLoading || bonusesLoading
    const showFullEmpty = !loyaltyLoading && !legacyStillLoading && !hasLoyaltyContent && !hasLegacyContent

    if (loyaltyLoading && legacyStillLoading) {
        return <div className="min-h-[320px] flex items-center justify-center"><Loading loading /></div>
    }

    if (showFullEmpty) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[320px] text-center py-8">
                <PiTicket className="text-4xl text-gray-400 mb-3" />
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 max-w-md">{t('noDiscountsAndBonuses')}</p>
            </div>
        )
    }

    return (
        <div className="space-y-5 min-h-[320px]">
            {(loyaltyLoading || hasLoyaltyContent) && (
                <div className="space-y-3">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tLoyalty('title')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{tLoyalty('description')}</p>
                    </div>
                    {loyaltyLoading ? (
                        <div className="min-h-[120px] flex items-center justify-center"><Loading loading /></div>
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

            {legacyStillLoading && !hasLegacyContent ? (
                <div className="min-h-[120px] flex items-center justify-center"><Loading loading /></div>
            ) : hasLegacyContent ? (
                <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('platformOffersTitle')}</h4>
                    {allItems.map((item) => {
                        const isDiscount = item.type === 'discount'
                        const isValid = new Date(item.validUntil) > new Date()
                        return (
                            <div key={`${item.type}-${item.id}`} className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.title}</h4>
                                            <span className={classNames('text-xs font-bold px-2 py-0.5 rounded-full', isDiscount ? 'bg-primary text-white' : 'bg-emerald-500 text-white')}>
                                                {isDiscount ? (item.discountType === 'percentage' ? t('discountPercentOff', { value: item.discountValue }) : t('discountMoneyOff', { amount: `$${item.discountValue}` })) : t('bonusValueLabel', { value: item.bonusValue })}
                                            </span>
                                        </div>
                                        {isDiscount && (
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-mono font-bold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{item.code}</span>
                                                <Button variant="plain" size="sm" icon={<PiCopy />} onClick={() => handleCopyCode(item.code)} className="h-6 w-6 p-0" title={t('copyCodeTitle')} />
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('validUntil')} {formatDate(item.validUntil, CLIENT_DEFAULT_TIMEZONE, 'short')}</span>
                                            {isValid && <Button size="sm" variant="solid" onClick={() => isDiscount ? applyDiscountMutation.mutate(item.id) : applyBonusMutation.mutate(item.id)}>{isDiscount ? t('apply') : t('get')}</Button>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : null}
        </div>
    )
}

// Вкладка уведомлений
const NotificationsTab = () => {
    const t = useTranslations('public.profile')
    const queryClient = useQueryClient()

    const { data: settings = { email: true, sms: false, telegram: false, push: true }, isLoading } = useQuery({
        queryKey: ['client-notification-settings'],
        queryFn: getNotificationSettings,
    })

    const updateSettingsMutation = useMutation({
        mutationFn: updateNotificationSettings,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-notification-settings'] }),
    })

    if (isLoading) return <Loading loading />

    const handleChange = (key, value) => updateSettingsMutation.mutate({ ...settings, [key]: value })

    const items = [
        { key: 'push', icon: <PiBell />, colorClass: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400', label: t('notifications.push'), desc: t('notifications.browser') },
        { key: 'email', icon: <PiEnvelope />, colorClass: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400', label: t('notifications.email'), desc: t('notifications.emailDescription') },
        { key: 'telegram', icon: <PiPaperPlaneTilt />, colorClass: 'bg-sky-100 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400', label: t('notifications.telegram'), desc: t('notifications.telegramDescription') },
    ]

    return (
        <div className="space-y-3">
            <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('notificationSettings')}</h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('notificationSettingsDescription')}</p>
            </div>
            {items.map(({ key, icon, colorClass, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className={classNames('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', colorClass)}>{icon}</div>
                        <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{label}</div>
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{desc}</div>
                        </div>
                    </div>
                    <Switcher checked={settings[key]} onChange={(v) => handleChange(key, v)} disabled={isLoading || updateSettingsMutation.isPending} />
                </div>
            ))}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
                    <strong>{t('telegramFutureTitle')}</strong>{' '}{t('telegramFutureBody')}
                </p>
            </div>
        </div>
    )
}



// Основная страница профиля
export default function ClientProfilePage() {
    const t = useTranslations('public.profile')
    const tServices = useTranslations('public.services')
    const { data: user, isLoading: userLoading } = useCurrentUser()
    const { user: userStore } = useUserStore()
    const [activeTab, setActiveTab] = useState('bookings')

    const displayUser = user || userStore

    // Данные для статистики
    const { data: allBookings = [] } = useQuery({
        queryKey: ['client-bookings-all'],
        queryFn: () => getClientBookings(),
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
    const { data: completedReviews = [] } = useQuery({
        queryKey: ['client-reviews'],
        queryFn: getClientReviews,
    })
    const { data: pendingReviewsForBadge = [] } = useQuery({
        queryKey: ['client-pending-reviews'],
        queryFn: getPendingReviews,
        staleTime: 30000,
    })
    const { data: discounts = [] } = useQuery({
        queryKey: ['client-discounts'],
        queryFn: getClientDiscounts,
    })
    const { data: categories = [] } = useQuery({
        queryKey: ['marketplace-categories'],
        queryFn: getCategories,
        staleTime: 5 * 60 * 1000,
    })

    // Подсчёт статистики
    const bookingsTotal = allBookings.length
    const recentBookingsCount = useMemo(() => {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return allBookings.filter((b) => new Date(b.date) >= monthAgo).length
    }, [allBookings])

    const favoritesCount = (favoriteServices?.length || 0) + (favoriteAdvertisements?.length || 0) + (favoriteBusinesses?.length || 0)
    const reviewsCount = completedReviews?.length || 0
    const pendingReviewsCount = pendingReviewsForBadge?.length || 0
    const activeDiscountsCount = discounts.filter((d) => d.isActive && !d.isUsed).length

    if (userLoading) {
        return (
            <main>
                <div className={`mx-auto w-full ${PUBLIC_MARKETPLACE_CONTENT_MAX} px-4 sm:px-6 lg:px-8 pt-20 pb-8 md:pt-24 md:pb-12`}>
                    <div className="flex items-center justify-center min-h-[320px]">
                        <Loading loading />
                    </div>
                </div>
            </main>
        )
    }

    return (
        <ProtectedRoute allowedRoles={[CLIENT]} redirectTo="/sign-in">
            <main>
                <div className={`mx-auto w-full ${PUBLIC_MARKETPLACE_CONTENT_MAX} px-4 sm:px-6 lg:px-8 pt-20 pb-10 md:pt-24 md:pb-14`}>
                    <div className="flex flex-col lg:flex-row gap-5">

                        {/* Основной контент */}
                        <div className="flex-1 min-w-0 flex flex-col gap-4">
                            <ProfileHeader user={displayUser} />

                            <StatsGrid
                                bookingsCount={bookingsTotal}
                                recentBookingsCount={recentBookingsCount}
                                favoritesCount={favoritesCount}
                                reviewsCount={reviewsCount}
                                activeDiscountsCount={activeDiscountsCount}
                            />

                            {/* Карточка с табами */}
                            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-gray-900">
                                <Tabs value={activeTab} onChange={setActiveTab}>
                                    <TabList className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-4 border-b border-gray-100 dark:border-white/10">
                                        <TabNav value="bookings" icon={<PiCalendar />} className="whitespace-nowrap">
                                            {t('bookings')}
                                            {pendingReviewsCount > 0 && (
                                                <span className="ml-2 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                                    {pendingReviewsCount}
                                                </span>
                                            )}
                                        </TabNav>
                                        <TabNav value="reviews" icon={<PiStar />} className="whitespace-nowrap">
                                            {t('myReviews')}
                                            {pendingReviewsCount > 0 && (
                                                <span className="ml-2 rounded-full bg-yellow-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                                    {pendingReviewsCount}
                                                </span>
                                            )}
                                        </TabNav>
                                        <TabNav value="favorites" icon={<PiHeart />} className="whitespace-nowrap">
                                            {t('favorites')}
                                            {favoritesCount > 0 && (
                                                <span className="ml-2 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                                    {favoritesCount}
                                                </span>
                                            )}
                                        </TabNav>
                                        <TabNav value="discounts" icon={<PiTicket />} className="whitespace-nowrap">
                                            {t('discountsAndBonuses')}
                                        </TabNav>
                                        <TabNav value="notifications" icon={<PiBell />} className="whitespace-nowrap">
                                            {t('notificationsTab')}
                                        </TabNav>
                                    </TabList>

                                    <div className="p-4 sm:p-5 min-h-[320px]">
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
                            </div>
                        </div>

                        {/* Сайдбар */}
                        <aside className="hidden lg:flex lg:flex-col lg:w-[300px] xl:w-[300px] shrink-0 gap-4">
                            {/* Популярные категории */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
                                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    {t('popularCategoriesTitle')}
                                </h4>
                                <ul className="mt-4 flex flex-col">
                                    {categories.slice(0, 5).map((cat) => (
                                        <li
                                            key={cat.id}
                                            className="border-b border-gray-100 py-3 last:border-b-0 dark:border-white/10"
                                        >
                                            <Link
                                                href={`/services?category=${cat.id}`}
                                                className="group flex w-full items-center justify-between gap-4"
                                            >
                                                <span className="flex min-w-0 flex-1 items-center gap-3">
                                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                        <CategoryGlyph category={cat} />
                                                    </span>
                                                    <span className="min-w-0 truncate text-sm font-bold text-gray-900 group-hover:text-primary dark:text-gray-100 transition-colors">
                                                        {getCategoryName(cat, tServices)}
                                                    </span>
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/services"
                                    className="mt-2 block pt-1 text-sm font-bold text-primary hover:underline"
                                >
                                    {t('viewAllCategoriesLink')}
                                </Link>
                            </div>

                        </aside>
                    </div>
                </div>
            </main>
        </ProtectedRoute>
    )
}

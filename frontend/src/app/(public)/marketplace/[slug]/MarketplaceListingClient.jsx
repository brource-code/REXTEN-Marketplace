'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import Container from '@/components/shared/Container'
import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { getServiceProfile, getCategories, getFilteredServices } from '@/lib/api/marketplace'
import ServiceCard from '@/components/marketplace/ServiceCard'
import { getAvailableSlots } from '@/lib/api/bookings'
import { useQuery } from '@tanstack/react-query'
import { getFavoriteServices, getFavoriteBusinesses, getFavoriteAdvertisements, addToFavorites, removeFromFavorites } from '@/lib/api/client'
import { getTagLabel } from '@/mocks/tags'
import Image from 'next/image'
import ImageGallery from '@/components/shared/ImageGallery'
import BookingDialog from '@/components/marketplace/BookingDialog'
import Dialog from '@/components/ui/Dialog'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useQueryClient } from '@tanstack/react-query'
import {
    PiStarFill,
    PiHeart,
    PiHeartFill,
    PiMapPinDuotone,
    PiCalendarDuotone,
    PiUsersDuotone,
    PiChatCircleDuotone,
    PiArrowLeft,
    PiShareNetwork,
    PiCaretLeft,
    PiCaretRight,
    PiX,
    PiShieldCheck,
    PiClockCountdown,
    PiCreditCard,
    PiCamera,
} from 'react-icons/pi'
import classNames from '@/utils/classNames'
import { formatDuration } from '@/utils/formatDuration'
import { normalizeImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils'
import { formatCurrency } from '@/utils/formatCurrency'
import { useTranslations, useLocale } from 'next-intl'
import { getCategoryName } from '@/utils/categoryUtils'
import { formatDate } from '@/utils/dateTime'
import { resolveClientBookingTimezone } from '@/constants/client-datetime.constant'
import {
    marketplaceSlugsMatch,
    normalizeMarketplaceRouteSlug,
} from '@/utils/marketplace-slug'
import { useAuthStore } from '@/store'
import { CLIENT } from '@/constants/roles.constant'

// Функция для получения табов с переводами
const getTabs = (t) => [
    { id: 'overview', label: t('tabs.overview') },
    { id: 'services', label: t('tabs.services') },
    { id: 'reviews', label: t('tabs.reviews') },
    { id: 'about', label: t('tabs.about') },
    { id: 'works', label: t('tabs.works') },
]



// Функция для получения инициалов из имени
const getInitials = (name) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
}


// Skeleton компонент для загрузки
const ServiceProfileSkeleton = () => {
    return (
        <main className="text-base bg-white dark:bg-gray-900 overflow-x-hidden">
            <Container className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Хлебные крошки skeleton */}
                <div className="pt-6 pb-4">
                    <div className="h-4 w-32 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                </div>

                {/* Мобильная версия - фото сверху skeleton */}
                <div className="block lg:hidden mb-6">
                    <div className="h-56 w-full rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                </div>

                {/* Основной контент - двухколоночный layout */}
                <div className="grid lg:grid-cols-3 gap-4 lg:gap-8">
                    {/* Левая колонка - основной контент skeleton */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Категория skeleton */}
                        <div className="h-5 w-24 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse"></div>

                        {/* Название skeleton */}
                        <div className="h-7 w-48 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"></div>

                        {/* Описание skeleton */}
                        <div className="space-y-2">
                            <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                            <div className="h-3 w-4/5 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                        </div>

                        {/* Рейтинг, отзывы и город skeleton */}
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-16 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                            <div className="h-4 w-20 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                        </div>

                        {/* Теги skeleton */}
                        <div className="flex flex-wrap gap-2">
                            <div className="h-6 w-24 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                            <div className="h-6 w-28 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                        </div>

                        {/* CTA-кнопки skeleton */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <div className="h-10 w-full sm:w-32 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                            <div className="h-10 w-full sm:w-28 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                        </div>
                    </div>

                    {/* Правая колонка - фото карточка skeleton (только десктоп) */}
                    <div className="hidden lg:block">
                        <div className="rounded-xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden sticky top-24">
                            <div className="h-64 w-full bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                            <div className="p-4 border-t border-gray-100 dark:border-white/10">
                                <div className="flex items-center justify-between">
                                    <div className="h-4 w-8 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                                    <div className="h-5 w-16 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Табы skeleton */}
                <div className="mt-8 lg:mt-12 border-b border-gray-200 dark:border-white/10 mb-6">
                    <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="h-10 w-24 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"
                            ></div>
                        ))}
                    </div>
                </div>

                {/* Контент табов skeleton - услуги */}
                <div className="min-h-[320px] pb-10">
                    <div className="space-y-4">
                        <div className="h-6 w-40 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 px-4 py-4 shadow-sm"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <div className="h-4 w-32 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                                            <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                                            <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                                            <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <div className="h-4 w-16 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Container>
        </main>
    )
}

export default function MarketplaceProfilePage({
    initialProfile = null,
    initialSlug = null,
    initialCategories = null,
    primaryTitleAsH2 = false,
}) {
    const TitleTag = primaryTitleAsH2 ? 'h2' : 'h1'
    const params = useParams()
    const slug =
        normalizeMarketplaceRouteSlug(params?.slug) ||
        normalizeMarketplaceRouteSlug(initialSlug) ||
        ''
    const queryClient = useQueryClient()
    const t = useTranslations('public.marketplace')
    const tServices = useTranslations('public.services')
    const locale = useLocale()
    const { isAuthenticated, userRole, authReady } = useAuthStore()
    const favoritesApiEnabled =
        authReady && isAuthenticated && userRole === CLIENT

    const [activeTab, setActiveTab] = useState('overview')
    const [selectedDate, setSelectedDate] = useState(0)
    const [isLoading, setIsLoading] = useState(() => initialProfile == null)
    const [profile, setProfile] = useState(() => initialProfile ?? null)
    const [categories, setCategories] = useState(() => initialCategories ?? [])
    const [bookingOpen, setBookingOpen] = useState(false)
    const [bookingSuccess, setBookingSuccess] = useState(false)
    const [bookingSelectedDate, setBookingSelectedDate] = useState(0)
    const [bookingSelectedTime, setBookingSelectedTime] = useState(null)
    const [bookingSelectedMaster, setBookingSelectedMaster] = useState(null)
    const [bookingForm, setBookingForm] = useState({
        name: '',
        phone: '',
        email: '',
    })
    const [isBookingSubmitting, setIsBookingSubmitting] = useState(false)
    const [bookingError, setBookingError] = useState(null)
    const [availableSlotsData, setAvailableSlotsData] = useState({}) // Кэш доступных слотов по дате
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [showFullDescription, setShowFullDescription] = useState(false)
    const [galleryIndex, setGalleryIndex] = useState(-1)
    const [portfolioModalOpen, setPortfolioModalOpen] = useState(false)
    const [selectedPortfolioItem, setSelectedPortfolioItem] = useState(null)
    const [portfolioImageIndex, setPortfolioImageIndex] = useState(0)
    const [bookingSelectedService, setBookingSelectedService] = useState(null)
    const [isFavoriteLoading, setIsFavoriteLoading] = useState(false)
    const [serviceDetailModalOpen, setServiceDetailModalOpen] = useState(false)
    const [selectedServiceDetail, setSelectedServiceDetail] = useState(null)
    const [similarServices, setSimilarServices] = useState([])
    const [similarServicesLoading, setSimilarServicesLoading] = useState(false)

    /** чтобы не дергать избранное при каждом повторном матче RSC/props */
    const favoritesHydratedForSlugRef = useRef(null)

    // Клавиатурная навигация для портфолио
    useEffect(() => {
        if (!portfolioModalOpen || !selectedPortfolioItem) return
        
        const images = selectedPortfolioItem.images || (selectedPortfolioItem.imageUrl ? [selectedPortfolioItem.imageUrl] : [])
        
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft' && portfolioImageIndex > 0) {
                setPortfolioImageIndex(prev => prev - 1)
            } else if (e.key === 'ArrowRight' && portfolioImageIndex < images.length - 1) {
                setPortfolioImageIndex(prev => prev + 1)
            } else if (e.key === 'Escape') {
                setPortfolioModalOpen(false)
                setSelectedPortfolioItem(null)
                setPortfolioImageIndex(0)
            }
        }
        
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [portfolioModalOpen, portfolioImageIndex, selectedPortfolioItem])
    
    // Проверка статуса избранного
    const { data: favoriteServices = [], refetch: refetchFavoriteServices } = useQuery({
        queryKey: ['client-favorite-services'],
        queryFn: getFavoriteServices,
        retry: false,
        enabled: favoritesApiEnabled,
        staleTime: 30000,
    })

    const { data: favoriteBusinesses = [], refetch: refetchFavoriteBusinesses } = useQuery({
        queryKey: ['client-favorite-businesses'],
        queryFn: getFavoriteBusinesses,
        retry: false,
        enabled: favoritesApiEnabled,
        staleTime: 30000,
    })

    const { data: favoriteAdvertisements = [], refetch: refetchFavoriteAdvertisements } = useQuery({
        queryKey: ['client-favorite-advertisements'],
        queryFn: getFavoriteAdvertisements,
        retry: false,
        enabled: favoritesApiEnabled,
        staleTime: 30000,
    })
    
    const refetchFavorites = useCallback(async () => {
        await Promise.all([refetchFavoriteServices(), refetchFavoriteBusinesses(), refetchFavoriteAdvertisements()])
    }, [refetchFavoriteServices, refetchFavoriteBusinesses, refetchFavoriteAdvertisements])
    
    // Проверяем, можно ли добавить в избранное
    const canAddToFavorites = useMemo(() => {
        if (!profile?.service?.id) return false
        // Всегда можно добавить (и услуги, и объявления)
        return true
    }, [profile?.service?.id])
    
    // Проверяем, находится ли текущая услуга/объявление в избранном
    const isFavorite = useMemo(() => {
        if (!profile?.service?.id || !canAddToFavorites) return false
        
        const serviceIdStr = String(profile.service.id)
        const isAdvertisement = serviceIdStr.startsWith('ad_')
        
        if (isAdvertisement) {
            // Для объявлений извлекаем реальный ID объявления (без префикса 'ad_')
            const adId = serviceIdStr.replace('ad_', '')
            const advertisementId = parseInt(adId)
            
            if (!advertisementId || isNaN(advertisementId)) return false
            
            // Проверяем по ID объявления в избранных объявлениях
            return favoriteAdvertisements.some((fav) => {
                const raw =
                    fav.advertisementId ??
                    fav.advertisement_id ??
                    fav.favoriteable_id
                if (raw === undefined || raw === null) return false
                const favAdId = typeof raw === 'string' ? parseInt(raw, 10) : raw
                if (Number.isNaN(favAdId)) return false
                return favAdId === advertisementId
            })
        } else {
            // Для обычных услуг проверяем по serviceId
            let currentServiceId = null
            if (profile.service.service_id) {
                currentServiceId = typeof profile.service.service_id === 'string'
                    ? parseInt(profile.service.service_id)
                    : profile.service.service_id
            } else {
                currentServiceId = typeof profile.service.id === 'string'
                    ? parseInt(profile.service.id)
                    : profile.service.id
            }
            
            if (!currentServiceId) return false
            
            return favoriteServices.some(fav => {
                const favServiceId = typeof fav.serviceId === 'string' ? parseInt(fav.serviceId) : fav.serviceId
                return favServiceId === currentServiceId
            })
        }
    }, [favoriteServices, favoriteAdvertisements, profile?.service?.id, profile?.service?.service_id, canAddToFavorites])
    
    // Данные с сервера RSC или клиентский fetch при смене slug / рассинхроне пропсов
    useEffect(() => {
        if (!slug) {
            setIsLoading(false)
            return
        }

        const matchServer =
            initialProfile != null &&
            initialSlug != null &&
            marketplaceSlugsMatch(slug, initialSlug)

        if (matchServer) {
            setProfile(initialProfile)
            setCategories(initialCategories ?? [])
            setIsLoading(false)
            if (favoritesHydratedForSlugRef.current !== slug) {
                favoritesHydratedForSlugRef.current = slug
                if (favoritesApiEnabled) {
                    refetchFavorites().catch(() => {})
                }
            }
            return
        }

        favoritesHydratedForSlugRef.current = null

        let cancelled = false

        const loadProfile = async () => {
            setIsLoading(true)
            try {
                const [profileData, categoriesData] = await Promise.all([
                    getServiceProfile(slug, true),
                    getCategories(),
                ])
                if (cancelled) return
                setProfile(profileData)
                setCategories(categoriesData)
                favoritesHydratedForSlugRef.current = slug
                if (favoritesApiEnabled) {
                    try {
                        await refetchFavorites()
                    } catch {
                        /* неавторизован / нет роли CLIENT */
                    }
                }
            } catch (error) {
                console.error('Error loading profile:', error)
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        loadProfile()
        return () => {
            cancelled = true
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialCategories из RSC без стабильной ссылки
    }, [slug, initialProfile, initialSlug, refetchFavorites, favoritesApiEnabled])
    
    // Загрузка похожих услуг (та же категория и штат)
    useEffect(() => {
        const loadSimilarServices = async () => {
            if (!profile?.service) return
            
            const { category_slug, group, state, id } = profile.service
            // Приоритет: category_slug (slug категории) > group (ID категории)
            const categoryFilter = category_slug || (typeof group === 'number' ? String(group) : null)
            
            if (!categoryFilter) return
            
            setSimilarServicesLoading(true)
            try {
                const services = await getFilteredServices({
                    category: categoryFilter,
                    state: state || undefined,
                })
                
                // Исключаем текущую услугу и берём максимум 4
                const filtered = services
                    .filter(s => s.id !== id && s.path !== `/marketplace/${slug}`)
                    .slice(0, 4)
                
                setSimilarServices(filtered)
            } catch (error) {
                console.error('Error loading similar services:', error)
                setSimilarServices([])
            } finally {
                setSimilarServicesLoading(false)
            }
        }
        
        loadSimilarServices()
    }, [profile?.service, slug])
    
    // Обработчик добавления/удаления из избранного
    const handleToggleFavorite = async () => {
        if (!profile?.service?.id) return

        if (!authReady) return
        if (!isAuthenticated || userRole !== CLIENT) {
            toast.push(
                <Notification title={t('errors.authRequired')} type="info">
                    {t('pleaseLogin')}
                </Notification>
            )
            return
        }

        setIsFavoriteLoading(true)
        try {
            const serviceIdStr = String(profile.service.id)
            const isAdvertisement = serviceIdStr.startsWith('ad_')
            
            let favoriteType = 'service'
            let favoriteId = null
            
            if (isAdvertisement) {
                // Для объявлений используем реальный ID объявления (без префикса 'ad_')
                favoriteType = 'advertisement'
                // Извлекаем реальный ID объявления из 'ad_123' -> 123
                const adId = serviceIdStr.replace('ad_', '')
                favoriteId = parseInt(adId)
                
                if (!favoriteId || isNaN(favoriteId)) {
                    toast.push(
                        <Notification
                            title={t('errors.error')}
                            type="danger"
                        >
                            {t('errors.cannotDetermineAdId')}
                        </Notification>
                    )
                    return
                }
            } else {
                // Для обычных услуг используем их собственный ID
                favoriteType = 'service'
                favoriteId = typeof profile.service.id === 'string'
                    ? parseInt(profile.service.id)
                    : profile.service.id
            }
            
            if (!favoriteId) {
                toast.push(
                    <Notification
                        title={t('errors.error')}
                        type="danger"
                    >
                        {t('errors.cannotDetermineFavoriteId')}
                    </Notification>
                )
                return
            }
            
            if (isFavorite) {
                await removeFromFavorites(favoriteType, favoriteId)
                toast.push(
                    <Notification
                        title={t('success.title')}
                        type="success"
                    >
                            {isAdvertisement ? t('success.adRemovedFromFavorites') : t('success.serviceRemovedFromFavorites')}
                    </Notification>
                )
                // Обновляем кэш избранного
                if (isAdvertisement) {
                    await queryClient.invalidateQueries({ queryKey: ['client-favorite-advertisements'] })
                    await queryClient.refetchQueries({ queryKey: ['client-favorite-advertisements'] })
                } else {
                    await queryClient.invalidateQueries({ queryKey: ['client-favorite-services'] })
                    await queryClient.refetchQueries({ queryKey: ['client-favorite-services'] })
                }
            } else {
                try {
                    const { alreadyExists } = await addToFavorites(favoriteType, favoriteId)
                    if (!alreadyExists) {
                        toast.push(
                            <Notification
                                title={t('success.title')}
                                type="success"
                            >
                                {isAdvertisement ? t('success.adAddedToFavorites') : t('success.serviceAddedToFavorites')}
                            </Notification>
                        )
                    }
                    // Обновляем кэш избранного
                    if (isAdvertisement) {
                        await queryClient.invalidateQueries({ queryKey: ['client-favorite-advertisements'] })
                        await queryClient.refetchQueries({ queryKey: ['client-favorite-advertisements'] })
                    } else {
                        await queryClient.invalidateQueries({ queryKey: ['client-favorite-services'] })
                        await queryClient.refetchQueries({ queryKey: ['client-favorite-services'] })
                    }
                } catch (addError) {
                    // Если услуга уже в избранном (400), обновляем кэш и считаем успехом
                    if (addError?.response?.status === 400) {
                        const errorMessage = addError?.response?.data?.message || ''
                        if (errorMessage.includes('Already in favorites') || errorMessage.includes('уже в избранном')) {
                            // Обновляем кэш избранного
                            if (isAdvertisement) {
                                await queryClient.invalidateQueries({ queryKey: ['client-favorite-advertisements'] })
                                await queryClient.refetchQueries({ queryKey: ['client-favorite-advertisements'] })
                            } else {
                                await queryClient.invalidateQueries({ queryKey: ['client-favorite-services'] })
                                await queryClient.refetchQueries({ queryKey: ['client-favorite-services'] })
                            }
                            // Не показываем ошибку, так как уже в избранном
                            return
                        }
                    }
                    throw addError // Пробрасываем другие ошибки
                }
            }
            
            // Обновляем кэш избранного (уже обновлен выше в блоках if/else)
        } catch (error) {
            console.error('Error toggling favorite:', error)
            if (error?.response?.status === 401) {
                toast.push(
                    <Notification
                        title={t('errors.authRequired')}
                        type="info"
                    >
                        {t('pleaseLogin')}
                    </Notification>
                )
            } else if (error?.response?.status === 400) {
                const errorMessage = error?.response?.data?.message || ''
                console.error('400 error adding to favorites:', { 
                    errorMessage, 
                    type: favoriteType, 
                    id: favoriteId,
                    response: error?.response?.data 
                })
                if (errorMessage.includes('Already in favorites') || errorMessage.includes('уже в избранном')) {
                    // Уже в избранном - обновляем кэш и не показываем ошибку
                    await refetchFavorites()
                    if (isAdvertisement) {
                        await queryClient.invalidateQueries({ queryKey: ['client-favorite-advertisements'] })
                        await queryClient.refetchQueries({ queryKey: ['client-favorite-advertisements'] })
                    } else {
                        await queryClient.invalidateQueries({ queryKey: ['client-favorite-services'] })
                        await queryClient.refetchQueries({ queryKey: ['client-favorite-services'] })
                    }
                    // Не показываем ошибку, так как это нормальная ситуация
                    return
                }
                // Другие ошибки 400 показываем пользователю
                toast.push(
                    <Notification
                        title={t('errors.error')}
                        type="danger"
                    >
                        {errorMessage || t('errors.cannotUpdateFavorites')}
                    </Notification>
                )
            } else if (error?.response?.status === 404) {
                toast.push(
                    <Notification
                        title={t('errors.error')}
                        type="danger"
                    >
                        {t('errors.serviceNotFound')}
                    </Notification>
                )
            } else {
                toast.push(
                    <Notification
                        title={t('errors.error')}
                        type="danger"
                    >
                        {error.message || t('errors.cannotUpdateFavoritesTryLater')}
                    </Notification>
                )
            }
        } finally {
            setIsFavoriteLoading(false)
        }
    }
    
    // Загрузка доступных слотов при открытии модалки бронирования
    useEffect(() => {
        if (!bookingOpen || !slug) {
            return
        }
        
        let isCancelled = false
        
        const loadAvailableSlots = async () => {
            // Всегда перезагружаем профиль при открытии модалки, чтобы использовать актуальные данные
            // Используем forceRefresh=true для предотвращения кэширования
            let currentProfile = null
            try {
                console.log('Reloading profile from API...', { slug })
                currentProfile = await getServiceProfile(slug, true) // forceRefresh=true
                if (isCancelled) return
                
                // Логируем полученные данные сразу после загрузки
                if (currentProfile?.servicesList && currentProfile.servicesList.length > 0) {
                    // Фильтруем валидные услуги для логирования
                    const validServicesForLog = Array.isArray(currentProfile.servicesList) 
                        ? currentProfile.servicesList.filter(s => s && typeof s === 'object' && s.id !== undefined && s.id !== null)
                        : []
                    console.log('Profile reloaded from API:', {
                        servicesListCount: currentProfile.servicesList.length,
                        validServicesCount: validServicesForLog.length,
                        firstServiceId: validServicesForLog.length > 0 ? validServicesForLog[0]?.id : undefined,
                        allServiceIds: validServicesForLog.map(s => s.id),
                        firstServiceFull: validServicesForLog.length > 0 ? validServicesForLog[0] : null,
                        firstServiceAdditionalServices: validServicesForLog.length > 0 ? validServicesForLog[0]?.additional_services : undefined,
                        allServicesWithAdditional: validServicesForLog.map(s => ({
                            id: s.id,
                            name: s.name,
                            hasAdditionalServices: !!s.additional_services,
                            additionalServicesCount: Array.isArray(s.additional_services) ? s.additional_services.length : 0,
                            additionalServices: s.additional_services
                        }))
                    })
                } else {
                    console.warn('Profile reloaded but no services found', { currentProfile })
                }
                
                // Обновляем профиль только если модалка все еще открыта
                setProfile(currentProfile)
            } catch (error) {
                console.error('❌ Error reloading profile:', error)
                if (isCancelled) return
                // Если перезагрузка не удалась, НЕ используем старый профиль - выходим
                // Это предотвращает использование устаревших данных
                console.error('Cannot proceed without fresh profile data')
                return
            }
            
            // КРИТИЧЕСКАЯ ПРОВЕРКА: currentProfile должен быть установлен после успешной перезагрузки
            if (!currentProfile) {
                console.error('❌ currentProfile is null after reload attempt')
                return
            }
            
            if (!currentProfile?.service || !currentProfile?.schedule?.days || currentProfile.schedule.days.length === 0) {
                console.warn('Profile incomplete after reload', { currentProfile })
                return
            }
            
            // ВАЖНО: Используем ТОЛЬКО перезагруженный профиль, не старый из состояния
            const companyId = currentProfile.service.company_id ? parseInt(currentProfile.service.company_id) : null
            const servicesList = currentProfile.servicesList || []
            // Фильтруем servicesList, чтобы получить только валидные объекты (не числа)
            const validServicesList = Array.isArray(servicesList) 
                ? servicesList.filter(s => s && typeof s === 'object' && s.id !== undefined && s.id !== null)
                : []
            const selectedService = validServicesList.length > 0 ? validServicesList[0] : null
            
            // Извлекаем advertisement_id из service.id (формат: 'ad_4') или из service.advertisement_id
            const getAdvertisementId = (serviceData) => {
                if (serviceData?.advertisement_id) {
                    return parseInt(serviceData.advertisement_id)
                }
                if (serviceData?.id?.startsWith('ad_')) {
                    return parseInt(serviceData.id.replace('ad_', ''))
                }
                return null
            }
            const advertisementId = getAdvertisementId(currentProfile.service)
            
            if (!selectedService) {
                console.warn('No selected service found', { servicesList, validServicesList, currentProfile })
                return
            }
            
            // ВАЖНО: Для marketplace объявлений используем service_id из таблицы services
            // Для рекламных объявлений используем id из JSON
            const serviceId = selectedService.service_id 
                ? parseInt(selectedService.service_id) 
                : (selectedService.id && !isNaN(parseInt(selectedService.id)) 
                    ? parseInt(selectedService.id) 
                    : null)
            const serviceIdStr = serviceId ? String(serviceId) : null
            
            console.log('Loading available slots', {
                companyId,
                serviceId,
                serviceIdStr,
                selectedServiceId: selectedService.id,
                selectedService,
                servicesList,
                validServicesList,
                profileReloaded: currentProfile !== profile,
                allServiceIds: validServicesList.map(s => s.id),
                profileFromAPI: currentProfile !== profile ? 'YES - RELOADED' : 'NO - CACHED',
                oldProfileServiceIds: profile?.servicesList?.map(s => s.id) || [],
                advertisementId,
                serviceData: currentProfile.service,
            })
            
            if (!serviceId) {
                console.error('❌ Service ID is null or invalid!', {
                    selectedService,
                    serviceIdStr,
                })
                return
            }
            
            // Дополнительная проверка: убеждаемся, что мы используем перезагруженный профиль
            if (currentProfile === profile) {
                console.warn('⚠️ WARNING: Using cached profile instead of reloaded one!', {
                    currentProfile,
                    profile,
                })
            }
            
            if (!companyId || !serviceId) {
                console.warn('Missing companyId or serviceId', { companyId, serviceId })
                return
            }
            
            setLoadingSlots(true)
            
            try {
                // Загружаем слоты для всех доступных дат параллельно
                const datesToLoad = currentProfile.schedule.days.slice(0, 30)
                const slotPromises = datesToLoad.map(async (date, idx) => {
                    if (isCancelled) return null
                    
                    const dateStr = date.date || new Date().toISOString().split('T')[0]
                    if (!dateStr) return null
                    
                    try {
                        const slots = await getAvailableSlots({
                            company_id: companyId,
                            service_id: serviceId,
                            date: dateStr,
                            ...(advertisementId ? { advertisement_id: advertisementId } : {}),
                        })
                        
                        if (isCancelled) return null
                        
                        // Преобразуем формат слотов для совместимости
                        const formattedSlots = Array.isArray(slots) ? slots.map(s => ({
                            time: s.time || s.start_time || '',
                            end_time: s.end_time || s.endTime || '',
                            available: s.available !== false, // По умолчанию доступен, если не указано иное
                        })) : []
                        
                        return { dateId: date.id !== undefined ? date.id : idx, slots: formattedSlots }
                    } catch (error) {
                        // Логируем ошибку, но не прерываем процесс
                        // 404 ошибки могут возникать, если услуга не найдена или дата неактивна
                        if (error.response?.status !== 404) {
                            console.error(`Error loading slots for date ${dateStr}:`, error)
                        }
                        return null
                    }
                })
                
                const results = await Promise.all(slotPromises)
                
                if (isCancelled) return
                
                // Обновляем кэш доступных слотов
                const newSlotsData = {}
                results.forEach(result => {
                    if (result) {
                        newSlotsData[result.dateId] = result.slots
                    }
                })
                
                setAvailableSlotsData(newSlotsData)
            } catch (error) {
                console.error('Error loading available slots:', error)
            } finally {
                if (!isCancelled) {
                    setLoadingSlots(false)
                }
            }
        }
        
        loadAvailableSlots()
        
        // Cleanup функция для отмены запросов при закрытии модалки
        return () => {
            isCancelled = true
        }
    }, [bookingOpen, slug]) // Используем slug вместо profile, чтобы избежать бесконечного цикла
    
    if (!isLoading && (!profile || !profile.service)) {
        notFound()
    }

    // Если загрузка, показываем skeleton
    if (isLoading) {
        return <ServiceProfileSkeleton />
    }

    const business = profile.service
    // Получаем валюту из объявления или используем USD по умолчанию
    const currency = business?.currency || 'USD'
    
    // Проверяем и заменяем битое изображение
    const getImageUrl = (url) => {
        if (!url) return null
        // Нормализуем URL через normalizeImageUrl
        const normalized = normalizeImageUrl(url)
        // Если это битое изображение, заменяем на рабочее
        if (normalized && normalized.includes('photo-1489278353717')) {
            return 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1200&q=80'
        }
        return normalized
    }
    
    const businessImageUrl = getImageUrl(business?.imageUrl)
    const categoryInfo = categories.find((cat) => cat.id === business.group)
    const servicesListRaw = profile.servicesList || []
    
    // Фильтруем servicesList, чтобы получить только валидные объекты (не числа)
    // Ослабляем фильтрацию: принимаем строковые ID и даже пустые строки (но не null/undefined)
    const services = Array.isArray(servicesListRaw) 
        ? servicesListRaw.filter(s => {
            return s && typeof s === 'object' && !Array.isArray(s) && (s.id !== undefined && s.id !== null && s.id !== '')
        })
        : []
    const reviewTz = resolveClientBookingTimezone({ timezone: business.timezone })
    const reviews = (profile.reviews || []).map((review) => ({
        id: review.id,
        name: review.userName || review.name || t('anonymous'),
        text: review.comment || review.text || '',
        rating: review.rating || 0,
        date: review.date ? formatDate(review.date, reviewTz, 'long') : '',
        service: review.serviceName || review.service,
        master: review.specialistName || review.master,
        specialistName: review.specialistName || review.master,
        response: review.response,
        responseDate: review.responseDate,
    }))
    const team = profile.team || []
    const portfolio = profile.portfolio || []
    
    // Получаем расписание
    const availableDates = profile.schedule?.days || []
    const timeSlots = profile.schedule?.slots?.[selectedDate] || []
    
    // Вычисляем средний рейтинг из отзывов
    const averageRating = reviews.length > 0
        ? (reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length).toFixed(1)
        : (business.rating || 0).toFixed(1)

    const showOnlineBookingBadge = profile?.allowBooking !== false

    // Фото-галерея: главное фото + первые изображения из портфолио
    const galleryPhotos = [
        businessImageUrl,
        ...portfolio.slice(0, 8).map(p => normalizeImageUrl(p.images?.[0] || p.imageUrl)).filter(Boolean),
    ].filter((url, idx, arr) => url && arr.indexOf(url) === idx)

    // Минимальная цена из списка услуг
    const minServicePrice = services.reduce((min, s) => {
        const p = parseFloat(s.price)
        return (!isNaN(p) && p > 0 && (min === null || p < min)) ? p : min
    }, null)
    const firstService = services[0] || null

    // Утилита поделиться
    const handleShare = () => {
        if (navigator.share) {
            navigator.share({ title: business.name, text: business.description, url: window.location.href }).catch(() => {})
        } else {
            navigator.clipboard.writeText(window.location.href)
        }
    }

    // Открытие бронирования
    const openBooking = (serviceId = null) => {
        setBookingSelectedService(serviceId)
        setBookingSelectedDate(0)
        setBookingSelectedTime(null)
        setBookingSelectedMaster(null)
        setBookingOpen(true)
    }

    return (
        <main className="text-base bg-white dark:bg-gray-900 overflow-x-hidden pt-20 md:pt-24">
            <Container className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Хлебные крошки */}
                <div className="pb-4">
                    <Link
                        href="/services"
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-2 transition"
                    >
                        <PiArrowLeft className="text-base" />
                        <span>{t('backToServices')}</span>
                    </Link>
                </div>

                {/* ── ШАПКА: категория + заголовок + рейтинг + бейджи ── */}
                <div className="mb-5">
                    {/* Категория */}
                    <div className="mb-2">
                        <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/20 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                            {business.group === 'regular_ad'
                                ? t('regularAdvertisement')
                                : getCategoryName(business.category || categoryInfo, tServices) || business.group}
                        </span>
                    </div>

                    {/* Заголовок + кнопки (избранное, поделиться) */}
                    <div className="flex items-start gap-3 justify-between">
                        <TitleTag className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight flex-1 min-w-0">
                            {business.name}
                        </TitleTag>
                        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                            <button
                                onClick={handleToggleFavorite}
                                disabled={isFavoriteLoading}
                                className={classNames(
                                    'p-2 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition',
                                    isFavorite ? 'text-red-500 border-red-200 dark:border-red-800' : 'text-gray-400'
                                )}
                                title={isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
                            >
                                {isFavorite ? <PiHeartFill className="text-lg" /> : <PiHeart className="text-lg" />}
                            </button>
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition text-sm font-medium"
                            >
                                <PiShareNetwork className="text-base" />
                                <span className="hidden sm:inline">{t('share')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Компания */}
                    {business.companyName && business.companySlug && (
                        <div className="flex items-center gap-2 mt-1.5 text-sm">
                            <span className="text-gray-500 dark:text-gray-400">{t('company')}:</span>
                            <Link
                                href={`/marketplace/company/${business.companySlug}`}
                                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                                {business.companyName}
                                {business.companyAdvertisementsCount > 1 && (
                                    <span className="text-xs text-gray-400">({business.companyAdvertisementsCount} {t('advertisements')})</span>
                                )}
                            </Link>
                        </div>
                    )}

                    {/* Рейтинг + локация */}
                    <div className="flex flex-wrap items-center gap-3 text-sm mt-2">
                        <div className="flex items-center gap-1">
                            <PiStarFill className="text-yellow-500 text-base" />
                            <span className="font-semibold text-gray-900 dark:text-white">{averageRating}</span>
                            {(reviews.length || business.reviewsCount || 0) > 0 && (
                                <span className="text-gray-500 dark:text-gray-400">
                                    ({reviews.length || business.reviewsCount} {t('reviews')})
                                </span>
                            )}
                        </div>
                        {business.location && (
                            <>
                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                    <PiMapPinDuotone className="text-base" />
                                    <span>{business.location}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Бейджи: онлайн-бронирование + проверенный специалист */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        {showOnlineBookingBadge && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                {t('onlineBooking')}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                            <PiShieldCheck className="text-sm" />
                            {t('verifiedSpecialist')}
                        </span>
                    </div>
                </div>

                {/* ── ДВУХКОЛОНОЧНЫЙ LAYOUT: галерея + контент (слева) | сайдбар (справа) ── */}
                <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">

                    {/* ЛЕВАЯ КОЛОНКА — галерея + табы + контент */}
                    <div className="lg:col-span-2 min-w-0">

                        {/* ── ФОТО-ГАЛЕРЕЯ (внутри левой колонки) ── */}
                        {galleryPhotos.length > 0 && (
                            <div className="mb-5 rounded-xl overflow-hidden">
                                {galleryPhotos.length >= 2 ? (
                                    <div className="grid grid-cols-4 grid-rows-2 gap-1 h-56 md:h-[340px]">
                                        {/* Главное фото: 2 колонки × 2 строки */}
                                        <div
                                            className="col-span-2 row-span-2 relative bg-gray-100 dark:bg-gray-800 cursor-pointer overflow-hidden group rounded-l-xl"
                                            onClick={() => { setGalleryIndex(0) }}
                                        >
                                            <Image
                                                src={galleryPhotos[0]}
                                                alt={business.name}
                                                fill
                                                quality={90}
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                sizes="40vw"
                                            />
                                            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm">
                                                <PiCamera className="text-sm" />
                                                <span>{t('photo')}</span>
                                            </div>
                                        </div>
                                        {/* До 4 маленьких фото */}
                                        {galleryPhotos.slice(1, 5).map((photo, idx) => {
                                            const total = Math.min(galleryPhotos.length - 1, 4)
                                            const isLast = idx === total - 1
                                            const remaining = galleryPhotos.length - 5
                                            const isTopRight = idx === 1
                                            const isBottomRight = idx === 3
                                            // Заполнитель — серый квадрат если фото меньше 4
                                            return (
                                                <div
                                                    key={idx}
                                                    className={classNames(
                                                        'relative bg-gray-100 dark:bg-gray-800 cursor-pointer overflow-hidden group',
                                                        isTopRight && 'rounded-tr-xl',
                                                        isBottomRight && 'rounded-br-xl',
                                                    )}
                                                    onClick={() => { setGalleryIndex(idx + 1) }}
                                                >
                                                    <Image
                                                        src={photo}
                                                        alt={business.name}
                                                        fill
                                                        quality={80}
                                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                        sizes="20vw"
                                                    />
                                                    {isLast && remaining > 0 && (
                                                        <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-0.5">
                                                            <span className="text-white font-bold text-lg leading-none">+{remaining}</span>
                                                            <span className="text-white/80 text-xs">{t('morePhotos')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        {/* Заполнители пустых ячеек если фото 2 или 3 */}
                                        {galleryPhotos.length < 5 && Array.from({ length: 4 - (galleryPhotos.length - 1) }).map((_, i) => {
                                            const absIdx = (galleryPhotos.length - 1) + i
                                            const isTopRight = absIdx === 1
                                            const isBottomRight = absIdx === 3
                                            return (
                                                <div
                                                    key={`placeholder-${i}`}
                                                    className={classNames(
                                                        'bg-gray-100 dark:bg-gray-800',
                                                        isTopRight && 'rounded-tr-xl',
                                                        isBottomRight && 'rounded-br-xl',
                                                    )}
                                                />
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div
                                        className="relative h-56 md:h-[340px] bg-gray-100 dark:bg-gray-800 cursor-pointer overflow-hidden group rounded-xl"
                                        onClick={() => { setGalleryIndex(0) }}
                                    >
                                        <Image
                                            src={galleryPhotos[0]}
                                            alt={business.name}
                                            fill
                                            quality={90}
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            sizes="(max-width: 1024px) 100vw, 66vw"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── МОБИЛЬНЫЙ ВИДЖЕТ БРОНИРОВАНИЯ ── */}
                        <div className="lg:hidden mb-5">
                            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                                {/* Цена + кнопка */}
                                <div className="flex items-center justify-between gap-3 p-4 pb-3">
                                    <div className="min-w-0">
                                        {minServicePrice ? (
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('from')}</span>
                                                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {formatCurrency(minServicePrice, (firstService?.currency || currency))}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                                                {business.priceLabel || t('priceOnRequest')}
                                            </span>
                                        )}
                                        {firstService?.duration && (
                                            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                <PiClockCountdown className="flex-shrink-0" />
                                                <span>{t('estimatedTime')}: {formatDuration(firstService.duration, firstService.duration_unit || 'hours')}</span>
                                            </div>
                                        )}
                                        {business.location && (
                                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                                <PiMapPinDuotone className="flex-shrink-0" />
                                                <span>{business.location}</span>
                                            </div>
                                        )}
                                    </div>
                                    {showOnlineBookingBadge && (
                                        <button
                                            onClick={() => openBooking(null)}
                                            className="flex-shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold px-5 py-3.5 transition text-sm shadow-sm"
                                        >
                                            {t('book')}
                                        </button>
                                    )}
                                </div>

                                {/* Мгновенное подтверждение */}
                                <div className="flex items-center justify-center gap-1.5 pb-3 text-xs text-gray-500 dark:text-gray-400">
                                    <PiShieldCheck className="text-green-500 flex-shrink-0" />
                                    <span>{t('instantConfirmation')}</span>
                                </div>

                                {/* Разделитель */}
                                <div className="border-t border-gray-100 dark:border-gray-800 mx-4" />

                                {/* 4 trust-фичи в ряд */}
                                <div className="grid grid-cols-4 gap-1 p-3 pt-2.5">
                                    {showOnlineBookingBadge && (
                                        <div className="flex flex-col items-center gap-1 text-center px-0.5">
                                            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                                <PiCalendarDuotone className="text-blue-600 dark:text-blue-400 text-base" />
                                            </div>
                                            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 leading-tight">{t('onlineBooking')}</span>
                                            <span className="text-[9px] text-gray-400 leading-tight">{t('bookingAvailable247')}</span>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center gap-1 text-center px-0.5">
                                        <div className="p-1.5 rounded-lg bg-green-50 dark:bg-green-900/20">
                                            <PiShieldCheck className="text-green-600 dark:text-green-400 text-base" />
                                        </div>
                                        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 leading-tight">{t('verifiedSpecialist')}</span>
                                        <span className="text-[9px] text-gray-400 leading-tight">{t('platformVerified')}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 text-center px-0.5">
                                        <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                                            <PiCreditCard className="text-purple-600 dark:text-purple-400 text-base" />
                                        </div>
                                        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 leading-tight">{t('safePayments')}</span>
                                        <span className="text-[9px] text-gray-400 leading-tight">{t('paymentsProtected')}</span>
                                    </div>
                                    {(reviews.length > 0 || (business.reviewsCount || 0) > 0) && (
                                        <div className="flex flex-col items-center gap-1 text-center px-0.5">
                                            <div className="flex -space-x-1.5 mb-0.5">
                                                {['RA','SK','JM'].map((ini, i) => (
                                                    <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[7px] font-bold border border-white dark:border-gray-900">
                                                        {ini}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 leading-tight">{(reviews.length || business.reviewsCount || 0)}+</span>
                                            <span className="text-[9px] text-gray-400 leading-tight">{t('trustedClients')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Табы */}
                        <div className="border-b border-gray-200 dark:border-white/10 mb-6">
                            <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {getTabs(t).filter(tab => {
                                    if (tab.id === 'reviews' && profile?.showReviews === false) return false
                                    if (tab.id === 'works' && (!portfolio || portfolio.length === 0 || !(profile?.showPortfolio ?? true))) return false
                                    return true
                                }).map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={classNames(
                                            'px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap flex-shrink-0',
                                            activeTab === tab.id
                                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── КОНТЕНТ ТАБОВ ── */}
                        <div className="min-h-[320px] pb-10">

                            {/* TAB: ОБЗОР */}
                            {activeTab === 'overview' && (
                                <div className="space-y-8">

                                    {/* О специалисте */}
                                    {business.description && (
                                        <div>
                                            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                                                {t('aboutSpecialist')}
                                            </h2>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                                {showFullDescription || business.description.length <= 300
                                                    ? business.description
                                                    : business.description.substring(0, 300) + '…'}
                                            </p>
                                            {business.description.length > 300 && (
                                                <button
                                                    onClick={() => setShowFullDescription(v => !v)}
                                                    className="mt-1.5 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                                                >
                                                    {showFullDescription ? t('hide') : t('showMore')}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Строка статистики: год, заказы, язык */}
                                    {(business.yearFounded || business.ordersCompleted || business.tags?.includes('russian-speaking')) && (
                                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                                            {business.yearFounded && (
                                                <div className="flex items-center gap-1.5">
                                                    <PiCalendarDuotone className="text-base flex-shrink-0" />
                                                    <span>{t('workingSince', { year: business.yearFounded })}</span>
                                                </div>
                                            )}
                                            {business.ordersCompleted > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <PiUsersDuotone className="text-base flex-shrink-0" />
                                                    <span>{business.ordersCompleted}+ {t('ordersCompleted')}</span>
                                                </div>
                                            )}
                                            {business.tags?.includes('russian-speaking') && (
                                                <div className="flex items-center gap-1.5">
                                                    <PiChatCircleDuotone className="text-base flex-shrink-0" />
                                                    <span>{getTagLabel('russian-speaking', tServices)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Доступные услуги */}
                                    {services && services.length > 0 && (
                                        <div>
                                            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">
                                                {t('availableServices')}
                                            </h2>

                                            {/* Мобилка: список-строки */}
                                            <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                                {services.map((service, index) => (
                                                    <div
                                                        key={service.id || `service-mob-${index}`}
                                                        onClick={() => { setSelectedServiceDetail(service); setServiceDetailModalOpen(true) }}
                                                        className="flex items-center justify-between gap-3 px-4 py-3.5 bg-white dark:bg-gray-900 active:bg-gray-50 dark:active:bg-gray-800 cursor-pointer"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug">{service.name}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                {service.duration && `${formatDuration(service.duration, service.duration_unit || 'hours')} · `}
                                                                {t('tabs.services')}
                                                            </p>
                                                            {service.description && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{service.description}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            {service.price && (
                                                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                                    {formatCurrency(service.price, service.currency || currency)}
                                                                </span>
                                                            )}
                                                            <PiCaretRight className="text-gray-400 text-sm flex-shrink-0" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Десктоп: сетка карточек */}
                                            <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {services.map((service, index) => (
                                                    <div
                                                        key={service.id || `service-${index}`}
                                                        onClick={() => {
                                                            setSelectedServiceDetail(service)
                                                            setServiceDetailModalOpen(true)
                                                        }}
                                                        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer flex flex-col"
                                                    >
                                                        <div className="flex items-start justify-between mb-1.5">
                                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug flex-1 min-w-0 pr-2">
                                                                {service.name}
                                                            </h3>
                                                            {service.price && (
                                                                <span className="text-sm font-bold text-gray-900 dark:text-white flex-shrink-0">
                                                                    {formatCurrency(service.price, service.currency || currency)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                            {service.duration && (
                                                                <span>{formatDuration(service.duration, service.duration_unit || 'hours')}</span>
                                                            )}
                                                            {service.duration && <span>•</span>}
                                                            <span>{t('tabs.services')}</span>
                                                        </div>
                                                        {service.description && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 flex-1">
                                                                {service.description}
                                                            </p>
                                                        )}
                                                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-auto">
                                                            {t('selectAndBook')} →
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Кнопка «Выбрать и забронировать» на мобилке */}
                                            {showOnlineBookingBadge && (
                                                <button
                                                    onClick={() => openBooking(null)}
                                                    className="sm:hidden mt-3 w-full text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline py-1"
                                                >
                                                    {t('viewAllServices')} →
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Превью отзывов */}
                                    {profile?.showReviews !== false && reviews.length > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                                    {t('tabs.reviews')} ({reviews.length})
                                                </h2>
                                                <div className="flex items-center gap-1 text-sm">
                                                    <PiStarFill className="text-yellow-500" />
                                                    <span className="font-semibold text-gray-900 dark:text-white">{averageRating}</span>
                                                    <span className="text-gray-500 dark:text-gray-400">{t('outOf5')}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                {reviews.slice(0, 3).map((review, idx) => (
                                                    <div key={review.id || `rev-${idx}`} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300 flex-shrink-0">
                                                                {getInitials(review.name)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{review.name}</span>
                                                                    <div className="flex items-center gap-0.5">
                                                                        {[...Array(5)].map((_, i) => (
                                                                            <PiStarFill key={i} className={classNames('text-xs', i < review.rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600')} />
                                                                        ))}
                                                                    </div>
                                                                    <span className="text-xs text-gray-400">{review.date}</span>
                                                                </div>
                                                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5 leading-relaxed">{review.text}</p>
                                                                {review.response && (
                                                                    <div className="mt-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-blue-500">
                                                                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-0.5">{t('responseFrom', { name: business.name })}</p>
                                                                        <p className="text-xs text-gray-600 dark:text-gray-300">{review.response}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {reviews.length > 3 && (
                                                <button
                                                    onClick={() => setActiveTab('reviews')}
                                                    className="mt-4 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    {t('allReviews')} ({reviews.length}) →
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB: УСЛУГИ */}
                            {activeTab === 'services' && (
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('availableServices')}</h3>
                                    {services && services.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {services.map((service, index) => (
                                                <div
                                                    key={service.id || `service-${index}`}
                                                    onClick={() => {
                                                        setSelectedServiceDetail(service)
                                                        setServiceDetailModalOpen(true)
                                                    }}
                                                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 hover:shadow-md transition-all cursor-pointer"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{service.name}</h3>
                                                        {service.price && (
                                                            <span className="text-base font-bold text-gray-900 dark:text-white ml-2 flex-shrink-0">
                                                                {formatCurrency(service.price, service.currency || currency)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                        {service.duration && <span>{formatDuration(service.duration, service.duration_unit || 'hours')}</span>}
                                                        {service.duration && <span>•</span>}
                                                        <span>{t('tabs.services')}</span>
                                                    </div>
                                                    {service.description && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{service.description}</p>
                                                    )}
                                                    <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                        {t('selectAndBook')} →
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center border border-dashed border-gray-200 dark:border-white/20 rounded-xl">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('noServicesAvailable')}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB: ОТЗЫВЫ */}
                            {activeTab === 'reviews' && (profile?.showReviews ?? true) && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <PiStarFill className="text-yellow-500 text-2xl" />
                                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{averageRating}</span>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('basedOnReviews', { count: reviews.length, reviewWord: reviews.length === 1 ? t('review') : t('reviews') })}
                                        </p>
                                    </div>
                                    {reviews.length === 0 ? (
                                        <div className="py-12 text-center border border-dashed border-gray-200 dark:border-white/20 rounded-xl">
                                            <PiChatCircleDuotone className="text-4xl text-gray-400 mx-auto mb-3" />
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('noReviews')}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('beFirstToReview')}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {reviews.map((review, idx) => (
                                                <div key={review.id || `review-${idx}`} className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 px-4 py-4 shadow-sm">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300 flex-shrink-0">
                                                                {getInitials(review.name)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{review.name}</h4>
                                                                    <div className="flex items-center gap-0.5">
                                                                        {[...Array(5)].map((_, i) => (
                                                                            <PiStarFill key={i} className={classNames('text-xs', i < review.rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600')} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <p className="text-xs text-gray-400 mt-0.5">{review.date}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-3">{review.text}</p>
                                                    {review.response && (
                                                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-blue-500">
                                                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t('responseFrom', { name: business.name })}</p>
                                                            <p className="text-sm text-gray-700 dark:text-gray-300">{review.response}</p>
                                                            {review.responseDate && <p className="text-xs text-gray-400 mt-1">{formatDate(review.responseDate, reviewTz, 'long')}</p>}
                                                        </div>
                                                    )}
                                                    {(() => {
                                                        const hasService = review.service?.trim()
                                                        const specialistName = (review.specialistName?.trim() || review.master?.trim())
                                                        const hasSpecialist = specialistName && specialistName !== 'Администратор Системы'
                                                        if (!hasService && !hasSpecialist) return null
                                                        return (
                                                            <div className="flex flex-wrap gap-2 mt-3">
                                                                {hasService && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">{t('service')}: {review.service}</span>}
                                                                {hasSpecialist && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">{t('specialist')}: {specialistName}</span>}
                                                            </div>
                                                        )
                                                    })()}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB: О СПЕЦИАЛИСТЕ */}
                            {activeTab === 'about' && (
                                <div className="space-y-6">
                                    {business.description && (
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('aboutSpecialist')}</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{business.description}</p>
                                        </div>
                                    )}
                                    {team.length > 0 && (
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('team')}</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {team.map((member, idx) => {
                                                    const teamPhoto = member.avatarUrl || member.avatar
                                                    return (
                                                        <div key={member.id || `member-${idx}`} className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-4 shadow-sm">
                                                            <div className="flex items-start gap-3">
                                                                {teamPhoto ? (
                                                                    <div className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-200 dark:border-gray-700 relative">
                                                                        <Image src={normalizeImageUrl(teamPhoto) || FALLBACK_IMAGE} alt={member.name} fill quality={90} className="object-cover" sizes="48px" />
                                                                    </div>
                                                                ) : (
                                                                    <div className={classNames('h-12 w-12 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0', member.avatarColor || 'bg-blue-500')}>
                                                                        {getInitials(member.name)}
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{member.name}</h4>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{member.role}</p>
                                                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{member.description || member.bio}</p>
                                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                                        {member.experience && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">{t('experience')} {member.experience}</span>}
                                                                        {member.languages && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">{member.languages}</span>}
                                                                    </div>
                                                                    {member.rating && (
                                                                        <div className="flex items-center gap-1 mt-2">
                                                                            <PiStarFill className="text-yellow-500 text-xs" />
                                                                            <span className="text-xs text-gray-500">{member.rating.toFixed(1)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {team.length === 0 && !business.description && (
                                        <div className="py-12 text-center border border-dashed border-gray-200 dark:border-white/20 rounded-xl">
                                            <PiUsersDuotone className="text-4xl text-gray-400 mx-auto mb-3" />
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('noTeamInfo')}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB: РАБОТЫ */}
                            {activeTab === 'works' && portfolio.length > 0 && (profile?.showPortfolio ?? true) && (
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('ourWorks')}</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {portfolio.map((item, idx) => {
                                            const images = item.images || (item.imageUrl ? [item.imageUrl] : [])
                                            const firstImage = images[0] || '/img/others/placeholder.jpg'
                                            const remainingImagesCount = Math.max(0, images.length - 1)
                                            return (
                                                <div
                                                    key={item.id || `portfolio-${idx}`}
                                                    onClick={() => { setSelectedPortfolioItem(item); setPortfolioImageIndex(0); setPortfolioModalOpen(true) }}
                                                    className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm cursor-pointer hover:shadow-md transition-all group"
                                                >
                                                    <div className="relative w-full aspect-[4/3]">
                                                        <Image src={normalizeImageUrl(firstImage) || FALLBACK_IMAGE} alt={item.title || t('portfolio')} fill quality={90} className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 50vw, 33vw" />
                                                        {remainingImagesCount > 0 && (
                                                            <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded-full backdrop-blur-sm">+{remainingImagesCount}</div>
                                                        )}
                                                    </div>
                                                    <div className="px-3 py-2">
                                                        {item.title && <h3 className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-1">{item.title}</h3>}
                                                        {item.tag && <span className="inline-block px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full mt-1">{item.tag}</span>}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* ПРАВАЯ КОЛОНКА — booking widget (только десктоп) */}
                    <div className="hidden lg:block">
                        <div className="sticky top-24 space-y-3">

                            {/* Карточка цены + кнопка бронирования */}
                            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-900 shadow-sm">
                                {/* Цена */}
                                <div className="mb-4">
                                    {minServicePrice ? (
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('from')}</span>
                                            <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(minServicePrice, (firstService?.currency || currency))}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                                            {business.priceLabel || t('priceOnRequest')}
                                        </span>
                                    )}
                                    {/* Примерное время */}
                                    {firstService?.duration && (
                                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            <PiClockCountdown className="text-base flex-shrink-0" />
                                            <span>{t('estimatedTime')}: {formatDuration(firstService.duration, firstService.duration_unit || 'hours')}</span>
                                        </div>
                                    )}
                                    {/* Локация */}
                                    {business.location && (
                                        <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                                            <PiMapPinDuotone className="text-base flex-shrink-0" />
                                            <span>{business.location}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Кнопка «Забронировать» */}
                                {showOnlineBookingBadge && (
                                    <button
                                        onClick={() => openBooking(null)}
                                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 transition shadow-sm text-base"
                                    >
                                        {t('book')}
                                    </button>
                                )}

                                {/* Мгновенное подтверждение */}
                                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500 dark:text-gray-400">
                                    <PiShieldCheck className="text-green-500 text-sm flex-shrink-0" />
                                    <span>{t('instantConfirmation')}</span>
                                </div>
                            </div>

                            {/* Trust-блок */}
                            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 space-y-3.5">
                                {showOnlineBookingBadge && (
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex-shrink-0">
                                            <PiCalendarDuotone className="text-blue-600 dark:text-blue-400 text-lg" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{t('onlineBooking')}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('bookingAvailable247')}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 flex-shrink-0">
                                        <PiShieldCheck className="text-green-600 dark:text-green-400 text-lg" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{t('verifiedSpecialist')}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('platformVerified')}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex-shrink-0">
                                        <PiCreditCard className="text-purple-600 dark:text-purple-400 text-lg" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{t('safePayments')}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('paymentsProtected')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Доверяют клиенты */}
                            {(reviews.length > 0 || (business.reviewsCount || 0) > 0) && (
                                <div className="flex items-center gap-3 px-1 py-1">
                                    <div className="flex -space-x-2">
                                        {['RA', 'SK', 'JM'].map((initials, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold border-2 border-white dark:border-gray-900 flex-shrink-0">
                                                {initials}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {(reviews.length || business.reviewsCount || 0)}+ {t('trustedClients')}
                                    </span>
                                </div>
                            )}

                            {/* Особенности */}
                            {Array.isArray(business.tags) && business.tags.length > 0 && (
                                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                                        {t('features')}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {business.tags.map((tag) => (
                                            <span key={tag} className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                                                {getTagLabel(tag, tServices)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Кнопка «Поделиться» */}
                            <button
                                onClick={handleShare}
                                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-3 transition flex items-center justify-center gap-2 font-medium"
                            >
                                <PiShareNetwork className="text-lg" />
                                <span>{t('share')}</span>
                            </button>
                        </div>
                    </div>

                </div>

                {/* Блок похожих услуг */}
                {similarServices.length > 0 && (
                    <div className="mt-4 md:mt-6 pt-4 md:pt-5 border-t border-gray-200 dark:border-gray-700">
                        <div className="mb-4 md:mb-6">
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2">
                                {t('similarServices')}
                            </h2>
                            <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
                                {t('similarServicesDescription')}
                            </p>
                        </div>
                        
                        {/* Мобильная версия - горизонтальный скролл */}
                        <div className="md:hidden -mx-4 px-4 overflow-x-auto scrollbar-hide">
                            <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
                                {similarServices.map((service) => (
                                    <div key={service.id} className="w-[280px] flex-shrink-0">
                                        <ServiceCard
                                            service={service}
                                            variant="compact"
                                            showBadges={true}
                                            showRating={true}
                                            showTags={false}
                                            className="!flex w-full"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Десктопная версия - сетка */}
                        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {similarServices.map((service) => (
                                <ServiceCard
                                    key={service.id}
                                    service={service}
                                    showBadges={true}
                                    showRating={true}
                                    showTags={true}
                                    className="!flex"
                                />
                            ))}
                        </div>
                    </div>
                )}
            </Container>

            {/* Модалка бронирования */}
            {/* Модалка с описанием услуги */}
            <Dialog
                isOpen={serviceDetailModalOpen}
                onClose={() => {
                    setServiceDetailModalOpen(false)
                    setSelectedServiceDetail(null)
                }}
                width={600}
            >
                {selectedServiceDetail && (
                    <div className="p-4">
                        <div className="mb-4">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                {selectedServiceDetail.name}
                            </h3>
                            {selectedServiceDetail.price && (
                                <div className="text-xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(selectedServiceDetail.price, selectedServiceDetail.currency || currency)}
                                </div>
                            )}
                        </div>
                        
                        {selectedServiceDetail.description && (
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                                    {selectedServiceDetail.description}
                                </p>
                            </div>
                        )}
                        
                        <div className="flex items-center gap-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
                            {selectedServiceDetail.duration && (
                                <span className="flex items-center gap-1">
                                    ⏱ {formatDuration(selectedServiceDetail.duration, selectedServiceDetail.duration_unit || 'hours')}
                                </span>
                            )}
                            {selectedServiceDetail.category && typeof selectedServiceDetail.category === 'string' && selectedServiceDetail.category.trim() !== '' && (
                                <span>• {(() => {
                                    try {
                                        const categoryName = getCategoryName(selectedServiceDetail.category, tServices)
                                        return categoryName || selectedServiceDetail.category
                                    } catch (error) {
                                        return selectedServiceDetail.category
                                    }
                                })()}</span>
                            )}
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setServiceDetailModalOpen(false)
                                }}
                                className={`${showOnlineBookingBadge ? 'flex-1' : 'w-full'} px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium`}
                            >
                                {t('close')}
                            </button>
                            {showOnlineBookingBadge && (
                                <button
                                    onClick={() => {
                                        setBookingSelectedService(selectedServiceDetail.id)
                                        setServiceDetailModalOpen(false)
                                        setSelectedServiceDetail(null)
                                        setBookingOpen(true)
                                    }}
                                    className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                                >
                                    {t('book')}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Dialog>

            <BookingDialog
                isOpen={bookingOpen}
                onClose={() => {
                    setBookingOpen(false)
                    setBookingSelectedDate(0)
                    setBookingSelectedTime(null)
                    setBookingSelectedMaster(null)
                    setBookingError(null)
                    setAvailableSlotsData({})
                    setBookingSelectedService(null)
                }}
                onSuccess={(opts) => {
                    queryClient.invalidateQueries({ queryKey: ['client-bookings'] })
                    queryClient.invalidateQueries({ queryKey: ['client-orders'] })
                    if (!opts?.hadOnlinePayment) {
                        setBookingSuccess(true)
                    }
                }}
                slug={slug}
                profile={profile}
                services={services}
                team={team}
                availableDates={availableDates}
                companyId={profile?.service?.company_id ? parseInt(profile.service.company_id) : null}
                advertisementId={profile?.service?.advertisement_id ? parseInt(profile.service.advertisement_id) : 
                    (profile?.service?.id?.startsWith('ad_') ? parseInt(profile.service.id.replace('ad_', '')) : null)}
                preselectedServiceId={bookingSelectedService}
            />
            

            {/* Модалка портфолио с каруселью */}
            <Dialog
                isOpen={portfolioModalOpen}
                onClose={() => {
                    setPortfolioModalOpen(false)
                    setSelectedPortfolioItem(null)
                    setPortfolioImageIndex(0)
                }}
                width={900}
                height="auto"
                contentClassName="max-h-[90vh] overflow-hidden flex flex-col"
            >
                {selectedPortfolioItem && (() => {
                    const images = selectedPortfolioItem.images || (selectedPortfolioItem.imageUrl ? [selectedPortfolioItem.imageUrl] : [])
                    const hasMultipleImages = images.length > 1
                    
                    return (
                        <div className="flex flex-col h-full">
                            {/* Заголовок */}
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
                                <div className="flex-1">
                                    {selectedPortfolioItem.title && (
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                            {selectedPortfolioItem.title}
                                        </h3>
                                    )}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {selectedPortfolioItem.tag && (
                                            <span className="inline-block px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full">
                                                {selectedPortfolioItem.tag}
                                            </span>
                                        )}
                                        {hasMultipleImages && (
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {portfolioImageIndex + 1} / {images.length}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setPortfolioModalOpen(false)
                                        setSelectedPortfolioItem(null)
                                        setPortfolioImageIndex(0)
                                    }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <PiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>
                            
                            {/* Карусель изображений */}
                            <div className="relative flex-1 min-h-[320px] max-h-[60vh] bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                {images.length > 0 ? (
                                    <>
                                        <Image
                                            src={normalizeImageUrl(images[portfolioImageIndex]) || FALLBACK_IMAGE}
                                            alt={selectedPortfolioItem.title || t('portfolio')}
                                            fill
                                            quality={90}
                                            className="object-contain"
                                            sizes="(max-width: 768px) 100vw, 80vw"
                                        />
                                        
                                        {/* Навигация */}
                                        {hasMultipleImages && (
                                            <>
                                                {/* Стрелка влево */}
                                                {portfolioImageIndex > 0 && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setPortfolioImageIndex(prev => prev - 1)
                                                        }}
                                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all z-10"
                                                    >
                                                        <PiCaretLeft className="w-6 h-6" />
                                                    </button>
                                                )}
                                                
                                                {/* Стрелка вправо */}
                                                {portfolioImageIndex < images.length - 1 && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setPortfolioImageIndex(prev => prev + 1)
                                                        }}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all z-10"
                                                    >
                                                        <PiCaretRight className="w-6 h-6" />
                                                    </button>
                                                )}
                                                
                                                {/* Индикаторы */}
                                                {images.length > 1 && (
                                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                                                        {images.map((_, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => setPortfolioImageIndex(idx)}
                                                                className={classNames(
                                                                    'w-2 h-2 rounded-full transition-all',
                                                                    idx === portfolioImageIndex
                                                                        ? 'bg-white w-6'
                                                                        : 'bg-white/50 hover:bg-white/75'
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-gray-400 dark:text-gray-500">
                                        Нет изображений
                                    </div>
                                )}
                            </div>
                            
                            {/* Описание */}
                            {selectedPortfolioItem.description && (
                                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                        {selectedPortfolioItem.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    )
                })()}
            </Dialog>

            {/* Модалка успешного подтверждения */}
            {bookingSuccess && (
                <div 
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    style={{ 
                        minHeight: '100vh',
                        minHeight: '-webkit-fill-available',
                        height: '100dvh',
                        paddingTop: 'max(1rem, env(safe-area-inset-top))',
                        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
                    }}
                    onClick={() => setBookingSuccess(false)}
                >
                    <div 
                        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm p-4 text-center relative transform transition-all duration-200 scale-100 opacity-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Иконка успеха */}
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <svg 
                                className="h-8 w-8 text-blue-600 dark:text-blue-400" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                viewBox="0 0 24 24"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    d="M5 13l4 4L19 7" 
                                />
                            </svg>
                        </div>

                        {/* Заголовок */}
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {t('bookingConfirmed')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            {t('bookingRequestSent')}
                        </p>

                        {/* Кнопка закрытия */}
                        <button
                            className="mt-6 w-full rounded-full bg-blue-600 hover:bg-blue-700 py-3 text-white font-semibold transition"
                            onClick={() => {
                                setBookingSuccess(false)
                                setBookingForm({ name: '', phone: '' })
                                setBookingSelectedDate(0)
                                setBookingSelectedTime(null)
                                setBookingSelectedMaster(null)
                            }}
                        >
                            {t('great')}
                        </button>
                    </div>
                </div>
            )}

            {/* Лайтбокс галереи */}
            <ImageGallery
                index={galleryIndex}
                slides={galleryPhotos.map(src => ({ src }))}
                onClose={() => setGalleryIndex(-1)}
            />
        </main>
    )
}

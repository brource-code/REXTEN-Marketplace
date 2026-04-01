'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Container from '@/components/shared/Container'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getServiceProfile, getCategories } from '@/lib/api/marketplace'
import { getAvailableSlots } from '@/lib/api/bookings'
import { useQuery } from '@tanstack/react-query'
import { getFavoriteServices, getFavoriteBusinesses, getFavoriteAdvertisements, addToFavorites, removeFromFavorites } from '@/lib/api/client'
import { tagDictionary } from '@/mocks/tags'
import Image from 'next/image'
import NotFound404 from '@/assets/svg/NotFound404'
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
} from 'react-icons/pi'
import classNames from '@/utils/classNames'
import { formatDuration } from '@/utils/formatDuration'
import { normalizeImageUrl } from '@/utils/imageUtils'
import { formatCurrency } from '@/utils/formatCurrency'

const TABS = [
    { id: 'schedule', label: 'Расписание', icon: PiCalendarDuotone },
    { id: 'reviews', label: 'Отзывы', icon: PiChatCircleDuotone },
    { id: 'team', label: 'Команда', icon: PiUsersDuotone },
]

// Функция для получения бейджей из тегов
const getBadges = (tags) => {
    const badges = []
    if (tags.includes('premium')) {
        badges.push({ label: 'Premium', color: 'bg-yellow-500' })
    }
    if (tags.includes('mobile')) {
        badges.push({ label: 'Выездной', color: 'bg-black/70' })
    }
    if (tags.includes('russian-speaking')) {
        badges.push({ label: 'RU', color: 'bg-black/70' })
    }
    return badges
}


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
        <main className="px-4 lg:px-0 text-base bg-white dark:bg-gray-900 overflow-x-hidden">
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
                <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
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
                        <div className="rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden sticky top-24">
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
                <div className="min-h-[400px] pb-12">
                    <div className="space-y-4">
                        <div className="h-6 w-40 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 px-4 py-4 shadow-sm"
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

export default function MarketplaceProfilePage() {
    const params = useParams()
    const slug = params?.slug
    const queryClient = useQueryClient()
    
    const [activeTab, setActiveTab] = useState('schedule')
    const [selectedDate, setSelectedDate] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [profile, setProfile] = useState(null)
    const [categories, setCategories] = useState([])
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
    const [galleryOpen, setGalleryOpen] = useState(false)
    const [galleryIndex, setGalleryIndex] = useState(-1)
    const [portfolioModalOpen, setPortfolioModalOpen] = useState(false)
    const [selectedPortfolioItem, setSelectedPortfolioItem] = useState(null)
    const [portfolioImageIndex, setPortfolioImageIndex] = useState(0)
    const [bookingSelectedService, setBookingSelectedService] = useState(null)
    const [isFavoriteLoading, setIsFavoriteLoading] = useState(false)
    const [serviceDetailModalOpen, setServiceDetailModalOpen] = useState(false)
    const [selectedServiceDetail, setSelectedServiceDetail] = useState(null)
    
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
        enabled: false, // Загружаем только при необходимости
    })
    
    const { data: favoriteBusinesses = [], refetch: refetchFavoriteBusinesses } = useQuery({
        queryKey: ['client-favorite-businesses'],
        queryFn: getFavoriteBusinesses,
        retry: false,
        enabled: false, // Загружаем только при необходимости
    })
    
    const { data: favoriteAdvertisements = [], refetch: refetchFavoriteAdvertisements } = useQuery({
        queryKey: ['client-favorite-advertisements'],
        queryFn: getFavoriteAdvertisements,
        retry: false,
        enabled: false, // Загружаем только при необходимости
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
                const favAdId = typeof fav.advertisementId === 'string' ? parseInt(fav.advertisementId) : fav.advertisementId
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
    
    // Загрузка данных профиля
    useEffect(() => {
        const loadProfile = async () => {
            if (!slug) {
                setIsLoading(false)
                return
            }
            
            setIsLoading(true)
            try {
                const [profileData, categoriesData] = await Promise.all([
                    getServiceProfile(slug),
                    getCategories(),
                ])
                setProfile(profileData)
                setCategories(categoriesData)
                
                // Загружаем избранное после загрузки профиля
                try {
                    await refetchFavorites()
                } catch (error) {
                    // Игнорируем ошибки авторизации для избранного
                    console.log('Could not load favorites (user may not be logged in)')
                }
            } catch (error) {
                console.error('Error loading profile:', error)
            } finally {
                setIsLoading(false)
            }
        }
        loadProfile()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug])
    
    // Обработчик добавления/удаления из избранного
    const handleToggleFavorite = async () => {
        if (!profile?.service?.id) return
        
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
                            title="Ошибка"
                            type="danger"
                        >
                            Не удалось определить ID объявления.
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
                        title="Ошибка"
                        type="danger"
                    >
                        Не удалось определить ID для добавления в избранное.
                    </Notification>
                )
                return
            }
            
            if (isFavorite) {
                await removeFromFavorites(favoriteType, favoriteId)
                toast.push(
                    <Notification
                        title="Успех"
                        type="success"
                    >
                        {isAdvertisement ? 'Объявление удалено из избранного' : 'Услуга удалена из избранного'}
                    </Notification>
                )
                // Обновляем кэш избранного
                if (isAdvertisement) {
                    await queryClient.invalidateQueries({ queryKey: ['client-favorite-advertisements'] })
                } else {
                    await queryClient.invalidateQueries({ queryKey: ['client-favorite-services'] })
                }
            } else {
                try {
                    await addToFavorites(favoriteType, favoriteId)
                    toast.push(
                        <Notification
                            title="Успех"
                            type="success"
                        >
                            {isAdvertisement ? 'Объявление добавлено в избранное' : 'Услуга добавлена в избранное'}
                        </Notification>
                    )
                    // Обновляем кэш избранного
                    if (isAdvertisement) {
                        await queryClient.invalidateQueries({ queryKey: ['client-favorite-advertisements'] })
                    } else {
                        await queryClient.invalidateQueries({ queryKey: ['client-favorite-services'] })
                    }
                } catch (addError) {
                    // Если услуга уже в избранном (400), обновляем кэш и считаем успехом
                    if (addError?.response?.status === 400) {
                        const errorMessage = addError?.response?.data?.message || ''
                        if (errorMessage.includes('Already in favorites') || errorMessage.includes('уже в избранном')) {
                            // Обновляем кэш избранного
                            if (isAdvertisement) {
                                await queryClient.invalidateQueries({ queryKey: ['client-favorite-advertisements'] })
                            } else {
                                await queryClient.invalidateQueries({ queryKey: ['client-favorite-services'] })
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
                        title="Требуется авторизация"
                        type="info"
                    >
                        Пожалуйста, войдите, чтобы добавлять услуги в избранное
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
                    } else {
                        await queryClient.invalidateQueries({ queryKey: ['client-favorite-services'] })
                    }
                    // Не показываем ошибку, так как это нормальная ситуация
                    return
                }
                // Другие ошибки 400 показываем пользователю
                toast.push(
                    <Notification
                        title="Ошибка"
                        type="danger"
                    >
                        {errorMessage || 'Не удалось обновить избранное.'}
                    </Notification>
                )
            } else if (error?.response?.status === 404) {
                toast.push(
                    <Notification
                        title="Ошибка"
                        type="danger"
                    >
                        Услуга не найдена. Возможно, она была удалена.
                    </Notification>
                )
            } else {
                toast.push(
                    <Notification
                        title="Ошибка"
                        type="danger"
                    >
                        {error.message || 'Не удалось обновить избранное. Попробуйте позже.'}
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
    
    // Если загрузка, показываем skeleton
    if (isLoading) {
        return <ServiceProfileSkeleton />
    }

    if (!profile || !profile.service) {
        return (
            <main className="px-4 lg:px-0 text-base bg-white dark:bg-gray-900 min-h-screen">
                <section className="relative overflow-hidden py-24">
                    <div
                        className="absolute inset-0 pointer-events-none select-none opacity-70"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='50' height='50' fill='none' stroke='${'#eaeaea'}'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
                        }}
                    ></div>
                    <Container>
                        <div className="relative text-center max-w-3xl mx-auto py-20">
                            <div className="mb-8 flex justify-center">
                                <NotFound404 height={200} width={200} />
                            </div>
                            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                                Бизнес не найден
                            </h2>
                            <p className="text-gray-500 dark:text-white/70 text-lg mb-8 max-w-md mx-auto">
                                Бизнес с таким адресом не существует или был удален
                            </p>
                            <div className="flex gap-4 justify-center">
                                <Link
                                    href="/services"
                                    className="inline-flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 h-12 rounded-2xl px-6 py-2 text-base font-semibold transition"
                                >
                                    Посмотреть все услуги
                                </Link>
                                <Link
                                    href="/landing"
                                    className="inline-flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 text-gray-600 dark:text-gray-100 h-12 rounded-2xl px-6 py-2 text-base font-semibold transition"
                                >
                                    На главную
                                </Link>
                            </div>
                        </div>
                    </Container>
                </section>
            </main>
        )
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
    const badges = getBadges(business.tags || [])
    const servicesListRaw = profile.servicesList || []
    
    // Логируем сырые данные перед фильтрацией
    console.log('[MarketplaceProfilePage] Raw servicesList:', {
        rawCount: servicesListRaw.length,
        rawServices: servicesListRaw.map((s, idx) => ({
            index: idx,
            type: typeof s,
            isObject: typeof s === 'object',
            isArray: Array.isArray(s),
            id: s?.id,
            idType: typeof s?.id,
            idValue: s?.id,
            hasId: s?.id !== undefined && s?.id !== null,
            fullItem: s
        }))
    })
    
    // Фильтруем servicesList, чтобы получить только валидные объекты (не числа)
    // Ослабляем фильтрацию: принимаем строковые ID и даже пустые строки (но не null/undefined)
    const services = Array.isArray(servicesListRaw) 
        ? servicesListRaw.filter(s => {
            const isValid = s && typeof s === 'object' && !Array.isArray(s) && (s.id !== undefined && s.id !== null && s.id !== '')
            if (!isValid) {
                console.warn('[MarketplaceProfilePage] Filtered out service:', {
                    type: typeof s,
                    isObject: typeof s === 'object',
                    isArray: Array.isArray(s),
                    id: s?.id,
                    idType: typeof s?.id,
                    fullItem: s
                })
            }
            return isValid
        })
        : []
    
    // Логируем services для отладки additional_services
    console.log('[MarketplaceProfilePage] Services from profile:', {
        servicesCount: services.length,
        services: services.map(s => ({
            id: s.id,
            name: s.name,
            hasAdditionalServices: !!s.additional_services,
            additionalServicesType: typeof s.additional_services,
            additionalServicesIsArray: Array.isArray(s.additional_services),
            additionalServicesLength: Array.isArray(s.additional_services) ? s.additional_services.length : 0,
            additionalServices: s.additional_services,
            fullService: s
        }))
    })
    const reviews = (profile.reviews || []).map((review) => ({
        id: review.id,
        name: review.userName || review.name || 'Аноним',
        text: review.comment || review.text || '',
        rating: review.rating || 0,
        date: review.date ? new Date(review.date).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }) : '',
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

    return (
        <main className="px-4 lg:px-0 text-base bg-white dark:bg-gray-900 overflow-x-hidden pt-20 md:pt-24">
            <Container className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Хлебные крошки */}
                <div className="pb-4">
                    <Link
                        href="/services"
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-2 mb-4 transition"
                    >
                        <PiArrowLeft className="text-base" />
                        <span>Вернуться к услугам</span>
                    </Link>
                </div>

                {/* Мобильная версия - фото сверху */}
                <div className="block lg:hidden mb-6">
                    <div className="relative h-56 rounded-xl overflow-hidden">
                        {businessImageUrl ? (
                            <img
                                src={businessImageUrl}
                                alt={business.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    // Заменяем битое изображение на рабочее изображение из Unsplash
                                    e.target.src = 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1200&q=80'
                                    e.target.onerror = null // Предотвращаем бесконечный цикл
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                                <span className="text-gray-400 dark:text-gray-600">Нет изображения</span>
                            </div>
                        )}
                        {/* Бейджи поверх фото */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                            {badges.map((badge, idx) => (
                                <span
                                    key={idx}
                                    className={classNames(
                                        'text-white text-[11px] px-2 py-1 rounded-full',
                                        badge.color
                                    )}
                                >
                                    {badge.label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Верхний блок (header) - улучшенный */}
                <div className="mb-6 lg:mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
                        {/* Фото/аватар бизнеса (мобильная версия уже показана выше) */}
                        <div className="hidden lg:block lg:flex-shrink-0">
                            <div className="relative w-72 h-72 rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                        {businessImageUrl ? (
                            <img
                                src={businessImageUrl}
                                alt={business.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    // Заменяем битое изображение на рабочее изображение из Unsplash
                                    e.target.src = 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1200&q=80'
                                    e.target.onerror = null // Предотвращаем бесконечный цикл
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                                <span className="text-gray-400 dark:text-gray-600">Нет изображения</span>
                            </div>
                        )}
                            </div>
                        </div>
                        
                        {/* Основная информация */}
                        <div className="flex-1 min-w-0">
                            {/* Категория */}
                            <div className="mb-2">
                                <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/20 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                                    {business.category || categoryInfo?.name || (business.group === 'regular_ad' ? 'Обычное объявление' : business.group)}
                                </span>
                            </div>

                            {/* Название */}
                            <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                                {business.name}
                            </h1>

                            {/* Информация о компании */}
                            {business.companyName && business.companySlug && (
                                <div className="flex items-center gap-2 mb-3 text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">
                                        Компания:
                                    </span>
                                    <Link
                                        href={`/marketplace/company/${business.companySlug}`}
                                        className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                    >
                                        {business.companyName}
                                        {business.companyAdvertisementsCount > 1 && (
                                            <span className="text-xs text-gray-400">
                                                ({business.companyAdvertisementsCount} объявлений)
                                            </span>
                                        )}
                                    </Link>
                                </div>
                            )}

                            {/* Рейтинг, отзывы, город, выполненные заказы */}
                            <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
                                <div className="flex items-center gap-1">
                                    {/* Звездочка рейтинга */}
                                    <PiStarFill className="text-yellow-500 text-lg" />
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {averageRating}
                                    </span>
                                    {((reviews.length || business.reviewsCount || 0) > 0) && (
                                        <span className="text-gray-500 dark:text-gray-400">
                                            ({reviews.length || business.reviewsCount || 0})
                                        </span>
                                    )}
                                    {/* Кнопка избранного - сердечко */}
                                    <button
                                            onClick={handleToggleFavorite}
                                            disabled={isFavoriteLoading}
                                            className={classNames(
                                                'ml-1 transition',
                                                isFavorite
                                                    ? 'text-red-500 hover:text-red-600'
                                                    : 'text-gray-400 hover:text-red-500'
                                            )}
                                            title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                                        >
                                            {isFavorite ? (
                                                <PiHeartFill className="text-lg" />
                                            ) : (
                                                <PiHeart className="text-lg" />
                                            )}
                                        </button>
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

                            {/* CTA-кнопки */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button 
                                    onClick={() => {
                                        setBookingSelectedDate(0)
                                        setBookingSelectedTime(null)
                                        setBookingSelectedMaster(null)
                                        setBookingOpen(true)
                                    }}
                                    className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 transition shadow-sm hover:shadow-md"
                                >
                                    Забронировать
                                </button>
                                {business.companyName && business.companySlug && business.companyAdvertisementsCount > 1 && (
                                    <Link
                                        href={`/marketplace/company/${business.companySlug}`}
                                        className="w-full sm:w-auto rounded-xl border-2 border-gray-300 dark:border-gray-600 hover:border-blue-600 dark:hover:border-blue-400 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-semibold px-6 py-3 transition flex items-center justify-center gap-2"
                                    >
                                        <PiUsersDuotone className="text-lg" />
                                        <span>Все объявления компании</span>
                                    </Link>
                                )}
                                <button 
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({
                                                title: business.name,
                                                text: business.description,
                                                url: window.location.href,
                                            }).catch(() => {})
                                        } else {
                                            navigator.clipboard.writeText(window.location.href)
                                        }
                                    }}
                                    className="w-full sm:w-auto sm:px-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-6 py-3 transition flex items-center justify-center gap-2"
                                >
                                    <PiShareNetwork className="text-base" />
                                    <span>Поделиться</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Основной контент - двухколоночный layout на десктопе */}
                <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
                    {/* Левая колонка - основной контент */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Блок "О специалисте / студии" */}
                        {business.description && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 md:p-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                    О специалисте / студии
                                </h2>
                                <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {business.description.length > 300 ? (
                                        <>
                                            {showFullDescription ? (
                                                <>
                                                    <p>{business.description}</p>
                                                    <button
                                                        onClick={() => setShowFullDescription(false)}
                                                        className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                                                    >
                                                        Скрыть
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <p>{business.description.substring(0, 300)}...</p>
                                                    <button
                                                        onClick={() => setShowFullDescription(true)}
                                                        className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                                                    >
                                                        Показать ещё
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <p>{business.description}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Блок "Наши работы" / портфолио */}
                        {portfolio && portfolio.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    Наши работы
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    Примеры выполненных работ
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                                    {portfolio.map((item, idx) => {
                                        const images = item.images || (item.imageUrl ? [item.imageUrl] : [])
                                        const firstImage = images[0] || '/img/others/placeholder.jpg'
                                        const remainingImagesCount = Math.max(0, images.length - 1)
                                        
                                        // Вычисляем индекс первого изображения этого элемента в общем массиве всех изображений
                                        let imageIndex = 0
                                        for (let i = 0; i < idx; i++) {
                                            const prevImages = portfolio[i].images || (portfolio[i].imageUrl ? [portfolio[i].imageUrl] : [])
                                            imageIndex += prevImages.length || 1
                                        }
                                        
                                        return (
                                            <div
                                                key={item.id || `portfolio-${idx}`}
                                                onClick={() => {
                                                    setSelectedPortfolioItem(item)
                                                    setPortfolioImageIndex(0)
                                                    setPortfolioModalOpen(true)
                                                }}
                                                className="rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm cursor-pointer hover:shadow-md transition-all group"
                                            >
                                                {/* Изображения */}
                                                <div className="relative w-full aspect-[4/3]">
                                                    <img
                                                        src={firstImage}
                                                        alt={item.title || 'Портфолио'}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                    {remainingImagesCount > 0 && (
                                                        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded-full backdrop-blur-sm">
                                                            +{remainingImagesCount}
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                                </div>
                                                
                                                {/* Информация */}
                                                <div className="px-2 py-2">
                                                    {item.title && (
                                                        <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                                                            {item.title}
                                                        </h3>
                                                    )}
                                                    {item.tag && (
                                                        <span className="inline-block px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full mb-1">
                                                            {item.tag}
                                                        </span>
                                                    )}
                                                    {item.description && (
                                                        <p className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Блок "Доступные услуги" */}
                        {services && services.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    Доступные услуги
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    Выберите услугу и забронируйте время
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {services.map((service, index) => (
                                        <div
                                            key={service.id || `service-${index}`}
                                            onClick={() => {
                                                setSelectedServiceDetail(service)
                                                setServiceDetailModalOpen(true)
                                            }}
                                            className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-4 hover:shadow-md transition-all cursor-pointer"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                                    {service.name}
                                                </h3>
                                                {service.price && (
                                                    <span className="text-base font-semibold text-gray-900 dark:text-white ml-2">
                                                        {formatCurrency(service.price, service.currency || currency)}
                                                    </span>
                                                )}
                                            </div>
                                            {service.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                                    {service.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                {service.duration && (
                                                    <span>⏱ {formatDuration(service.duration, service.duration_unit || 'hours')}</span>
                                                )}
                                                {service.category && (
                                                    <span>• {service.category}</span>
                                                )}
                                            </div>
                                            <button className="mt-3 w-full text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                Выбрать и забронировать →
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Правая колонка - сайдбар (только десктоп) */}
                    <div className="hidden lg:block">
                        <div className="sticky top-24 space-y-4">
                            {/* Карточка с ценой */}
                            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {services.length > 0 && services[0].price ? 'От' : ''}
                                        </span>
                                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                                            {services.length > 0 && services[0].price 
                                                ? formatCurrency(services[0].price, services[0].currency || currency)
                                                : business.priceLabel || 'Цена по запросу'}
                                        </span>
                                    </div>
                                    {services.length > 0 && services[0].duration && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            ⏱ {formatDuration(services[0].duration, services[0].duration_unit || 'hours')}
                                        </div>
                                    )}
                                </div>
                                {business.location && (
                                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-white/10 pt-3">
                                        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                            <PiMapPinDuotone className="text-base" />
                                            <span>{business.location}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Основные теги/категории */}
                            {business.tags && business.tags.length > 0 && (
                                <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm p-4">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                        Особенности
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {business.tags.slice(0, 6).map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs text-gray-700 dark:text-gray-300"
                                            >
                                                {tagDictionary[tag] || tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Кнопка "Поделиться" */}
                            <button
                                onClick={() => {
                                    if (navigator.share) {
                                        navigator.share({
                                            title: business.name,
                                            text: business.description,
                                            url: window.location.href,
                                        }).catch(() => {})
                                    } else {
                                        navigator.clipboard.writeText(window.location.href)
                                    }
                                }}
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-3 transition flex items-center justify-center gap-2 font-medium"
                            >
                                <PiShareNetwork className="text-lg" />
                                <span>Поделиться</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Табы */}
                <div className="mt-8 lg:mt-12 border-b border-gray-200 dark:border-white/10 mb-6">
                    <div className="flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {TABS.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={classNames(
                                        'px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition whitespace-nowrap flex-shrink-0',
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200',
                                    )}
                                >
                                    <Icon className="text-base" />
                                    <span>{tab.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Контент табов */}
                <div className="min-h-[400px] pb-12">
                    {activeTab === 'schedule' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    Расписание работы
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Выберите дату и время
                                </p>
                            </div>

                            {/* Список дат - горизонтальный скролл */}
                            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                <div className="flex gap-3 pb-2">
                                    {availableDates.map((date, idx) => (
                                        <button
                                            key={date.id || `date-${idx}`}
                                            onClick={() => setSelectedDate(date.id || idx)}
                                            className={classNames(
                                                'flex flex-col items-center rounded-2xl border px-3 py-2 text-sm transition flex-shrink-0 min-w-[70px]',
                                                selectedDate === date.id
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 font-medium'
                                                    : 'border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20',
                                            )}
                                        >
                                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                {date.dayName}
                                            </span>
                                            <span className="text-base font-semibold">
                                                {date.dayNumber}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Временные слоты */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                    Доступное время
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {timeSlots.map((slot, idx) => (
                                        <button
                                            key={idx}
                                            disabled={!slot.available}
                                            className={classNames(
                                                'rounded-full border px-4 py-2 text-sm text-gray-700 dark:text-gray-300 transition',
                                                slot.available
                                                    ? 'border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-white/20'
                                                    : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-gray-800/50 opacity-50 cursor-not-allowed',
                                            )}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div className="space-y-6">
                            {/* Summary сверху */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        {/* Звездочка рейтинга */}
                                        <PiStarFill className="text-yellow-500 text-2xl" />
                                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                            {averageRating}
                                        </span>
                                        {/* Кнопка избранного - сердечко */}
                                        <button
                                                onClick={handleToggleFavorite}
                                                disabled={isFavoriteLoading}
                                                className={classNames(
                                                    'ml-2 transition',
                                                    isFavorite
                                                        ? 'text-red-500 hover:text-red-600'
                                                        : 'text-gray-400 hover:text-red-500'
                                                )}
                                                title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                                            >
                                                {isFavorite ? (
                                                    <PiHeartFill className="text-2xl" />
                                                ) : (
                                                    <PiHeart className="text-2xl" />
                                                )}
                                            </button>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        На основе {reviews.length} {reviews.length === 1 ? 'отзыва' : reviews.length < 5 ? 'отзывов' : 'отзывов'}
                                    </p>
                                </div>
                            </div>

                            {/* Список отзывов */}
                            {reviews.length === 0 ? (
                                <div className="py-12 text-center border border-dashed border-gray-200 dark:border-white/20 rounded-xl">
                                    <PiChatCircleDuotone className="text-4xl text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        Пока нет отзывов
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Станьте первым клиентом и оставьте отзыв
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {reviews.map((review, idx) => (
                                    <div
                                        key={review.id || `review-${idx}`}
                                        className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 px-4 py-4 shadow-sm"
                                    >
                                        {/* Верхняя строка */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                {/* Аватар */}
                                                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
                                                    {getInitials(review.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {review.name}
                                                        </h4>
                                                        <div className="flex items-center gap-0.5">
                                                            {[...Array(5)].map((_, i) => (
                                                                <PiStarFill
                                                                    key={i}
                                                                    className={classNames(
                                                                        'text-xs',
                                                                        i < review.rating
                                                                            ? 'text-yellow-500'
                                                                            : 'text-gray-300 dark:text-gray-600',
                                                                    )}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                        {review.date}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Текст отзыва */}
                                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-3">
                                            {review.text}
                                        </p>

                                        {/* Ответ на отзыв */}
                                        {review.response && (
                                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-blue-500">
                                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                                    Ответ от {business.name}:
                                                </p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                                    {review.response}
                                                </p>
                                                {review.responseDate && (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                        {new Date(review.responseDate).toLocaleDateString('ru-RU', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric',
                                                        })}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Теги (если есть) */}
                                        {(() => {
                                            const hasService = review.service && review.service.trim();
                                            const specialistName = (review.specialistName && review.specialistName.trim()) || (review.master && review.master.trim());
                                            const hasSpecialist = specialistName && specialistName !== 'Администратор Системы';
                                            
                                            if (!hasService && !hasSpecialist) return null;
                                            
                                            return (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {hasService && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
                                                            Услуга: {review.service}
                                                        </span>
                                                    )}
                                                    {hasSpecialist && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
                                                            Исполнитель: {specialistName}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'team' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    Команда
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Наши специалисты
                                </p>
                            </div>
                            {team.length === 0 ? (
                                <div className="py-12 text-center border border-dashed border-gray-200 dark:border-white/20 rounded-xl">
                                    <PiUsersDuotone className="text-4xl text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Информация о команде пока не добавлена
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {team.map((member, idx) => (
                                    <div
                                        key={member.id || `member-${idx}`}
                                        className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-4 shadow-sm"
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Аватар */}
                                            {member.avatarUrl ? (
                                                <div className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-200 dark:border-gray-700">
                                                    <img
                                                        src={member.avatarUrl}
                                                        alt={member.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className={classNames(
                                                    'h-12 w-12 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0',
                                                    member.avatarColor || 'bg-gray-500'
                                                )}>
                                                    {getInitials(member.name)}
                                                </div>
                                            )}
                                            
                                            {/* Информация о мастере */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {member.name}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {member.role}
                                                </p>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                                                    {member.description}
                                                </p>
                                                
                                                {/* Теги */}
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {member.experience && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
                                                            Опыт {member.experience}
                                                        </span>
                                                    )}
                                                    {member.languages && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
                                                            {member.languages}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {/* Рейтинг */}
                                                {member.rating && (
                                                    <div className="flex items-center gap-1 mt-2">
                                                        <PiStarFill className="text-yellow-500 text-xs" />
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {member.rating.toFixed(1)}
                                                        </span>
                                                    </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
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
                    <div className="p-6">
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
                            {selectedServiceDetail.category && (
                                <span>• {selectedServiceDetail.category}</span>
                            )}
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setServiceDetailModalOpen(false)
                                }}
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium"
                            >
                                Закрыть
                            </button>
                            <button
                                onClick={() => {
                                    setBookingSelectedService(selectedServiceDetail.id)
                                    setServiceDetailModalOpen(false)
                                    setSelectedServiceDetail(null)
                                    setBookingOpen(true)
                                }}
                                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                            >
                                Забронировать
                            </button>
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
                }}
                onSuccess={() => {
                    setBookingSuccess(true)
                    // Инвалидируем кэш бронирований клиента, чтобы они обновились в профиле
                    queryClient.invalidateQueries({ queryKey: ['client-bookings'] })
                    queryClient.invalidateQueries({ queryKey: ['client-orders'] })
                    // Уведомление показывается через модалку успеха, toast не нужен
                }}
                slug={slug}
                profile={profile}
                services={services}
                team={team}
                availableDates={availableDates}
                companyId={profile?.service?.company_id ? parseInt(profile.service.company_id) : null}
                advertisementId={profile?.service?.advertisement_id ? parseInt(profile.service.advertisement_id) : 
                    (profile?.service?.id?.startsWith('ad_') ? parseInt(profile.service.id.replace('ad_', '')) : null)}
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
                            <div className="relative flex-1 min-h-[400px] max-h-[60vh] bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                {images.length > 0 ? (
                                    <>
                                        <img
                                            src={images[portfolioImageIndex]}
                                            alt={selectedPortfolioItem.title || 'Портфолио'}
                                            className="w-full h-full object-contain"
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
                        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center relative transform transition-all duration-200 scale-100 opacity-100"
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
                            Бронирование подтверждено
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Мы отправили вашу заявку мастеру. Он свяжется с вами в ближайшее время.
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
                            Отлично!
                        </button>
                    </div>
                </div>
            )}
        </main>
    )
}

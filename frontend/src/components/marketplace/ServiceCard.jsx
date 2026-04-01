'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import { PiStarFill, PiHeart, PiHeartFill, PiMapPinFill } from 'react-icons/pi'
import classNames from '@/utils/classNames'
import { normalizeImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils'
import { tagDictionary } from '@/mocks/tags'
import { getFavoriteServices, getFavoriteAdvertisements, addToFavorites, removeFromFavorites } from '@/lib/api/client'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { getCategoryName } from '@/utils/categoryUtils'
import { getLaravelApiUrl } from '@/lib/api/marketplace'

/**
 * Универсальный компонент карточки услуги/бизнеса
 * Используется на странице каталога /services и в профиле бизнеса
 */
const ServiceCard = ({ 
    service, 
    variant = 'default', // 'default' | 'compact' | 'featured'
    showBadges = true,
    showRating = true,
    showTags = true,
    className = '',
}) => {
    const queryClient = useQueryClient()
    const [isFavoriteLoading, setIsFavoriteLoading] = useState(false)
    const t = useTranslations('components.serviceCard')
    const tCommon = useTranslations('common')
    const tServices = useTranslations('public.services')
    
    // Загружаем избранное через React Query (автоматически загружается при монтировании)
    const { data: favoriteServices = [] } = useQuery({
        queryKey: ['client-favorite-services'],
        queryFn: getFavoriteServices,
        staleTime: 30000, // 30 секунд
        retry: false, // Не повторяем запрос при ошибке (например, если пользователь не авторизован)
    })
    
    const { data: favoriteAdvertisements = [] } = useQuery({
        queryKey: ['client-favorite-advertisements'],
        queryFn: getFavoriteAdvertisements,
        staleTime: 30000, // 30 секунд
        retry: false, // Не повторяем запрос при ошибке
    })
    
    // Проверяем, находится ли текущая услуга/объявление в избранном
    const isFavorite = useMemo(() => {
        if (!service?.id) return false
        
        const serviceIdStr = String(service.id)
        const isAdvertisement = serviceIdStr.startsWith('ad_')
        
        if (isAdvertisement) {
            // Для объявлений извлекаем реальный ID объявления (без префикса 'ad_')
            const adId = serviceIdStr.replace('ad_', '')
            const advertisementId = parseInt(adId)
            
            if (!advertisementId || isNaN(advertisementId)) return false
            
            // Проверяем по ID объявления в избранных объявлениях
            return favoriteAdvertisements.some((fav) => {
                // Может быть fav.id (ID избранного) или fav.advertisementId (ID объявления)
                const favAdId = fav.advertisementId || fav.id
                const favAdIdNum = typeof favAdId === 'string' ? parseInt(favAdId) : favAdId
                return favAdIdNum === advertisementId
            })
        } else {
            // Для обычных услуг используем service_id если есть, иначе их собственный ID
            let currentServiceId = null
            if (service.service_id) {
                currentServiceId = typeof service.service_id === 'string' ? parseInt(service.service_id) : service.service_id
            } else {
                currentServiceId = typeof service.id === 'string' ? parseInt(service.id) : service.id
            }
            
            if (!currentServiceId) return false
            
            // Проверяем по serviceId (ID услуги из таблицы services)
            return favoriteServices.some(fav => {
                const favServiceId = typeof fav.serviceId === 'string' ? parseInt(fav.serviceId) : fav.serviceId
                return favServiceId === currentServiceId
            })
        }
    }, [favoriteServices, favoriteAdvertisements, service?.id, service?.service_id])
    
    // Обработчик добавления/удаления из избранного
    const handleToggleFavorite = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        if (!service?.id) return
        
        setIsFavoriteLoading(true)
        try {
            const serviceIdStr = String(service.id)
            const isAdvertisement = serviceIdStr.startsWith('ad_')
            
            let favoriteType = 'service'
            let favoriteId = null
            
            if (isAdvertisement) {
                // Для объявлений используем реальный ID объявления (без префикса 'ad_')
                favoriteType = 'advertisement'
                const adId = serviceIdStr.replace('ad_', '')
                favoriteId = parseInt(adId)
                
                if (!favoriteId || isNaN(favoriteId)) {
                    toast.push(
                        <Notification
                            title={tCommon('messages.error')}
                            type="danger"
                        >
                            {t('errors.advertisementIdNotFound')}
                        </Notification>
                    )
                    setIsFavoriteLoading(false)
                    return
                }
            } else {
                // Для обычных услуг используем service_id если есть, иначе их собственный ID
                favoriteType = 'service'
                if (service.service_id) {
                    favoriteId = typeof service.service_id === 'string'
                        ? parseInt(service.service_id)
                        : service.service_id
                } else {
                    favoriteId = typeof service.id === 'string' ? parseInt(service.id) : service.id
                }
            }
            
            if (!favoriteId) {
                toast.push(
                    <Notification
                        title={tCommon('messages.error')}
                        type="danger"
                    >
                        {t('errors.favoriteIdNotFound')}
                    </Notification>
                )
                setIsFavoriteLoading(false)
                return
            }
            
            if (isFavorite) {
                try {
                    await removeFromFavorites(favoriteType, favoriteId)
                    toast.push(
                        <Notification
                            title={tCommon('messages.success')}
                            type="success"
                        >
                            {isAdvertisement ? t('removedFromFavoritesAd') : t('removedFromFavorites')}
                        </Notification>
                    )
                } catch (removeError) {
                    // Если ошибка 401, показываем сообщение об авторизации
                    if (removeError?.response?.status === 401) {
                        toast.push(
                            <Notification
                                title={t('authRequired')}
                                type="info"
                            >
                                {t('pleaseLoginToManageFavorites')}
                            </Notification>
                        )
                        setIsFavoriteLoading(false)
                        return
                    }
                    throw removeError // Пробрасываем другие ошибки
                }
            } else {
                try {
                    await addToFavorites(favoriteType, favoriteId)
                    // Показываем уведомление об успехе только если запрос успешен
                    toast.push(
                        <Notification
                            title={tCommon('messages.success')}
                            type="success"
                        >
                            {isAdvertisement ? t('addedToFavoritesAd') : t('addedToFavorites')}
                        </Notification>
                    )
                } catch (addError) {
                    // Если ошибка 401, показываем сообщение об авторизации
                    if (addError?.response?.status === 401) {
                        toast.push(
                            <Notification
                                title={t('authRequired')}
                                type="info"
                            >
                                {t('pleaseLoginToAddFavorites')}
                            </Notification>
                        )
                        setIsFavoriteLoading(false)
                        return
                    }
                    // Если уже в избранном (400), обновляем кэш и считаем успехом
                    if (addError?.response?.status === 400) {
                        const errorMessage = addError?.response?.data?.message || ''
                        if (errorMessage.includes('Already in favorites') || errorMessage.includes('уже в избранном')) {
                            // Обновляем кэш избранного, чтобы синхронизировать состояние
                            if (isAdvertisement) {
                                await queryClient.invalidateQueries({ queryKey: ['client-favorite-advertisements'] })
                            } else {
                                await queryClient.invalidateQueries({ queryKey: ['client-favorite-services'] })
                            }
                            // Не показываем ошибку, так как уже в избранном
                            setIsFavoriteLoading(false)
                            return
                        }
                    }
                    throw addError // Пробрасываем другие ошибки
                }
            }
            
            // Обновляем кэш избранного и принудительно обновляем данные
            if (isAdvertisement) {
                await queryClient.invalidateQueries({ queryKey: ['client-favorite-advertisements'] })
                // Принудительно обновляем данные
                await queryClient.refetchQueries({ queryKey: ['client-favorite-advertisements'] })
            } else {
                await queryClient.invalidateQueries({ queryKey: ['client-favorite-services'] })
                // Принудительно обновляем данные
                await queryClient.refetchQueries({ queryKey: ['client-favorite-services'] })
            }
        } catch (error) {
            console.error('Error toggling favorite:', error)
            if (error?.response?.status === 401) {
                toast.push(
                    <Notification
                        title={t('authRequired')}
                        type="info"
                    >
                        {t('pleaseLoginToAddFavorites')}
                    </Notification>
                )
            } else if (error?.response?.status === 400) {
                const errorMessage = error?.response?.data?.message || ''
                if (errorMessage.includes('Already in favorites') || errorMessage.includes('уже в избранном')) {
                    // Уже в избранном - обновляем кэш и не показываем ошибку
                    const serviceIdStr = String(service.id)
                    const isAdvertisement = serviceIdStr.startsWith('ad_')
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
                        title={tCommon('messages.error')}
                        type="danger"
                    >
                        {errorMessage || t('errors.updateFailed')}
                    </Notification>
                )
            } else if (error?.response?.status === 404) {
                toast.push({
                    title: tCommon('messages.error'),
                    message: t('errors.notFound'),
                    type: 'danger',
                })
            } else {
                toast.push({
                    title: tCommon('messages.error'),
                    message: error.message || t('errors.updateFailedLater'),
                    type: 'danger',
                })
            }
        } finally {
            setIsFavoriteLoading(false)
        }
    }
    
    const badges = getBadges(service.tags || [], t)
    const isExternalLink = service.path && (service.path.startsWith('http://') || service.path.startsWith('https://'))
    const isAdvertisement = service?.id && String(service.id).startsWith('ad_')
    
    // Ref для предотвращения повторного трекинга показов
    const hasTrackedImpression = useRef(false)
    
    // Трекинг показов для featured рекламных объявлений
    useEffect(() => {
        if (isAdvertisement && variant === 'featured' && !hasTrackedImpression.current) {
            const adId = parseInt(String(service.id).replace('ad_', ''))
            if (adId && !isNaN(adId)) {
                hasTrackedImpression.current = true
                fetch(`${getLaravelApiUrl()}/advertisements/${adId}/impression`, {
                    method: 'POST',
                    credentials: 'include',
                }).catch(() => {}) // Игнорируем ошибки трекинга
            }
        }
    }, [isAdvertisement, variant, service.id])
    
    // Обработчик клика для отслеживания кликов по рекламным объявлениям
    const handleClick = async (e) => {
        if (isAdvertisement) {
            try {
                const adId = parseInt(String(service.id).replace('ad_', ''))
                if (adId && !isNaN(adId)) {
                    // Отслеживаем клик асинхронно, не блокируя переход
                    fetch(`${getLaravelApiUrl()}/advertisements/${adId}/click`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }).catch(err => console.error('Failed to track click:', err))
                }
            } catch (error) {
                console.error('Error tracking advertisement click:', error)
            }
        }
    }
    
    const LinkComponent = isExternalLink ? 'a' : Link
    const linkProps = isExternalLink 
        ? { 
            href: service.path || '/services', 
            target: '_blank', 
            rel: 'noopener noreferrer',
            onClick: handleClick
          }
        : { 
            href: service.path || '/services',
            onClick: handleClick // Трекинг кликов для внутренних ссылок тоже
          }

    // Мобильная версия (горизонтальная карточка)
    if (variant === 'compact') {
        return (
            <LinkComponent
                {...linkProps}
                className={classNames(
                    'md:hidden w-full rounded-lg border border-gray-200 dark:border-white/10',
                    'bg-white dark:bg-gray-900 overflow-hidden flex gap-3 py-3 px-3',
                    'shadow-sm hover:shadow-md transition-all cursor-pointer',
                    className
                )}
            >
                {/* Изображение слева */}
                <div className="relative w-28 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {service?.imageUrl ? (
                        <img
                            src={normalizeImageUrl(service.imageUrl) || FALLBACK_IMAGE}
                            alt={service.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                                e.target.src = FALLBACK_IMAGE
                                e.target.onerror = null
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="text-gray-400 text-xs">{t('noPhoto')}</span>
                        </div>
                    )}
                    {/* Fallback placeholder для битых изображений */}
                    <div className="image-placeholder-fallback absolute inset-0 w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800" style={{ display: 'none' }}>
                        <span className="text-gray-400 text-xs">{t('noPhoto')}</span>
                    </div>
                    {/* Бейджи поверх фото */}
                    {showBadges && badges.length > 0 && (
                        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                            {badges.slice(0, 2).map((badge, idx) => (
                                <span
                                    key={idx}
                                    className={classNames(
                                        'text-white text-[10px] px-1.5 py-0.5 rounded-full',
                                        badge.color
                                    )}
                                >
                                    {badge.label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Текстовый блок справа */}
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    {/* Категория */}
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {getCategoryName(service.category || service.groupLabel, tServices) || t('service')}
                    </p>
                    
                    {/* Название */}
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                        {service.name}
                    </h3>
                    
                    {/* Описание */}
                    {service.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">
                            {service.description}
                        </p>
                    )}

                    {/* Теги */}
                    {showTags && service.tags && service.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {service.tags.slice(0, 2).map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-600 dark:text-gray-300"
                                >
                                    {tagDictionary[tag] || tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Локация */}
                    {(service.city || service.state) && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <PiMapPinFill className="text-[10px]" />
                            {service.city && service.state ? `${service.city}, ${service.state}` : service.city || service.state}
                        </p>
                    )}
                    
                    {/* Рейтинг и цена */}
                    <div className="flex items-center justify-between mt-auto pt-1">
                        {showRating && service.rating !== undefined && (
                            <div className="flex items-center gap-1">
                                {/* Звездочка рейтинга */}
                                <PiStarFill className="text-amber-400 text-xs" />
                                <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                    {service.rating.toFixed(1)}
                                </span>
                                {((service.reviews || service.reviewsCount) > 0) && (
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                        ({(service.reviews || service.reviewsCount)})
                                    </span>
                                )}
                                {/* Кнопка избранного - сердечко */}
                                <button
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleToggleFavorite(e)
                                        }}
                                        disabled={isFavoriteLoading}
                                        className={classNames(
                                            'ml-1 transition',
                                            isFavorite
                                                ? 'text-red-500 hover:text-red-600'
                                                : 'text-gray-400 hover:text-red-500'
                                        )}
                                        title={isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
                                    >
                                        {isFavorite ? (
                                            <PiHeartFill className="text-xs" />
                                        ) : (
                                            <PiHeart className="text-xs" />
                                        )}
                                    </button>
                            </div>
                        )}
                        {service.priceLabel && (
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {service.priceLabel}
                            </span>
                        )}
                    </div>
                </div>
            </LinkComponent>
        )
    }

    // Десктопная версия (вертикальная карточка)
    const isFeaturedVariant = variant === 'featured'
    const cardClasses = classNames(
        isFeaturedVariant ? 'flex' : 'hidden md:flex',
        'rounded-xl border border-gray-200 dark:border-white/10',
        'bg-white dark:bg-gray-900 overflow-hidden flex-col',
        'shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full',
        isFeaturedVariant && 'border-blue-300 dark:border-blue-700 ring-1 ring-blue-100 dark:ring-blue-900/50',
        isFeaturedVariant && 'min-h-[320px]',
        className
    )

    return (
        <LinkComponent
            {...linkProps}
            className={cardClasses}
        >
            {/* Изображение */}
            <div className="relative h-48 w-full flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                {service?.imageUrl ? (
                    <img
                        src={normalizeImageUrl(service.imageUrl) || FALLBACK_IMAGE}
                        alt={service.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                            e.target.src = FALLBACK_IMAGE
                            e.target.onerror = null
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-sm">Нет фото</span>
                    </div>
                )}
                {/* Fallback placeholder для битых изображений */}
                <div className="image-placeholder-fallback absolute inset-0 w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800" style={{ display: 'none' }}>
                    <span className="text-gray-400 text-sm">Нет фото</span>
                </div>
                
                {/* Бейджи поверх фото */}
                {showBadges && (
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        {variant === 'featured' && (
                            <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                                {t('featured')}
                            </span>
                        )}
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
                )}
                
                {/* Рейтинг и отзывы (справа сверху) */}
                {showRating && service.rating !== undefined && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                        {/* Звездочка рейтинга */}
                        <PiStarFill className="text-amber-400 text-sm" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {service.rating.toFixed(1)}
                        </span>
                        {((service.reviews || service.reviewsCount) > 0) && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({(service.reviews || service.reviewsCount)})
                            </span>
                        )}
                        {/* Кнопка избранного - сердечко */}
                        <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleToggleFavorite(e)
                                }}
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
                                    <PiHeartFill className="text-sm" />
                                ) : (
                                    <PiHeart className="text-sm" />
                                )}
                            </button>
                    </div>
                )}
            </div>

            {/* Контент */}
            <div className="p-4 flex flex-col gap-2.5 flex-1 min-h-0">
                {/* Категория */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                        {getCategoryName(service.category || service.groupLabel, tServices) || t('service')}
                </p>
                
                {/* Заголовок */}
                <div className="space-y-1">
                    {service.businessName && (
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 line-clamp-1">
                            {service.businessName}
                        </p>
                    )}
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-1">
                        {service.name}
                    </h3>
                </div>
                
                {/* Описание */}
                {service.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1">
                        {service.description}
                    </p>
                )}

                {/* Теги */}
                {showTags && service.tags && service.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {service.tags.slice(0, 3).map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300"
                            >
                                {tagDictionary[tag] || tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Локация */}
                {(service.city || service.state) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <PiMapPinFill className="text-xs" />
                        {service.city && service.state ? `${service.city}, ${service.state}` : service.city || service.state}
                    </p>
                )}

                {/* Цена */}
                {service.priceLabel && (
                    <div className="mt-auto pt-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {service.priceLabel}
                        </span>
                    </div>
                )}
            </div>
        </LinkComponent>
    )
}

// Функция для получения бейджей из тегов
function getBadges(tags, t = null) {
    const badges = []
    if (tags.includes('premium')) {
        badges.push({ label: 'Premium', color: 'bg-yellow-500' })
    }
    if (tags.includes('mobile')) {
        badges.push({ label: t ? t('mobile') : 'Выездной', color: 'bg-black/70' })
    }
    if (tags.includes('russian-speaking')) {
        badges.push({ label: 'RU', color: 'bg-black/70' })
    }
    return badges
}

export default ServiceCard


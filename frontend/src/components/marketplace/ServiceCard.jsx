'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { PiStarFill, PiHeart, PiHeartFill, PiMapPinFill } from 'react-icons/pi'
import classNames from '@/utils/classNames'
import { normalizeImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils'
import { getCatalogListingBadges, getTagLabel } from '@/mocks/tags'
import { getFavoriteServices, getFavoriteAdvertisements, addToFavorites, removeFromFavorites } from '@/lib/api/client'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { getCategoryName } from '@/utils/categoryUtils'
import { getLaravelApiUrl } from '@/lib/api/marketplace'
import { useAuthStore } from '@/store'
import { CLIENT } from '@/constants/roles.constant'

/**
 * Универсальный компонент карточки услуги/бизнеса
 * Используется на странице каталога /services и в профиле бизнеса
 */
const ServiceCard = ({
    service,
    variant = 'default', // 'default' | 'compact' | 'featured' | 'catalog' | 'list'
    /** Две плашки под локацией (онлайн-запись + RU) — по умолчанию выключены */
    showBadges = false,
    showRating = true,
    showTags = false,
    className = '',
}) => {
    const queryClient = useQueryClient()
    const { isAuthenticated, userRole, authReady } = useAuthStore()
    const favoritesQueryEnabled =
        authReady && isAuthenticated && userRole === CLIENT
    const [isFavoriteLoading, setIsFavoriteLoading] = useState(false)
    const t = useTranslations('components.serviceCard')
    const tCommon = useTranslations('common')
    const tServices = useTranslations('public.services')
    const isCatalogVariant = variant === 'catalog'
    const isListVariant = variant === 'list'

    const { data: favoriteServices = [] } = useQuery({
        queryKey: ['client-favorite-services'],
        queryFn: getFavoriteServices,
        enabled: favoritesQueryEnabled,
        staleTime: 30000,
        retry: false,
    })

    const { data: favoriteAdvertisements = [] } = useQuery({
        queryKey: ['client-favorite-advertisements'],
        queryFn: getFavoriteAdvertisements,
        enabled: favoritesQueryEnabled,
        staleTime: 30000,
        retry: false,
    })

    const isFavorite = useMemo(() => {
        if (!service?.id) return false

        const serviceIdStr = String(service.id)
        const isAdvertisement = serviceIdStr.startsWith('ad_')

        if (isAdvertisement) {
            const adId = serviceIdStr.replace('ad_', '')
            const advertisementId = parseInt(adId)

            if (!advertisementId || isNaN(advertisementId)) return false

            return favoriteAdvertisements.some((fav) => {
                const raw =
                    fav.advertisementId ??
                    fav.advertisement_id ??
                    fav.favoriteable_id
                if (raw === undefined || raw === null) return false
                const favAdIdNum = typeof raw === 'string' ? parseInt(raw, 10) : raw
                return favAdIdNum === advertisementId
            })
        }
        let currentServiceId = null
        if (service.service_id) {
            currentServiceId = typeof service.service_id === 'string' ? parseInt(service.service_id) : service.service_id
        } else {
            currentServiceId = typeof service.id === 'string' ? parseInt(service.id) : service.id
        }

        if (!currentServiceId) return false

        return favoriteServices.some((fav) => {
            const favServiceId = typeof fav.serviceId === 'string' ? parseInt(fav.serviceId) : fav.serviceId
            return favServiceId === currentServiceId
        })
    }, [favoriteServices, favoriteAdvertisements, service?.id, service?.service_id])

    const handleToggleFavorite = async (e) => {
        e.preventDefault()
        e.stopPropagation()

        if (!service?.id) return

        if (!authReady) {
            return
        }
        if (!isAuthenticated || userRole !== CLIENT) {
            toast.push(
                <Notification title={t('authRequired')} type="info">
                    {t('pleaseLoginToAddFavorites')}
                </Notification>
            )
            return
        }

        setIsFavoriteLoading(true)
        try {
            const serviceIdStr = String(service.id)
            const isAdvertisement = serviceIdStr.startsWith('ad_')

            let favoriteType = 'service'
            let favoriteId = null

            if (isAdvertisement) {
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
                    throw removeError
                }
            } else {
                try {
                    const { alreadyExists } = await addToFavorites(favoriteType, favoriteId)
                    if (!alreadyExists) {
                        toast.push(
                            <Notification
                                title={tCommon('messages.success')}
                                type="success"
                            >
                                {isAdvertisement ? t('addedToFavoritesAd') : t('addedToFavorites')}
                            </Notification>
                        )
                    }
                } catch (addError) {
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
                    if (addError?.response?.status === 400) {
                        const errorMessage = addError?.response?.data?.message || ''
                        if (errorMessage.includes('Already in favorites') || errorMessage.includes('уже в избранном')) {
                            if (isAdvertisement) {
                                await queryClient.invalidateQueries({ queryKey: ['client-favorite-advertisements'] })
                                await queryClient.refetchQueries({ queryKey: ['client-favorite-advertisements'] })
                            } else {
                                await queryClient.invalidateQueries({ queryKey: ['client-favorite-services'] })
                                await queryClient.refetchQueries({ queryKey: ['client-favorite-services'] })
                            }
                            setIsFavoriteLoading(false)
                            return
                        }
                    }
                    throw addError
                }
            }

            if (isAdvertisement) {
                await queryClient.invalidateQueries({ queryKey: ['client-favorite-advertisements'] })
                await queryClient.refetchQueries({ queryKey: ['client-favorite-advertisements'] })
            } else {
                await queryClient.invalidateQueries({ queryKey: ['client-favorite-services'] })
                await queryClient.refetchQueries({ queryKey: ['client-favorite-services'] })
            }
        } catch (error) {
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
                    const serviceIdStr = String(service.id)
                    const isAdvertisement = serviceIdStr.startsWith('ad_')
                    if (isAdvertisement) {
                        await queryClient.invalidateQueries({ queryKey: ['client-favorite-advertisements'] })
                        await queryClient.refetchQueries({ queryKey: ['client-favorite-advertisements'] })
                    } else {
                        await queryClient.invalidateQueries({ queryKey: ['client-favorite-services'] })
                        await queryClient.refetchQueries({ queryKey: ['client-favorite-services'] })
                    }
                    return
                }
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

    const tagsForListingPills = (() => {
        const raw = [...(service.tags || [])]
        if (service.allowBooking === true && !raw.includes('online-booking')) {
            raw.push('online-booking')
        }
        if (service.allowBooking === false) {
            return raw.filter((x) => x !== 'online-booking')
        }
        return raw
    })()
    const listingPills = showBadges ? getCatalogListingBadges(tagsForListingPills, tServices) : []
    const isExternalLink = service.path && (service.path.startsWith('http://') || service.path.startsWith('https://'))
    const isAdvertisement = service?.id && String(service.id).startsWith('ad_')

    const reviewsCount = service.reviews ?? service.reviewsCount ?? 0
    const ratingNum = service.rating !== undefined && service.rating !== null ? Number(service.rating) : null

    const topLeftBadge = useMemo(() => {
        const available =
            service.allowBooking !== false &&
            service.hasSchedule === true
        const popular =
            isAdvertisement ||
            (service.tags || []).includes('premium') ||
            (ratingNum != null && ratingNum >= 4.5 && reviewsCount >= 12)
        if (available) return { kind: 'available', label: t('badgeAvailable') }
        if (popular) return { kind: 'popular', label: t('badgePopular') }
        return null
    }, [service.allowBooking, service.hasSchedule, service.tags, isAdvertisement, ratingNum, reviewsCount, t])

    const hasTrackedImpression = useRef(false)
    const cardRef = useRef(null)

    useEffect(() => {
        if (!isAdvertisement || hasTrackedImpression.current || !cardRef.current) return
        const adId = parseInt(String(service.id).replace('ad_', ''))
        if (!adId || isNaN(adId)) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasTrackedImpression.current) {
                    hasTrackedImpression.current = true
                    fetch(`${getLaravelApiUrl()}/advertisements/${adId}/impression`, {
                        method: 'POST',
                        credentials: 'include',
                    }).catch(() => {})
                    observer.disconnect()
                }
            },
            { threshold: 0.5 }
        )
        observer.observe(cardRef.current)
        return () => observer.disconnect()
    }, [isAdvertisement, service.id])

    const handleClick = async () => {
        if (isAdvertisement) {
            try {
                const adId = parseInt(String(service.id).replace('ad_', ''))
                if (adId && !isNaN(adId)) {
                    fetch(`${getLaravelApiUrl()}/advertisements/${adId}/click`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }).catch(() => {})
                }
            } catch {
                /* noop */
            }
        }
    }

    const LinkComponent = isExternalLink ? 'a' : Link
    const linkProps = isExternalLink
        ? {
            href: service.path || '/services',
            target: '_blank',
            rel: 'noopener noreferrer',
            onClick: handleClick,
        }
        : {
            href: service.path || '/services',
            onClick: handleClick,
        }

    const categoryLine =
        getCategoryName(service.category || service.groupLabel, tServices) || t('service')

    const locationLine =
        service.city && service.state
            ? `${service.city}, ${service.state}`
            : service.city || service.state || ''

    const FAVORITE_BTN_INLINE =
        'border border-gray-200 bg-white shadow-sm !backdrop-blur-none dark:border-white/10 dark:bg-gray-900'

    const FavoriteBtn = ({ btnClass }) => (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleToggleFavorite(e)
            }}
            disabled={isFavoriteLoading}
            className={classNames(
                'rounded-full p-1.5 transition backdrop-blur-sm',
                isFavorite
                    ? 'bg-white/90 text-red-500 hover:bg-white'
                    : 'bg-white/80 text-gray-700 hover:bg-white hover:text-red-500',
                btnClass,
            )}
            title={isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
            aria-label={isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
        >
            {isFavorite ? <PiHeartFill className="text-lg" /> : <PiHeart className="text-lg" />}
        </button>
    )

    const ImageBlock = ({ imgClass }) => (
        <>
            {service?.imageUrl ? (
                <img
                    src={normalizeImageUrl(service.imageUrl) || FALLBACK_IMAGE}
                    alt={service.name}
                    className={classNames(
                        'absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out',
                        imgClass,
                    )}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                        e.target.src = FALLBACK_IMAGE
                        e.target.onerror = null
                    }}
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <span className="text-gray-400 text-xs font-bold">{t('noPhoto')}</span>
                </div>
            )}
            {topLeftBadge && (
                <span
                    className={classNames(
                        'absolute left-2 top-2 z-[2] rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm',
                        topLeftBadge.kind === 'available' ? 'bg-emerald-500' : 'bg-amber-500',
                    )}
                >
                    {topLeftBadge.label}
                </span>
            )}
            {showRating && ratingNum != null && (
                <div className="absolute inset-x-0 bottom-0 z-[1] flex items-end bg-gradient-to-t from-black/70 via-black/25 to-transparent px-2 pb-2 pt-8">
                    <div className="flex items-center gap-1 text-white">
                        <PiStarFill className="text-amber-400 text-sm shrink-0" />
                        <span className="text-xs font-bold">
                            {ratingNum.toFixed(1)}
                            {reviewsCount > 0 && (
                                <span className="font-bold text-white/90"> ({reviewsCount})</span>
                            )}
                        </span>
                    </div>
                </div>
            )}
        </>
    )

    if (variant === 'compact') {
        return (
            <div ref={cardRef} className="relative md:hidden">
                <LinkComponent
                    {...linkProps}
                    className={classNames(
                        'w-full rounded-2xl border border-gray-200 dark:border-white/10',
                        'bg-white dark:bg-gray-900 overflow-hidden flex gap-3 p-3',
                        'shadow-sm hover:shadow-lg transition-shadow cursor-pointer group',
                        className,
                    )}
                >
                    <div
                        className={classNames(
                            'relative w-[104px] aspect-[4/3] flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800',
                        )}
                    >
                        <ImageBlock imgClass="group-hover:scale-105" />
                    </div>

                    <div className="flex-1 flex flex-col gap-1 min-w-0 py-0.5 pr-11">
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
                            {categoryLine}
                        </p>
                        <div className="flex items-start justify-between gap-2 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug min-w-0 flex-1">
                                {service.name}
                            </h3>
                        </div>
                        {locationLine && (
                            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                <PiMapPinFill className="text-primary text-xs shrink-0" />
                                <span className="truncate">{locationLine}</span>
                            </p>
                        )}
                        {service.priceLabel && (
                            <div className="mt-auto pt-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {service.priceLabel}
                                </span>
                            </div>
                        )}
                    </div>
                </LinkComponent>
                <div className="pointer-events-none absolute inset-0 z-[5]">
                    <div className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2">
                        <FavoriteBtn
                            btnClass={classNames(
                                FAVORITE_BTN_INLINE,
                                isFavorite
                                    ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
                                    : 'bg-white text-gray-600 hover:text-red-500 dark:text-gray-400',
                            )}
                        />
                    </div>
                </div>
            </div>
        )
    }

    const isFeaturedVariant = variant === 'featured'

    if (isListVariant) {
        return (
            <div ref={cardRef} className={classNames('relative h-full', className)}>
                <LinkComponent
                    {...linkProps}
                    className={classNames(
                        'group flex w-full gap-4 rounded-2xl border border-gray-200 dark:border-white/10',
                        'bg-white dark:bg-gray-900 overflow-hidden p-3 md:p-4 pr-14 md:pr-14',
                        'shadow-sm hover:shadow-lg transition-shadow cursor-pointer items-stretch',
                    )}
                >
                    <div className="relative w-36 md:w-44 shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-[4/3]">
                        <ImageBlock imgClass="group-hover:scale-105" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 gap-1 justify-center">
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {categoryLine}
                        </p>
                        <div className="flex items-start justify-between gap-2 min-w-0">
                            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 line-clamp-2 min-w-0 flex-1">
                                {service.name}
                            </h3>
                        </div>
                        {locationLine && (
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <PiMapPinFill className="text-primary shrink-0" />
                                {locationLine}
                            </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            {listingPills.map((pill, idx) => (
                                <span
                                    key={idx}
                                    className={classNames(
                                        'text-white text-[10px] px-2 py-0.5 rounded-full font-bold',
                                        pill.color,
                                    )}
                                >
                                    {pill.label}
                                </span>
                            ))}
                            {service.priceLabel && (
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 ml-auto">
                                    {service.priceLabel}
                                </span>
                            )}
                        </div>
                    </div>
                </LinkComponent>
                <div className="pointer-events-none absolute inset-0 z-[5]">
                    <div className="pointer-events-auto absolute right-3 top-3 md:right-4 md:top-4">
                        <FavoriteBtn
                            btnClass={classNames(
                                FAVORITE_BTN_INLINE,
                                isFavorite
                                    ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
                                    : 'bg-white text-gray-600 hover:text-red-500 dark:text-gray-400',
                            )}
                        />
                    </div>
                </div>
            </div>
        )
    }

    const cardClasses = classNames(
        isFeaturedVariant || isCatalogVariant ? 'flex' : 'hidden md:flex',
        'group flex-col rounded-2xl border border-gray-200 dark:border-white/10',
        'bg-white dark:bg-gray-900 overflow-hidden',
        'shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full',
        isFeaturedVariant && 'ring-1 ring-blue-100 dark:ring-blue-900/40 border-blue-200 dark:border-blue-800',
        className,
    )

    return (
        <div ref={cardRef} className="relative h-full">
            <LinkComponent {...linkProps} className={cardClasses}>
                <div
                    className={classNames(
                        'relative w-full flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800',
                        isCatalogVariant ? 'aspect-[5/3]' : 'aspect-[5/3] md:aspect-[4/3]',
                    )}
                >
                    <ImageBlock imgClass="group-hover:scale-105" />
                </div>

                <div
                    className={classNames(
                        'flex flex-col gap-1.5 flex-1 min-h-0 p-3 md:p-3.5',
                        isCatalogVariant && 'md:p-4',
                    )}
                >
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide line-clamp-1">
                        {categoryLine}
                    </p>

                    <div className="flex items-start justify-between gap-2 min-w-0">
                        <h3 className="text-sm md:text-[15px] font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug min-w-0 flex-1">
                            {service.name}
                        </h3>
                    </div>

                    {service.description && (isCatalogVariant || isFeaturedVariant) && (
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 line-clamp-1">
                            {service.description}
                        </p>
                    )}

                    {showTags && service.tags && service.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {service.tags.slice(0, 2).map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-600 dark:text-gray-300"
                                >
                                    {getTagLabel(tag, tServices)}
                                </span>
                            ))}
                        </div>
                    )}

                    {locationLine && (
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                            <PiMapPinFill className="text-primary text-sm shrink-0" />
                            <span className="line-clamp-1">{locationLine}</span>
                        </p>
                    )}

                    <div className="mt-auto flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            {showBadges &&
                                listingPills.map((pill, idx) => (
                                    <span
                                        key={idx}
                                        className={classNames(
                                            'text-white text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0',
                                            pill.color,
                                        )}
                                    >
                                        {pill.label}
                                    </span>
                                ))}
                            {service.priceLabel && (
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                    {service.priceLabel}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </LinkComponent>
            <div className="pointer-events-none absolute inset-0 z-[5]">
                <div className="pointer-events-auto absolute right-2 top-2 md:right-3 md:top-3">
                    <FavoriteBtn
                        btnClass={classNames(
                            FAVORITE_BTN_INLINE,
                            isFavorite
                                ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
                                : 'bg-white text-gray-600 hover:text-red-500 dark:text-gray-400',
                        )}
                    />
                </div>
            </div>
        </div>
    )
}

export default ServiceCard

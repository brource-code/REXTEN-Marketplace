'use client'

import { useState } from 'react'
import Container from '@/components/shared/Container'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getCompanyProfile } from '@/lib/api/marketplace'
import { useQuery } from '@tanstack/react-query'
import ServiceCard from '@/components/marketplace/ServiceCard'
import ContactDropdown from '@/components/marketplace/ContactDropdown'
import Loading from '@/components/shared/Loading'
import NotFound404 from '@/assets/svg/NotFound404'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import { useTranslations } from 'next-intl'
import {
    PiStarFill,
    PiMapPinDuotone,
    PiArrowLeft,
    PiPhone,
    PiEnvelope,
    PiGlobe,
    PiBuilding,
    PiCheckCircleFill,
    PiUsersFill,
    PiListBulletsFill,
} from 'react-icons/pi'
import classNames from '@/utils/classNames'
import Image from 'next/image'
import { normalizeImageUrl } from '@/utils/imageUtils'
import { formatDate } from '@/utils/dateTime'
import { resolveClientBookingTimezone } from '@/constants/client-datetime.constant'

export default function CompanyProfilePage() {
    const params = useParams()
    const slug = params?.slug || ''
    const t = useTranslations('public.company')
    const [reviewsToShow, setReviewsToShow] = useState(10)
    const [servicesToShow, setServicesToShow] = useState(15)

    const { data: profile, isLoading, error } = useQuery({
        queryKey: ['company-profile', slug],
        queryFn: () => getCompanyProfile(slug),
        enabled: !!slug,
    })

    if (isLoading) {
        return (
            <main className="text-base bg-white dark:bg-gray-900 overflow-x-hidden pt-20 md:pt-24">
                <Container className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Loading loading />
                </Container>
            </main>
        )
    }

    if (error || !profile) {
        return (
            <main className="text-base bg-white dark:bg-gray-900 overflow-x-hidden pt-20 md:pt-24">
                <Container className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <NotFound404 />
                    <div className="text-center mt-8">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {t('notFound')}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            {t('notFoundDescription')}
                        </p>
                        <Link
                            href="/services"
                            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            <PiArrowLeft className="text-base" />
                            <span>{t('backToServices')}</span>
                        </Link>
                    </div>
                </Container>
            </main>
        )
    }

    const { company, advertisements, services = [], reviews = [] } = profile
    const companyTz = resolveClientBookingTimezone({ timezone: company?.timezone })
    const visibleReviews = reviews.slice(0, reviewsToShow)
    const hasMoreReviews = reviews.length > reviewsToShow
    const visibleServices = services.slice(0, servicesToShow)
    const hasMoreServices = services.length > servicesToShow

    // Cover image из первого объявления
    const coverImage = advertisements?.[0]?.imageUrl 
        ? normalizeImageUrl(advertisements[0].imageUrl) 
        : null

    // Featured отзыв - первый с рейтингом 5 и текстом
    const featuredReview = reviews.find(
        (r) => r.rating === 5 && r.comment && r.comment.trim().length > 0
    )

    const handleLoadMoreReviews = () => {
        setReviewsToShow(prev => prev + 10)
    }

    const handleLoadMoreServices = () => {
        setServicesToShow(prev => prev + 15)
    }

    return (
        <>
            <main className="text-base bg-white dark:bg-gray-900 overflow-x-hidden pt-20 md:pt-24 pb-24 md:pb-12">
            <Container className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Хлебные крошки */}
                <div className="pb-4">
                    <Link
                        href="/services"
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-2 mb-4 transition"
                    >
                        <PiArrowLeft className="text-base" />
                        <span>{t('backToServices')}</span>
                    </Link>
                </div>

                {/* ========== COVER / HERO С ЛОГОТИПОМ (всегда — без обложки нейтральный градиент) ========== */}
                <div className="relative w-full h-48 md:h-64 lg:h-80 rounded-xl overflow-hidden mb-8 bg-gray-100 dark:bg-gray-800">
                    {coverImage ? (
                        <img
                            src={coverImage}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-60"
                            loading="eager"
                            decoding="async"
                        />
                    ) : (
                        <div
                            className="absolute inset-0 bg-gradient-to-br from-slate-200 via-gray-100 to-slate-300 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900"
                            aria-hidden="true"
                        />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        {company.logo ? (
                            <div className="relative w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-xl overflow-hidden border-4 border-white dark:border-gray-900 shadow-2xl bg-white dark:bg-gray-800">
                                <Image
                                    src={normalizeImageUrl(company.logo)}
                                    alt={company.name}
                                    fill
                                    className="object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl border-4 border-white dark:border-gray-900">
                                <PiBuilding className="text-5xl md:text-6xl lg:text-7xl text-white" />
                            </div>
                        )}
                    </div>
                </div>

                {/* ========== HERO БЛОК ========== */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {company.name}
                    </h1>
                    
                    {/* Описание */}
                    <p className="text-base text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {company.description ||
                            (company.location
                                ? t('qualityServicesIn', { location: company.location })
                                : t('professionalServices'))}
                    </p>

                    {/* CTA кнопки */}
                    <div className="hidden sm:flex flex-wrap gap-3 mb-4">
                        {company.phone && (
                            <Button
                                asElement="a"
                                href={`tel:${company.phone}`}
                                variant="solid"
                                size="md"
                                className="inline-flex items-center gap-2"
                            >
                                <PiPhone className="text-lg" />
                                {t('callButton')}
                            </Button>
                        )}
                        {(company.email || company.telegram || company.whatsapp) && (
                            <ContactDropdown
                                email={company.email}
                                telegram={company.telegram}
                                whatsapp={company.whatsapp}
                                phone={company.phone}
                            />
                        )}
                    </div>

                    {/* Рейтинг и статистика (всегда видны метки, даже при нулях) */}
                    <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                        <div
                            className={classNames(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                                company.rating > 0
                                    ? 'bg-yellow-50 dark:bg-yellow-900/20'
                                    : 'bg-gray-100 dark:bg-gray-800/80',
                            )}
                        >
                            <PiStarFill
                                className={company.rating > 0 ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500'}
                            />
                            {company.rating > 0 ? (
                                <>
                                    <span className="font-bold text-gray-900 dark:text-gray-100">
                                        {company.rating.toFixed(1)}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                        ({company.reviewsCount})
                                    </span>
                                </>
                            ) : (
                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {t('ratingNotYet')}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <PiMapPinDuotone className="text-base" />
                            <span>{company.location || t('locationNotSpecified')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <PiListBulletsFill className="text-base" />
                            <span>
                                {company.advertisementsCount}{' '}
                                {company.advertisementsCount === 1
                                    ? t('advertisement')
                                    : company.advertisementsCount < 5
                                      ? t('advertisementsFew')
                                      : t('advertisements')}
                            </span>
                        </div>
                    </div>

                    {/* Контакты */}
                    {(company.phone || company.email || company.website) && (
                        <div className="flex flex-wrap gap-4 text-sm">
                            {company.phone && (
                                <a
                                    href={`tel:${company.phone}`}
                                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                >
                                    <PiPhone className="text-base" />
                                    <span>{company.phone}</span>
                                </a>
                            )}
                            {company.email && (
                                <a
                                    href={`mailto:${company.email}`}
                                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                >
                                    <PiEnvelope className="text-base" />
                                    <span>{company.email}</span>
                                </a>
                            )}
                            {company.website && (
                                <a
                                    href={company.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                >
                                    <PiGlobe className="text-base" />
                                    <span>{t('website')}</span>
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {/* ========== БЛОК ДОВЕРИЯ (СТАТИСТИКА) — карточки всегда на месте ========== */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                        <PiStarFill
                            className={classNames(
                                'text-2xl mx-auto mb-2',
                                company.rating > 0 ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500',
                            )}
                        />
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {company.rating > 0 ? company.rating.toFixed(1) : '—'}
                        </div>
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('ratingLabel')}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                        <PiUsersFill className="text-2xl text-blue-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {company.reviewsCount}
                        </div>
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('reviewsCountLabel')}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                        <PiListBulletsFill className="text-2xl text-green-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {company.advertisementsCount}
                        </div>
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('servicesCountLabel')}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                        <PiMapPinDuotone className="text-2xl text-red-500 mx-auto mb-2" />
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                            {company.location || t('locationNotSpecified')}
                        </div>
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('locationLabel')}
                        </div>
                    </div>
                </div>

                {/* ========== FEATURED ОТЗЫВ (блок всегда; при отсутствии — плейсхолдер) ========== */}
                <div className="mb-10 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2 mb-4">
                        <PiCheckCircleFill className="text-xl text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                            {t('bestReview')}
                        </span>
                    </div>
                    {featuredReview ? (
                        <div className="flex items-start gap-4">
                            <Avatar
                                src={featuredReview.userAvatar}
                                alt={featuredReview.userName}
                                size={48}
                                className="flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                                        {featuredReview.userName}
                                    </span>
                                    <div className="flex items-center gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <PiStarFill
                                                key={i}
                                                className="text-yellow-500 text-sm"
                                            />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed">
                                    {`"${featuredReview.comment}"`}
                                </p>
                                {featuredReview.serviceName && (
                                    <div className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('serviceLabel')}: {featuredReview.serviceName}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('featuredReviewPlaceholderDescription')}
                        </p>
                    )}
                </div>

                {/* Основной контент: объявления/услуги и отзывы в двух колонках */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    {/* Левая колонка: объявления и услуги */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Объявления компании — секция всегда */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                                {t('allAdvertisements', { count: advertisements?.length ?? 0 })}
                            </h2>
                            {advertisements && advertisements.length > 0 ? (
                                <>
                                    <div className="md:hidden space-y-3">
                                        {advertisements.map((ad) => (
                                            <ServiceCard
                                                key={ad.id}
                                                service={ad}
                                                variant="compact"
                                                showRating={false}
                                            />
                                        ))}
                                    </div>
                                    <div className="hidden md:grid grid-cols-2 gap-4">
                                        {advertisements.map((ad) => (
                                            <ServiceCard
                                                key={ad.id}
                                                service={ad}
                                                variant="default"
                                                showRating={false}
                                            />
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-10 border border-dashed border-gray-200 dark:border-white/20 rounded-xl">
                                    <PiBuilding className="text-4xl text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {t('noAdvertisements')}
                                    </h3>
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('noAdvertisementsDescription')}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Услуги компании — секция всегда */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                                {t('services', { count: services?.length ?? 0 })}
                            </h2>
                            {services && services.length > 0 ? (
                                <>
                                    <div className="space-y-2">
                                        {visibleServices.map((service) => (
                                            <div
                                                key={service.id}
                                                className="flex items-start justify-between gap-4 p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
                                                        {service.name}
                                                    </div>
                                                    {service.description && (
                                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 line-clamp-2">
                                                            {service.description}
                                                        </div>
                                                    )}
                                                </div>
                                                {service.priceLabel && (
                                                    <div className="flex-shrink-0 text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {service.priceLabel}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {hasMoreServices && (
                                        <div className="mt-6 text-center">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleLoadMoreServices}
                                            >
                                                {t('showMoreServices', { count: services.length - servicesToShow })}
                                            </Button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-10 border border-dashed border-gray-200 dark:border-white/20 rounded-xl">
                                    <PiListBulletsFill className="text-4xl text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('noServicesSectionDescription')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Правая колонка: отзывы — всегда */}
                    <div className="lg:col-span-1">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                            {t('reviewsTitle', { count: reviews.length })}
                        </h2>
                        {reviews.length > 0 ? (
                            <>
                                <div className="space-y-4">
                                    {visibleReviews.map((review) => (
                                        <div
                                            key={review.id}
                                            className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900"
                                        >
                                            <div className="flex items-start gap-3 mb-3">
                                                <Avatar
                                                    src={review.userAvatar}
                                                    alt={review.userName}
                                                    size={40}
                                                    className="flex-shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
                                                        {review.userName}
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="flex items-center gap-1">
                                                            {[...Array(5)].map((_, i) => (
                                                                <PiStarFill
                                                                    key={i}
                                                                    className={classNames(
                                                                        i < review.rating
                                                                            ? 'text-yellow-500'
                                                                            : 'text-gray-300 dark:text-gray-600',
                                                                        'text-sm',
                                                                    )}
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                            {formatDate(review.date, companyTz, 'short')}
                                                        </span>
                                                    </div>
                                                    {review.serviceName && (
                                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                            {review.serviceName}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {review.comment && (
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                                                    {review.comment}
                                                </div>
                                            )}
                                            {review.response && (
                                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                                        {t('companyResponse')}
                                                    </div>
                                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {review.response}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {hasMoreReviews && (
                                    <div className="mt-6 text-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleLoadMoreReviews}
                                        >
                                            {t('showMoreReviews', { count: reviews.length - reviewsToShow })}
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-10 border border-dashed border-gray-200 dark:border-white/20 rounded-xl">
                                <PiUsersFill className="text-4xl text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    {t('reviewsEmptyTitle')}
                                </h3>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {t('reviewsEmptyDescription')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Container>
        </main>

        {/* ========== STICKY CTA ДЛЯ МОБИЛЬНЫХ ========== */}
        {(company.phone || company.email || company.telegram || company.whatsapp) && (
            <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg safe-area-inset-bottom">
                <div className="flex gap-2">
                    {company.phone && (
                        <Button
                            asElement="a"
                            href={`tel:${company.phone}`}
                            variant="solid"
                            size="md"
                            className="flex-1 inline-flex items-center justify-center gap-2 min-w-0"
                        >
                            <PiPhone className="text-lg flex-shrink-0" />
                            <span className="truncate">{t('callButton')}</span>
                        </Button>
                    )}
                    <div className={company.phone ? 'flex-1 min-w-0' : 'w-full'}>
                        <ContactDropdown
                            email={company.email}
                            telegram={company.telegram}
                            whatsapp={company.whatsapp}
                            phone={company.phone}
                            isMobile={true}
                        />
                    </div>
                </div>
            </div>
        )}
    </>
    )
}


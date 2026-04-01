'use client'

import { useState } from 'react'
import Container from '@/components/shared/Container'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getCompanyProfile } from '@/lib/api/marketplace'
import { useQuery } from '@tanstack/react-query'
import ServiceCard from '@/components/marketplace/ServiceCard'
import Loading from '@/components/shared/Loading'
import NotFound404 from '@/assets/svg/NotFound404'
import {
    PiStarFill,
    PiMapPinDuotone,
    PiArrowLeft,
    PiPhone,
    PiEnvelope,
    PiGlobe,
    PiBuilding,
} from 'react-icons/pi'
import classNames from '@/utils/classNames'
import Image from 'next/image'

export default function CompanyProfilePage() {
    const params = useParams()
    const slug = params?.slug || ''

    const { data: profile, isLoading, error } = useQuery({
        queryKey: ['company-profile', slug],
        queryFn: () => getCompanyProfile(slug),
        enabled: !!slug,
    })

    if (isLoading) {
        return (
            <main className="px-4 lg:px-0 text-base bg-white dark:bg-gray-900 overflow-x-hidden pt-20 md:pt-24">
                <Container className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Loading loading />
                </Container>
            </main>
        )
    }

    if (error || !profile) {
        return (
            <main className="px-4 lg:px-0 text-base bg-white dark:bg-gray-900 overflow-x-hidden pt-20 md:pt-24">
                <Container className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <NotFound404 />
                    <div className="text-center mt-8">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Компания не найдена
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Компания с таким названием не существует или была удалена
                        </p>
                        <Link
                            href="/services"
                            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            <PiArrowLeft className="text-base" />
                            <span>Вернуться к услугам</span>
                        </Link>
                    </div>
                </Container>
            </main>
        )
    }

    const { company, advertisements, services } = profile

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

                {/* Заголовок компании */}
                <div className="mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                        {/* Логотип */}
                        {company.logo && (
                            <div className="flex-shrink-0">
                                <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                                    <Image
                                        src={company.logo}
                                        alt={company.name}
                                        fill
                                        className="object-cover"
                                        onError={(e) => {
                                            e.currentTarget.src = '/img/others/placeholder.jpg'
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Информация о компании */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3 mb-3">
                                <PiBuilding className="text-2xl text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                                <div className="flex-1">
                                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                                        {company.name}
                                    </h1>
                                    {company.description && (
                                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                                            {company.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Рейтинг и статистика */}
                            <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
                                {company.rating > 0 && (
                                    <div className="flex items-center gap-1">
                                        <PiStarFill className="text-yellow-500 text-lg" />
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {company.rating.toFixed(1)}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400">
                                            ({company.reviewsCount} {company.reviewsCount === 1 ? 'отзыв' : company.reviewsCount < 5 ? 'отзыва' : 'отзывов'})
                                        </span>
                                    </div>
                                )}
                                {company.location && (
                                    <>
                                        <span className="text-gray-300 dark:text-gray-600">•</span>
                                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                            <PiMapPinDuotone className="text-base" />
                                            <span>{company.location}</span>
                                        </div>
                                    </>
                                )}
                                {company.advertisementsCount > 0 && (
                                    <>
                                        <span className="text-gray-300 dark:text-gray-600">•</span>
                                        <span className="text-gray-600 dark:text-gray-400">
                                            {company.advertisementsCount} {company.advertisementsCount === 1 ? 'объявление' : company.advertisementsCount < 5 ? 'объявления' : 'объявлений'}
                                        </span>
                                    </>
                                )}
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
                                            <span>Сайт</span>
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Объявления компании */}
                {advertisements && advertisements.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            Все объявления ({advertisements.length})
                        </h2>
                        {/* Мобильная версия - компактные карточки */}
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
                        {/* Десктопная версия - сетка */}
                        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
                            {advertisements.map((ad) => (
                                <ServiceCard
                                    key={ad.id}
                                    service={ad}
                                    variant="default"
                                    showRating={false}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Услуги компании (если есть) */}
                {services && services.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            Услуги ({services.length})
                        </h2>
                        {/* Мобильная версия - компактные карточки */}
                        <div className="md:hidden space-y-3">
                            {services.map((service) => (
                                <ServiceCard
                                    key={service.id}
                                    service={{
                                        ...service,
                                        path: `/marketplace/${service.id}`,
                                        imageUrl: service.imageUrl || '/img/others/placeholder.jpg',
                                    }}
                                    variant="compact"
                                />
                            ))}
                        </div>
                        {/* Десктопная версия - сетка */}
                        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
                            {services.map((service) => (
                                <ServiceCard
                                    key={service.id}
                                    service={{
                                        ...service,
                                        path: `/marketplace/${service.id}`,
                                        imageUrl: service.imageUrl || '/img/others/placeholder.jpg',
                                    }}
                                    variant="default"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Пустое состояние */}
                {(!advertisements || advertisements.length === 0) && (!services || services.length === 0) && (
                    <div className="text-center py-12 border border-dashed border-gray-200 dark:border-white/20 rounded-xl">
                        <PiBuilding className="text-4xl text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Нет объявлений
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            У этой компании пока нет активных объявлений
                        </p>
                    </div>
                )}
            </Container>
        </main>
    )
}


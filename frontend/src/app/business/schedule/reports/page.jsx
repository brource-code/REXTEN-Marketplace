'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import ReportsHeader from './_components/ReportsHeader'
import OverviewCards from './_components/OverviewCards'
import BookingsReport from './_components/BookingsReport'
import ClientsReport from './_components/ClientsReport'
import RevenueReport from './_components/RevenueReport'
import SpecialistsReport from './_components/SpecialistsReport'
import SalaryReport from './_components/SalaryReport'
import PermissionGuard from '@/components/shared/PermissionGuard'
import useSubscriptionLimits from '@/hooks/useSubscriptionLimits'

/**
 * Страница отчетов для бизнеса
 * Детальная аналитика по бронированиям, клиентам, заработку и исполнителям
 */
export default function Page() {
    return (
        <PermissionGuard permission="view_reports">
            <ReportsPageContent />
        </PermissionGuard>
    )
}

function ReportsPageContent() {
    const t = useTranslations('nav.business.schedule.reports')
    const tBusiness = useTranslations('business.reports')
    const tFeature = useTranslations('business.subscription.featureRequired')
    const { hasFeature, isLoading, isError, usage } = useSubscriptionLimits()

    // Фильтры по умолчанию (пустые - показываем все данные, как в дашборде)
    const [filters, setFilters] = useState({
        date_from: null,
        date_to: null,
    })

    const handleFiltersChange = (newFilters) => {
        setFilters(newFilters)
    }

    // Проверяем, указан ли период
    const hasPeriod = filters?.date_from && filters?.date_to

    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    if (!isError && usage && !hasFeature('analytics')) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tFeature('title')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{tFeature('description')}</p>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{tFeature('analytics')}</p>
                        <Link
                            href="/business/subscription"
                            className="text-sm font-bold text-primary underline w-fit"
                        >
                            {tFeature('upgrade')}
                        </Link>
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {t('description')}
                        </p>
                    </div>

                    <ReportsHeader filters={filters} onFiltersChange={handleFiltersChange} />

                    {!hasPeriod ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-12 rounded-lg border border-dashed border-gray-200 dark:border-gray-600">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                                {tBusiness('selectPeriodTitle')}
                            </p>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {tBusiness('selectPeriodDescription')}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            <OverviewCards filters={filters} />

                            <BookingsReport filters={filters} />

                            <ClientsReport filters={filters} />

                            <RevenueReport filters={filters} />

                            <SpecialistsReport filters={filters} />

                            <SalaryReport filters={filters} />
                        </div>
                    )}
                </div>
            </AdaptiveCard>
        </Container>
    )
}


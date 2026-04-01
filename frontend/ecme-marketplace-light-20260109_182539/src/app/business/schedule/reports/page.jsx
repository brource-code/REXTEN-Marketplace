'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Loading from '@/components/shared/Loading'
import dayjs from 'dayjs'
import ReportsHeader from './_components/ReportsHeader'
import OverviewCards from './_components/OverviewCards'
import BookingsReport from './_components/BookingsReport'
import ClientsReport from './_components/ClientsReport'
import RevenueReport from './_components/RevenueReport'
import SpecialistsReport from './_components/SpecialistsReport'

/**
 * Страница отчетов для бизнеса
 * Детальная аналитика по бронированиям, клиентам, заработку и исполнителям
 */
export default function Page() {
    const t = useTranslations('nav.business.schedule.reports')
    
    // Фильтры по умолчанию (пустые - показываем все данные, как в дашборде)
    const [filters, setFilters] = useState({
        date_from: null,
        date_to: null,
    })

    const handleFiltersChange = (newFilters) => {
        setFilters(newFilters)
    }

    return (
        <Container>
            <div className="space-y-6">
                <div>
                    <h1 className="h2 mb-2 heading-text">{t('title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('description')}</p>
                </div>

                <ReportsHeader filters={filters} onFiltersChange={handleFiltersChange} />

                <OverviewCards filters={filters} />

                <BookingsReport filters={filters} />

                <ClientsReport filters={filters} />

                <RevenueReport filters={filters} />

                <SpecialistsReport filters={filters} />
            </div>
        </Container>
    )
}


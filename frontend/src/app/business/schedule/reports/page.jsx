'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import classNames from '@/utils/classNames'
import SegmentTabBar from '@/components/shared/SegmentTabBar'
import ReportsHeader from './_components/ReportsHeader'
import OverviewCards from './_components/OverviewCards'
import BookingsReport from './_components/BookingsReport'
import ClientsReport from './_components/ClientsReport'
import RevenueReport from './_components/RevenueReport'
import SpecialistsReport from './_components/SpecialistsReport'
import SalaryReport from './_components/SalaryReport'
import PermissionGuard from '@/components/shared/PermissionGuard'
import FeatureLockOverlay from '@/components/shared/FeatureLockOverlay'
import EmptyStatePanel from '@/components/shared/EmptyStatePanel'
import { PiCalendarBlank } from 'react-icons/pi'

const REPORTS_FILTERS_STORAGE_KEY = 'rexten-business-reports-filters'

function readStoredReportFilters() {
    if (typeof window === 'undefined') {
        return null
    }
    try {
        const raw = sessionStorage.getItem(REPORTS_FILTERS_STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (
            parsed &&
            typeof parsed.date_from === 'string' &&
            typeof parsed.date_to === 'string' &&
            parsed.date_from &&
            parsed.date_to
        ) {
            return { date_from: parsed.date_from, date_to: parsed.date_to }
        }
    } catch {
        // ignore
    }
    return null
}

/**
 * Страница отчетов для бизнеса
 * Детальная аналитика по бронированиям, клиентам, заработку и исполнителям
 */
export default function Page() {
    return (
        <PermissionGuard permission="view_reports">
            <FeatureLockOverlay feature="analytics">
                <ReportsPageContent />
            </FeatureLockOverlay>
        </PermissionGuard>
    )
}

function ReportsPageContent() {
    const t = useTranslations('nav.business.schedule.reports')
    const tBusiness = useTranslations('business.reports')

    const [filters, setFilters] = useState({
        date_from: null,
        date_to: null,
    })
    const [mobileTab, setMobileTab] = useState('overview')

    const handleFiltersChange = useCallback((newFilters) => {
        setFilters(newFilters)
        try {
            if (newFilters?.date_from && newFilters?.date_to) {
                sessionStorage.setItem(
                    REPORTS_FILTERS_STORAGE_KEY,
                    JSON.stringify({
                        date_from: newFilters.date_from,
                        date_to: newFilters.date_to,
                    }),
                )
            } else {
                sessionStorage.removeItem(REPORTS_FILTERS_STORAGE_KEY)
            }
        } catch {
            // ignore quota / private mode
        }
    }, [])

    useEffect(() => {
        const stored = readStoredReportFilters()
        if (stored) {
            handleFiltersChange(stored)
        }
    }, [handleFiltersChange])

    const hasPeriod = filters?.date_from && filters?.date_to

    useEffect(() => {
        if (typeof window === 'undefined') return undefined
        const mq = window.matchMedia('(min-width: 1024px)')
        const nudgeCharts = () => {
            window.requestAnimationFrame(() => {
                window.dispatchEvent(new Event('resize'))
            })
        }
        mq.addEventListener('change', nudgeCharts)
        return () => mq.removeEventListener('change', nudgeCharts)
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined' || !hasPeriod) return undefined
        const id = window.setTimeout(() => {
            window.dispatchEvent(new Event('resize'))
        }, 120)
        return () => window.clearTimeout(id)
    }, [mobileTab, hasPeriod, filters.date_from, filters.date_to])

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex max-w-full flex-col gap-4 overflow-x-hidden">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                        <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('description')}
                        </p>
                    </div>

                    <ReportsHeader filters={filters} onFiltersChange={handleFiltersChange} />

                    {!hasPeriod ? (
                        <EmptyStatePanel
                            icon={PiCalendarBlank}
                            title={tBusiness('selectPeriodTitle')}
                            hint={tBusiness('selectPeriodDescription')}
                        />
                    ) : (
                        <>
                            <div className="lg:hidden">
                                <SegmentTabBar
                                    value={mobileTab}
                                    onChange={setMobileTab}
                                    items={[
                                        { value: 'overview', label: t('tabs.overview') },
                                        { value: 'bookings', label: t('tabs.bookings') },
                                        { value: 'clients', label: t('tabs.clients') },
                                        { value: 'revenue', label: t('tabs.revenue') },
                                        { value: 'specialists', label: t('tabs.specialists') },
                                        { value: 'salary', label: t('tabs.salary') },
                                    ]}
                                />
                            </div>

                            <div className="flex flex-col gap-6">
                                <div
                                    className={classNames(
                                        mobileTab !== 'overview' && 'hidden',
                                        'lg:block',
                                    )}
                                >
                                    <OverviewCards filters={filters} />
                                </div>

                                <div
                                    className={classNames(
                                        mobileTab !== 'bookings' && 'hidden',
                                        'lg:block',
                                    )}
                                >
                                    <BookingsReport filters={filters} />
                                </div>

                                <div
                                    className={classNames(
                                        mobileTab !== 'clients' && 'hidden',
                                        'lg:block',
                                    )}
                                >
                                    <ClientsReport filters={filters} />
                                </div>

                                <div
                                    className={classNames(
                                        mobileTab !== 'revenue' && 'hidden',
                                        'lg:block',
                                    )}
                                >
                                    <RevenueReport filters={filters} />
                                </div>

                                <div
                                    className={classNames(
                                        mobileTab !== 'specialists' && 'hidden',
                                        'lg:block',
                                    )}
                                >
                                    <SpecialistsReport filters={filters} />
                                </div>

                                <div
                                    className={classNames(
                                        mobileTab !== 'salary' && 'hidden',
                                        'lg:block',
                                    )}
                                >
                                    <SalaryReport filters={filters} />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </AdaptiveCard>
        </Container>
    )
}

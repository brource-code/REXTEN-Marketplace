'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ClientsTable from './_components/ClientsTable'
import ClientsTableTools from './_components/ClientsTableTools'
import ClientsOverviewCards from './_components/ClientsOverviewCards'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getBusinessClients } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import { useTranslations } from 'next-intl'
import PermissionGuard from '@/components/shared/PermissionGuard'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'

const CLIENTS_FILTERS_STORAGE_KEY = 'rexten-business-clients-filters'

function readStoredClientFilters() {
    if (typeof window === 'undefined') {
        return null
    }
    try {
        const raw = sessionStorage.getItem(CLIENTS_FILTERS_STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return null
        return parsed
    } catch {
        return null
    }
}

/**
 * Страница клиентов бизнеса
 * Список всех клиентов бизнеса с CRM функционалом
 */
export default function Page() {
    return (
        <PermissionGuard permission="view_clients">
            <ClientsPageContent />
        </PermissionGuard>
    )
}

function ClientsPageContent() {
    const t = useTranslations('business.clients')
    const searchParams = useSearchParams()
    const { onAppendQueryParams } = useAppendQueryParams()
    const restoredFiltersRef = useRef(false)

    const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const quickFilter = searchParams.get('quickFilter') || ''
    const sortKey = searchParams.get('sortKey') || 'name'
    const order = searchParams.get('order') === 'desc' ? 'desc' : 'asc'

    useEffect(() => {
        if (restoredFiltersRef.current) return
        restoredFiltersRef.current = true
        const stored = readStoredClientFilters()
        if (!stored) return
        const hasUrlFilter =
            (searchParams.get('search') || '').trim() ||
            searchParams.get('status') ||
            searchParams.get('quickFilter') ||
            (searchParams.get('sortKey') && searchParams.get('sortKey') !== 'name') ||
            searchParams.get('order') === 'desc'
        if (hasUrlFilter) return
        onAppendQueryParams({
            search: typeof stored.search === 'string' ? stored.search : '',
            status: typeof stored.status === 'string' ? stored.status : '',
            quickFilter: typeof stored.quickFilter === 'string' ? stored.quickFilter : '',
            sortKey: typeof stored.sortKey === 'string' ? stored.sortKey : 'name',
            order: stored.order === 'desc' ? 'desc' : 'asc',
            pageIndex: '1',
        })
    }, [onAppendQueryParams, searchParams])

    useEffect(() => {
        try {
            sessionStorage.setItem(
                CLIENTS_FILTERS_STORAGE_KEY,
                JSON.stringify({
                    search: searchParams.get('search') || '',
                    status: searchParams.get('status') || '',
                    quickFilter: searchParams.get('quickFilter') || '',
                    sortKey: searchParams.get('sortKey') || 'name',
                    order: searchParams.get('order') === 'desc' ? 'desc' : 'asc',
                }),
            )
        } catch {
            // ignore
        }
    }, [searchParams])

    useEffect(() => {
        if (typeof window === 'undefined') return undefined
        const mq = window.matchMedia('(min-width: 768px)')
        const nudgeCharts = () => {
            window.requestAnimationFrame(() => {
                window.dispatchEvent(new Event('resize'))
            })
        }
        mq.addEventListener('change', nudgeCharts)
        return () => mq.removeEventListener('change', nudgeCharts)
    }, [])

    const { data, isPending, isFetching } = useQuery({
        queryKey: [
            'business-clients',
            pageIndex,
            pageSize,
            search,
            status,
            quickFilter,
            sortKey,
            order,
        ],
        queryFn: () =>
            getBusinessClients({
                page: pageIndex,
                pageSize,
                search: search || undefined,
                status: status || undefined,
                quickFilter: quickFilter || undefined,
                sortKey,
                order,
            }),
        placeholderData: keepPreviousData,
    })

    const nudgeAfterContent = useCallback(() => {
        if (typeof window === 'undefined') return
        window.setTimeout(() => {
            window.dispatchEvent(new Event('resize'))
        }, 120)
    }, [])

    useEffect(() => {
        if (!isFetching) {
            nudgeAfterContent()
        }
    }, [isFetching, pageIndex, pageSize, search, status, quickFilter, sortKey, order, nudgeAfterContent])

    if (isPending && !data) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex min-h-[400px] min-w-0 flex-col gap-4">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                            <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('description')}
                            </p>
                        </div>
                        <ClientsTableTools />
                        <ClientsOverviewCards total={0} summary={null} isLoading />
                        <div className="flex flex-1 items-center justify-center">
                            <Loading loading />
                        </div>
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex min-w-0 flex-col gap-4" data-tour="page-clients-main">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                        <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('description')}
                        </p>
                    </div>
                    <ClientsTableTools />
                    <ClientsOverviewCards
                        total={data?.total ?? 0}
                        summary={data?.summary ?? null}
                        isLoading={false}
                    />
                    <ClientsTable
                        clientsList={data?.data || []}
                        clientsTotal={data?.total || 0}
                        pageIndex={pageIndex}
                        pageSize={pageSize}
                    />
                </div>
            </AdaptiveCard>
        </Container>
    )
}

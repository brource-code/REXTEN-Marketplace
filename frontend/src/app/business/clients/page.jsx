'use client'

import { useSearchParams } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ClientsTable from './_components/ClientsTable'
import ClientsTableTools from './_components/ClientsTableTools'
import ClientsActionTools from './_components/ClientsActionTools'
import { useQuery } from '@tanstack/react-query'
import { getBusinessClients } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import { useTranslations } from 'next-intl'
import PermissionGuard from '@/components/shared/PermissionGuard'

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
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const { data, isLoading } = useQuery({
        queryKey: ['business-clients', pageIndex, pageSize, search, status],
        queryFn: () => getBusinessClients({
            page: pageIndex,
            pageSize,
            search: search || undefined,
            status: status || undefined,
        }),
    })

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

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4" data-tour="page-clients-main">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                {t('description')}
                            </p>
                        </div>
                        <ClientsActionTools />
                    </div>
                    <ClientsTableTools />
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

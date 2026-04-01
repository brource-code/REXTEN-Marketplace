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

/**
 * Страница клиентов бизнеса
 * Список всех клиентов бизнеса с CRM функционалом
 */
export default function Page() {
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
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                            <h3>Клиенты</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Управление клиентской базой
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

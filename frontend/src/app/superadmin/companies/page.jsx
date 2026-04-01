'use client'

import { useSearchParams } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import CompaniesTable from './_components/CompaniesTable'
import CompaniesTableTools from './_components/CompaniesTableTools'
import CompaniesActionTools from './_components/CompaniesActionTools'
import { useQuery } from '@tanstack/react-query'
import { getCompanies } from '@/lib/api/superadmin'
import Loading from '@/components/shared/Loading'

/**
 * Страница управления компаниями (суперадмин)
 * Список всех бизнесов-тенантов, CRUD, модерация, подписки
 */
export default function Page() {
    const searchParams = useSearchParams()
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const { data, isLoading } = useQuery({
        queryKey: ['companies', pageIndex, pageSize, search, status],
        queryFn: () => getCompanies({
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
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">Компании</h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                Управление бизнесами-тенантами
                            </p>
                        </div>
                        <CompaniesActionTools />
                    </div>
                    <CompaniesTableTools />
                    {data && (data.data || []).length === 0 && !isLoading ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Компании не найдены</p>
                        </div>
                    ) : (
                        <CompaniesTable
                            companiesList={data?.data || []}
                            companiesTotal={data?.total || 0}
                            pageIndex={pageIndex}
                            pageSize={pageSize}
                        />
                    )}
                </div>
            </AdaptiveCard>
        </Container>
    )
}

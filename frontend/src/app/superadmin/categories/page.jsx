'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import CategoriesTable from './_components/CategoriesTable'
import CategoriesActionTools from './_components/CategoriesActionTools'
import { useQuery } from '@tanstack/react-query'
import { getCategories } from '@/lib/api/superadmin'
import Loading from '@/components/shared/Loading'

function CategoriesContent() {
    const searchParams = useSearchParams()
    const search = searchParams.get('search') || ''
    const isActive = searchParams.get('is_active')
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    const { data, isLoading, error } = useQuery({
        queryKey: ['categories', pageIndex, pageSize, search, isActive],
        queryFn: () => getCategories({
            search: search || undefined,
            is_active: isActive !== null ? isActive === 'true' : undefined,
            page: pageIndex,
            pageSize,
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

    if (error) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                        <p className="text-red-500">Ошибка загрузки категорий</p>
                        <p className="text-sm text-gray-500">{error.message}</p>
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
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">Категории бизнесов</h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                Управление категориями услуг для русскоговорящих бизнесов в США
                            </p>
                        </div>
                        <CategoriesActionTools />
                    </div>
                    <CategoriesTable
                        categoriesList={data?.data || []}
                        categoriesTotal={data?.total || 0}
                        pageIndex={pageIndex}
                        pageSize={pageSize}
                    />
                </div>
            </AdaptiveCard>
        </Container>
    )
}

/**
 * Страница управления категориями бизнесов (суперадмин)
 * CRUD операции для категорий услуг
 */
export default function Page() {
    return (
        <Suspense fallback={
            <Container>
                <AdaptiveCard>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        }>
            <CategoriesContent />
        </Suspense>
    )
}


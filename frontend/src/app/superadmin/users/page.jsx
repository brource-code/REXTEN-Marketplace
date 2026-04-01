'use client'

import { useSearchParams } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import UsersTable from './_components/UsersTable'
import UsersTableTools from './_components/UsersTableTools'
import UsersActionTools from './_components/UsersActionTools'
import { useQuery } from '@tanstack/react-query'
import { getUsers } from '@/lib/api/superadmin'
import Loading from '@/components/shared/Loading'

/**
 * Страница управления пользователями (суперадмин)
 * Список всех пользователей, фильтры по ролям, управление ролями и правами
 */
export default function Page() {
    const searchParams = useSearchParams()
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''

    const { data, isLoading } = useQuery({
        queryKey: ['users', pageIndex, pageSize, search, role, status],
        queryFn: () => getUsers({
            page: pageIndex,
            pageSize,
            search: search || undefined,
            role: role || undefined,
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
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">Пользователи</h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                Управление пользователями платформы
                            </p>
                        </div>
                        <UsersActionTools />
                    </div>
                    <UsersTableTools />
                    <UsersTable
                        usersList={data?.data || []}
                        usersTotal={data?.total || 0}
                        pageIndex={pageIndex}
                        pageSize={pageSize}
                    />
                </div>
            </AdaptiveCard>
        </Container>
    )
}

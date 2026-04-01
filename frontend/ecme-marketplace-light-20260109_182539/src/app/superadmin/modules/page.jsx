'use client'

import Container from '@/components/shared/Container'
import ModulesList from './_components/ModulesList'
import { useQuery } from '@tanstack/react-query'
import { getModules } from '@/lib/api/superadmin'
import Loading from '@/components/shared/Loading'

/**
 * Страница управления модулями (суперадмин)
 * Включение/отключение модулей, настройки доступности
 */
export default function Page() {
    const { data: modules, isLoading } = useQuery({
        queryKey: ['superadmin-modules'],
        queryFn: getModules,
    })

    if (isLoading) {
        return (
            <Container>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loading loading />
                </div>
            </Container>
        )
    }

    return (
        <Container>
            <ModulesList modules={modules || []} />
        </Container>
    )
}

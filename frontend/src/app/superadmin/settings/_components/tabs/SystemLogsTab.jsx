'use client'

import { useSearchParams } from 'next/navigation'
import ActivityLogTable from '../../../activity-log/_components/ActivityLogTable'
import ActivityLogFilters from '../../../activity-log/_components/ActivityLogFilters'
import Button from '@/components/ui/Button'
import { PiDownload } from 'react-icons/pi'
import { useQuery } from '@tanstack/react-query'
import { getActivityLogs, exportActivityLogs } from '@/lib/api/superadmin'
import Loading from '@/components/shared/Loading'

/**
 * Таб "Системные логи" в настройках
 * Переиспользует компоненты из activity-log
 */
const SystemLogsTab = () => {
    const searchParams = useSearchParams()
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const search = searchParams.get('search') || ''
    const action = searchParams.get('action') || ''
    const entityType = searchParams.get('entity_type') || ''
    const segment = searchParams.get('segment') || ''
    const category = searchParams.get('category') || ''
    const dateFrom = searchParams.get('date_from') || ''
    const dateTo = searchParams.get('date_to') || ''

    const { data, isLoading } = useQuery({
        queryKey: [
            'activity-logs',
            pageIndex,
            pageSize,
            search,
            action,
            entityType,
            segment,
            category,
            dateFrom,
            dateTo,
        ],
        queryFn: () =>
            getActivityLogs({
                page: pageIndex,
                pageSize,
                search: search || undefined,
                action: action || undefined,
                entity_type: entityType || undefined,
                segment: segment || undefined,
                category: category || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            }),
    })

    const handleExport = async () => {
        try {
            const blob = await exportActivityLogs({
                action: action || undefined,
                entity_type: entityType || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `system_logs_${new Date().toISOString().split('T')[0]}.csv`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Export error:', error)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading loading />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Заголовок и экспорт */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                        Системные логи
                    </h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                        Технические логи всех действий в системе (изменения, создания, удаления)
                    </p>
                </div>
                <Button
                    variant="solid"
                    size="sm"
                    icon={<PiDownload />}
                    onClick={handleExport}
                >
                    Экспорт CSV
                </Button>
            </div>

            {/* Фильтры */}
            <ActivityLogFilters />

            {/* Таблица логов */}
            {data && (data.data || []).length === 0 && !isLoading ? (
                <div className="text-center py-12">
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        Записи не найдены
                    </p>
                </div>
            ) : (
                <ActivityLogTable
                    logsList={data?.data || []}
                    logsTotal={data?.total || 0}
                    pageIndex={pageIndex}
                    pageSize={pageSize}
                />
            )}
        </div>
    )
}

export default SystemLogsTab

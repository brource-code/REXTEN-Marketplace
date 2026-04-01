'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import { useQuery } from '@tanstack/react-query'
import { getAdminDashboardRecentActivity } from '@/lib/api/superadmin'
import Loading from '@/components/shared/Loading'
import { useTranslations } from 'next-intl'
import { formatSuperadminDateTime } from '@/utils/dateTime'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'

const { Tr, Td, TBody, THead, Th } = Table

function activityDescription(row, tSyn) {
    if (row.description) return row.description
    if (!row.activity_key || !tSyn) {
        return [row.action, row.entity_name].filter(Boolean).join(' · ') || '—'
    }
    const meta = row.activity_meta || {}
    if (row.activity_key === 'new_booking') {
        return meta.company
            ? tSyn('new_booking', { id: meta.id, company: meta.company })
            : tSyn('new_booking_short', { id: meta.id })
    }
    return tSyn(row.activity_key, { ...meta, defaultValue: row.activity_key })
}

export default function DashboardActivity() {
    const router = useRouter()
    const t = useTranslations('superadmin.dashboard.activity')
    const tSyn = useTranslations('superadmin.dashboard.activitySynthetic')
    const { data = [], isLoading } = useQuery({
        queryKey: ['admin-dashboard-activity'],
        queryFn: getAdminDashboardRecentActivity,
    })

    const formatDate = (iso) => (iso ? formatSuperadminDateTime(iso) : '')

    const columns = useMemo(
        () => [
            {
                accessorKey: 'created_at',
                header: t('columnTime'),
                cell: ({ row }) => (
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        {formatDate(row.original.created_at)}
                    </span>
                ),
            },
            {
                accessorKey: 'user',
                header: t('columnUser'),
                cell: ({ row }) => {
                    const u = row.original.user
                    return (
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {u?.name || u?.email || '—'}
                        </span>
                    )
                },
            },
            {
                accessorKey: 'description',
                header: t('columnAction'),
                cell: ({ row }) => {
                    const r = row.original
                    const text = activityDescription(r, tSyn)
                    return (
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 line-clamp-2">
                            {text}
                        </span>
                    )
                },
            },
        ],
        [t, tSyn],
    )

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    if (isLoading) {
        return (
            <Card>
                <div className="flex items-center justify-center py-12">
                    <Loading loading />
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                <Button size="sm" onClick={() => router.push('/superadmin/activity-log')}>
                    {t('viewAll')}
                </Button>
            </div>
            {data.length === 0 ? (
                <div className="text-center py-12 text-sm font-bold text-gray-500 dark:text-gray-400">
                    {t('empty')}
                </div>
            ) : (
                <div className="hidden md:block overflow-x-auto">
                    <Table>
                        <THead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <Tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <Th key={header.id} colSpan={header.colSpan}>
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext(),
                                            )}
                                        </Th>
                                    ))}
                                </Tr>
                            ))}
                        </THead>
                        <TBody>
                            {table.getRowModel().rows.map((row) => (
                                <Tr key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <Td key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </Td>
                                    ))}
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                </div>
            )}
            {data.length > 0 && (
                <div className="md:hidden flex flex-col gap-3">
                    {data.map((row) => (
                        <div
                            key={row.id}
                            className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {formatDate(row.created_at)}
                            </div>
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1">
                                {row.user?.name || row.user?.email || '—'}
                            </div>
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                {activityDescription(row, tSyn)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    )
}

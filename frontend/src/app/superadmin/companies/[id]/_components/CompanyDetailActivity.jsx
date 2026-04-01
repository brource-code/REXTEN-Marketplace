'use client'

import { useState, useMemo } from 'react'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Loading from '@/components/shared/Loading'
import DataTable from '@/components/shared/DataTable'
import { useQuery } from '@tanstack/react-query'
import { getCompanyActivity } from '@/lib/api/superadmin'
import { useTranslations } from 'next-intl'
import { formatSuperadminDateOnly, formatSuperadminTimeOnly } from '@/utils/dateTime'
import {
    PiUser,
    PiCalendarCheck,
    PiMegaphone,
    PiStar,
    PiGear,
    PiSignIn,
    PiChartLine,
} from 'react-icons/pi'

const categoryIcons = {
    auth: PiSignIn,
    company: PiChartLine,
    booking: PiCalendarCheck,
    user: PiUser,
    advertisement: PiMegaphone,
    review: PiStar,
    settings: PiGear,
    service: PiChartLine,
}

const actionColors = {
    create: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    update: 'bg-blue-200 dark:bg-blue-900/40 text-gray-900 dark:text-gray-100',
    delete: 'bg-red-200 dark:bg-red-900/40 text-gray-900 dark:text-gray-100',
    login: 'bg-cyan-200 dark:bg-cyan-900/40 text-gray-900 dark:text-gray-100',
    logout: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    approve: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    reject: 'bg-red-200 dark:bg-red-900/40 text-gray-900 dark:text-gray-100',
    block: 'bg-red-200 dark:bg-red-900/40 text-gray-900 dark:text-gray-100',
    unblock: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    cancel: 'bg-amber-200 dark:bg-amber-900/40 text-gray-900 dark:text-gray-100',
    complete: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    confirm: 'bg-blue-200 dark:bg-blue-900/40 text-gray-900 dark:text-gray-100',
}

export default function CompanyDetailActivity({ companyId }) {
    const t = useTranslations('superadmin.companyDetail.activity')
    const [filters, setFilters] = useState({
        category: '',
        page: 1,
        pageSize: 10,
    })

    const categoryOptions = useMemo(() => [
        { value: '', label: t('filters.allCategories') },
        { value: 'company', label: t('categories.company') },
        { value: 'booking', label: t('categories.booking') },
        { value: 'user', label: t('categories.user') },
        { value: 'advertisement', label: t('categories.advertisement') },
        { value: 'review', label: t('categories.review') },
        { value: 'service', label: t('categories.service') },
    ], [t])

    const { data, isLoading } = useQuery({
        queryKey: ['company-activity', companyId, filters],
        queryFn: () => getCompanyActivity(companyId, {
            category: filters.category || undefined,
            page: filters.page,
            pageSize: filters.pageSize,
        }),
        enabled: !!companyId,
    })

    const columns = useMemo(() => [
        {
            header: t('table.date'),
            accessorKey: 'created_at',
            cell: (props) => {
                const created = props.row.original.created_at
                return (
                    <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {formatSuperadminDateOnly(created)}
                        </div>
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {formatSuperadminTimeOnly(created)}
                        </div>
                    </div>
                )
            },
        },
        {
            header: t('table.user'),
            accessorKey: 'user',
            cell: (props) => {
                const user = props.row.original.user
                return user ? (
                    <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {user.name}
                        </div>
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {user.email}
                        </div>
                    </div>
                ) : (
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('table.system')}
                    </span>
                )
            },
        },
        {
            header: t('table.action'),
            accessorKey: 'action',
            cell: (props) => {
                const action = props.row.original.action
                return (
                    <Tag className={actionColors[action] || 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}>
                        {t(`actions.${action}`, { defaultValue: action })}
                    </Tag>
                )
            },
        },
        {
            header: t('table.description'),
            accessorKey: 'description',
            cell: (props) => {
                const row = props.row.original
                const CategoryIcon = categoryIcons[row.category] || PiChartLine
                return (
                    <div className="flex items-start gap-2">
                        <CategoryIcon className="text-lg text-gray-400 shrink-0 mt-0.5" />
                        <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {row.description || row.entity_name || '-'}
                            </div>
                            {row.entity_type && (
                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {row.entity_type} {row.entity_id ? `#${row.entity_id}` : ''}
                                </div>
                            )}
                        </div>
                    </div>
                )
            },
        },
    ], [t])

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
    }

    const handlePaginationChange = (page) => {
        setFilters(prev => ({ ...prev, page }))
    }

    const handlePageSizeChange = (size) => {
        setFilters(prev => ({ ...prev, pageSize: size, page: 1 }))
    }

    return (
        <div className="space-y-4">
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {t('title')}
                    </h4>
                    <div className="w-full sm:w-48">
                        <Select
                            size="sm"
                            options={categoryOptions}
                            value={categoryOptions.find(o => o.value === filters.category)}
                            onChange={(opt) => handleFilterChange('category', opt?.value || '')}
                            placeholder={t('filters.category')}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loading loading />
                    </div>
                ) : data?.data?.length > 0 ? (
                    <>
                        {/* Мобильная версия — карточки */}
                        <div className="md:hidden space-y-4">
                            {data.data.map((log, idx) => {
                                const CategoryIcon = categoryIcons[log.category] || PiChartLine
                                const actionColor = actionColors[log.action] || 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                return (
                                    <Card key={log.id ?? `activity-${idx}`} className="p-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-start justify-between gap-2 flex-wrap">
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {formatSuperadminDateOnly(log.created_at)}
                                                    </div>
                                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                        {formatSuperadminTimeOnly(log.created_at)}
                                                    </div>
                                                </div>
                                                <Tag className={actionColor}>
                                                    {t(`actions.${log.action}`, { defaultValue: log.action })}
                                                </Tag>
                                            </div>
                                            {log.user ? (
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{log.user.name}</div>
                                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{log.user.email}</div>
                                                </div>
                                            ) : (
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('table.system')}</span>
                                            )}
                                            <div className="flex items-start gap-2">
                                                <CategoryIcon className="text-lg text-gray-400 shrink-0 mt-0.5" />
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 min-w-0">
                                                    {log.description || log.entity_name || '-'}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )
                            })}
                            {(data.total || 0) > filters.pageSize && (
                                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={filters.page <= 1}
                                        onClick={() => handlePaginationChange(filters.page - 1)}
                                    >
                                        {t('table.prev')}
                                    </Button>
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {filters.page} / {Math.max(1, Math.ceil((data.total || 0) / filters.pageSize))}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={filters.page >= Math.ceil((data.total || 0) / filters.pageSize)}
                                        onClick={() => handlePaginationChange(filters.page + 1)}
                                    >
                                        {t('table.next')}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Десктопная версия — таблица */}
                        <div className="hidden md:block">
                            <DataTable
                                columns={columns}
                                data={data.data}
                                noData={false}
                                pagingData={{
                                    total: data.total || 0,
                                    pageIndex: filters.page,
                                    pageSize: filters.pageSize,
                                }}
                                onPaginationChange={handlePaginationChange}
                                onSelectChange={handlePageSizeChange}
                            />
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12 text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('noActivity')}
                    </div>
                )}
            </Card>
        </div>
    )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Loading from '@/components/shared/Loading'
import Tag from '@/components/ui/Tag'
import { getAdminSupportTickets } from '@/lib/api/superadmin'
import { formatDateTime } from '@/utils/dateTime'

const STATUS_FILTER = ['all', 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed']

export default function SuperadminSupportListPage() {
    const router = useRouter()
    const t = useTranslations('superadmin.support')
    const [status, setStatus] = useState('all')
    const [searchInput, setSearchInput] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400)
        return () => clearTimeout(timer)
    }, [searchInput])

    const { data, isLoading, error } = useQuery({
        queryKey: ['admin-support-tickets', status, debouncedSearch],
        queryFn: () =>
            getAdminSupportTickets({
                status: status === 'all' ? undefined : status,
                search: debouncedSearch || undefined,
                page: 1,
                pageSize: 50,
            }),
    })

    const statusOptions = useMemo(
        () => STATUS_FILTER.map((s) => ({ value: s, label: t(`filters.statuses.${s}`) })),
        [t],
    )

    const statusColor = (s) => {
        if (s === 'resolved' || s === 'closed') return 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'
        if (s === 'in_progress') return 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100'
        if (s === 'waiting_customer') return 'bg-violet-200 dark:bg-violet-800 text-violet-900 dark:text-violet-100'
        return 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('listTitle')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('listDescription')}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                {t('filters.status')}
                            </label>
                            <Select
                                value={statusOptions.find((o) => o.value === status)}
                                onChange={(option) => setStatus(option?.value || 'all')}
                                options={statusOptions}
                                isSearchable={false}
                            />
                        </div>
                        <div className="flex-[2]">
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                {t('filters.search')}
                            </label>
                            <Input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder={t('filters.searchPlaceholder')}
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loading loading />
                            </div>
                        ) : error ? (
                            <p className="text-sm font-bold text-red-500">{t('loadError')}</p>
                        ) : !data?.data?.length ? (
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('empty')}</p>
                        ) : (
                            <>
                                <div className="md:hidden space-y-4">
                                    {data.data.map((row) => (
                                        <div
                                            key={row.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => router.push(`/superadmin/support/${row.id}`)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault()
                                                    router.push(`/superadmin/support/${row.id}`)
                                                }
                                            }}
                                            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 flex-1 min-w-0">
                                                    {row.subject}
                                                </h4>
                                                <Tag className={statusColor(row.status)}>{t(`status.${row.status}`)}</Tag>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    #{row.id}
                                                    <span className="text-gray-500 dark:text-gray-400 font-bold mx-2">·</span>
                                                    <span>{row.company?.name ?? '—'}</span>
                                                </div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                                    {row.submitterEmail ?? '—'}
                                                </div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {formatDateTime(row.createdAt, null, 'America/Los_Angeles', 'short')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="py-2 pr-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                                    {t('columns.id')}
                                                </th>
                                                <th className="py-2 pr-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                                    {t('columns.subject')}
                                                </th>
                                                <th className="py-2 pr-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                                    {t('columns.company')}
                                                </th>
                                                <th className="py-2 pr-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                                    {t('columns.submitter')}
                                                </th>
                                                <th className="py-2 pr-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                                    {t('columns.status')}
                                                </th>
                                                <th className="py-2 pr-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                                    {t('columns.created')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.data.map((row) => (
                                                <tr
                                                    key={row.id}
                                                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                                                    onClick={() => router.push(`/superadmin/support/${row.id}`)}
                                                >
                                                    <td className="py-3 pr-4 text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        #{row.id}
                                                    </td>
                                                    <td className="py-3 pr-4 text-sm font-bold text-gray-900 dark:text-gray-100 max-w-[200px] truncate">
                                                        {row.subject}
                                                    </td>
                                                    <td className="py-3 pr-4 text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {row.company?.name ?? '—'}
                                                    </td>
                                                    <td className="py-3 pr-4 text-sm font-bold text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                                                        {row.submitterEmail ?? '—'}
                                                    </td>
                                                    <td className="py-3 pr-4">
                                                        <Tag className={statusColor(row.status)}>{t(`status.${row.status}`)}</Tag>
                                                    </td>
                                                    <td className="py-3 pr-4 text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                        {formatDateTime(row.createdAt, null, 'America/Los_Angeles', 'short')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </AdaptiveCard>
        </Container>
    )
}

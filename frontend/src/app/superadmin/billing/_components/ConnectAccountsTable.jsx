'use client'

import { useState, useMemo } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import DataTable from '@/components/shared/DataTable'
import Tag from '@/components/ui/Tag'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import { useQuery } from '@tanstack/react-query'
import { getConnectAccounts } from '@/lib/api/superadmin-billing'
import Loading from '@/components/shared/Loading'
import { formatDate } from '@/utils/dateTime'
import {
    PiCheckCircle,
    PiClock,
    PiWarningCircle,
    PiXCircle,
    PiBuildings,
    PiMagnifyingGlass,
} from 'react-icons/pi'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { NumericFormat } from 'react-number-format'

const statusColors = {
    active: 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100',
    pending: 'bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100',
    restricted: 'bg-orange-200 dark:bg-orange-700 text-orange-900 dark:text-orange-100',
    disabled: 'bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100',
    none: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
}

const statusIcons = {
    active: <PiCheckCircle className="text-emerald-500" size={16} />,
    pending: <PiClock className="text-amber-500" size={16} />,
    restricted: <PiWarningCircle className="text-orange-500" size={16} />,
    disabled: <PiXCircle className="text-red-500" size={16} />,
    none: null,
}

export default function ConnectAccountsTable() {
    const t = useTranslations('superadmin.billing.connect.accounts')
    const [statusFilter, setStatusFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [pageIndex, setPageIndex] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const { data, isLoading, isError } = useQuery({
        queryKey: ['superadmin-connect-accounts', statusFilter, search, pageIndex, pageSize],
        queryFn: () =>
            getConnectAccounts({
                page: pageIndex,
                pageSize,
                status: statusFilter === 'all' ? undefined : statusFilter,
                search: search || undefined,
            }),
        staleTime: 60_000,
    })

    const statusOptions = useMemo(
        () => [
            { value: 'all', label: t('filters.allStatuses') },
            { value: 'active', label: t('statuses.active') },
            { value: 'pending', label: t('statuses.pending') },
            { value: 'restricted', label: t('statuses.restricted') },
            { value: 'disabled', label: t('statuses.disabled') },
            { value: 'dispute', label: t('statuses.dispute') },
        ],
        [t],
    )

    const columns = useMemo(
        () => [
            {
                header: t('columns.company'),
                accessorKey: 'name',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <div className="flex items-center gap-2">
                            <PiBuildings className="text-gray-400 shrink-0" size={16} />
                            <Link
                                href={`/superadmin/companies/${row.id}`}
                                className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                {row.name}
                            </Link>
                        </div>
                    )
                },
            },
            {
                header: t('columns.status'),
                accessorKey: 'stripe_account_status',
                cell: (props) => {
                    const row = props.row.original
                    const status = row.stripe_account_status || 'none'
                    return (
                        <div className="flex items-center gap-2">
                            {statusIcons[status]}
                            <Tag className={statusColors[status] || statusColors.none}>
                                {t(`statuses.${status}`, { defaultValue: status })}
                            </Tag>
                            {row.has_active_dispute && (
                                <Tag className="bg-rose-200 dark:bg-rose-700 text-rose-900 dark:text-rose-100">
                                    {t('statuses.dispute')}
                                </Tag>
                            )}
                        </div>
                    )
                },
            },
            {
                header: t('columns.payments'),
                accessorKey: 'payment_count',
                cell: (props) => (
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {props.row.original.payment_count}
                    </span>
                ),
            },
            {
                header: t('columns.revenue'),
                accessorKey: 'total_amount',
                cell: (props) => (
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        <NumericFormat
                            displayType="text"
                            value={props.row.original.total_amount}
                            prefix="$"
                            thousandSeparator
                            decimalScale={2}
                            fixedDecimalScale
                        />
                    </span>
                ),
            },
            {
                header: t('columns.fees'),
                accessorKey: 'total_fees',
                cell: (props) => (
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        <NumericFormat
                            displayType="text"
                            value={props.row.original.total_fees}
                            prefix="$"
                            thousandSeparator
                            decimalScale={2}
                            fixedDecimalScale
                        />
                    </span>
                ),
            },
            {
                header: t('columns.connectedAt'),
                accessorKey: 'stripe_onboarding_completed_at',
                cell: (props) => {
                    const date = props.row.original.stripe_onboarding_completed_at
                    return (
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {date ? formatDate(date, 'America/Los_Angeles', 'numeric') : '—'}
                        </span>
                    )
                },
            },
        ],
        [t],
    )

    const rows = data?.data ?? []
    const total = data?.total ?? 0

    const MobileCard = ({ row }) => (
        <Card>
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                    <Link
                        href={`/superadmin/companies/${row.id}`}
                        className="text-sm font-bold text-blue-600 dark:text-blue-400"
                    >
                        {row.name}
                    </Link>
                    <div className="flex items-center gap-1">
                        {statusIcons[row.stripe_account_status]}
                        <Tag className={statusColors[row.stripe_account_status] || statusColors.none}>
                            {t(`statuses.${row.stripe_account_status}`, { defaultValue: row.stripe_account_status })}
                        </Tag>
                    </div>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="font-bold text-gray-500 dark:text-gray-400">{t('columns.payments')}:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{row.payment_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="font-bold text-gray-500 dark:text-gray-400">{t('columns.revenue')}:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        <NumericFormat
                            displayType="text"
                            value={row.total_amount}
                            prefix="$"
                            thousandSeparator
                            decimalScale={2}
                            fixedDecimalScale
                        />
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="font-bold text-gray-500 dark:text-gray-400">{t('columns.fees')}:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                        <NumericFormat
                            displayType="text"
                            value={row.total_fees}
                            prefix="$"
                            thousandSeparator
                            decimalScale={2}
                            fixedDecimalScale
                        />
                    </span>
                </div>
                {row.has_active_dispute && (
                    <Tag className="bg-rose-200 dark:bg-rose-700 text-rose-900 dark:text-rose-100 self-start">
                        {t('statuses.dispute')}
                    </Tag>
                )}
            </div>
        </Card>
    )

    if (isLoading) {
        return (
            <AdaptiveCard>
                <div className="flex justify-center py-16">
                    <Loading loading />
                </div>
            </AdaptiveCard>
        )
    }

    if (isError) {
        return (
            <AdaptiveCard>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 text-center py-8">
                    {t('loadError')}
                </p>
            </AdaptiveCard>
        )
    }

    return (
        <AdaptiveCard>
            <div className="flex flex-col gap-4 mb-4">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 max-w-xs">
                        <Input
                            placeholder={t('filters.search')}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value)
                                setPageIndex(1)
                            }}
                            prefix={<PiMagnifyingGlass className="text-gray-400" />}
                        />
                    </div>
                    <div className="max-w-xs">
                        <Select
                            value={statusOptions.find((o) => o.value === statusFilter)}
                            onChange={(opt) => {
                                setStatusFilter(opt?.value || 'all')
                                setPageIndex(1)
                            }}
                            options={statusOptions}
                            isSearchable={false}
                        />
                    </div>
                </div>
            </div>
            {total === 0 ? (
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 text-center py-8">
                    {t('empty')}
                </p>
            ) : (
                <>
                    <div className="md:hidden space-y-4">
                        {rows.map((row) => (
                            <MobileCard key={row.id} row={row} />
                        ))}
                        {total > pageSize && (
                            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pageIndex <= 1}
                                    onClick={() => setPageIndex((p) => p - 1)}
                                >
                                    {t('prev')}
                                </Button>
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {pageIndex} / {Math.max(1, Math.ceil(total / pageSize))}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pageIndex >= Math.ceil(total / pageSize)}
                                    onClick={() => setPageIndex((p) => p + 1)}
                                >
                                    {t('next')}
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="hidden md:block">
                        <DataTable
                            columns={columns}
                            data={rows}
                            noData={rows.length === 0}
                            loading={false}
                            pagingData={{
                                total,
                                pageIndex,
                                pageSize,
                            }}
                            onPaginationChange={(p) => setPageIndex(p)}
                            onSelectChange={(v) => {
                                setPageSize(Number(v))
                                setPageIndex(1)
                            }}
                        />
                    </div>
                </>
            )}
        </AdaptiveCard>
    )
}

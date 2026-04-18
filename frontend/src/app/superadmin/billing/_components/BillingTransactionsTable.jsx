'use client'

import { useState, useMemo } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import DataTable from '@/components/shared/DataTable'
import Tag from '@/components/ui/Tag'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { useQuery } from '@tanstack/react-query'
import { getSuperadminBillingTransactions } from '@/lib/api/superadmin-billing'
import StripePaymentDetailModal from './StripePaymentDetailModal'
import Loading from '@/components/shared/Loading'
import { formatDate } from '@/utils/dateTime'
import { PiMegaphone, PiCreditCard, PiBuildings, PiCalendarCheck } from 'react-icons/pi'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

const typeColors = {
    advertisement: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100',
    subscription: 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100',
    unknown: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
}

export default function BillingTransactionsTable() {
    const t = useTranslations('superadmin.billing.transactions')
    const tModal = useTranslations('superadmin.billing.stripeModal')
    const [typeFilter, setTypeFilter] = useState('all')
    const [pageIndex, setPageIndex] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [stripeModalRow, setStripeModalRow] = useState(null)

    const { data, isLoading, isError } = useQuery({
        queryKey: ['superadmin-billing-transactions', typeFilter, pageIndex, pageSize],
        queryFn: () =>
            getSuperadminBillingTransactions({
                page: pageIndex,
                pageSize,
                type: typeFilter === 'all' ? undefined : typeFilter,
                include_stripe: false,
            }),
        staleTime: 60_000,
    })

    const typeOptions = useMemo(
        () => [
            { value: 'all', label: t('filters.allTypes') },
            { value: 'advertisement', label: t('types.advertisement') },
            { value: 'subscription', label: t('types.subscription') },
            { value: 'unknown', label: t('types.other') },
        ],
        [t],
    )

    const modalSummary = useMemo(() => {
        if (!stripeModalRow) return null
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: stripeModalRow.currency || 'USD',
        }).format(stripeModalRow.amount)
        return [
            formatDate(stripeModalRow.created, 'America/Los_Angeles', 'numeric'),
            stripeModalRow.company_name || '—',
            stripeModalRow.description,
            formatted,
        ]
            .filter(Boolean)
            .join(' · ')
    }, [stripeModalRow])

    const columns = useMemo(
        () => [
            {
                header: t('columns.date'),
                accessorKey: 'created',
                cell: (props) => (
                    <div className="flex items-center gap-2">
                        <PiCalendarCheck className="text-gray-400 shrink-0" size={16} />
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {formatDate(props.row.original.created, 'America/Los_Angeles', 'numeric')}
                        </span>
                    </div>
                ),
            },
            {
                header: t('columns.company'),
                accessorKey: 'company_name',
                cell: (props) => {
                    const row = props.row.original
                    if (row.company_id && row.company_name) {
                        return (
                            <Link
                                href={`/superadmin/companies/${row.company_id}`}
                                className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                {row.company_name}
                            </Link>
                        )
                    }
                    return (
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">—</span>
                    )
                },
            },
            {
                header: t('columns.type'),
                accessorKey: 'type',
                cell: (props) => {
                    const row = props.row.original
                    const icon =
                        row.type === 'advertisement' ? (
                            <PiMegaphone className="text-blue-500" size={16} />
                        ) : row.type === 'subscription' ? (
                            <PiCreditCard className="text-emerald-500" size={16} />
                        ) : null
                    return (
                        <div className="flex items-center gap-2">
                            {icon}
                            <Tag className={typeColors[row.type] || typeColors.unknown}>
                                {t(`types.${row.type}`, { defaultValue: row.type })}
                            </Tag>
                        </div>
                    )
                },
            },
            {
                header: t('columns.description'),
                accessorKey: 'description',
                cell: (props) => (
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2">
                        {props.row.original.description}
                    </span>
                ),
            },
            {
                header: t('columns.amount'),
                accessorKey: 'amount',
                cell: (props) => {
                    const row = props.row.original
                    const formatted = new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: row.currency || 'USD',
                    }).format(row.amount)
                    return (
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {formatted}
                        </span>
                    )
                },
            },
            {
                header: t('columns.actions'),
                accessorKey: 'id',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="whitespace-nowrap"
                            onClick={() => setStripeModalRow(row)}
                        >
                            {tModal('openButton')}
                        </Button>
                    )
                },
            },
        ],
        [t, tModal],
    )

    const rows = data?.data ?? []
    const total = data?.total ?? 0

    const MobileCard = ({ row }) => {
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: row.currency || 'USD',
        }).format(row.amount)
        return (
            <Card>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 min-w-0">
                            {row.description}
                        </span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            {formatted}
                        </span>
                    </div>
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        {formatDate(row.created, 'America/Los_Angeles', 'numeric')}
                    </div>
                    {row.company_id && row.company_name && (
                        <Link
                            href={`/superadmin/companies/${row.company_id}`}
                            className="flex items-center gap-1 text-sm font-bold text-blue-600 dark:text-blue-400 min-w-0"
                        >
                            <PiBuildings size={14} className="shrink-0" />
                            <span className="truncate">{row.company_name}</span>
                        </Link>
                    )}
                    <Tag className={typeColors[row.type] || typeColors.unknown}>
                        {t(`types.${row.type}`, { defaultValue: row.type })}
                    </Tag>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full mt-1"
                        onClick={() => setStripeModalRow(row)}
                    >
                        {tModal('openButton')}
                    </Button>
                </div>
            </Card>
        )
    }

    if (!data?.stripe_configured && !isLoading) {
        return null
    }

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
            <StripePaymentDetailModal
                isOpen={Boolean(stripeModalRow)}
                onClose={() => setStripeModalRow(null)}
                variant={stripeModalRow ? 'platform' : null}
                paymentId={null}
                checkoutSessionId={stripeModalRow?.id ?? null}
                stripeConnectAccountId={null}
                summary={modalSummary}
            />
            <div className="flex flex-col gap-4 mb-4">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                <div className="max-w-xs w-full">
                    <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 block">
                        {t('filters.type')}
                    </label>
                    <Select
                        value={typeOptions.find((o) => o.value === typeFilter)}
                        onChange={(opt) => {
                            setTypeFilter(opt?.value || 'all')
                            setPageIndex(1)
                        }}
                        options={typeOptions}
                        isSearchable={false}
                    />
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

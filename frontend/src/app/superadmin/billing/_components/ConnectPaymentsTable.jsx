'use client'

import { useState, useMemo } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import DataTable from '@/components/shared/DataTable'
import Tag from '@/components/ui/Tag'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { useQuery } from '@tanstack/react-query'
import { getConnectPayments } from '@/lib/api/superadmin-billing'
import StripePaymentDetailModal from './StripePaymentDetailModal'
import Loading from '@/components/shared/Loading'
import { formatDate } from '@/utils/dateTime'
import {
    PiCheckCircle,
    PiClock,
    PiWarningCircle,
    PiXCircle,
    PiArrowsCounterClockwise,
    PiCalendarCheck,
} from 'react-icons/pi'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { NumericFormat } from 'react-number-format'

const statusColors = {
    pending: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    authorized: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100',
    succeeded: 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100',
    failed: 'bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100',
    canceled: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    refunded: 'bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100',
    partially_refunded: 'bg-orange-200 dark:bg-orange-700 text-orange-900 dark:text-orange-100',
    disputed: 'bg-rose-200 dark:bg-rose-700 text-rose-900 dark:text-rose-100',
    transfer_failed: 'bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100',
    expired: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
}

const statusIcons = {
    pending: <PiClock className="text-gray-500" size={16} />,
    authorized: <PiClock className="text-blue-500" size={16} />,
    succeeded: <PiCheckCircle className="text-emerald-500" size={16} />,
    failed: <PiXCircle className="text-red-500" size={16} />,
    canceled: <PiXCircle className="text-gray-500" size={16} />,
    refunded: <PiArrowsCounterClockwise className="text-amber-500" size={16} />,
    partially_refunded: <PiArrowsCounterClockwise className="text-orange-500" size={16} />,
    disputed: <PiWarningCircle className="text-rose-500" size={16} />,
    transfer_failed: <PiXCircle className="text-red-500" size={16} />,
    expired: <PiClock className="text-gray-500" size={16} />,
}

export default function ConnectPaymentsTable() {
    const t = useTranslations('superadmin.billing.connect.payments')
    const tModal = useTranslations('superadmin.billing.stripeModal')
    const [statusFilter, setStatusFilter] = useState('all')
    const [pageIndex, setPageIndex] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [stripeModalRow, setStripeModalRow] = useState(null)

    const { data, isLoading, isError } = useQuery({
        queryKey: ['superadmin-connect-payments', statusFilter, pageIndex, pageSize],
        queryFn: () =>
            getConnectPayments({
                page: pageIndex,
                pageSize,
                status: statusFilter === 'all' ? undefined : statusFilter,
                include_stripe: false,
            }),
        staleTime: 60_000,
    })

    const statusOptions = useMemo(
        () => [
            { value: 'all', label: t('filters.allStatuses') },
            { value: 'pending', label: t('statuses.pending') },
            { value: 'authorized', label: t('statuses.authorized') },
            { value: 'succeeded', label: t('statuses.succeeded') },
            { value: 'failed', label: t('statuses.failed') },
            { value: 'expired', label: t('statuses.expired') },
            { value: 'refunded', label: t('statuses.refunded') },
            { value: 'partially_refunded', label: t('statuses.partially_refunded') },
            { value: 'disputed', label: t('statuses.disputed') },
            { value: 'transfer_failed', label: t('statuses.transfer_failed') },
        ],
        [t],
    )

    const modalSummary = useMemo(() => {
        if (!stripeModalRow) return null
        const parts = [
            formatDate(stripeModalRow.created_at, 'America/Los_Angeles', 'numeric'),
            stripeModalRow.company_name || '—',
            typeof stripeModalRow.amount === 'number' ? `$${stripeModalRow.amount.toFixed(2)}` : '',
        ]
        return parts.filter(Boolean).join(' · ')
    }, [stripeModalRow])

    const columns = useMemo(
        () => [
            {
                header: t('columns.date'),
                accessorKey: 'created_at',
                cell: (props) => (
                    <div className="flex items-center gap-2">
                        <PiCalendarCheck className="text-gray-400 shrink-0" size={16} />
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {formatDate(props.row.original.created_at, 'America/Los_Angeles', 'numeric')}
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
                    return <span className="text-sm font-bold text-gray-500 dark:text-gray-400">—</span>
                },
            },
            {
                header: t('columns.status'),
                accessorKey: 'status',
                cell: (props) => {
                    const status = props.row.original.status
                    return (
                        <div className="flex items-center gap-2">
                            {statusIcons[status]}
                            <Tag className={statusColors[status] || statusColors.pending}>
                                {t(`statuses.${status}`, { defaultValue: status })}
                            </Tag>
                        </div>
                    )
                },
            },
            {
                header: t('columns.amount'),
                accessorKey: 'amount',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            <NumericFormat
                                displayType="text"
                                value={row.amount}
                                prefix="$"
                                thousandSeparator
                                decimalScale={2}
                                fixedDecimalScale
                            />
                        </span>
                    )
                },
            },
            {
                header: t('columns.fee'),
                accessorKey: 'application_fee',
                cell: (props) => (
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        <NumericFormat
                            displayType="text"
                            value={props.row.original.application_fee}
                            prefix="$"
                            thousandSeparator
                            decimalScale={2}
                            fixedDecimalScale
                        />
                    </span>
                ),
            },
            {
                header: t('columns.refunded'),
                accessorKey: 'refunded_amount',
                cell: (props) => {
                    const amount = props.row.original.refunded_amount
                    if (!amount) return <span className="text-sm font-bold text-gray-500 dark:text-gray-400">—</span>
                    return (
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                            <NumericFormat
                                displayType="text"
                                value={amount}
                                prefix="$"
                                thousandSeparator
                                decimalScale={2}
                                fixedDecimalScale
                            />
                        </span>
                    )
                },
            },
            {
                header: t('columns.details'),
                accessorKey: 'id',
                cell: (props) => {
                    const row = props.row.original
                    const canOpen = Boolean(String(row.stripe_payment_intent_id ?? '').trim())
                    return (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="whitespace-nowrap"
                            disabled={!canOpen}
                            onClick={() => canOpen && setStripeModalRow(row)}
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

    const MobileCard = ({ row }) => (
        <Card>
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {formatDate(row.created_at, 'America/Los_Angeles', 'numeric')}
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        <NumericFormat
                            displayType="text"
                            value={row.amount}
                            prefix="$"
                            thousandSeparator
                            decimalScale={2}
                            fixedDecimalScale
                        />
                    </span>
                </div>
                {row.company_id && row.company_name && (
                    <Link
                        href={`/superadmin/companies/${row.company_id}`}
                        className="text-sm font-bold text-blue-600 dark:text-blue-400"
                    >
                        {row.company_name}
                    </Link>
                )}
                <div className="flex items-center gap-2">
                    {statusIcons[row.status]}
                    <Tag className={statusColors[row.status] || statusColors.pending}>
                        {t(`statuses.${row.status}`, { defaultValue: row.status })}
                    </Tag>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="font-bold text-gray-500 dark:text-gray-400">{t('columns.fee')}:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                        <NumericFormat
                            displayType="text"
                            value={row.application_fee}
                            prefix="$"
                            thousandSeparator
                            decimalScale={2}
                            fixedDecimalScale
                        />
                    </span>
                </div>
                {row.refunded_amount > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="font-bold text-gray-500 dark:text-gray-400">{t('columns.refunded')}:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                            <NumericFormat
                                displayType="text"
                                value={row.refunded_amount}
                                prefix="$"
                                thousandSeparator
                                decimalScale={2}
                                fixedDecimalScale
                            />
                        </span>
                    </div>
                )}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full mt-1"
                    disabled={!String(row.stripe_payment_intent_id ?? '').trim()}
                    onClick={() =>
                        String(row.stripe_payment_intent_id ?? '').trim() && setStripeModalRow(row)
                    }
                >
                    {tModal('openButton')}
                </Button>
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
            <StripePaymentDetailModal
                isOpen={Boolean(stripeModalRow)}
                onClose={() => setStripeModalRow(null)}
                variant={stripeModalRow ? 'connect' : null}
                paymentId={stripeModalRow?.id ?? null}
                checkoutSessionId={null}
                stripeConnectAccountId={stripeModalRow?.stripe_account_id ?? null}
                summary={modalSummary}
            />
            <div className="flex flex-col gap-4 mb-4">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                <div className="max-w-xs w-full">
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

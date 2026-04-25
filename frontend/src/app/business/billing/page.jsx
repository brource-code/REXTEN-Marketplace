'use client'

import { useState, useMemo, Suspense } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import DataTable from '@/components/shared/DataTable'
import EmptyStatePanel from '@/components/shared/EmptyStatePanel'
import Tag from '@/components/ui/Tag'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useQuery } from '@tanstack/react-query'
import { getStripeTransactions, getBookingPayments } from '@/lib/api/stripe'
import Loading from '@/components/shared/Loading'
import { formatDateLocalized } from '@/utils/dateTime'
import Select from '@/components/ui/Select'
import {
    PiCreditCard,
    PiMegaphone,
    PiCalendarCheck,
    PiHandCoins,
    PiArrowDown,
    PiArrowUp,
    PiFileCsv,
    PiFileXls,
    PiArrowCounterClockwise,
} from 'react-icons/pi'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import PermissionGuard from '@/components/shared/PermissionGuard'
import useBusinessStore from '@/store/businessStore'
import { billingStatusUiKey, getBillingTransactionDescription } from '@/utils/businessBillingHelpers'
import {
    buildBusinessBillingAoa,
    downloadBillingCsv,
    downloadBillingXlsx,
    billingExportFilename,
} from '@/utils/businessBillingExport'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

const statusColors = {
    succeeded: 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100',
    authorized: 'bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100',
    pending: 'bg-yellow-200 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100',
    failed: 'bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100',
    canceled: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    expired: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    paid: 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100',
}

export default function BillingPage() {
    return (
        <PermissionGuard permission="manage_settings">
            <Suspense fallback={<BillingSuspenseFallback />}>
                <BillingPageContent />
            </Suspense>
        </PermissionGuard>
    )
}

function BillingSuspenseFallback() {
    return (
        <Container>
            <AdaptiveCard>
                <div className="flex items-center justify-center min-h-[320px]">
                    <Loading loading />
                </div>
            </AdaptiveCard>
        </Container>
    )
}

function BillingPageContent() {
    const t = useTranslations('business.billing')
    const tSub = useTranslations('business.subscription')
    const locale = useLocale()
    const searchParams = useSearchParams()
    const { onAppendQueryParams } = useAppendQueryParams()
    const { settings } = useBusinessStore()
    const billingTxTimezone = settings?.timezone || 'America/Los_Angeles'
    
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    
    const [activeSection, setActiveSection] = useState('earnings')
    const [statusFilter, setStatusFilter] = useState('all')
    const [exportingExcel, setExportingExcel] = useState(false)

    const { data: stripeData, isLoading: stripeLoading } = useQuery({
        queryKey: ['stripe-transactions'],
        queryFn: () => getStripeTransactions(50),
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
    })

    const { data: bookingData, isLoading: bookingLoading } = useQuery({
        queryKey: ['booking-payments'],
        queryFn: () => getBookingPayments(50),
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
    })

    /** Таблица активной вкладки не должна ждать второй источник (Stripe часто медленнее БД). */
    const tableLoading = activeSection === 'earnings' ? bookingLoading : stripeLoading

    const earningsTransactions = useMemo(() => {
        const bookings = (bookingData?.payments || []).map((p) => ({
            ...p,
            id: `bp_${p.id}`,
        }))
        bookings.sort((a, b) => (b.created_timestamp || 0) - (a.created_timestamp || 0))
        return bookings
    }, [bookingData?.payments])

    const expensesTransactions = useMemo(() => {
        const stripe = stripeData?.transactions || []
        const sorted = [...stripe].sort((a, b) => (b.created_timestamp || 0) - (a.created_timestamp || 0))
        return sorted
    }, [stripeData?.transactions])

    const currentTransactions = activeSection === 'earnings' ? earningsTransactions : expensesTransactions

    const filteredTransactions = useMemo(() => {
        return currentTransactions.filter((transaction) => {
            if (statusFilter !== 'all' && transaction.status !== statusFilter) {
                return false
            }
            return true
        })
    }, [currentTransactions, statusFilter])

    const paginatedTransactions = useMemo(() => {
        const start = (pageIndex - 1) * pageSize
        const end = start + pageSize
        return filteredTransactions.slice(start, end)
    }, [filteredTransactions, pageIndex, pageSize])

    const billingEmptyState = useMemo(
        () => (
            <EmptyStatePanel
                icon={PiCreditCard}
                title={
                    activeSection === 'earnings' ? t('emptyEarningsTitle') : t('emptyExpensesTitle')
                }
                hint={
                    activeSection === 'earnings' ? t('emptyEarningsHint') : t('emptyExpensesHint')
                }
            />
        ),
        [activeSection, t],
    )

    const earningsTotal = useMemo(() => {
        return earningsTransactions
            .filter(tx => tx.status === 'succeeded' || tx.status === 'paid')
            .reduce((sum, tx) => sum + (tx.net_amount || tx.amount || 0), 0)
    }, [earningsTransactions])

    const expensesTotal = useMemo(() => {
        return expensesTransactions
            .filter(tx => tx.status === 'succeeded')
            .reduce((sum, tx) => {
                const a = Number(tx.amount) || 0
                if (tx.type === 'refund') {
                    return sum - a
                }
                return sum + a
            }, 0)
    }, [expensesTransactions])

    const statusOptions = useMemo(() => {
        if (activeSection === 'earnings') {
            return [
                { value: 'all', label: t('filters.allStatuses') },
                { value: 'succeeded', label: t('statuses.succeeded') },
                { value: 'authorized', label: t('statuses.authorized', { defaultValue: 'Authorized' }) },
                { value: 'pending', label: t('statuses.pending') },
                { value: 'failed', label: t('statuses.failed') },
            ]
        }
        return [
            { value: 'all', label: t('filters.allStatuses') },
            { value: 'succeeded', label: t('statuses.succeeded') },
            { value: 'pending', label: t('statuses.pending') },
            { value: 'failed', label: t('statuses.failed') },
        ]
    }, [activeSection, t])

    const formatAmount = (amount, currency) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: (currency || 'USD').toUpperCase(),
        }).format(amount)
    }

    const earningsColumns = [
        {
            header: t('columns.date'),
            accessorKey: 'created',
            cell: (props) => (
                <div className="flex items-center gap-2">
                    <PiCalendarCheck className="text-gray-400" size={16} />
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {formatDateLocalized(props.row.original.created, billingTxTimezone, locale)}
                    </span>
                </div>
            ),
        },
        {
            header: t('columns.description'),
            accessorKey: 'description',
            cell: (props) => {
                const tx = props.row.original
                return (
                    <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {t('earningsDescription', { defaultValue: 'Booking payment' })}
                        </div>
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            {tx.service_name} — {tx.client_name}
                        </div>
                        {tx.booking_id != null && (
                            <div className="mt-1">
                                <Link
                                    href={`/business/bookings?bookingId=${tx.booking_id}`}
                                    className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                    aria-label={t('bookingRefAria', { id: tx.booking_id })}
                                >
                                    {t('bookingRef', { id: tx.booking_id })}
                                </Link>
                            </div>
                        )}
                    </div>
                )
            },
        },
        {
            header: t('columns.amount'),
            accessorKey: 'amount',
            cell: (props) => {
                const tx = props.row.original
                const netAmount = tx.net_amount != null ? tx.net_amount : tx.amount
                return (
                    <div>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {formatAmount(netAmount, tx.currency)}
                        </span>
                        {tx.platform_fee > 0 && (
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {t('feeNote', {
                                    total: formatAmount(tx.amount, tx.currency),
                                    fee: formatAmount(tx.platform_fee, tx.currency),
                                    defaultValue: `of ${formatAmount(tx.amount, tx.currency)}, fee: ${formatAmount(tx.platform_fee, tx.currency)}`,
                                })}
                            </div>
                        )}
                    </div>
                )
            },
        },
        {
            header: t('columns.status'),
            accessorKey: 'status',
            cell: (props) => {
                const tx = props.row.original
                const displayStatus = tx.capture_status === 'captured' ? 'succeeded' : tx.status
                const statusKey = billingStatusUiKey(displayStatus)
                return (
                    <Tag className={statusColors[statusKey] || statusColors.pending}>
                        {t(`statuses.${statusKey}`, { defaultValue: displayStatus })}
                    </Tag>
                )
            },
        },
    ]

    const expensesColumns = [
        {
            header: t('columns.date'),
            accessorKey: 'created',
            cell: (props) => (
                <div className="flex items-center gap-2">
                    <PiCalendarCheck className="text-gray-400" size={16} />
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {formatDateLocalized(props.row.original.created, billingTxTimezone, locale)}
                    </span>
                </div>
            ),
        },
        {
            header: t('columns.type'),
            accessorKey: 'type',
            cell: (props) => {
                const tx = props.row.original
                let icon = <PiCreditCard className="text-emerald-500" size={16} />
                let color = 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100'
                if (tx.type === 'advertisement') {
                    icon = <PiMegaphone className="text-blue-500" size={16} />
                    color = 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100'
                } else if (tx.type === 'refund') {
                    icon = <PiArrowCounterClockwise className="text-violet-500" size={16} />
                    color = 'bg-violet-200 dark:bg-violet-800 text-violet-900 dark:text-violet-100'
                }
                return (
                    <div className="flex items-center gap-2">
                        {icon}
                        <Tag className={color}>
                            {t(`types.${tx.type}`, { defaultValue: tx.type })}
                        </Tag>
                    </div>
                )
            },
        },
        {
            header: t('columns.description'),
            accessorKey: 'description',
            cell: (props) => (
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {getBillingTransactionDescription(props.row.original, t, tSub)}
                </span>
            ),
        },
        {
            header: t('columns.amount'),
            accessorKey: 'amount',
            cell: (props) => {
                const tx = props.row.original
                const isRefund = tx.type === 'refund'
                return (
                    <span
                        className={
                            isRefund
                                ? 'text-sm font-bold text-emerald-600 dark:text-emerald-400'
                                : 'text-sm font-bold text-red-500 dark:text-red-400'
                        }
                    >
                        {isRefund ? '+' : '-'}
                        {formatAmount(tx.amount, tx.currency)}
                    </span>
                )
            },
        },
        {
            header: t('columns.status'),
            accessorKey: 'status',
            cell: (props) => {
                const raw = props.row.original.status
                const statusKey = billingStatusUiKey(raw)
                return (
                    <Tag className={statusColors[statusKey] || statusColors.pending}>
                        {t(`statuses.${statusKey}`, { defaultValue: raw })}
                    </Tag>
                )
            },
        },
    ]

    const columns = activeSection === 'earnings' ? earningsColumns : expensesColumns

    const handlePaginationChange = (page) => {
        onAppendQueryParams({ pageIndex: String(page) })
    }

    const handleSelectChange = (value) => {
        onAppendQueryParams({ pageSize: String(value), pageIndex: '1' })
    }

    const handleSectionChange = (section) => {
        setActiveSection(section)
        setStatusFilter('all')
        onAppendQueryParams({ pageIndex: '1' })
    }

    const runExport = (format) => {
        if (filteredTransactions.length === 0) {
            toast.push(<Notification title={t('export.toastEmpty')} type="warning" />)
            return
        }
        try {
            const aoa = buildBusinessBillingAoa(
                activeSection,
                filteredTransactions,
                t,
                tSub,
                billingTxTimezone,
                locale,
            )
            if (format === 'csv') {
                downloadBillingCsv(billingExportFilename(activeSection, 'csv'), aoa)
            } else {
                setExportingExcel(true)
                const sheet =
                    activeSection === 'earnings' ? t('export.sheetEarnings') : t('export.sheetExpenses')
                downloadBillingXlsx(billingExportFilename(activeSection, 'xlsx'), sheet, aoa)
                    .then(() => {
                        toast.push(<Notification title={t('export.toastOk')} type="success" />)
                    })
                    .catch(() => {
                        toast.push(<Notification title={t('export.toastErr')} type="danger" />)
                    })
                    .finally(() => setExportingExcel(false))
                return
            }
            toast.push(<Notification title={t('export.toastOk')} type="success" />)
        } catch {
            toast.push(<Notification title={t('export.toastErr')} type="danger" />)
        }
    }

    const EarningsMobileCard = ({ transaction }) => {
        const tx = transaction
        const netAmount = tx.net_amount != null ? tx.net_amount : tx.amount
        const displayStatus = tx.capture_status === 'captured' ? 'succeeded' : tx.status
        const statusKey = billingStatusUiKey(displayStatus)

        return (
            <Card>
                <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <PiHandCoins className="text-emerald-500" size={20} />
                            <div>
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {tx.service_name} — {tx.client_name}
                                </div>
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                    {formatDateLocalized(tx.created, billingTxTimezone, locale)}
                                </div>
                                {tx.booking_id != null && (
                                    <div className="mt-1">
                                        <Link
                                            href={`/business/bookings?bookingId=${tx.booking_id}`}
                                            className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                            aria-label={t('bookingRefAria', { id: tx.booking_id })}
                                        >
                                            {t('bookingRef', { id: tx.booking_id })}
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                        <Tag className={statusColors[statusKey] || statusColors.pending}>
                            {t(`statuses.${statusKey}`, { defaultValue: displayStatus })}
                        </Tag>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {t('sections.youReceive')}
                            </div>
                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                {formatAmount(netAmount, tx.currency)}
                            </div>
                        </div>
                        {tx.platform_fee > 0 && (
                            <div className="text-right">
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                    {t('sections.platformFee')}
                                </div>
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                    {formatAmount(tx.platform_fee, tx.currency)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        )
    }

    const ExpensesMobileCard = ({ transaction }) => {
        const tx = transaction
        const expenseStatusKey = billingStatusUiKey(tx.status)
        const isRefund = tx.type === 'refund'
        let typeIcon = <PiCreditCard className="text-emerald-500" size={20} />
        if (tx.type === 'advertisement') {
            typeIcon = <PiMegaphone className="text-blue-500" size={20} />
        } else if (isRefund) {
            typeIcon = <PiArrowCounterClockwise className="text-violet-500" size={20} />
        }

        return (
            <Card>
                <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            {typeIcon}
                            <div>
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {getBillingTransactionDescription(tx, t, tSub)}
                                </div>
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                    {formatDateLocalized(tx.created, billingTxTimezone, locale)}
                                </div>
                            </div>
                        </div>
                        <Tag className={statusColors[expenseStatusKey] || statusColors.pending}>
                            {t(`statuses.${expenseStatusKey}`, { defaultValue: tx.status })}
                        </Tag>
                    </div>
                    <div className="flex items-center justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div
                            className={
                                isRefund
                                    ? 'text-sm font-bold text-emerald-600 dark:text-emerald-400'
                                    : 'text-sm font-bold text-red-500 dark:text-red-400'
                            }
                        >
                            {isRefund ? '+' : '-'}
                            {formatAmount(tx.amount, tx.currency)}
                        </div>
                    </div>
                </div>
            </Card>
        )
    }

    const MobileCard = activeSection === 'earnings' ? EarningsMobileCard : ExpensesMobileCard

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {t('title')}
                        </h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {t('description')}
                        </p>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                activeSection === 'earnings'
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            onClick={() => handleSectionChange('earnings')}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <PiArrowDown className="text-emerald-500" size={18} />
                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {t('sections.earnings')}
                                </span>
                            </div>
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {formatAmount(earningsTotal, 'USD')}
                            </div>
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                {earningsTransactions.length} {t('sections.transactions')}
                            </div>
                        </div>

                        <div
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                activeSection === 'expenses'
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            onClick={() => handleSectionChange('expenses')}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <PiArrowUp className="text-red-500" size={18} />
                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {t('sections.expenses')}
                                </span>
                            </div>
                            <div className="text-lg font-bold text-red-500 dark:text-red-400">
                                {formatAmount(expensesTotal, 'USD')}
                            </div>
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                {expensesTransactions.length} {t('sections.transactions')}
                            </div>
                        </div>
                    </div>

                    {/* Filters + export */}
                    <div className="flex flex-col lg:flex-row gap-4 pt-2 border-t border-gray-200 dark:border-gray-700 lg:items-end">
                        <div className="flex-1 min-w-0">
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 block">
                                {t('filters.status')}
                            </label>
                            <Select
                                value={statusOptions.find(opt => opt.value === statusFilter)}
                                onChange={(option) => {
                                    setStatusFilter(option?.value || 'all')
                                    onAppendQueryParams({ pageIndex: '1' })
                                }}
                                options={statusOptions}
                                isSearchable={false}
                                isDisabled={tableLoading}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                icon={<PiFileCsv className="text-lg" />}
                                disabled={tableLoading}
                                onClick={() => runExport('csv')}
                            >
                                {t('export.csv')}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                icon={<PiFileXls className="text-lg" />}
                                disabled={tableLoading || exportingExcel}
                                loading={exportingExcel}
                                onClick={() => runExport('excel')}
                            >
                                {t('export.excel')}
                            </Button>
                        </div>
                    </div>

                    {/* Transactions table */}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    {tableLoading ? (
                        <div className="flex items-center justify-center min-h-[280px] py-8">
                            <Loading loading />
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        billingEmptyState
                    ) : (
                        <>
                            <div className="md:hidden space-y-4">
                                {paginatedTransactions.map((transaction) => (
                                    <MobileCard key={transaction.id} transaction={transaction} />
                                ))}
                                
                                {filteredTransactions.length > pageSize && (
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pageIndex === 1}
                                            onClick={() => handlePaginationChange(pageIndex - 1)}
                                        >
                                            {t('pagination.prev')}
                                        </Button>
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {pageIndex} / {Math.ceil(filteredTransactions.length / pageSize)}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pageIndex >= Math.ceil(filteredTransactions.length / pageSize)}
                                            onClick={() => handlePaginationChange(pageIndex + 1)}
                                        >
                                            {t('pagination.next')}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="hidden md:block">
                                <DataTable
                                    columns={columns}
                                    data={paginatedTransactions}
                                    noData={filteredTransactions.length === 0}
                                    emptyState={billingEmptyState}
                                    loading={false}
                                    pagingData={{
                                        total: filteredTransactions.length,
                                        pageIndex,
                                        pageSize,
                                    }}
                                    onPaginationChange={handlePaginationChange}
                                    onSelectChange={handleSelectChange}
                                />
                            </div>
                        </>
                    )}
                    </div>
                </div>
            </AdaptiveCard>
        </Container>
    )
}

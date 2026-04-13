'use client'

import { useState, useMemo, Suspense } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import DataTable from '@/components/shared/DataTable'
import Tag from '@/components/ui/Tag'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useQuery } from '@tanstack/react-query'
import { getStripeTransactions, getBookingPayments } from '@/lib/api/stripe'
import Loading from '@/components/shared/Loading'
import { formatDateLocalized } from '@/utils/dateTime'
import Select from '@/components/ui/Select'
import { PiCreditCard, PiMegaphone, PiCalendarCheck, PiHandCoins, PiArrowDown, PiArrowUp } from 'react-icons/pi'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import PermissionGuard from '@/components/shared/PermissionGuard'
import useBusinessStore from '@/store/businessStore'

function getBillingTransactionDescription(transaction, tBilling, tSub) {
    if (transaction.type === 'subscription' && transaction.plan) {
        const planName = tSub(`plans.${transaction.plan}.name`, {
            defaultValue: transaction.plan,
        })
        const periodLabel =
            transaction.interval === 'year'
                ? tBilling('periodLabelYear')
                : tBilling('periodLabelMonth')
        return tBilling('subscriptionPayment', { planName, periodLabel })
    }
    return transaction.description
}

const statusColors = {
    succeeded: 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100',
    authorized: 'bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100',
    pending: 'bg-yellow-200 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100',
    failed: 'bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100',
    canceled: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
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

    const isLoading = stripeLoading || bookingLoading

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

    const earningsTotal = useMemo(() => {
        return earningsTransactions
            .filter(tx => tx.status === 'succeeded' || tx.status === 'paid')
            .reduce((sum, tx) => sum + (tx.net_amount || tx.amount || 0), 0)
    }, [earningsTransactions])

    const expensesTotal = useMemo(() => {
        return expensesTransactions
            .filter(tx => tx.status === 'succeeded')
            .reduce((sum, tx) => sum + (tx.amount || 0), 0)
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
                return (
                    <Tag className={statusColors[displayStatus] || statusColors.pending}>
                        {t(`statuses.${displayStatus}`, { defaultValue: displayStatus })}
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
                const icon = tx.type === 'advertisement'
                    ? <PiMegaphone className="text-blue-500" size={16} />
                    : <PiCreditCard className="text-emerald-500" size={16} />
                const color = tx.type === 'advertisement'
                    ? 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100'
                    : 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100'
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
                return (
                    <span className="text-sm font-bold text-red-500 dark:text-red-400">
                        -{formatAmount(tx.amount, tx.currency)}
                    </span>
                )
            },
        },
        {
            header: t('columns.status'),
            accessorKey: 'status',
            cell: (props) => (
                <Tag className={statusColors[props.row.original.status] || statusColors.pending}>
                    {t(`statuses.${props.row.original.status}`, { defaultValue: props.row.original.status })}
                </Tag>
            ),
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

    const EarningsMobileCard = ({ transaction }) => {
        const tx = transaction
        const netAmount = tx.net_amount != null ? tx.net_amount : tx.amount
        const displayStatus = tx.capture_status === 'captured' ? 'succeeded' : tx.status

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
                            </div>
                        </div>
                        <Tag className={statusColors[displayStatus] || statusColors.pending}>
                            {t(`statuses.${displayStatus}`, { defaultValue: displayStatus })}
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
        const typeIcon = tx.type === 'advertisement'
            ? <PiMegaphone className="text-blue-500" size={20} />
            : <PiCreditCard className="text-emerald-500" size={20} />

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
                        <Tag className={statusColors[tx.status] || statusColors.pending}>
                            {t(`statuses.${tx.status}`, { defaultValue: tx.status })}
                        </Tag>
                    </div>
                    <div className="flex items-center justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-bold text-red-500 dark:text-red-400">
                            -{formatAmount(tx.amount, tx.currency)}
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

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex-1">
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
                                isDisabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Transactions table */}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    {isLoading ? (
                        <div className="flex items-center justify-center min-h-[280px] py-8">
                            <Loading loading />
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {activeSection === 'earnings' ? t('noEarnings') : t('noExpenses')}
                            </p>
                        </div>
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

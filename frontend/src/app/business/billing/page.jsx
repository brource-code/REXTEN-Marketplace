'use client'

import { useState, useMemo, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import DataTable from '@/components/shared/DataTable'
import Tag from '@/components/ui/Tag'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useQuery } from '@tanstack/react-query'
import { getStripeTransactions } from '@/lib/api/stripe'
import Loading from '@/components/shared/Loading'
import { formatDate } from '@/utils/dateTime'
import Select from '@/components/ui/Select'
import { PiCreditCard, PiMegaphone, PiCalendarCheck } from 'react-icons/pi'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import PermissionGuard from '@/components/shared/PermissionGuard'

const typeColors = {
    advertisement: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100',
    subscription: 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100',
    unknown: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
}

const statusColors = {
    succeeded: 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100',
    pending: 'bg-yellow-200 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100',
    failed: 'bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100',
    canceled: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
}

/**
 * Страница биллинга - список транзакций
 */
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
    const tCommon = useTranslations('common')
    const searchParams = useSearchParams()
    const { onAppendQueryParams } = useAppendQueryParams()
    
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    
    const [typeFilter, setTypeFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')

    const { data, isLoading, error } = useQuery({
        queryKey: ['stripe-transactions'],
        queryFn: () => getStripeTransactions(50),
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
    })

    const filteredTransactions = useMemo(() => {
        return data?.transactions?.filter((transaction) => {
            if (typeFilter !== 'all' && transaction.type !== typeFilter) {
                return false
            }
            if (statusFilter !== 'all' && transaction.status !== statusFilter) {
                return false
            }
            return true
        }) || []
    }, [data?.transactions, typeFilter, statusFilter])

    // Пагинация для отображения
    const paginatedTransactions = useMemo(() => {
        const start = (pageIndex - 1) * pageSize
        const end = start + pageSize
        return filteredTransactions.slice(start, end)
    }, [filteredTransactions, pageIndex, pageSize])

    const typeOptions = [
        { value: 'all', label: t('filters.allTypes') },
        { value: 'advertisement', label: t('types.advertisement') },
        { value: 'subscription', label: t('types.subscription') },
    ]

    const statusOptions = [
        { value: 'all', label: t('filters.allStatuses') },
        { value: 'succeeded', label: t('statuses.succeeded') },
        { value: 'pending', label: t('statuses.pending') },
        { value: 'failed', label: t('statuses.failed') },
    ]

    const columns = [
        {
            header: t('columns.date'),
            accessorKey: 'created',
            cell: (props) => (
                <div className="flex items-center gap-2">
                    <PiCalendarCheck className="text-gray-400" size={16} />
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {formatDate(props.row.original.created, 'America/Los_Angeles', 'numeric')}
                    </span>
                </div>
            ),
        },
        {
            header: t('columns.type'),
            accessorKey: 'type',
            cell: (props) => {
                const transaction = props.row.original
                const icon = transaction.type === 'advertisement' 
                    ? <PiMegaphone className="text-blue-500" size={16} />
                    : transaction.type === 'subscription'
                    ? <PiCreditCard className="text-emerald-500" size={16} />
                    : null

                return (
                    <div className="flex items-center gap-2">
                        {icon}
                        <Tag className={typeColors[transaction.type] || typeColors.unknown}>
                            {t(`types.${transaction.type}`)}
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
                    {props.row.original.description}
                </span>
            ),
        },
        {
            header: t('columns.amount'),
            accessorKey: 'amount',
            cell: (props) => {
                const transaction = props.row.original
                const formattedAmount = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: transaction.currency.toUpperCase(),
                }).format(transaction.amount)

                return (
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formattedAmount}
                    </span>
                )
            },
        },
        {
            header: t('columns.status'),
            accessorKey: 'status',
            cell: (props) => {
                const transaction = props.row.original
                const statusColor = statusColors[transaction.status] || statusColors.pending

                return (
                    <Tag className={statusColor}>
                        {t(`statuses.${transaction.status}`)}
                    </Tag>
                )
            },
        },
    ]

    const handlePaginationChange = (page) => {
        onAppendQueryParams({
            pageIndex: String(page),
        })
    }

    const handleSelectChange = (value) => {
        onAppendQueryParams({
            pageSize: String(value),
            pageIndex: '1',
        })
    }

    // Мобильная карточка транзакции
    const MobileCard = ({ transaction }) => {
        const formattedAmount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: transaction.currency.toUpperCase(),
        }).format(transaction.amount)

        const typeIcon = transaction.type === 'advertisement' 
            ? <PiMegaphone className="text-blue-500" size={20} />
            : transaction.type === 'subscription'
            ? <PiCreditCard className="text-emerald-500" size={20} />
            : null

        return (
            <Card>
                <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            {typeIcon}
                            <div>
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {transaction.description}
                                </div>
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                    {formatDate(transaction.created, 'America/Los_Angeles', 'numeric')}
                                </div>
                            </div>
                        </div>
                        <Tag className={statusColors[transaction.status] || statusColors.pending}>
                            {t(`statuses.${transaction.status}`)}
                        </Tag>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {t('columns.type')}
                            </div>
                            <Tag className={typeColors[transaction.type] || typeColors.unknown}>
                                {t(`types.${transaction.type}`)}
                            </Tag>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {t('columns.amount')}
                            </div>
                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                {formattedAmount}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {t('title')}
                            </h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                {t('description')}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex-1">
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 block">
                                {t('filters.type')}
                            </label>
                            <Select
                                value={typeOptions.find(opt => opt.value === typeFilter)}
                                onChange={(option) => setTypeFilter(option?.value || 'all')}
                                options={typeOptions}
                                isSearchable={false}
                                isDisabled={isLoading}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 block">
                                {t('filters.status')}
                            </label>
                            <Select
                                value={statusOptions.find(opt => opt.value === statusFilter)}
                                onChange={(option) => setStatusFilter(option?.value || 'all')}
                                options={statusOptions}
                                isSearchable={false}
                                isDisabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    {isLoading ? (
                        <div className="flex items-center justify-center min-h-[280px] py-8">
                            <Loading loading />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('errors.loadError')}
                            </p>
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('noTransactions')}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Мобильная версия - карточки */}
                            <div className="md:hidden space-y-4">
                                {paginatedTransactions.map((transaction) => (
                                    <MobileCard key={transaction.id} transaction={transaction} />
                                ))}
                                
                                {/* Мобильная пагинация */}
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

                            {/* Десктопная версия - таблица */}
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

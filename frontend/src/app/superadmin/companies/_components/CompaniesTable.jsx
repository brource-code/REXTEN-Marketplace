'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Tag from '@/components/ui/Tag'
import DataTable from '@/components/shared/DataTable'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { TbCheck, TbX, TbBan, TbDotsVertical, TbExternalLink } from 'react-icons/tb'
import { NumericFormat } from 'react-number-format'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { approveCompany, rejectCompany, blockCompany } from '@/lib/api/superadmin'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useTranslations } from 'next-intl'
const statusColor = {
    active: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    pending: 'bg-amber-200 dark:bg-amber-900/40 text-gray-900 dark:text-gray-100',
    suspended: 'bg-red-200 dark:bg-red-900/40 text-gray-900 dark:text-gray-100',
    rejected: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
}

const subscriptionColor = {
    basic: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    premium: 'bg-blue-200 dark:bg-blue-900/40 text-gray-900 dark:text-gray-100',
    enterprise: 'bg-purple-200 dark:bg-purple-900/40 text-gray-900 dark:text-gray-100',
}

function ActionColumn({ status, basePath, t, onApprove, onReject, onBlock }) {
    const router = useRouter()
    const go = (tab) => {
        const q = tab ? `?tab=${tab}` : ''
        router.push(`${basePath}${q}`)
    }

    return (
        <Dropdown
            renderTitle={
                <div className="text-xl cursor-pointer select-none font-semibold hover:text-primary">
                    <TbDotsVertical />
                </div>
            }
            placement="bottom-end"
        >
            <Dropdown.Item eventKey="open" onClick={() => go()}>
                <span className="flex items-center gap-2">
                    <TbExternalLink className="text-lg" />
                    <span>{t('open')}</span>
                </span>
            </Dropdown.Item>
            <Dropdown.Item eventKey="stats" onClick={() => go('stats')}>
                <span>{t('toStats')}</span>
            </Dropdown.Item>
            <Dropdown.Item eventKey="edit" onClick={() => go('edit')}>
                <span>{t('toEdit')}</span>
            </Dropdown.Item>
            {status === 'pending' && (
                <>
                    <Dropdown.Item variant="divider" />
                    <Dropdown.Item eventKey="approve" onClick={() => onApprove()}>
                        <span className="flex items-center gap-2 text-emerald-600">
                            <TbCheck className="text-lg" />
                            <span>{t('approve')}</span>
                        </span>
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="reject" onClick={() => onReject()}>
                        <span className="flex items-center gap-2 text-red-600">
                            <TbX className="text-lg" />
                            <span>{t('reject')}</span>
                        </span>
                    </Dropdown.Item>
                </>
            )}
            {status === 'active' && (
                <>
                    <Dropdown.Item variant="divider" />
                    <Dropdown.Item eventKey="block" onClick={() => onBlock()}>
                        <span className="flex items-center gap-2 text-red-600">
                            <TbBan className="text-lg" />
                            <span>{t('block')}</span>
                        </span>
                    </Dropdown.Item>
                </>
            )}
        </Dropdown>
    )
}

const CompaniesTable = ({
    companiesList = [],
    companiesTotal = 0,
    pageIndex = 1,
    pageSize = 10,
}) => {
    const t = useTranslations('superadmin.companiesTable')
    const router = useRouter()
    const queryClient = useQueryClient()
    const onAppendQueryParams = useAppendQueryParams()
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: null,
    })

    const approveMutation = useMutation({
        mutationFn: approveCompany,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] })
            toast.push(
                <Notification title={t('toastOk')} type="success">
                    {t('approved')}
                </Notification>,
            )
            setConfirmDialog((d) => ({ ...d, isOpen: false }))
        },
        onError: (error) => {
            toast.push(
                <Notification title={t('toastErr')} type="danger">
                    {error.response?.data?.message || t('approveFail')}
                </Notification>,
            )
        },
    })

    const rejectMutation = useMutation({
        mutationFn: rejectCompany,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] })
            toast.push(
                <Notification title={t('toastOk')} type="success">
                    {t('rejected')}
                </Notification>,
            )
            setConfirmDialog((d) => ({ ...d, isOpen: false }))
        },
        onError: (error) => {
            toast.push(
                <Notification title={t('toastErr')} type="danger">
                    {error.response?.data?.message || t('rejectFail')}
                </Notification>,
            )
        },
    })

    const blockMutation = useMutation({
        mutationFn: blockCompany,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] })
            toast.push(
                <Notification title={t('toastOk')} type="success">
                    {t('blocked')}
                </Notification>,
            )
            setConfirmDialog((d) => ({ ...d, isOpen: false }))
        },
        onError: (error) => {
            toast.push(
                <Notification title={t('toastErr')} type="danger">
                    {error.response?.data?.message || t('blockFail')}
                </Notification>,
            )
        },
    })

    const openCompany = (id, tab) => {
        const q = tab ? `?tab=${tab}` : ''
        router.push(`/superadmin/companies/${id}${q}`)
    }

    const columns = useMemo(
        () => [
            {
                header: t('colName'),
                accessorKey: 'name',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <button
                            type="button"
                            className="text-left w-full"
                            onClick={() => openCompany(row.id)}
                        >
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-primary">
                                {row.name}
                            </div>
                            {row.category && (
                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                    {row.category}
                                </div>
                            )}
                        </button>
                    )
                },
            },
            {
                header: t('colOwner'),
                accessorKey: 'owner',
                cell: (props) => (
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {props.row.original.owner}
                    </span>
                ),
            },
            {
                header: t('colContacts'),
                accessorKey: 'email',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {row.email}
                            </div>
                            {row.phone && (
                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {row.phone}
                                </div>
                            )}
                        </div>
                    )
                },
            },
            {
                header: t('colStatus'),
                accessorKey: 'status',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <Tag className={statusColor[row.status] || statusColor.pending}>
                            <span>{t(`status.${row.status}`)}</span>
                        </Tag>
                    )
                },
            },
            {
                header: t('colSubscription'),
                accessorKey: 'subscription',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <Tag
                            className={
                                subscriptionColor[row.subscription] || subscriptionColor.basic
                            }
                        >
                            <span>{t(`subscription.${row.subscription || 'basic'}`)}</span>
                        </Tag>
                    )
                },
            },
            {
                header: t('colRevenue'),
                accessorKey: 'revenue',
                cell: (props) => (
                    <NumericFormat
                        className="text-sm font-bold text-gray-900 dark:text-gray-100"
                        displayType="text"
                        value={props.row.original.revenue}
                        prefix="$"
                        thousandSeparator
                    />
                ),
            },
            {
                header: t('colBookings'),
                accessorKey: 'bookings',
                cell: (props) => (
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {props.row.original.bookings}
                    </span>
                ),
            },
            {
                header: '',
                id: 'action',
                cell: (props) => {
                    const c = props.row.original
                    return (
                        <ActionColumn
                            status={c.status}
                            basePath={`/superadmin/companies/${c.id}`}
                            t={t}
                            onApprove={() =>
                                setConfirmDialog({
                                    isOpen: true,
                                    type: 'success',
                                    title: t('confirmApproveTitle'),
                                    message: t('confirmApproveMsg', { name: c.name }),
                                    onConfirm: () => approveMutation.mutate(c.id),
                                })
                            }
                            onReject={() =>
                                setConfirmDialog({
                                    isOpen: true,
                                    type: 'warning',
                                    title: t('confirmRejectTitle'),
                                    message: t('confirmRejectMsg', { name: c.name }),
                                    onConfirm: () => rejectMutation.mutate(c.id),
                                })
                            }
                            onBlock={() =>
                                setConfirmDialog({
                                    isOpen: true,
                                    type: 'danger',
                                    title: t('confirmBlockTitle'),
                                    message: t('confirmBlockMsg', { name: c.name }),
                                    onConfirm: () => blockMutation.mutate(c.id),
                                })
                            }
                        />
                    )
                },
            },
        ],
        [t],
    )

    const handlePaginationChange = (page) => {
        onAppendQueryParams({ pageIndex: String(page) })
    }

    const handleSelectChange = (value) => {
        onAppendQueryParams({
            pageSize: String(value),
            pageIndex: '1',
        })
    }

    const handleSort = (sort) => {
        onAppendQueryParams({
            order: sort.order,
            sortKey: sort.key,
        })
    }

    const MobileCard = ({ company }) => (
        <Card className="mb-4">
            <div className="flex flex-col gap-3">
                <button
                    type="button"
                    className="text-left"
                    onClick={() => openCompany(company.id)}
                >
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 hover:text-primary">
                        {company.name}
                    </h4>
                    {company.category && (
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {company.category}
                        </p>
                    )}
                </button>
                <Tag className={statusColor[company.status] || statusColor.pending}>
                    {t(`status.${company.status}`)}
                </Tag>
                <div className="space-y-2">
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('colOwner')}:{' '}
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {company.owner}
                        </span>
                    </div>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {company.email}
                    </div>
                    {company.phone && (
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {company.phone}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('colRevenue')}
                            </span>
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                <NumericFormat
                                    displayType="text"
                                    value={company.revenue || 0}
                                    prefix="$"
                                    thousandSeparator
                                />
                            </div>
                        </div>
                        <div>
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('colBookings')}
                            </span>
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {company.bookings || 0}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        variant="solid"
                        size="sm"
                        className="flex-1"
                        onClick={() => openCompany(company.id)}
                    >
                        {t('open')}
                    </Button>
                    {company.status === 'pending' && (
                        <>
                            <Button
                                variant="solid"
                                size="sm"
                                icon={<TbCheck />}
                                onClick={() =>
                                    setConfirmDialog({
                                        isOpen: true,
                                        type: 'success',
                                        title: t('confirmApproveTitle'),
                                        message: t('confirmApproveMsg', { name: company.name }),
                                        onConfirm: () => approveMutation.mutate(company.id),
                                    })
                                }
                            >
                                {t('approve')}
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                icon={<TbX />}
                                onClick={() =>
                                    setConfirmDialog({
                                        isOpen: true,
                                        type: 'warning',
                                        title: t('confirmRejectTitle'),
                                        message: t('confirmRejectMsg', { name: company.name }),
                                        onConfirm: () => rejectMutation.mutate(company.id),
                                    })
                                }
                            >
                                {t('reject')}
                            </Button>
                        </>
                    )}
                    {company.status === 'active' && (
                        <Button
                            variant="default"
                            size="sm"
                            icon={<TbBan />}
                            onClick={() =>
                                setConfirmDialog({
                                    isOpen: true,
                                    type: 'danger',
                                    title: t('confirmBlockTitle'),
                                    message: t('confirmBlockMsg', { name: company.name }),
                                    onConfirm: () => blockMutation.mutate(company.id),
                                })
                            }
                        >
                            {t('block')}
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    )

    return (
        <>
            <div className="md:hidden space-y-4">
                {companiesList.length > 0 ? (
                    companiesList.map((company) => (
                        <MobileCard key={company.id} company={company} />
                    ))
                ) : (
                    <div className="text-center py-12 text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('empty')}
                    </div>
                )}
            </div>

            <div className="hidden md:block">
                <DataTable
                    columns={columns}
                    data={companiesList}
                    noData={companiesList.length === 0}
                    loading={false}
                    pagingData={{
                        total: companiesTotal,
                        pageIndex,
                        pageSize,
                    }}
                    onPaginationChange={handlePaginationChange}
                    onSelectChange={handleSelectChange}
                    onSort={handleSort}
                />
            </div>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                type={confirmDialog.type}
                title={confirmDialog.title}
                onCancel={() => setConfirmDialog((d) => ({ ...d, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                confirmText={t('confirm')}
                cancelText={t('cancel')}
                loading={
                    approveMutation.isPending || rejectMutation.isPending || blockMutation.isPending
                }
            >
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    {confirmDialog.message}
                </p>
            </ConfirmDialog>
        </>
    )
}

export default CompaniesTable

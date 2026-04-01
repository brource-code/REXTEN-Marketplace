'use client'

import { useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import DataTable from '@/components/shared/DataTable'
import Loading from '@/components/shared/Loading'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import Select from '@/components/ui/Select'
import Dropdown from '@/components/ui/Dropdown'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useTranslations } from 'next-intl'
import { formatDate } from '@/utils/dateTime'
import { HiStar } from 'react-icons/hi'
import { PiDotsThreeVertical, PiPencil, PiTrash } from 'react-icons/pi'
import ReviewDetailsModal from './ReviewDetailsModal'
import {
    deleteSuperadminReview,
    getSuperadminReviewsList,
    updateSuperadminReviewResponse,
} from '@/lib/api/superadmin-reviews'

const statusColors = {
    published: 'bg-emerald-200 dark:bg-emerald-200 text-gray-900 dark:text-gray-900',
    pending: 'bg-yellow-200 dark:bg-yellow-200 text-gray-900 dark:text-gray-900',
    rejected: 'bg-red-200 dark:bg-red-200 text-gray-900 dark:text-gray-900',
}

function RatingColumn({ rating }) {
    const value = typeof rating === 'number' ? Math.round(rating) : 0
    return (
        <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
                <HiStar
                    key={i}
                    className={
                        value > i
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                    }
                />
            ))}
            <span className="ml-1 text-sm font-bold text-gray-900 dark:text-gray-100">
                {value}
            </span>
        </div>
    )
}

function ClientColumn({ row }) {
    return (
        <div className="flex items-center">
            <Avatar size={40} shape="circle" src={row.userAvatar} />
            <div className="ml-2 rtl:mr-2 min-w-0">
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                    {row.userName}
                </div>
                {row.serviceName && (
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate">
                        {row.serviceName}
                    </div>
                )}
            </div>
        </div>
    )
}

function CommentColumn({ row, t }) {
    return (
        <div className="max-w-md">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 line-clamp-2">
                {row.comment || ''}
            </p>
            {row.response && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        {t('yourResponse')}:
                    </div>
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 line-clamp-2">
                        {row.response}
                    </div>
                </div>
            )}
        </div>
    )
}

function ActionColumn({ row, onEditResponse, onDelete, t }) {
    const hasResponse = Boolean(row.response)

    return (
        <Dropdown
            renderTitle={
                <div className="text-xl cursor-pointer select-none font-semibold hover:text-primary">
                    <PiDotsThreeVertical />
                </div>
            }
            placement="bottom-end"
        >
            <Dropdown.Item eventKey="response" onClick={() => onEditResponse(row)}>
                <span className="flex items-center gap-2">
                    <PiPencil className="text-lg" />
                    <span>{hasResponse ? t('actions.editResponse') : t('actions.respond')}</span>
                </span>
            </Dropdown.Item>
            <Dropdown.Item variant="divider" />
            <Dropdown.Item eventKey="delete" onClick={() => onDelete(row)}>
                <span className="flex items-center gap-2 text-red-600">
                    <PiTrash className="text-lg" />
                    <span>{t('actions.delete')}</span>
                </span>
            </Dropdown.Item>
        </Dropdown>
    )
}

export default function ReviewsTable() {
    const t = useTranslations('superadmin.reviews.table')
    const tPage = useTranslations('superadmin.reviews')
    const tNotifications = useTranslations('superadmin.reviews.notifications')
    const tCommon = useTranslations('common.messages')
    const queryClient = useQueryClient()

    const [statusFilter, setStatusFilter] = useState('all')
    const [minRating, setMinRating] = useState(0)
    const [pageIndex, setPageIndex] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const queryKey = [
        'superadmin-reviews-list',
        statusFilter,
        minRating,
        pageIndex,
        pageSize,
    ]

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey,
        queryFn: () =>
            getSuperadminReviewsList({
                page: pageIndex,
                pageSize,
                status: statusFilter,
                minRating: minRating > 0 ? minRating : undefined,
            }),
        staleTime: 60_000,
    })

    const rows = data?.data ?? []
    const total = data?.total ?? 0

    const [detailsModalOpen, setDetailsModalOpen] = useState(false)
    const [activeReview, setActiveReview] = useState(null)

    const updateResponseMutation = useMutation({
        mutationFn: ({ id, response }) => updateSuperadminReviewResponse(id, response),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['superadmin-reviews-list'] })
            setDetailsModalOpen(false)
            setActiveReview(null)
            toast.push(
                <Notification type="success" title={tCommon('success')}>
                    {tNotifications('responseUpdated')}
                </Notification>,
                { placement: 'top-end' },
            )
        },
        onError: () => {
            toast.push(
                <Notification type="error" title={tCommon('error')}>
                    {tNotifications('responseError')}
                </Notification>,
                { placement: 'top-end' },
            )
        },
    })

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [reviewToDelete, setReviewToDelete] = useState(null)

    const deleteMutation = useMutation({
        mutationFn: (reviewId) => deleteSuperadminReview(reviewId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['superadmin-reviews-list'] })
            setIsDeleteDialogOpen(false)
            setReviewToDelete(null)
            toast.push(
                <Notification type="success" title={tCommon('success')}>
                    {tNotifications('deleteSuccess')}
                </Notification>,
                { placement: 'top-end' },
            )
        },
        onError: () => {
            toast.push(
                <Notification type="error" title={tCommon('error')}>
                    {tNotifications('deleteError')}
                </Notification>,
                { placement: 'top-end' },
            )
        },
    })

    const statusOptions = useMemo(
        () => [
            { value: 'all', label: t('filters.allStatuses') },
            { value: 'published', label: t('statuses.published') },
            { value: 'pending', label: t('statuses.pending') },
        ],
        [t],
    )

    const ratingOptions = useMemo(
        () => [
            { value: 0, label: t('filters.anyMinRating') },
            { value: 1, label: t('filters.minRatingFrom', { value: 1 }) },
            { value: 2, label: t('filters.minRatingFrom', { value: 2 }) },
            { value: 3, label: t('filters.minRatingFrom', { value: 3 }) },
            { value: 4, label: t('filters.minRatingFrom', { value: 4 }) },
            { value: 5, label: t('filters.minRatingFrom', { value: 5 }) },
        ],
        [t],
    )

    const columns = useMemo(
        () => [
            {
                header: t('columns.client'),
                accessorKey: 'userName',
                cell: (props) => <ClientColumn row={props.row.original} />,
            },
            {
                header: t('columns.company'),
                accessorKey: 'companyName',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {row.companyName || '—'}
                        </span>
                    )
                },
            },
            {
                header: t('columns.rating'),
                accessorKey: 'rating',
                cell: (props) => <RatingColumn rating={props.row.original.rating} />,
            },
            {
                header: t('columns.review'),
                accessorKey: 'comment',
                cell: (props) => <CommentColumn row={props.row.original} t={t} />,
            },
            {
                header: t('columns.status'),
                accessorKey: 'status',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <Tag className={statusColors[row.status] || statusColors.pending}>
                            <span className="text-sm font-bold">
                                {t(`statuses.${row.status}`, { defaultValue: row.status })}
                            </span>
                        </Tag>
                    )
                },
            },
            {
                header: t('columns.date'),
                accessorKey: 'createdAt',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {row.createdAt
                                ? formatDate(new Date(row.createdAt), 'America/Los_Angeles', 'short')
                                : '—'}
                        </span>
                    )
                },
            },
            {
                header: '',
                id: 'action',
                cell: (props) => (
                    <ActionColumn
                        row={props.row.original}
                        onEditResponse={(review) => {
                            setActiveReview(review)
                            setDetailsModalOpen(true)
                        }}
                        onDelete={(review) => {
                            setReviewToDelete(review)
                            setIsDeleteDialogOpen(true)
                        }}
                        t={t}
                    />
                ),
            },
        ],
        [t],
    )

    const pageCount = Math.max(1, Math.ceil(total / pageSize))

    if (isLoading) {
        return (
            <Card>
                <div className="flex items-center justify-center min-h-[240px]">
                    <Loading loading />
                </div>
            </Card>
        )
    }

    if (isError) {
        return (
            <Card>
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {tPage('title')}
                    </h4>
                    <p className="text-sm font-bold text-red-600 dark:text-red-400 mt-2">
                        {error?.message || tPage('loadError')}
                    </p>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="mt-4 text-sm font-bold text-blue-600 dark:text-blue-400"
                    >
                        {tPage('retry')}
                    </button>
                </div>
            </Card>
        )
    }

    if (total === 0) {
        return (
            <Card className="p-8 text-center">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('empty')}</p>
            </Card>
        )
    }

    return (
        <Card className="p-0">
            <div className="flex flex-col gap-4 p-6">
                <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                    <div className="max-w-xs">
                        <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 block">
                            {t('filters.status')}
                        </label>
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

                    <div className="max-w-xs">
                        <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 block">
                            {t('filters.minRating')}
                        </label>
                        <Select
                            value={ratingOptions.find((o) => o.value === minRating)}
                            onChange={(opt) => {
                                setMinRating(Number(opt?.value || 0))
                                setPageIndex(1)
                            }}
                            options={ratingOptions}
                            isSearchable={false}
                        />
                    </div>
                </div>

                {/* Мобильные карточки */}
                <div className="md:hidden space-y-4">
                    {rows.map((row) => (
                        <Card key={row.id} className="p-4">
                            <div className="flex gap-4">
                                <Avatar size={56} shape="circle" src={row.userAvatar} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                                {row.userName}
                                            </div>
                                            {row.companyName && (
                                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate">
                                                    {row.companyName}
                                                </div>
                                            )}
                                        </div>
                                        <Tag className={statusColors[row.status] || statusColors.pending}>
                                            <span className="text-xs font-bold">
                                                {t(`statuses.${row.status}`, { defaultValue: row.status })}
                                            </span>
                                        </Tag>
                                    </div>

                                    <div className="mb-2">
                                        <RatingColumn rating={row.rating} />
                                    </div>

                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                                        {row.comment || ''}
                                    </p>

                                    {row.response && (
                                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded mb-2">
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                                {t('yourResponse')}:
                                            </div>
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 line-clamp-3">
                                                {row.response}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                            {row.createdAt
                                                ? formatDate(new Date(row.createdAt), 'America/Los_Angeles', 'short')
                                                : '—'}
                                        </span>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="plain"
                                                size="sm"
                                                icon={<PiPencil />}
                                                onClick={() => {
                                                    setActiveReview(row)
                                                    setDetailsModalOpen(true)
                                                }}
                                            />
                                            <Button
                                                variant="plain"
                                                size="sm"
                                                icon={<PiTrash />}
                                                onClick={() => {
                                                    setReviewToDelete(row)
                                                    setIsDeleteDialogOpen(true)
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}

                    {pageCount > 1 && (
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
                                {pageIndex} / {pageCount}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pageIndex >= pageCount}
                                onClick={() => setPageIndex((p) => p + 1)}
                            >
                                {t('next')}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Десктопная таблица */}
                <div className="hidden md:block">
                    <DataTable
                        columns={columns}
                        data={rows}
                        noData={rows.length === 0}
                        loading={false}
                        pagingData={{
                            pageIndex,
                            pageSize,
                            total,
                        }}
                        onPaginationChange={(page) => setPageIndex(page)}
                        onSelectChange={(value) => {
                            setPageSize(Number(value))
                            setPageIndex(1)
                        }}
                        skeletonAvatarColumns={[0]}
                        skeletonAvatarProps={{ width: 40, height: 40 }}
                    />
                </div>
            </div>

            <ReviewDetailsModal
                isOpen={detailsModalOpen}
                onClose={() => {
                    setDetailsModalOpen(false)
                    setActiveReview(null)
                }}
                review={activeReview}
                isSubmitting={updateResponseMutation.isPending}
                onSubmit={(response) => {
                    if (!activeReview) return
                    updateResponseMutation.mutate({
                        id: activeReview.id,
                        response,
                    })
                }}
            />

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onCancel={() => {
                    setIsDeleteDialogOpen(false)
                    setReviewToDelete(null)
                }}
                onConfirm={() => {
                    if (!reviewToDelete) return
                    deleteMutation.mutate(reviewToDelete.id)
                }}
                type="danger"
                title={t('deleteConfirm.title')}
                confirmText={t('deleteConfirm.confirm')}
                cancelText={t('deleteConfirm.cancel')}
            >
                {t('deleteConfirm.message', { userName: reviewToDelete?.userName || '' })}
            </ConfirmDialog>
        </Card>
    )
}


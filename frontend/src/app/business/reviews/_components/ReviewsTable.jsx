'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import DataTable from '@/components/shared/DataTable'
import EmptyStatePanel from '@/components/shared/EmptyStatePanel'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Dropdown from '@/components/ui/Dropdown'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { HiStar, HiPencil, HiDotsVertical } from 'react-icons/hi'
import { PiChatCircleDots } from 'react-icons/pi'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateBusinessReviewResponse } from '@/lib/api/business'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import classNames from '@/utils/classNames'
import { useTranslations } from 'next-intl'
import { formatDate } from '@/utils/dateTime'
import { usePermission } from '@/hooks/usePermission'
import useBusinessStore from '@/store/businessStore'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'

const RatingColumn = ({ row }) => {
    const rating = row.rating || 0
    return (
        <div className="flex min-w-0 items-center gap-1">
            {[...Array(5)].map((_, i) => (
                <HiStar
                    key={i}
                    className={classNames(
                        'shrink-0 text-sm',
                        i < rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600',
                    )}
                    aria-hidden
                />
            ))}
            <span className="ml-1 text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">{rating}</span>
        </div>
    )
}

const UserColumn = ({ row, t, densityLines, onClientClick }) => {
    const hasProfile = row.userId !== null && row.userId !== undefined

    const nameElement = hasProfile ? (
        <button
            type="button"
            onClick={(e) => onClientClick(row.userId, e)}
            className="text-left text-sm font-bold text-gray-900 transition-colors hover:text-primary dark:text-gray-100"
        >
            {row.userName || t('anonymous')}
        </button>
    ) : (
        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{row.userName || t('anonymous')}</div>
    )

    return (
        <div className="flex min-w-0 max-w-full items-center">
            <Avatar size={40} shape="circle" className="shrink-0" src={row.userAvatar} />
            <div className="ml-2 min-w-0 flex-1 rtl:mr-2">
                {nameElement}
                {row.serviceName ? (
                    <div className="mt-0.5 truncate text-xs font-bold text-gray-500 dark:text-gray-400">
                        {row.serviceName}
                    </div>
                ) : null}
                {row.specialistName ? (
                    <div className="mt-0.5 truncate text-xs font-bold text-gray-500 dark:text-gray-400">
                        {t('specialist')}:{' '}
                        <span className="text-gray-900 dark:text-gray-100">{row.specialistName}</span>
                    </div>
                ) : null}
                {densityLines.map((line, i) => (
                    <div
                        key={i}
                        className="mt-0.5 truncate text-[11px] font-bold text-gray-500 dark:text-gray-400"
                    >
                        {line}
                    </div>
                ))}
            </div>
        </div>
    )
}

const CommentColumn = ({ row, t }) => {
    return (
        <div className="min-w-0 max-w-full">
            <p className="line-clamp-2 text-sm font-bold text-gray-500 dark:text-gray-400">{row.comment || ''}</p>
            {row.response ? (
                <div className="mt-2 rounded bg-gray-50 p-2 dark:bg-gray-800">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('yourResponse')}: </span>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{row.response}</span>
                </div>
            ) : null}
        </div>
    )
}

const ActionColumn = ({ row, onResponse, t, canManage }) => {
    if (!canManage) return null

    return (
        <div className="flex justify-end">
            <Dropdown
                renderTitle={
                    <div className="cursor-pointer select-none text-xl font-semibold hover:text-primary">
                        <HiDotsVertical aria-hidden />
                    </div>
                }
                placement="bottom-end"
            >
                <Dropdown.Item eventKey="response" onClick={() => onResponse(row)}>
                    <span className="flex items-center gap-2">
                        <HiPencil className="text-lg" aria-hidden />
                        <span>{row.response ? t('editResponse') : t('respond')}</span>
                    </span>
                </Dropdown.Item>
            </Dropdown>
        </div>
    )
}

export default function ReviewsTable({
    groupedByAdvertisement = [],
    reviewsWithoutAd = [],
    pageIndex = 1,
    pageSize = 10,
    total = 0,
}) {
    const t = useTranslations('business.reviews.table')
    const tm = useTranslations('business.reviews.mobile')
    const tReviews = useTranslations('business.reviews')
    const { settings } = useBusinessStore()
    const businessTz = settings?.timezone || 'America/Los_Angeles'
    const canManageReviews = usePermission('manage_reviews')
    const tModal = useTranslations('business.reviews.responseModal')
    const tNotifications = useTranslations('business.reviews.notifications')
    const tCommon = useTranslations('common.messages')
    const router = useRouter()
    const [responseModal, setResponseModal] = useState({ isOpen: false, review: null, response: '' })
    const queryClient = useQueryClient()
    const { onAppendQueryParams } = useAppendQueryParams()

    const tableHostRef = useRef(null)
    const [tableHostWidth, setTableHostWidth] = useState(1200)

    useEffect(() => {
        const el = tableHostRef.current
        if (!el || typeof ResizeObserver === 'undefined') return undefined
        const ro = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect?.width
            if (typeof w === 'number' && w >= 320) setTableHostWidth(w)
        })
        ro.observe(el)
        const initial = el.getBoundingClientRect().width
        if (initial >= 320) setTableHostWidth(initial)
        return () => ro.disconnect()
    }, [])

    const hideDateColumn = tableHostWidth < 920
    const hideAdvertisementColumn = tableHostWidth < 780
    const hideRatingColumn = tableHostWidth < 700

    const allReviews = useMemo(() => {
        const reviews = []
        groupedByAdvertisement.forEach((group) => {
            group.reviews?.forEach((review) => {
                reviews.push({
                    ...review,
                    advertisementTitle: group.advertisement.title,
                    advertisementLink: group.advertisement.link,
                    advertisementImage: group.advertisement.image,
                })
            })
        })
        reviewsWithoutAd.forEach((review) => {
            reviews.push({
                ...review,
                advertisementTitle: null,
                advertisementLink: null,
                advertisementImage: null,
            })
        })
        return reviews
    }, [groupedByAdvertisement, reviewsWithoutAd])

    const updateResponseMutation = useMutation({
        mutationFn: ({ id, response }) => updateBusinessReviewResponse(id, response),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-reviews'] })
            setResponseModal({ isOpen: false, review: null, response: '' })
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

    const handleResponse = useCallback((review) => {
        setResponseModal({
            isOpen: true,
            review,
            response: review.response || '',
        })
    }, [])

    const onClientClick = useCallback(
        (userId, e) => {
            e.stopPropagation()
            router.push(`/business/clients/${userId}`)
        },
        [router],
    )

    const columns = useMemo(() => {
        const densityLinesForRow = (row) => {
            const lines = []
            if (hideDateColumn && row.createdAt) {
                lines.push(`${t('date')}: ${formatDate(row.createdAt, businessTz, 'short')}`)
            }
            if (hideRatingColumn) {
                lines.push(`${t('rating')}: ${row.rating ?? 0}/5`)
            }
            if (hideAdvertisementColumn) {
                lines.push(
                    row.advertisementTitle
                        ? `${t('advertisement')}: ${row.advertisementTitle}`
                        : `${t('advertisement')}: ${t('noAd')}`,
                )
            }
            return lines
        }

        const cols = [
            {
                header: t('user'),
                accessorKey: 'userName',
                enableSorting: false,
                meta: { stopRowClick: true },
                cell: (props) => (
                    <UserColumn
                        row={props.row.original}
                        t={t}
                        densityLines={densityLinesForRow(props.row.original)}
                        onClientClick={onClientClick}
                    />
                ),
            },
        ]

        if (!hideAdvertisementColumn) {
            cols.push({
                header: t('advertisement'),
                accessorKey: 'advertisementTitle',
                enableSorting: false,
                meta: { stopRowClick: true },
                cell: (props) => {
                    const row = props.row.original
                    const adSlug =
                        row.advertisementLink?.replace('/marketplace/', '').replace(/^\//, '') || ''
                    return (
                        <div className="flex min-w-0 items-center gap-3">
                            {row.advertisementImage ? (
                                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                                    <img
                                        src={row.advertisementImage}
                                        alt={row.advertisementTitle || ''}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ) : null}
                            <div className="min-w-0 flex-1">
                                {row.advertisementTitle ? (
                                    <>
                                        <div className="truncate text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {row.advertisementTitle}
                                        </div>
                                        {adSlug ? (
                                            <Link
                                                href={`/marketplace/${adSlug}`}
                                                target="_blank"
                                                className="text-xs font-bold text-primary hover:underline"
                                                rel="noopener noreferrer"
                                            >
                                                {t('open')}
                                            </Link>
                                        ) : null}
                                    </>
                                ) : (
                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('noAd')}
                                    </span>
                                )}
                            </div>
                        </div>
                    )
                },
            })
        }

        if (!hideRatingColumn) {
            cols.push({
                header: t('rating'),
                accessorKey: 'rating',
                enableSorting: false,
                cell: (props) => <RatingColumn row={props.row.original} />,
            })
        }

        cols.push({
            header: t('review'),
            accessorKey: 'comment',
            enableSorting: false,
            cell: (props) => <CommentColumn row={props.row.original} t={t} />,
        })

        if (!hideDateColumn) {
            cols.push({
                header: t('date'),
                accessorKey: 'createdAt',
                enableSorting: false,
                cell: (props) => (
                    <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                        {props.row.original.createdAt
                            ? formatDate(props.row.original.createdAt, businessTz, 'short')
                            : '—'}
                    </span>
                ),
            })
        }

        cols.push({
            header: '',
            id: 'action',
            enableSorting: false,
            meta: { stopRowClick: true },
            cell: (props) => (
                <ActionColumn
                    row={props.row.original}
                    onResponse={handleResponse}
                    t={t}
                    canManage={canManageReviews}
                />
            ),
        })

        return cols
    }, [
        t,
        businessTz,
        handleResponse,
        onClientClick,
        canManageReviews,
        hideDateColumn,
        hideAdvertisementColumn,
        hideRatingColumn,
    ])

    const reviewsEmptyState = useMemo(
        () => (
            <EmptyStatePanel icon={PiChatCircleDots} title={tReviews('emptyTitle')} hint={tReviews('emptyHint')} />
        ),
        [tReviews],
    )

    const pageSizeOptions = useMemo(
        () =>
            [10, 25, 50, 100].map((n) => ({
                value: n,
                label: `${n} / page`,
            })),
        [],
    )

    const listPaginationFooter =
        allReviews.length > 0 ? (
            <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <Pagination
                    pageSize={pageSize}
                    currentPage={pageIndex}
                    total={total}
                    onChange={(page) => {
                        onAppendQueryParams({
                            pageIndex: String(page),
                        })
                    }}
                />
                <div className="min-w-[130px]">
                    <Select
                        size="sm"
                        menuPlacement="top"
                        isSearchable={false}
                        value={pageSizeOptions.find((opt) => opt.value === pageSize)}
                        options={pageSizeOptions}
                        onChange={(option) => {
                            onAppendQueryParams({
                                pageSize: String(option?.value),
                                pageIndex: '1',
                            })
                        }}
                    />
                </div>
            </div>
        ) : null

    const handleRowClick = canManageReviews ? handleResponse : undefined

    if (allReviews.length === 0) {
        return reviewsEmptyState
    }

    const MobileCard = ({ review }) => {
        const adSlug = review.advertisementLink?.replace('/marketplace/', '').replace(/^\//, '') || ''
        const hasProfile = review.userId !== null && review.userId !== undefined
        const ratingVal = review.rating ?? 0

        const nameElement = hasProfile ? (
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    onClientClick(review.userId, e)
                }}
                className="min-w-0 truncate text-left text-sm font-bold text-gray-900 transition-colors hover:text-primary dark:text-gray-100"
            >
                {review.userName || t('anonymous')}
            </button>
        ) : (
            <span className="min-w-0 truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                {review.userName || t('anonymous')}
            </span>
        )

        return (
            <div
                className={classNames(
                    'rounded-lg border border-gray-200 bg-white p-2 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800/40',
                    canManageReviews &&
                        'cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/60',
                )}
                role={canManageReviews ? 'button' : undefined}
                tabIndex={canManageReviews ? 0 : undefined}
                onClick={canManageReviews ? () => handleResponse(review) : undefined}
                onKeyDown={
                    canManageReviews
                        ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  handleResponse(review)
                              }
                          }
                        : undefined
                }
            >
                <div className="flex gap-2">
                    <Avatar size={40} shape="circle" className="shrink-0" src={review.userAvatar} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 flex-wrap items-center gap-1.5">{nameElement}</div>
                                {review.serviceName ? (
                                    <div className="mt-0.5 truncate text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                        {review.serviceName}
                                    </div>
                                ) : null}
                                {review.specialistName ? (
                                    <div className="mt-0.5 truncate text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                        {t('specialist')}:{' '}
                                        <span className="text-gray-900 dark:text-gray-100">
                                            {review.specialistName}
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <RatingColumn row={review} />
                                {canManageReviews ? (
                                    <button
                                        type="button"
                                        className="inline-flex size-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                        aria-label={tm('respondAria')}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleResponse(review)
                                        }}
                                    >
                                        <HiPencil className="text-base" aria-hidden />
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        {review.advertisementTitle ? (
                            <div className="mt-2 flex min-w-0 items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-700/80">
                                {review.advertisementImage ? (
                                    <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                                        <img
                                            src={review.advertisementImage}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                ) : null}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                        {review.advertisementTitle}
                                    </p>
                                    {adSlug ? (
                                        <Link
                                            href={`/marketplace/${adSlug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[11px] font-bold text-primary hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {t('open')}
                                        </Link>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}

                        <p className="mt-2 line-clamp-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                            {review.comment || ''}
                        </p>

                        {review.response ? (
                            <div className="mt-2 rounded bg-gray-50 p-2 dark:bg-gray-800">
                                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">{t('yourResponse')}:</p>
                                <p className="mt-0.5 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                    {review.response}
                                </p>
                            </div>
                        ) : null}

                        <div className="mt-2 grid grid-cols-3 gap-1 border-t border-gray-100 pt-2 dark:border-gray-700/80">
                            <div className="min-w-0">
                                <div className="truncate text-[9px] font-bold uppercase leading-none tracking-wide text-gray-500 dark:text-gray-400">
                                    {tm('rating')}
                                </div>
                                <div className="mt-0.5 text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                    {ratingVal}/5
                                </div>
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-[9px] font-bold uppercase leading-none tracking-wide text-gray-500 dark:text-gray-400">
                                    {tm('date')}
                                </div>
                                <div className="mt-0.5 truncate text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                    {review.createdAt
                                        ? formatDate(review.createdAt, businessTz, 'short')
                                        : '—'}
                                </div>
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-[9px] font-bold uppercase leading-none tracking-wide text-gray-500 dark:text-gray-400">
                                    {tm('ad')}
                                </div>
                                <div
                                    className="mt-0.5 truncate text-xs font-bold text-gray-900 dark:text-gray-100"
                                    title={review.advertisementTitle || undefined}
                                >
                                    {review.advertisementTitle || t('noAd')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="flex flex-col gap-1.5 md:hidden">
                {allReviews.map((review) => (
                    <MobileCard key={review.id} review={review} />
                ))}
            </div>

            <div ref={tableHostRef} className="hidden min-w-0 w-full md:block">
                <DataTable
                    columns={columns}
                    data={allReviews}
                    emptyState={reviewsEmptyState}
                    noData={allReviews.length === 0}
                    skeletonAvatarColumns={[0]}
                    skeletonAvatarProps={{ width: 40, height: 40 }}
                    loading={false}
                    compact
                    fluidCells
                    className="w-full min-w-0"
                    showPaginationFooter={false}
                    pagingData={{
                        pageIndex,
                        pageSize,
                        total,
                    }}
                    onPaginationChange={(page) => {
                        onAppendQueryParams({
                            pageIndex: String(page),
                        })
                    }}
                    onSelectChange={(value) => {
                        onAppendQueryParams({
                            pageSize: String(value),
                            pageIndex: '1',
                        })
                    }}
                    onRowClick={handleRowClick}
                />
            </div>

            {listPaginationFooter}

            <Dialog
                isOpen={responseModal.isOpen}
                onClose={() => setResponseModal({ isOpen: false, review: null, response: '' })}
                width={600}
            >
                <div className="flex h-full max-h-[85vh] flex-col">
                    <div className="flex-shrink-0 border-b border-gray-200 px-6 pb-4 pt-6 dark:border-gray-700">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tModal('title')}</h4>
                    </div>

                    <div className="booking-modal-scroll flex-1 overflow-y-auto px-6 py-4">
                        <div className="space-y-4">
                            <div>
                                <p className="mb-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {tModal('reviewFrom')}:{' '}
                                    <span className="text-gray-900 dark:text-gray-100">
                                        {responseModal.review?.userName || t('anonymous')}
                                    </span>
                                    {responseModal.review?.userId ? (
                                        <span className="ml-2 text-xs font-bold text-gray-900 dark:text-gray-100">
                                            (ID: {responseModal.review.userId})
                                        </span>
                                    ) : null}
                                </p>
                                <p className="rounded bg-gray-50 p-3 text-sm font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                    {responseModal.review?.comment || ''}
                                </p>
                            </div>
                            <div>
                                <label
                                    htmlFor="review-response-textarea"
                                    className="mb-2 block text-sm font-bold text-gray-500 dark:text-gray-400"
                                >
                                    {tModal('yourResponse')}
                                </label>
                                <textarea
                                    id="review-response-textarea"
                                    value={responseModal.response}
                                    onChange={(e) =>
                                        setResponseModal((prev) => ({
                                            ...prev,
                                            response: e.target.value,
                                        }))
                                    }
                                    rows={5}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                    placeholder={tModal('placeholder')}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-shrink-0 justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setResponseModal({ isOpen: false, review: null, response: '' })}
                        >
                            {tModal('cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="solid"
                            onClick={() => {
                                if (responseModal.review) {
                                    updateResponseMutation.mutate({
                                        id: responseModal.review.id,
                                        response: responseModal.response,
                                    })
                                }
                            }}
                            loading={updateResponseMutation.isPending}
                            disabled={!responseModal.review}
                        >
                            {tModal('save')}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </>
    )
}

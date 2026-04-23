'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import DataTable from '@/components/shared/DataTable'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getBusinessAdvertisements,
    deleteBusinessAdvertisement,
    getBusinessAdvertisement,
    updateAdvertisementVisibility,
} from '@/lib/api/business'
import Switcher from '@/components/ui/Switcher'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { PiPlus, PiPencil, PiTrash, PiMegaphone, PiArrowRight } from 'react-icons/pi'
import Link from 'next/link'
import { normalizeImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'
import { formatDate } from '@/utils/dateTime'
import SubscriptionLimitAlert from '@/components/shared/SubscriptionLimitAlert'
import useSubscriptionLimits from '@/hooks/useSubscriptionLimits'
import useBusinessStore from '@/store/businessStore'
import EmptyStatePanel from '@/components/shared/EmptyStatePanel'

const statusColors = {
    draft: 'bg-yellow-400 dark:bg-yellow-500 text-gray-900 dark:text-gray-900',
    pending: 'bg-yellow-200 dark:bg-yellow-200 text-gray-900 dark:text-gray-900',
    approved: 'bg-emerald-200 dark:bg-emerald-200 text-gray-900 dark:text-gray-900',
    rejected: 'bg-red-200 dark:bg-red-200 text-gray-900 dark:text-gray-900',
    active: 'bg-blue-200 dark:bg-blue-200 text-gray-900 dark:text-gray-900',
    inactive: 'bg-gray-200 dark:bg-gray-200 text-gray-900 dark:text-gray-900',
}

const ImageColumn = ({ row, noPhotoText }) => {
    const imageUrl = row.image ? normalizeImageUrl(row.image) : null
    return (
        <div className="flex items-center">
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={row.title}
                        fill
                        className="object-cover"
                        onError={(e) => {
                            e.target.src = FALLBACK_IMAGE
                            e.target.onerror = null
                        }}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                        {noPhotoText}
                    </div>
                )}
            </div>
        </div>
    )
}

const TitleColumn = ({ row, densityLines = [], showThumb, noPhotoText }) => {
    const imageUrl = row.image ? normalizeImageUrl(row.image) : null
    return (
        <div className="flex min-w-0 max-w-full items-start gap-2">
            {showThumb ? (
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt=""
                            fill
                            className="object-cover"
                            onError={(e) => {
                                e.target.src = FALLBACK_IMAGE
                                e.target.onerror = null
                            }}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                            {noPhotoText}
                        </div>
                    )}
                </div>
            ) : null}
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">{row.title}</div>
                {row.description ? (
                    <div className="mt-1 line-clamp-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                        {row.description}
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

export function AdvertisementsRegularPanel({ queryEnabled = true }) {
    const t = useTranslations('business.advertisements')
    const tCommon = useTranslations('business.common')
    const { settings } = useBusinessStore()
    const businessTz = settings?.timezone || 'America/Los_Angeles'
    const { canCreate } = useSubscriptionLimits()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()
    const { onAppendQueryParams } = useAppendQueryParams()
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [adToDelete, setAdToDelete] = useState(null)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [selectedAd, setSelectedAd] = useState(null)

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

    const hideCreatedAtColumn = tableHostWidth < 920
    const hidePhotoColumn = tableHostWidth < 760

    const getStatusLabel = useCallback(
        (status) => {
            try {
                return t(`statuses.${status}`) || status
            } catch {
                return status
            }
        },
        [t],
    )

    const { data: advertisementsData, isLoading, error } = useQuery({
        queryKey: ['business-advertisements-regular', pageIndex, pageSize],
        queryFn: () =>
            getBusinessAdvertisements({
                page: pageIndex,
                pageSize,
                type: 'regular',
            }),
        enabled: queryEnabled,
    })

    const advertisements = advertisementsData?.data || []
    const total = advertisementsData?.total || 0

    const deleteAdMutation = useMutation({
        mutationFn: deleteBusinessAdvertisement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-advertisements-regular'] })
            queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
            setIsDeleteDialogOpen(false)
            setAdToDelete(null)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.deleteSuccess')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.deleteError')}
                </Notification>,
            )
        },
    })

    const updateVisibilityMutation = useMutation({
        mutationFn: ({ id, isActive }) => updateAdvertisementVisibility(id, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-advertisements-regular'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.visibilityUpdated')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.visibilityError')}
                </Notification>,
            )
        },
    })

    const handleDeleteAd = useCallback((ad) => {
        setAdToDelete(ad)
        setIsDeleteDialogOpen(true)
    }, [])

    const confirmDeleteAd = () => {
        if (adToDelete) {
            deleteAdMutation.mutate(adToDelete.id)
        }
    }

    const handleView = useCallback(
        async (ad) => {
            try {
                const fullAd = await getBusinessAdvertisement(ad.id)
                setSelectedAd(fullAd)
                setIsViewModalOpen(true)
            } catch {
                toast.push(
                    <Notification title={tCommon('error')} type="danger">
                        {t('notifications.loadError')}
                    </Notification>,
                )
            }
        },
        [t, tCommon],
    )

    const columns = useMemo(() => {
        const densityLinesForRow = (row) => {
            const lines = []
            if (hideCreatedAtColumn && row.created_at) {
                lines.push(
                    `${t('columns.createdAt')}: ${formatDate(row.created_at, businessTz, 'short')}`,
                )
            }
            return lines
        }

        const cols = []

        if (!hidePhotoColumn) {
            cols.push({
                header: t('columns.photo'),
                accessorKey: 'image',
                enableSorting: false,
                cell: (props) => (
                    <ImageColumn row={props.row.original} noPhotoText={t('noPhoto')} />
                ),
            })
        }

        cols.push({
            header: t('columns.title'),
            accessorKey: 'title',
            enableSorting: false,
            cell: (props) => {
                const row = props.row.original
                return (
                    <TitleColumn
                        row={row}
                        showThumb={hidePhotoColumn}
                        noPhotoText={t('noPhoto')}
                        densityLines={densityLinesForRow(row)}
                    />
                )
            },
        })

        cols.push(
            {
                header: t('columns.status'),
                accessorKey: 'status',
                enableSorting: false,
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <div className="flex flex-col items-start gap-1">
                            <Tag className={statusColors[row.status] || statusColors.inactive}>
                                {getStatusLabel(row.status)}
                            </Tag>
                            {row.status === 'rejected' && row.moderation_reason ? (
                                <span
                                    className="max-w-[200px] text-xs font-bold text-red-600 dark:text-red-400"
                                    title={row.moderation_reason}
                                >
                                    {row.moderation_reason.length > 50
                                        ? `${row.moderation_reason.substring(0, 50)}...`
                                        : row.moderation_reason}
                                </span>
                            ) : null}
                        </div>
                    )
                },
            },
            {
                header: t('columns.visible'),
                accessorKey: 'is_active',
                enableSorting: false,
                meta: { stopRowClick: true },
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <Switcher
                            checked={row.is_active !== false}
                            onChange={(checked) => {
                                updateVisibilityMutation.mutate({
                                    id: row.id,
                                    isActive: checked,
                                })
                            }}
                            loading={updateVisibilityMutation.isPending}
                        />
                    )
                },
            },
        )

        if (!hideCreatedAtColumn) {
            cols.push({
                header: t('columns.createdAt'),
                accessorKey: 'created_at',
                enableSorting: false,
                cell: (props) => (
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {props.row.original.created_at
                            ? formatDate(props.row.original.created_at, businessTz, 'short')
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
                <div className="flex items-center justify-end gap-1">
                    <Link href={`/business/settings/advertisements/create?edit=${props.row.original.id}`}>
                        <Button variant="plain" size="sm" icon={<PiPencil />} />
                    </Link>
                    <Button
                        variant="plain"
                        size="sm"
                        icon={<PiTrash />}
                        onClick={() => handleDeleteAd(props.row.original)}
                        className="text-red-600"
                    />
                </div>
            ),
        })

        return cols
    }, [
        t,
        businessTz,
        getStatusLabel,
        handleDeleteAd,
        hideCreatedAtColumn,
        hidePhotoColumn,
        updateVisibilityMutation,
    ])

    const regularEmptyState = useMemo(
        () => (
            <EmptyStatePanel icon={PiMegaphone} title={t('emptyTitle')} hint={t('emptyHint')}>
                {error ? (
                    <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">
                            {t('loadError')}: {error.message}
                        </p>
                    </div>
                ) : null}
                {canCreate('advertisements') ? (
                    <Link href="/business/settings/advertisements/create">
                        <Button variant="solid" icon={<PiPlus />}>
                            {t('createButton')}
                        </Button>
                    </Link>
                ) : (
                    <Button variant="solid" icon={<PiPlus />} disabled>
                        {t('createButton')}
                    </Button>
                )}
            </EmptyStatePanel>
        ),
        [t, error, canCreate],
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
        advertisements.length > 0 ? (
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

    if (!queryEnabled) {
        return null
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loading loading />
            </div>
        )
    }

    return (
        <>
            <div className="flex flex-col gap-4">
                <SubscriptionLimitAlert resource="advertisements" />
                <div className="flex flex-wrap justify-end gap-2">
                    <Link href="/business/advertisements/purchase">
                        <Button variant="outline" size="sm" icon={<PiMegaphone />}>
                            {t('buyAds')}
                        </Button>
                    </Link>
                    {canCreate('advertisements') ? (
                        <Link href="/business/settings/advertisements/create">
                            <Button variant="outline" size="sm">
                                {t('createButton')}
                            </Button>
                        </Link>
                    ) : (
                        <Button variant="outline" size="sm" disabled>
                            {t('createButton')}
                        </Button>
                    )}
                </div>

                {advertisements.length === 0 ? (
                    regularEmptyState
                ) : (
                    <>
                        <div className="flex flex-col gap-1.5 md:hidden">
                            {advertisements.map((ad) => {
                                const imageUrl = ad.image ? normalizeImageUrl(ad.image) : null
                                return (
                                    <div
                                        key={ad.id}
                                        className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm transition-colors active:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/40 dark:active:bg-gray-800/60"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleView(ad)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                handleView(ad)
                                            }
                                        }}
                                    >
                                        <div className="flex gap-2">
                                            {imageUrl ? (
                                                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                                                    <Image
                                                        src={imageUrl}
                                                        alt=""
                                                        fill
                                                        className="object-cover"
                                                        onError={(e) => {
                                                            e.target.src = FALLBACK_IMAGE
                                                            e.target.onerror = null
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] text-gray-400 dark:bg-gray-800">
                                                    {t('noPhoto')}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                                            <span className="min-w-0 truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                                                                {ad.title}
                                                            </span>
                                                            <Tag
                                                                className={`shrink-0 !px-1.5 !py-0 !text-[11px] leading-none ${statusColors[ad.status] || statusColors.inactive}`}
                                                            >
                                                                {getStatusLabel(ad.status)}
                                                            </Tag>
                                                        </div>
                                                        {ad.description ? (
                                                            <div className="mt-0.5 line-clamp-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                                                {ad.description}
                                                            </div>
                                                        ) : null}
                                                        {ad.created_at ? (
                                                            <div className="mt-0.5 text-[11px] font-bold text-gray-900 dark:text-gray-100">
                                                                {formatDate(ad.created_at, businessTz, 'short')}
                                                            </div>
                                                        ) : null}
                                                        {ad.status === 'rejected' && ad.moderation_reason ? (
                                                            <div className="mt-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                                                                {ad.moderation_reason}
                                                            </div>
                                                        ) : null}
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                                                {t('columns.visible')}:
                                                            </span>
                                                            <div
                                                                onClick={(e) => e.stopPropagation()}
                                                                onKeyDown={(e) => e.stopPropagation()}
                                                                role="presentation"
                                                            >
                                                                <Switcher
                                                                    checked={ad.is_active !== false}
                                                                    onChange={(checked) => {
                                                                        updateVisibilityMutation.mutate({
                                                                            id: ad.id,
                                                                            isActive: checked,
                                                                        })
                                                                    }}
                                                                    loading={updateVisibilityMutation.isPending}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 gap-1">
                                                        <Link
                                                            href={`/business/settings/advertisements/create?edit=${ad.id}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Button variant="plain" size="sm" icon={<PiPencil />} />
                                                        </Link>
                                                        <Button
                                                            variant="plain"
                                                            size="sm"
                                                            icon={<PiTrash />}
                                                            className="text-red-600"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDeleteAd(ad)
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div ref={tableHostRef} className="hidden min-w-0 w-full md:block">
                            <DataTable
                                columns={columns}
                                data={advertisements}
                                emptyState={regularEmptyState}
                                noData={advertisements.length === 0}
                                emptyStateIcon={PiMegaphone}
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
                                onRowClick={handleView}
                            />
                        </div>

                        {listPaginationFooter}
                    </>
                )}
            </div>

            <Dialog
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false)
                    setSelectedAd(null)
                }}
                width={700}
            >
                {selectedAd ? (
                    <div className="flex h-full max-h-[85vh] flex-col">
                        <div className="flex-shrink-0 border-b border-gray-200 px-6 pb-4 pt-6 dark:border-gray-700">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {t('viewModal.title')}
                            </h4>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                            {selectedAd.image ? (
                                <div className="relative h-64 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                                    <img
                                        src={normalizeImageUrl(selectedAd.image)}
                                        alt={selectedAd.title}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            e.target.src = FALLBACK_IMAGE
                                            e.target.onerror = null
                                        }}
                                    />
                                </div>
                            ) : null}

                            <div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    {selectedAd.title}
                                </h4>
                                {selectedAd.description ? (
                                    <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {selectedAd.description}
                                    </p>
                                ) : null}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <Tag className={statusColors[selectedAd.status] || statusColors.inactive}>
                                    {getStatusLabel(selectedAd.status)}
                                </Tag>
                                <span
                                    className={`rounded-full px-2 py-1 text-xs font-bold ${selectedAd.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}
                                >
                                    {selectedAd.is_active ? t('viewModal.visible') : t('viewModal.hidden')}
                                </span>
                                {selectedAd.category_slug ? (
                                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                                        {selectedAd.category_slug}
                                    </span>
                                ) : null}
                            </div>

                            {selectedAd.status === 'rejected' && selectedAd.moderation_reason ? (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-500/10">
                                    <div className="mb-0.5 text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {t('viewModal.rejectionReason')}
                                    </div>
                                    <div className="text-sm text-red-600 dark:text-red-400">
                                        {selectedAd.moderation_reason}
                                    </div>
                                </div>
                            ) : null}

                            {selectedAd.services && selectedAd.services.length > 0 ? (
                                <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
                                    <div className="mb-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('viewModal.services')}
                                    </div>
                                    <div className="space-y-2">
                                        {selectedAd.services.map((service, idx) => (
                                            <div
                                                key={service.id || idx}
                                                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {service.name}
                                                    </div>
                                                    {service.description ? (
                                                        <div className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                                                            {service.description}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className="ml-4 flex flex-shrink-0 items-center gap-4">
                                                    {service.duration ? (
                                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                            {service.duration} {t('viewModal.min')}
                                                        </span>
                                                    ) : null}
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        ${Number(service.price || 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {selectedAd.portfolio && selectedAd.portfolio.length > 0 ? (
                                <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
                                    <div className="mb-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('viewModal.portfolio')}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                        {selectedAd.portfolio.map((item, idx) => (
                                            <div
                                                key={item.id || idx}
                                                className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
                                            >
                                                <img
                                                    src={normalizeImageUrl(item.image || item.url || item)}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => {
                                                        e.target.src = FALLBACK_IMAGE
                                                        e.target.onerror = null
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {selectedAd.city ? (
                                        <div>
                                            <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('viewModal.city')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {selectedAd.city}
                                            </div>
                                        </div>
                                    ) : null}
                                    {selectedAd.state ? (
                                        <div>
                                            <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('viewModal.state')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {selectedAd.state}
                                            </div>
                                        </div>
                                    ) : null}
                                    {selectedAd.placement ? (
                                        <div>
                                            <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('viewModal.placement')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {selectedAd.placement}
                                            </div>
                                        </div>
                                    ) : null}
                                    {selectedAd.price_from || selectedAd.price_to ? (
                                        <div>
                                            <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('viewModal.priceFrom')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {selectedAd.price_from && `$${selectedAd.price_from}`}
                                                {selectedAd.price_from && selectedAd.price_to ? ' — ' : null}
                                                {selectedAd.price_to && `$${selectedAd.price_to}`}
                                            </div>
                                        </div>
                                    ) : null}
                                    {selectedAd.impressions > 0 || selectedAd.clicks > 0 ? (
                                        <>
                                            <div>
                                                <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    {t('viewModal.impressions')}
                                                </div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {selectedAd.impressions || 0}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    {t('viewModal.clicks')}
                                                </div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {selectedAd.clicks || 0}
                                                </div>
                                            </div>
                                        </>
                                    ) : null}
                                    {selectedAd.created_at ? (
                                        <div>
                                            <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('viewModal.createdAt')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {formatDate(selectedAd.created_at, businessTz, 'short')}
                                            </div>
                                        </div>
                                    ) : null}
                                    {selectedAd.updated_at ? (
                                        <div>
                                            <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('viewModal.updatedAt')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {formatDate(selectedAd.updated_at, businessTz, 'short')}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {selectedAd.link ? (
                                <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
                                    <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                        {t('viewModal.link')}
                                    </div>
                                    <Link
                                        href={`/marketplace/${selectedAd.link}`}
                                        target="_blank"
                                        className="break-all text-sm font-bold text-primary hover:underline"
                                    >
                                        /marketplace/{selectedAd.link}
                                    </Link>
                                </div>
                            ) : null}
                        </div>

                        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                            {selectedAd.link ? (
                                <Link href={`/marketplace/${selectedAd.link}`} target="_blank">
                                    <Button variant="outline" size="sm" icon={<PiArrowRight />}>
                                        {t('viewModal.link')}
                                    </Button>
                                </Link>
                            ) : null}
                            <Link href={`/business/settings/advertisements/create?edit=${selectedAd.id}`}>
                                <Button variant="solid" size="sm" icon={<PiPencil />}>
                                    {t('viewModal.editAd')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : null}
            </Dialog>

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                type="danger"
                title={t('deleteConfirm.title')}
                confirmText={t('deleteConfirm.confirm')}
                onConfirm={confirmDeleteAd}
                onCancel={() => {
                    setIsDeleteDialogOpen(false)
                    setAdToDelete(null)
                }}
            >
                <p>{t('deleteConfirm.message', { title: adToDelete?.title || '' })}</p>
            </ConfirmDialog>
        </>
    )
}

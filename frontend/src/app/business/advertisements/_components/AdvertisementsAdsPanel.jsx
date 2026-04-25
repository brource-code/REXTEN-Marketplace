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
import { PiPencil, PiTrash, PiMegaphone, PiEye, PiCursorClick, PiArrowRight } from 'react-icons/pi'
import Link from 'next/link'
import { normalizeImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'
import { formatDate } from '@/utils/dateTime'
import { formatDurationMinutesI18n } from '@/utils/formatDurationMinutesI18n'
import useBusinessStore from '@/store/businessStore'
import EmptyStatePanel from '@/components/shared/EmptyStatePanel'
import classNames from '@/utils/classNames'

const statusColors = {
    draft: 'bg-yellow-400 dark:bg-yellow-500 text-gray-900 dark:text-gray-900',
    pending: 'bg-yellow-200 dark:bg-yellow-200 text-gray-900 dark:text-gray-900',
    approved: 'bg-emerald-200 dark:bg-emerald-200 text-gray-900 dark:text-gray-900',
    rejected: 'bg-red-200 dark:bg-red-200 text-gray-900 dark:text-gray-900',
    active: 'bg-blue-200 dark:bg-blue-200 text-gray-900 dark:text-gray-900',
    inactive: 'bg-gray-200 dark:bg-gray-200 text-gray-900 dark:text-gray-900',
}

/** Показы, клики, CTR — плоская строка без карточек (колонка таблицы уже даёт заголовок). */
function AdsStatsMini({
    row,
    impressionsLabel,
    clicksLabel,
    ctrLabel,
    statsHeading,
    className,
    showHeading = false,
}) {
    const ctr = row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : '0'
    const StatItem = ({ icon: Icon, iconClassName, label, value }) => (
        <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {Icon ? (
                    <Icon className={classNames('shrink-0', iconClassName)} size={12} aria-hidden />
                ) : null}
                {label}
            </span>
            <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">{value}</span>
        </div>
    )
    return (
        <div className={classNames('min-w-0', className)} role="group" aria-label={statsHeading}>
            {showHeading ? (
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {statsHeading}
                </div>
            ) : null}
            <div className="flex min-w-0 flex-wrap items-stretch gap-x-4 gap-y-2 sm:gap-x-5">
                <StatItem
                    icon={PiEye}
                    iconClassName="text-emerald-600 dark:text-emerald-400"
                    label={impressionsLabel}
                    value={(row.impressions || 0).toLocaleString()}
                />
                <StatItem
                    icon={PiCursorClick}
                    iconClassName="text-blue-600 dark:text-blue-400"
                    label={clicksLabel}
                    value={String(row.clicks || 0)}
                />
                <StatItem label={ctrLabel} value={`${ctr}%`} />
            </div>
        </div>
    )
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

const TitleColumn = ({
    row,
    adBadgeText,
    densityLines = [],
    showThumb,
    noPhotoText,
    showInlineStats,
    statsHeading,
    impressionsLabel,
    clicksLabel,
    ctrLabel,
}) => {
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
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">{row.title}</div>
                    <span className="inline-flex shrink-0 items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {adBadgeText}
                    </span>
                </div>
                {row.description ? (
                    <div className="mt-1 line-clamp-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                        {row.description}
                    </div>
                ) : null}
                {showInlineStats ? (
                    <AdsStatsMini
                        row={row}
                        impressionsLabel={impressionsLabel}
                        clicksLabel={clicksLabel}
                        ctrLabel={ctrLabel}
                        statsHeading={statsHeading}
                        showHeading
                        className="mt-2"
                    />
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

const StatsColumn = ({ row, ctrLabel, impressionsLabel, clicksLabel, statsHeading }) => (
    <AdsStatsMini
        row={row}
        impressionsLabel={impressionsLabel}
        clicksLabel={clicksLabel}
        ctrLabel={ctrLabel}
        statsHeading={statsHeading}
    />
)

export function AdvertisementsAdsPanel({ queryEnabled = true }) {
    const t = useTranslations('business.advertisements.ads')
    const tAds = useTranslations('business.advertisements')
    const tCommon = useTranslations('business.common')
    const tDur = useTranslations('common.durationMinutes')
    const { settings } = useBusinessStore()
    const businessTz = settings?.timezone || 'America/Los_Angeles'
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

    // Узкая область (планшет с сайдбаром): раньше прячем колонки — плотность в TitleColumn, без гориз. скролла
    const hidePlacementDatesColumn = tableHostWidth < 1180
    const hideCreatedAtColumn = tableHostWidth < 1080
    const hideStatsColumn = tableHostWidth < 1000
    const hidePhotoColumn = tableHostWidth < 920
    const hidePlacementColumn = tableHostWidth < 880

    const getStatusLabel = useCallback(
        (status) => {
            try {
                return tAds(`statuses.${status}`) || status
            } catch {
                return status
            }
        },
        [tAds],
    )

    const getPlacementLabel = useCallback(
        (placement) => {
            try {
                return t(`placements.${placement}`) || placement
            } catch {
                return placement
            }
        },
        [t],
    )

    const { data: advertisementsData, isLoading, error } = useQuery({
        queryKey: ['business-advertisements-ads', pageIndex, pageSize],
        queryFn: () =>
            getBusinessAdvertisements({
                page: pageIndex,
                pageSize,
                type: 'advertisement',
            }),
        enabled: queryEnabled,
    })

    const advertisements = (advertisementsData?.data || []).filter(
        (ad) => ad.type === 'advertisement' || ad.type === 'ad',
    )

    const total = advertisementsData?.total || 0

    const deleteAdMutation = useMutation({
        mutationFn: deleteBusinessAdvertisement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-advertisements-ads'] })
            setIsDeleteDialogOpen(false)
            setAdToDelete(null)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {tAds('notifications.deleteSuccess')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {tAds('notifications.deleteError')}
                </Notification>,
            )
        },
    })

    const updateVisibilityMutation = useMutation({
        mutationFn: ({ id, isActive }) => updateAdvertisementVisibility(id, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-advertisements-ads'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {tAds('notifications.visibilityUpdated')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {tAds('notifications.visibilityError')}
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
                        {tAds('notifications.loadError')}
                    </Notification>,
                )
            }
        },
        [tAds, tCommon],
    )

    const ctrShortLabel = t('viewModal.ctr')

    const columns = useMemo(() => {
        const densityLinesForRow = (row) => {
            const lines = []
            if (hidePlacementColumn && row.placement) {
                lines.push(`${t('columns.placement')}: ${getPlacementLabel(row.placement)}`)
            }
            if (hidePlacementDatesColumn && (row.start_date || row.end_date)) {
                const start = row.start_date ? formatDate(row.start_date, businessTz, 'short') : '—'
                const end = row.end_date ? formatDate(row.end_date, businessTz, 'short') : '—'
                lines.push(`${t('columns.placementDates')}: ${start} — ${end}`)
            }
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
                    <ImageColumn row={props.row.original} noPhotoText={tAds('noPhoto')} />
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
                        adBadgeText={t('adBadge')}
                        showThumb={hidePhotoColumn}
                        noPhotoText={tAds('noPhoto')}
                        showInlineStats={hideStatsColumn}
                        statsHeading={t('columns.stats')}
                        impressionsLabel={t('stats.impressions')}
                        clicksLabel={t('stats.clicks')}
                        ctrLabel={ctrShortLabel}
                        densityLines={densityLinesForRow(row)}
                    />
                )
            },
        })

        if (!hidePlacementColumn) {
            cols.push({
                header: t('columns.placement'),
                accessorKey: 'placement',
                enableSorting: false,
                cell: (props) => (
                    <Tag className="bg-gray-100 dark:bg-gray-800">
                        {getPlacementLabel(props.row.original.placement)}
                    </Tag>
                ),
            })
        }

        cols.push(
            {
                header: t('columns.status'),
                accessorKey: 'status',
                enableSorting: false,
                cell: (props) => (
                    <Tag className={statusColors[props.row.original.status] || statusColors.inactive}>
                        {getStatusLabel(props.row.original.status)}
                    </Tag>
                ),
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

        if (!hideStatsColumn) {
            cols.push({
                header: t('columns.stats'),
                accessorKey: 'impressions',
                enableSorting: false,
                cell: (props) => (
                    <StatsColumn
                        row={props.row.original}
                        ctrLabel={ctrShortLabel}
                        impressionsLabel={t('stats.impressions')}
                        clicksLabel={t('stats.clicks')}
                        statsHeading={t('columns.stats')}
                    />
                ),
            })
        }

        if (!hidePlacementDatesColumn) {
            cols.push({
                header: t('columns.placementDates'),
                accessorKey: 'start_date',
                enableSorting: false,
                cell: (props) => {
                    const row = props.row.original
                    if (row.start_date || row.end_date) {
                        return (
                            <div className="text-xs">
                                <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                    {row.start_date ? formatDate(row.start_date, businessTz, 'short') : '—'}
                                </div>
                                <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                    {row.end_date ? formatDate(row.end_date, businessTz, 'short') : '—'}
                                </div>
                            </div>
                        )
                    }
                    return <span className="text-sm font-bold text-gray-500 dark:text-gray-400">—</span>
                },
            })
        }

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
        tAds,
        businessTz,
        getPlacementLabel,
        getStatusLabel,
        handleDeleteAd,
        hideCreatedAtColumn,
        hidePhotoColumn,
        hidePlacementColumn,
        hidePlacementDatesColumn,
        hideStatsColumn,
        ctrShortLabel,
        updateVisibilityMutation,
    ])

    const adsEmptyState = useMemo(
        () => (
            <EmptyStatePanel icon={PiMegaphone} title={t('emptyTitle')} hint={t('emptyHint')}>
                {error ? (
                    <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">
                            {tAds('loadError')}: {error.message}
                        </p>
                    </div>
                ) : null}
                <Link href="/business/advertisements/purchase">
                    <Button variant="solid" icon={<PiMegaphone />}>
                        {t('buyAds')}
                    </Button>
                </Link>
            </EmptyStatePanel>
        ),
        [t, tAds, error],
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
            <div className="flex min-w-0 flex-col gap-3">
                {advertisements.length === 0 ? (
                    adsEmptyState
                ) : (
                    <>
                        <div className="flex flex-col gap-1.5 lg:hidden">
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
                                                    {tAds('noPhoto')}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                                            <span className="min-w-0 truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                                                                {ad.title}
                                                            </span>
                                                            <span className="inline-flex shrink-0 items-center rounded-full bg-blue-100 px-1.5 py-0 text-[11px] font-bold leading-none text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                                {t('adBadge')}
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
                                                        {ad.placement ? (
                                                            <div className="mt-1">
                                                                <Tag className="bg-gray-100 text-[11px] dark:bg-gray-800">
                                                                    {getPlacementLabel(ad.placement)}
                                                                </Tag>
                                                            </div>
                                                        ) : null}
                                                        <AdsStatsMini
                                                            row={ad}
                                                            impressionsLabel={t('stats.impressions')}
                                                            clicksLabel={t('stats.clicks')}
                                                            ctrLabel={t('viewModal.ctr')}
                                                            statsHeading={t('columns.stats')}
                                                            showHeading
                                                            className="mt-2"
                                                        />
                                                        {ad.created_at ? (
                                                            <div className="mt-2 rounded-md border border-dashed border-gray-200 bg-gray-50/80 px-2 py-1.5 dark:border-gray-600 dark:bg-gray-900/40">
                                                                <div className="text-[9px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                                    {t('columns.createdAt')}
                                                                </div>
                                                                <div className="mt-0.5 text-xs font-bold text-gray-900 dark:text-gray-100">
                                                                    {formatDate(ad.created_at, businessTz, 'short')}
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                        <div className="mt-2 flex items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-700/80">
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

                        <div ref={tableHostRef} className="hidden min-w-0 w-full lg:block">
                            <DataTable
                                columns={columns}
                                data={advertisements}
                                emptyState={adsEmptyState}
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
                                {tAds('viewModal.title')}
                            </h4>
                        </div>

                        <div className="booking-modal-scroll flex-1 space-y-4 overflow-y-auto px-6 py-4">
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
                                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedAd.title}</h4>
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
                                    {selectedAd.is_active ? tAds('viewModal.visible') : tAds('viewModal.hidden')}
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
                                        {tAds('viewModal.rejectionReason')}
                                    </div>
                                    <div className="text-sm text-red-600 dark:text-red-400">{selectedAd.moderation_reason}</div>
                                </div>
                            ) : null}

                            {selectedAd.services && selectedAd.services.length > 0 ? (
                                <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
                                    <div className="mb-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {tAds('viewModal.services')}
                                    </div>
                                    <div className="space-y-2">
                                        {selectedAd.services.map((service, idx) => (
                                            <div
                                                key={service.id || idx}
                                                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{service.name}</div>
                                                    {service.description ? (
                                                        <div className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                                                            {service.description}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className="ml-4 flex flex-shrink-0 items-center gap-4">
                                                    {service.duration ? (
                                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                            {formatDurationMinutesI18n(service.duration, tDur)}
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
                                        {tAds('viewModal.portfolio')}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                        {selectedAd.portfolio.map((item, idx) => (
                                            <div
                                                key={item.id || idx}
                                                className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
                                            >
                                                <img
                                                    src={
                                                        normalizeImageUrl(
                                                            (Array.isArray(item.images)
                                                                ? item.images.find(
                                                                      (x) =>
                                                                          x != null &&
                                                                          String(x).trim() !== '',
                                                                  )
                                                                : null) ??
                                                                item.imageUrl ??
                                                                item.image ??
                                                                item.url ??
                                                                item,
                                                        ) || FALLBACK_IMAGE
                                                    }
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
                                                {tAds('viewModal.city')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedAd.city}</div>
                                        </div>
                                    ) : null}
                                    {selectedAd.state ? (
                                        <div>
                                            <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {tAds('viewModal.state')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedAd.state}</div>
                                        </div>
                                    ) : null}
                                    {selectedAd.placement ? (
                                        <div>
                                            <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {tAds('viewModal.placement')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {getPlacementLabel(selectedAd.placement) || selectedAd.placement}
                                            </div>
                                        </div>
                                    ) : null}
                                    {selectedAd.price_from || selectedAd.price_to ? (
                                        <div>
                                            <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {tAds('viewModal.priceFrom')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {selectedAd.price_from && `$${selectedAd.price_from}`}
                                                {selectedAd.price_from && selectedAd.price_to ? ' — ' : null}
                                                {selectedAd.price_to && `$${selectedAd.price_to}`}
                                            </div>
                                        </div>
                                    ) : null}
                                    {selectedAd.start_date ? (
                                        <div>
                                            <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('viewModal.startDate')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {formatDate(selectedAd.start_date, businessTz, 'short')}
                                            </div>
                                        </div>
                                    ) : null}
                                    {selectedAd.end_date ? (
                                        <div>
                                            <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('viewModal.endDate')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {formatDate(selectedAd.end_date, businessTz, 'short')}
                                            </div>
                                        </div>
                                    ) : null}
                                    {selectedAd.impressions > 0 || selectedAd.clicks > 0 ? (
                                        <>
                                            <div>
                                                <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    {tAds('viewModal.impressions')}
                                                </div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {selectedAd.impressions || 0}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    {tAds('viewModal.clicks')}
                                                </div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {selectedAd.clicks || 0}
                                                </div>
                                            </div>
                                        </>
                                    ) : null}
                                    {selectedAd.impressions > 0 ? (
                                        <div>
                                            <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('viewModal.ctr')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {((selectedAd.clicks / selectedAd.impressions) * 100).toFixed(2)}%
                                            </div>
                                        </div>
                                    ) : null}
                                    {selectedAd.created_at ? (
                                        <div>
                                            <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {tAds('viewModal.createdAt')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {formatDate(selectedAd.created_at, businessTz, 'short')}
                                            </div>
                                        </div>
                                    ) : null}
                                    {selectedAd.updated_at ? (
                                        <div>
                                            <div className="mb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {tAds('viewModal.updatedAt')}
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
                                        {tAds('viewModal.link')}
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
                                        {tAds('viewModal.link')}
                                    </Button>
                                </Link>
                            ) : null}
                            <Link href={`/business/settings/advertisements/create?edit=${selectedAd.id}`}>
                                <Button variant="solid" size="sm" icon={<PiPencil />}>
                                    {tAds('viewModal.editAd')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : null}
            </Dialog>

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                type="danger"
                title={tAds('deleteConfirm.title')}
                confirmText={tAds('deleteConfirm.confirm')}
                onConfirm={confirmDeleteAd}
                onCancel={() => {
                    setIsDeleteDialogOpen(false)
                    setAdToDelete(null)
                }}
            >
                <p>{tAds('deleteConfirm.message', { title: adToDelete?.title || '' })}</p>
            </ConfirmDialog>
        </>
    )
}

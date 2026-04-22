'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import DataTable from '@/components/shared/DataTable'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBusinessAdvertisements, deleteBusinessAdvertisement, getBusinessAdvertisement, updateAdvertisementVisibility } from '@/lib/api/business'
import Switcher from '@/components/ui/Switcher'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { PiPlus, PiPencil, PiTrash, PiMegaphone, PiEye, PiCursorClick, PiArrowRight } from 'react-icons/pi'
import Link from 'next/link'
import { normalizeImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'
import { formatDate } from '@/utils/dateTime'
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
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
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
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        {noPhotoText}
                    </div>
                )}
            </div>
        </div>
    )
}

const TitleColumn = ({ row, adBadgeText }) => {
    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {row.title}
                </div>
                <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {adBadgeText}
                </span>
            </div>
            {row.description && (
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {row.description}
                </div>
            )}
        </div>
    )
}

const StatsColumn = ({ row }) => {
    const ctr = row.impressions > 0 
        ? ((row.clicks / row.impressions) * 100).toFixed(2)
        : 0
    
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-sm">
                <PiEye className="text-gray-400" size={14} />
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{(row.impressions || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
                <PiCursorClick className="text-gray-400" size={14} />
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{row.clicks || 0}</span>
            </div>
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                CTR: <span className="text-gray-900 dark:text-gray-100">{ctr}%</span>
            </div>
        </div>
    )
}

const ActionColumn = ({ row, onView, onEdit, onDelete }) => {
    return (
        <div className="flex items-center gap-2">
            <Button
                variant="plain"
                size="sm"
                icon={<PiEye />}
                onClick={() => onView(row)}
            />
            <Link href={`/business/settings/advertisements/create?edit=${row.id}`}>
                <Button
                    variant="plain"
                    size="sm"
                    icon={<PiPencil />}
                />
            </Link>
            <Button
                variant="plain"
                size="sm"
                icon={<PiTrash />}
                onClick={() => onDelete(row)}
                className="text-red-600"
            />
        </div>
    )
}

export function AdvertisementsAdsPanel({ queryEnabled = true }) {
    const t = useTranslations('business.advertisements.ads')
    const tAds = useTranslations('business.advertisements')
    const tCommon = useTranslations('business.common')
    const { settings } = useBusinessStore()
    const businessTz = settings?.timezone || 'America/Los_Angeles'
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()
    const { onAppendQueryParams } = useAppendQueryParams()
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [adToDelete, setAdToDelete] = useState(null)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [selectedAd, setSelectedAd] = useState(null)
    
    // Функция для получения перевода статуса
    const getStatusLabel = (status) => {
        try {
            return tAds(`statuses.${status}`) || status
        } catch {
            return status
        }
    }
    
    // Функция для получения перевода размещения
    const getPlacementLabel = (placement) => {
        try {
            return t(`placements.${placement}`) || placement
        } catch {
            return placement
        }
    }

    const { data: advertisementsData, isLoading, error } = useQuery({
        queryKey: ['business-advertisements-ads', pageIndex, pageSize],
        queryFn: () => getBusinessAdvertisements({
            page: pageIndex,
            pageSize,
            type: 'advertisement', // Фильтруем на бэкенде только рекламные (type = 'advertisement' или 'ad')
        }),
        enabled: queryEnabled,
    })
    
    // Дополнительная фильтрация на клиенте для надежности
    const advertisements = (advertisementsData?.data || []).filter(ad => 
        ad.type === 'advertisement' || ad.type === 'ad'
    )
    
    // Используем total от бэкенда - он должен быть правильным после фильтрации
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

    const handleDeleteAd = (ad) => {
        setAdToDelete(ad)
        setIsDeleteDialogOpen(true)
    }

    const confirmDeleteAd = () => {
        if (adToDelete) {
            deleteAdMutation.mutate(adToDelete.id)
        }
    }

    const handleView = async (ad) => {
        try {
            const fullAd = await getBusinessAdvertisement(ad.id)
            setSelectedAd(fullAd)
            setIsViewModalOpen(true)
        } catch (error) {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {tAds('notifications.loadError')}
                </Notification>,
            )
        }
    }

    const columns = useMemo(
        () => [
            {
                header: t('columns.photo'),
                accessorKey: 'image',
                cell: (props) => <ImageColumn row={props.row.original} noPhotoText={tAds('noPhoto')} />,
            },
            {
                header: t('columns.title'),
                accessorKey: 'title',
                cell: (props) => (
                    <div 
                        className="cursor-pointer hover:text-primary"
                        onClick={() => handleView(props.row.original)}
                    >
                        <TitleColumn row={props.row.original} adBadgeText={t('adBadge')} />
                    </div>
                ),
            },
            {
                header: t('columns.placement'),
                accessorKey: 'placement',
                cell: (props) => (
                    <Tag className="bg-gray-100 dark:bg-gray-800">
                        {getPlacementLabel(props.row.original.placement)}
                    </Tag>
                ),
            },
            {
                header: t('columns.status'),
                accessorKey: 'status',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <Tag className={statusColors[row.status] || statusColors.inactive}>
                            {getStatusLabel(row.status)}
                        </Tag>
                    )
                },
            },
            {
                header: t('columns.visible') || 'Видимость', // Fallback на случай проблем с переводами
                accessorKey: 'is_active',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <Switcher
                            checked={row.is_active !== false}
                            onChange={(checked) => {
                                updateVisibilityMutation.mutate({
                                    id: row.id,
                                    isActive: checked
                                })
                            }}
                            loading={updateVisibilityMutation.isPending}
                        />
                    )
                },
            },
            {
                header: t('columns.stats'),
                accessorKey: 'impressions',
                cell: (props) => <StatsColumn row={props.row.original} />,
            },
            {
                header: t('columns.placementDates'),
                accessorKey: 'start_date',
                cell: (props) => {
                    const row = props.row.original
                    if (row.start_date || row.end_date) {
                        return (
                            <div className="text-xs">
                                <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                    {row.start_date ? formatDate(row.start_date, businessTz, 'short') : '-'}
                                </div>
                                <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                    {row.end_date ? formatDate(row.end_date, businessTz, 'short') : '-'}
                                </div>
                            </div>
                        )
                    }
                    return <span className="text-sm font-bold text-gray-500 dark:text-gray-400">-</span>
                },
            },
            {
                header: t('columns.createdAt'),
                accessorKey: 'created_at',
                cell: (props) => (
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {props.row.original.created_at 
                            ? formatDate(props.row.original.created_at, businessTz, 'short') 
                            : '-'}
                    </span>
                ),
            },
            {
                header: '',
                id: 'action',
                cell: (props) => (
                    <ActionColumn
                        row={props.row.original}
                        onView={handleView}
                        onEdit={() => router.push(`/business/settings/advertisements/create?edit=${props.row.original.id}`)}
                        onDelete={handleDeleteAd}
                    />
                ),
            },
        ],
        [t, tAds, getStatusLabel, getPlacementLabel, handleView, updateVisibilityMutation]
    )

    if (!queryEnabled) {
        return null
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading loading />
            </div>
        )
    }

    return (
        <>
            <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2 justify-end">
                            <Link href="/business/advertisements/purchase">
                                <Button
                                    variant="solid"
                                    size="sm"
                                    icon={<PiMegaphone />}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {t('buyAds')}
                                </Button>
                            </Link>
                    </div>

                    {advertisements.length === 0 ? (
                        <EmptyStatePanel icon={PiMegaphone} title={t('emptyTitle')} hint={t('emptyHint')}>
                            {error && (
                                <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                                    <p className="text-sm font-bold text-red-600 dark:text-red-400">
                                        {tAds('loadError')}: {error.message}
                                    </p>
                                </div>
                            )}
                            <Link href="/business/advertisements/purchase">
                                <Button variant="solid" icon={<PiMegaphone />}>
                                    {t('buyAds')}
                                </Button>
                            </Link>
                        </EmptyStatePanel>
                    ) : (
                        <>
                            {/* Мобильная версия - карточки */}
                            <div className="block md:hidden space-y-4">
                                {advertisements.map((ad) => {
                                    const imageUrl = ad.image ? normalizeImageUrl(ad.image) : null
                                    const ctr = ad.impressions > 0 
                                        ? ((ad.clicks / ad.impressions) * 100).toFixed(2)
                                        : 0
                                    return (
                                        <div
                                            key={ad.id}
                                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                        >
                                            <div className="p-4 space-y-4">
                                                <div className="flex items-start gap-4">
                                                    {imageUrl ? (
                                                        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 shadow-sm">
                                                            <Image
                                                                src={imageUrl}
                                                                alt={ad.title}
                                                                fill
                                                                className="object-cover"
                                                                onError={(e) => {
                                                                    e.target.src = FALLBACK_IMAGE
                                                                    e.target.onerror = null
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-xs flex-shrink-0 shadow-sm">
                                                            Нет фото
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0 pt-1">
                                                        <div className="flex items-start gap-2 mb-2">
                                                            <div
                                                                className="text-sm font-bold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary transition-colors line-clamp-2 flex-1 min-w-0"
                                                                onClick={() => handleView(ad)}
                                                            >
                                                                {ad.title}
                                                            </div>
                                                            <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 flex-shrink-0">
                                                                Реклама
                                                            </span>
                                                        </div>
                                                        {ad.description && (
                                                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                                                                {ad.description}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 flex-wrap mb-3">
                                                            <Tag className={`${statusColors[ad.status] || statusColors.inactive} text-xs font-bold px-2.5 py-1`}>
                                                                {getStatusLabel(ad.status)}
                                                            </Tag>
                                                            {ad.placement && (
                                                                <Tag className="bg-gray-100 dark:bg-gray-800 text-xs font-bold px-2.5 py-1">
                                                                    {getPlacementLabel(ad.placement)}
                                                                </Tag>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                                            <div>
                                                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Показы</div>
                                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                                                    <PiEye className="text-gray-400" size={14} />
                                                                    {(ad.impressions || 0).toLocaleString()}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Клики</div>
                                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                                                    <PiCursorClick className="text-gray-400" size={14} />
                                                                    {ad.clicks || 0}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">CTR</div>
                                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{ctr}%</div>
                                                            </div>
                                                            {ad.created_at && (
                                                                <div>
                                                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Создано</div>
                                                                    <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                                                        {formatDate(ad.created_at, businessTz, 'short')}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Кнопки действий */}
                                                <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        icon={<PiEye />}
                                                        onClick={() => handleView(ad)}
                                                        className="flex-1 justify-center"
                                                    />
                                                    <Link href={`/business/settings/advertisements/create?edit=${ad.id}`} className="flex-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            icon={<PiPencil />}
                                                            className="w-full justify-center"
                                                        />
                                                    </Link>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        icon={<PiTrash />}
                                                        onClick={() => handleDeleteAd(ad)}
                                                        className="flex-1 justify-center text-red-600 hover:text-red-700 hover:border-red-300 dark:hover:border-red-600"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            {/* Пагинация для мобильной версии */}
                            <div className="block md:hidden flex flex-col gap-3 mt-4">
                                <div className="flex items-center justify-between">
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
                                    <Select
                                        size="sm"
                                        menuPlacement="top"
                                        isSearchable={false}
                                        value={[
                                            { value: 10, label: '10 / page' },
                                            { value: 25, label: '25 / page' },
                                            { value: 50, label: '50 / page' },
                                            { value: 100, label: '100 / page' },
                                        ].find(opt => opt.value === pageSize)}
                                        options={[
                                            { value: 10, label: '10 / page' },
                                            { value: 25, label: '25 / page' },
                                            { value: 50, label: '50 / page' },
                                            { value: 100, label: '100 / page' },
                                        ]}
                                        onChange={(option) => {
                                            onAppendQueryParams({
                                                pageSize: String(option?.value),
                                                pageIndex: '1',
                                            })
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Десктопная версия - таблица */}
                            <div className="hidden md:block">
                                <DataTable
                                    columns={columns}
                                    data={advertisements}
                                    noData={advertisements.length === 0}
                                    emptyTranslationNamespace="business.advertisements.ads"
                                    emptyStateIcon={PiMegaphone}
                                    loading={false}
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
                                />
                            </div>
                        </>
                    )}
            </div>

            {/* Модалка просмотра (как у обычных объявлений) */}
            <Dialog
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false)
                    setSelectedAd(null)
                }}
                width={700}
            >
                {selectedAd && (
                    <div className="flex flex-col h-full max-h-[85vh]">
                        <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tAds('viewModal.title')}</h4>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                            {selectedAd.image && (
                                <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                    <img
                                        src={normalizeImageUrl(selectedAd.image)}
                                        alt={selectedAd.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.src = FALLBACK_IMAGE
                                            e.target.onerror = null
                                        }}
                                    />
                                </div>
                            )}

                            <div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedAd.title}</h4>
                                {selectedAd.description && (
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{selectedAd.description}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                                <Tag className={statusColors[selectedAd.status] || statusColors.inactive}>
                                    {getStatusLabel(selectedAd.status)}
                                </Tag>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${selectedAd.is_active ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                    {selectedAd.is_active ? tAds('viewModal.visible') : tAds('viewModal.hidden')}
                                </span>
                                {selectedAd.category_slug && (
                                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                        {selectedAd.category_slug}
                                    </span>
                                )}
                            </div>

                            {selectedAd.status === 'rejected' && selectedAd.moderation_reason && (
                                <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-800">
                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                                        {tAds('viewModal.rejectionReason')}
                                    </div>
                                    <div className="text-sm text-red-600 dark:text-red-400">
                                        {selectedAd.moderation_reason}
                                    </div>
                                </div>
                            )}

                            {selectedAd.services && selectedAd.services.length > 0 && (
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{tAds('viewModal.services')}</div>
                                    <div className="space-y-2">
                                        {selectedAd.services.map((service, idx) => (
                                            <div key={service.id || idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{service.name}</div>
                                                    {service.description && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{service.description}</div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                                                    {service.duration && (
                                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                            {service.duration} {tAds('viewModal.min')}
                                                        </span>
                                                    )}
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        ${Number(service.price || 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedAd.portfolio && selectedAd.portfolio.length > 0 && (
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{tAds('viewModal.portfolio')}</div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {selectedAd.portfolio.map((item, idx) => (
                                            <div key={item.id || idx} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                <img
                                                    src={normalizeImageUrl(item.image || item.url || item)}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.src = FALLBACK_IMAGE
                                                        e.target.onerror = null
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {selectedAd.city && (
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{tAds('viewModal.city')}</div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedAd.city}</div>
                                        </div>
                                    )}
                                    {selectedAd.state && (
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{tAds('viewModal.state')}</div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedAd.state}</div>
                                        </div>
                                    )}
                                    {selectedAd.placement && (
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{tAds('viewModal.placement')}</div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {getPlacementLabel(selectedAd.placement) || selectedAd.placement}
                                            </div>
                                        </div>
                                    )}
                                    {(selectedAd.price_from || selectedAd.price_to) && (
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{tAds('viewModal.priceFrom')}</div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {selectedAd.price_from && `$${selectedAd.price_from}`}
                                                {selectedAd.price_from && selectedAd.price_to && ' — '}
                                                {selectedAd.price_to && `$${selectedAd.price_to}`}
                                            </div>
                                        </div>
                                    )}
                                    {selectedAd.start_date && (
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{t('viewModal.startDate')}</div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {formatDate(selectedAd.start_date, businessTz, 'short')}
                                            </div>
                                        </div>
                                    )}
                                    {selectedAd.end_date && (
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{t('viewModal.endDate')}</div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {formatDate(selectedAd.end_date, businessTz, 'short')}
                                            </div>
                                        </div>
                                    )}
                                    {(selectedAd.impressions > 0 || selectedAd.clicks > 0) && (
                                        <>
                                            <div>
                                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{tAds('viewModal.impressions')}</div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedAd.impressions || 0}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{tAds('viewModal.clicks')}</div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedAd.clicks || 0}</div>
                                            </div>
                                        </>
                                    )}
                                    {selectedAd.impressions > 0 && (
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{t('viewModal.ctr')}</div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {((selectedAd.clicks / selectedAd.impressions) * 100).toFixed(2)}%
                                            </div>
                                        </div>
                                    )}
                                    {selectedAd.created_at && (
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{tAds('viewModal.createdAt')}</div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {formatDate(selectedAd.created_at, businessTz, 'short')}
                                            </div>
                                        </div>
                                    )}
                                    {selectedAd.updated_at && (
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{tAds('viewModal.updatedAt')}</div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {formatDate(selectedAd.updated_at, businessTz, 'short')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedAd.link && (
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">{tAds('viewModal.link')}</div>
                                    <Link
                                        href={`/marketplace/${selectedAd.link}`}
                                        target="_blank"
                                        className="text-sm font-bold text-primary hover:underline break-all"
                                    >
                                        /marketplace/{selectedAd.link}
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end gap-2">
                            {selectedAd.link && (
                                <Link href={`/marketplace/${selectedAd.link}`} target="_blank">
                                    <Button variant="outline" size="sm" icon={<PiArrowRight />}>
                                        {tAds('viewModal.link')}
                                    </Button>
                                </Link>
                            )}
                            <Link href={`/business/settings/advertisements/create?edit=${selectedAd.id}`}>
                                <Button variant="solid" size="sm" icon={<PiPencil />}>
                                    {tAds('viewModal.editAd')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Диалог подтверждения удаления */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                type="danger"
                title="Удалить объявление?"
                confirmText="Удалить"
                onConfirm={confirmDeleteAd}
                onCancel={() => {
                    setIsDeleteDialogOpen(false)
                    setAdToDelete(null)
                }}
            >
                <p>
                    Вы уверены, что хотите удалить объявление &quot;{adToDelete?.title}&quot;?
                    Это действие нельзя отменить.
                </p>
            </ConfirmDialog>
        </>
    )
}


'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import DataTable from '@/components/shared/DataTable'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Badge from '@/components/ui/Badge'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBusinessAdvertisements, deleteBusinessAdvertisement, getBusinessAdvertisement } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { PiPlus, PiPencil, PiTrash, PiMegaphone, PiEye, PiCursorClick } from 'react-icons/pi'
import Link from 'next/link'
import { normalizeImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils'

const statusLabels = {
    pending: 'На модерации',
    approved: 'Одобрено',
    rejected: 'Отклонено',
    active: 'Активно',
    inactive: 'Неактивно',
}

const statusColors = {
    pending: 'bg-yellow-200 dark:bg-yellow-200 text-gray-900 dark:text-gray-900',
    approved: 'bg-emerald-200 dark:bg-emerald-200 text-gray-900 dark:text-gray-900',
    rejected: 'bg-red-200 dark:bg-red-200 text-gray-900 dark:text-gray-900',
    active: 'bg-blue-200 dark:bg-blue-200 text-gray-900 dark:text-gray-900',
    inactive: 'bg-gray-200 dark:bg-gray-200 text-gray-900 dark:text-gray-900',
}

const placementLabels = {
    homepage: 'Главная',
    services: 'Услуги',
    sidebar: 'Боковая панель',
    banner: 'Баннер',
}

const ImageColumn = ({ row }) => {
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
                        Нет фото
                    </div>
                )}
            </div>
        </div>
    )
}

const TitleColumn = ({ row }) => {
    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {row.title}
                </div>
                <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    Реклама
                </span>
            </div>
            {row.description && (
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">
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
                <span>{(row.impressions || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
                <PiCursorClick className="text-gray-400" size={14} />
                <span>{row.clicks || 0}</span>
            </div>
            <div className="text-xs text-gray-500">
                CTR: {ctr}%
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

export default function AdvertisementsAdsPage() {
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

    const { data: advertisementsData, isLoading, error } = useQuery({
        queryKey: ['business-advertisements-ads', pageIndex, pageSize],
        queryFn: () => getBusinessAdvertisements({
            page: pageIndex,
            pageSize,
        }),
    })
    
    const advertisements = advertisementsData?.data?.filter(ad => ad.type === 'advertisement') || []
    const total = advertisementsData?.total || 0

    const deleteAdMutation = useMutation({
        mutationFn: deleteBusinessAdvertisement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-advertisements-ads'] })
            setIsDeleteDialogOpen(false)
            setAdToDelete(null)
            toast.push(
                <Notification title="Успешно" type="success">
                    Объявление успешно удалено
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось удалить объявление
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
                <Notification title="Ошибка" type="danger">
                    Не удалось загрузить объявление
                </Notification>,
            )
        }
    }

    const columns = useMemo(
        () => [
            {
                header: 'Фото',
                accessorKey: 'image',
                cell: (props) => <ImageColumn row={props.row.original} />,
            },
            {
                header: 'Название',
                accessorKey: 'title',
                cell: (props) => (
                    <div 
                        className="cursor-pointer hover:text-primary"
                        onClick={() => handleView(props.row.original)}
                    >
                        <TitleColumn row={props.row.original} />
                    </div>
                ),
            },
            {
                header: 'Размещение',
                accessorKey: 'placement',
                cell: (props) => (
                    <Tag className="bg-gray-100 dark:bg-gray-800">
                        {placementLabels[props.row.original.placement] || props.row.original.placement}
                    </Tag>
                ),
            },
            {
                header: 'Статус',
                accessorKey: 'status',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <Tag className={statusColors[row.status] || statusColors.inactive}>
                            {statusLabels[row.status] || row.status}
                        </Tag>
                    )
                },
            },
            {
                header: 'Статистика',
                accessorKey: 'impressions',
                cell: (props) => <StatsColumn row={props.row.original} />,
            },
            {
                header: 'Даты размещения',
                accessorKey: 'start_date',
                cell: (props) => {
                    const row = props.row.original
                    if (row.start_date || row.end_date) {
                        return (
                            <div className="text-xs">
                                <div className="text-gray-700 dark:text-gray-300">
                                    {row.start_date ? new Date(row.start_date).toLocaleDateString('ru-RU') : '-'}
                                </div>
                                <div className="text-gray-500 dark:text-gray-400">
                                    {row.end_date ? new Date(row.end_date).toLocaleDateString('ru-RU') : '-'}
                                </div>
                            </div>
                        )
                    }
                    return <span className="text-sm text-gray-400">-</span>
                },
            },
            {
                header: 'Дата создания',
                accessorKey: 'created_at',
                cell: (props) => (
                    <span className="text-sm text-gray-500">
                        {props.row.original.created_at 
                            ? new Date(props.row.original.created_at).toLocaleDateString('ru-RU') 
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
        []
    )

    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                            <h3>Мои рекламные объявления</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Управление рекламными объявлениями с полной статистикой и настройками
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Link href="/business/advertisements/purchase">
                                <Button
                                    variant="solid"
                                    size="sm"
                                    icon={<PiMegaphone />}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    Купить рекламу
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {advertisements.length === 0 ? (
                        <div className="text-center py-12">
                            <PiMegaphone className="text-5xl mx-auto mb-4 text-gray-400" />
                            <h4 className="text-lg font-semibold mb-2">Нет рекламных объявлений</h4>
                            <p className="text-sm text-gray-500 mb-4">
                                Купите рекламу для продвижения вашего бизнеса
                            </p>
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        Ошибка загрузки: {error.message}
                                    </p>
                                </div>
                            )}
                            <Link href="/business/advertisements/purchase">
                                <Button
                                    variant="solid"
                                    icon={<PiMegaphone />}
                                >
                                    Купить рекламу
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={advertisements}
                            noData={advertisements.length === 0}
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
                    )}
                </div>
            </AdaptiveCard>

            {/* Модалка просмотра */}
            <Dialog 
                isOpen={isViewModalOpen} 
                onClose={() => {
                    setIsViewModalOpen(false)
                    setSelectedAd(null)
                }}
                width={800}
            >
                {selectedAd && (
                    <div className="flex flex-col h-full max-h-[85vh]">
                        <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <h4 className="text-lg">Просмотр рекламного объявления</h4>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                            <div className="space-y-4">
                                {selectedAd.image && (
                                    <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                        <Image
                                            src={normalizeImageUrl(selectedAd.image)}
                                            alt={selectedAd.title}
                                            onError={(e) => {
                                                e.target.src = FALLBACK_IMAGE
                                                e.target.onerror = null
                                            }}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">{selectedAd.title}</h3>
                                    {selectedAd.description && (
                                        <p className="text-gray-600 dark:text-gray-300 mb-4">{selectedAd.description}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">Размещение</div>
                                        <div className="font-semibold">{placementLabels[selectedAd.placement] || selectedAd.placement}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">Статус</div>
                                        <Tag className={statusColors[selectedAd.status] || statusColors.inactive}>
                                            {statusLabels[selectedAd.status] || selectedAd.status}
                                        </Tag>
                                    </div>
                                    {selectedAd.city && (
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Город</div>
                                            <div className="font-semibold">{selectedAd.city}</div>
                                        </div>
                                    )}
                                    {selectedAd.state && (
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Штат</div>
                                            <div className="font-semibold">{selectedAd.state}</div>
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">Показы</div>
                                        <div className="font-semibold">{(selectedAd.impressions || 0).toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">Клики</div>
                                        <div className="font-semibold">{selectedAd.clicks || 0}</div>
                                    </div>
                                    {selectedAd.impressions > 0 && (
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">CTR</div>
                                            <div className="font-semibold">
                                                {((selectedAd.clicks / selectedAd.impressions) * 100).toFixed(2)}%
                                            </div>
                                        </div>
                                    )}
                                    {selectedAd.start_date && (
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Дата начала</div>
                                            <div className="font-semibold text-sm">
                                                {new Date(selectedAd.start_date).toLocaleDateString('ru-RU')}
                                            </div>
                                        </div>
                                    )}
                                    {selectedAd.end_date && (
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">Дата окончания</div>
                                            <div className="font-semibold text-sm">
                                                {new Date(selectedAd.end_date).toLocaleDateString('ru-RU')}
                                            </div>
                                        </div>
                                    )}
                                    {selectedAd.link && (
                                        <div className="col-span-2">
                                            <div className="text-xs text-gray-500 mb-1">Ссылка</div>
                                            <div className="font-semibold text-sm break-all">{selectedAd.link}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
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
        </Container>
    )
}


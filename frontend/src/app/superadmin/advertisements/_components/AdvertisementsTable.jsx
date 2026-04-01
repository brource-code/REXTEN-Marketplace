'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import DataTable from '@/components/shared/DataTable'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Card from '@/components/ui/Card'
import Dropdown from '@/components/ui/Dropdown'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { PiEye, PiCursorClick, PiGear, PiCheck, PiX, PiTrash, PiPencil, PiPlus, PiDotsThreeVertical, PiArrowRight, PiChartLine } from 'react-icons/pi'
import Link from 'next/link'
import { TbX } from 'react-icons/tb'
import { normalizeImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils'
import { FormItem } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { approveAdvertisement, rejectAdvertisement, updateAdvertisementPlacement, deleteAdvertisement, toggleAdvertisementActive } from '@/lib/api/superadmin'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import AdvertisementStatsModal from './AdvertisementStatsModal'
import { formatDate, formatSuperadminDateTime } from '@/utils/dateTime'
import { SUPERADMIN_DISPLAY_TIMEZONE } from '@/constants/superadmin-datetime.constant'

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

const TitleColumn = ({ row, simplified = false }) => {
    const isAdvertisement = row.type === 'advertisement'
    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {row.title}
                </div>
                {isAdvertisement && (
                    simplified ? (
                        <Link href="/superadmin/advertisements/ads">
                            <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                                Реклама
                                <PiArrowRight className="inline ml-1" size={12} />
                            </span>
                        </Link>
                    ) : (
                        <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            Реклама
                        </span>
                    )
                )}
            </div>
            {row.description && (
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {row.description}
                </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
                {row.company?.name || row.business || 'Без компании'}
            </div>
        </div>
    )
}

const StatsColumn = ({ row }) => {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-sm">
                <PiEye className="text-gray-400" size={14} />
                <span>{(row.impressions || 0).toLocaleString('en-US')}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
                <PiCursorClick className="text-gray-400" size={14} />
                <span>{row.clicks || 0}</span>
            </div>
            <div className="text-xs text-gray-500">
                CTR: {row.ctr ? `${row.ctr}%` : '0%'}
            </div>
        </div>
    )
}

const ActionColumn = ({ row, onApprove, onReject, onEdit, onDelete, onPlacement, onToggleActive, onStats, approveLoading, rejectLoading, type = 'advertisement' }) => {
    const isRegular = type === 'regular' || row.type === 'regular'
    
    return (
        <Dropdown
            renderTitle={
                <div className="text-xl cursor-pointer select-none font-semibold hover:text-primary">
                    <PiDotsThreeVertical />
                </div>
            }
            placement="bottom-end"
        >
            {row.status === 'pending' && (
                <>
                    <Dropdown.Item 
                        eventKey="approve" 
                        onClick={() => onApprove(row.id)}
                        disabled={approveLoading}
                    >
                        <span className="flex items-center gap-2 text-emerald-600">
                            <PiCheck className="text-lg" />
                            <span>Одобрить</span>
                            {approveLoading && <span className="text-xs">...</span>}
                        </span>
                    </Dropdown.Item>
                    <Dropdown.Item 
                        eventKey="reject" 
                        onClick={() => onReject(row.id)}
                        disabled={rejectLoading}
                    >
                        <span className="flex items-center gap-2 text-red-600">
                            <PiX className="text-lg" />
                            <span>Отклонить</span>
                            {rejectLoading && <span className="text-xs">...</span>}
                        </span>
                    </Dropdown.Item>
                    <Dropdown.Item variant="divider" />
                </>
            )}
            {!isRegular && (
                <Dropdown.Item eventKey="stats" onClick={() => onStats(row)}>
                    <span className="flex items-center gap-2 text-blue-600">
                        <PiChartLine className="text-lg" />
                        <span>Статистика</span>
                    </span>
                </Dropdown.Item>
            )}
            <Dropdown.Item eventKey="edit" onClick={() => onEdit(row)}>
                <span className="flex items-center gap-2">
                    <PiPencil className="text-lg" />
                    <span>Редактировать</span>
                </span>
            </Dropdown.Item>
            {!isRegular && (
                <>
                    <Dropdown.Item eventKey="placement" onClick={() => onPlacement(row)}>
                        <span className="flex items-center gap-2">
                            <PiGear className="text-lg" />
                            <span>Настроить размещение</span>
                        </span>
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="toggleActive" onClick={() => onToggleActive(row)}>
                        <span className="flex items-center gap-2">
                            {row.is_active ? (
                                <>
                                    <PiX className="text-lg" />
                                    <span>Заблокировать показ</span>
                                </>
                            ) : (
                                <>
                                    <PiCheck className="text-lg" />
                                    <span>Разблокировать показ</span>
                                </>
                            )}
                        </span>
                    </Dropdown.Item>
                </>
            )}
            <Dropdown.Item variant="divider" />
            <Dropdown.Item eventKey="delete" onClick={() => onDelete(row)}>
                <span className="flex items-center gap-2 text-red-600">
                    <PiTrash className="text-lg" />
                    <span>Удалить</span>
                </span>
            </Dropdown.Item>
        </Dropdown>
    )
}

const AdvertisementsTable = ({ 
    advertisements = [], 
    type = 'advertisement',
    pageIndex = 1,
    pageSize = 10,
    total = 0,
    simplified = false, // Упрощенный режим - без статистики и управления
}) => {
    const queryClient = useQueryClient()
    const router = useRouter()
    const { onAppendQueryParams } = useAppendQueryParams()
    const [selectedAd, setSelectedAd] = useState(null)
    const [isPlacementModalOpen, setIsPlacementModalOpen] = useState(false)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [adToDelete, setAdToDelete] = useState(null)
    const [statusFilter, setStatusFilter] = useState('all')
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
    const [statsAdId, setStatsAdId] = useState(null)

    const approveMutation = useMutation({
        mutationFn: approveAdvertisement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['advertisements'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Объявление одобрено
                </Notification>
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось одобрить объявление
                </Notification>
            )
        },
    })

    const rejectMutation = useMutation({
        mutationFn: rejectAdvertisement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['advertisements'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Объявление отклонено
                </Notification>
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось отклонить объявление
                </Notification>
            )
        },
    })

    const handleApprove = (adId) => {
        approveMutation.mutate(adId)
    }

    const handleReject = (adId) => {
        rejectMutation.mutate(adId)
    }

    const handleEdit = (ad) => {
        router.push(`/superadmin/advertisements/create?edit=${ad.id}`)
    }

    const deleteMutation = useMutation({
        mutationFn: deleteAdvertisement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['advertisements'] })
            setIsDeleteDialogOpen(false)
            setAdToDelete(null)
            toast.push(
                <Notification title="Успешно" type="success">
                    Объявление удалено
                </Notification>
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось удалить объявление
                </Notification>
            )
        },
    })

    const handleDelete = (ad) => {
        setAdToDelete(ad)
        setIsDeleteDialogOpen(true)
    }

    const confirmDelete = () => {
        if (adToDelete) {
            deleteMutation.mutate(adToDelete.id)
        }
    }

    const handlePlacement = (ad) => {
        setSelectedAd(ad)
        setIsPlacementModalOpen(true)
    }

    const toggleActiveMutation = useMutation({
        mutationFn: ({ adId, isActive }) => toggleAdvertisementActive(adId, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['advertisements'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Статус показа обновлен
                </Notification>
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось изменить статус показа
                </Notification>
            )
        },
    })

    const handleToggleActive = (ad) => {
        toggleActiveMutation.mutate({ adId: ad.id, isActive: !ad.is_active })
    }

    const handleView = (ad) => {
        setSelectedAd(ad)
        setIsViewModalOpen(true)
    }

    const handleStats = (ad) => {
        setStatsAdId(ad.id)
        setIsStatsModalOpen(true)
    }

    const filteredAds = statusFilter === 'all' 
        ? advertisements 
        : advertisements.filter(ad => ad.status === statusFilter)

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
                        className={simplified ? '' : 'cursor-pointer hover:text-primary'}
                        onClick={() => !simplified && handleView(props.row.original)}
                    >
                        <TitleColumn row={props.row.original} simplified={simplified} />
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
                        <div className="flex flex-col gap-1 items-start">
                            <Tag className={statusColors[row.status] || statusColors.inactive}>
                                {statusLabels[row.status] || row.status}
                            </Tag>
                            {row.status === 'rejected' && row.moderation_reason && (
                                <Tooltip title={row.moderation_reason}>
                                    <span className="text-xs text-red-600 dark:text-red-400 max-w-[150px] truncate cursor-help">
                                        {row.moderation_reason}
                                    </span>
                                </Tooltip>
                            )}
                        </div>
                    )
                },
            },
            ...(simplified ? [] : [
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
                        if (row.type === 'advertisement' && (row.start_date || row.end_date)) {
                            return (
                                <div className="text-xs">
                                    <div className="text-gray-700 dark:text-gray-300">
                                        {row.start_date ? formatDate(row.start_date, SUPERADMIN_DISPLAY_TIMEZONE, 'numeric') : '-'}
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400">
                                        {row.end_date ? formatDate(row.end_date, SUPERADMIN_DISPLAY_TIMEZONE, 'numeric') : '-'}
                                    </div>
                                </div>
                            )
                        }
                        return <span className="text-sm text-gray-400">-</span>
                    },
                },
                {
                    header: '',
                    id: 'action',
                    cell: (props) => (
                        <ActionColumn
                            row={props.row.original}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onPlacement={handlePlacement}
                            onToggleActive={handleToggleActive}
                            onStats={handleStats}
                            approveLoading={approveMutation.isPending}
                            rejectLoading={rejectMutation.isPending}
                            type={type}
                        />
                    ),
                },
            ]),
        ],
        [approveMutation.isPending, rejectMutation.isPending, simplified, type]
    )

    // Мобильная версия - карточки
    const MobileCard = ({ ad }) => {
        const isRegular = type === 'regular' || ad.type === 'regular'
        return (
        <Card className="mb-4">
            <div className="flex gap-4">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                    {ad.image ? (
                        <Image
                            src={normalizeImageUrl(ad.image)}
                            alt={ad.title}
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
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                                    {ad.title}
                                </h4>
                                {ad.type === 'advertisement' && (
                                    <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 flex-shrink-0">
                                        Реклама
                                    </span>
                                )}
                            </div>
                            {ad.type === 'advertisement' && (ad.start_date || ad.end_date) && (
                                <div className="text-xs text-gray-500 mb-1">
                                    {ad.start_date ? formatDate(ad.start_date, SUPERADMIN_DISPLAY_TIMEZONE, 'numeric') : '-'} - {ad.end_date ? formatDate(ad.end_date, SUPERADMIN_DISPLAY_TIMEZONE, 'numeric') : '-'}
                                </div>
                            )}
                        </div>
                        <Tag className={statusColors[ad.status] || statusColors.inactive}>
                            {statusLabels[ad.status] || ad.status}
                        </Tag>
                    </div>
                    {ad.status === 'rejected' && ad.moderation_reason && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 mb-2">
                            {ad.moderation_reason}
                        </p>
                    )}
                    {ad.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                            {ad.description}
                        </p>
                    )}
                    <div className="text-xs text-gray-400 mb-2">
                        {ad.company?.name || ad.business || 'Без компании'}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                            <PiEye size={14} />
                            <span>{(ad.impressions || 0).toLocaleString('en-US')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <PiCursorClick size={14} />
                            <span>{ad.clicks || 0}</span>
                        </div>
                        <span>CTR: {ad.ctr ? `${ad.ctr}%` : '0%'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {ad.status === 'pending' && (
                            <>
                                <Button
                                    variant="solid"
                                    size="sm"
                                    icon={<PiCheck />}
                                    onClick={() => handleApprove(ad.id)}
                                    loading={approveMutation.isPending}
                                    className="flex-1"
                                >
                                    Одобрить
                                </Button>
                                <Button
                                    variant="default"
                                    size="sm"
                                    icon={<PiX />}
                                    onClick={() => handleReject(ad.id)}
                                    loading={rejectMutation.isPending}
                                    className="flex-1"
                                >
                                    Отклонить
                                </Button>
                            </>
                        )}
                        {!isRegular && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon={<PiChartLine />}
                                    onClick={() => handleStats(ad)}
                                    className="flex-1"
                                >
                                    Статистика
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon={<PiGear />}
                                    onClick={() => handlePlacement(ad)}
                                    className="flex-1"
                                >
                                    Размещение
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon={ad.is_active ? <PiX /> : <PiCheck />}
                                    onClick={() => handleToggleActive(ad)}
                                    loading={toggleActiveMutation.isPending}
                                    className="flex-1"
                                >
                                    {ad.is_active ? 'Заблокировать' : 'Разблокировать'}
                                </Button>
                            </>
                        )}
                        <Button
                            variant="plain"
                            size="sm"
                            icon={<PiPencil />}
                            onClick={() => handleEdit(ad)}
                        />
                        <Button
                            variant="plain"
                            size="sm"
                            icon={<PiTrash />}
                            onClick={() => handleDelete(ad)}
                            className="text-red-600"
                        />
                    </div>
                </div>
            </div>
        </Card>
        )
    }

    return (
        <>
            {/* Кнопка создания и фильтр */}
            <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="flex-1 max-w-xs">
                    <Select
                        options={[
                            { value: 'all', label: 'Все статусы' },
                            { value: 'pending', label: 'На модерации' },
                            { value: 'approved', label: 'Одобрено' },
                            { value: 'rejected', label: 'Отклонено' },
                            { value: 'active', label: 'Активно' },
                            { value: 'inactive', label: 'Неактивно' },
                        ]}
                        value={{ value: statusFilter, label: statusFilter === 'all' ? 'Все статусы' : (statusLabels[statusFilter] || statusFilter) }}
                        onChange={(option) => setStatusFilter(option.value)}
                    />
                </div>
            </div>
            
            {/* Мобильная версия - карточки */}
            <div className="md:hidden space-y-4">
                {filteredAds.length > 0 ? (
                    filteredAds.map((ad) => (
                        <MobileCard key={ad.id} ad={ad} />
                    ))
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500">
                            {statusFilter === 'all' 
                                ? 'Нет объявлений' 
                                : `Нет объявлений со статусом "${statusLabels[statusFilter] || statusFilter}"`}
                        </p>
                    </div>
                )}
            </div>

            {/* Десктопная версия - таблица */}
            <div className="hidden md:block">
                <DataTable
                    columns={columns}
                    data={filteredAds}
                    noData={filteredAds.length === 0}
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
            
            {/* Модалка просмотра */}
            <Dialog isOpen={isViewModalOpen} onClose={() => {
                setIsViewModalOpen(false)
                setSelectedAd(null)
            }} width={800}>
                {selectedAd && (
                    <div className="flex flex-col h-full max-h-[85vh]">
                        {/* Заголовок - зафиксирован сверху */}
                        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Просмотр объявления</h4>
                            <Button
                                variant="plain"
                                size="sm"
                                icon={<TbX />}
                                onClick={() => {
                                    setIsViewModalOpen(false)
                                    setSelectedAd(null)
                                }}
                            />
                        </div>
                        
                        {/* Скроллируемый контент */}
                        <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                        <div className="space-y-4">
                            {selectedAd.image && (
                                <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                    <Image
                                        src={normalizeImageUrl(selectedAd.image)}
                                        alt={selectedAd.title}
                                        fill
                                        className="object-cover"
                                        onError={(e) => {
                                            e.target.src = FALLBACK_IMAGE
                                            e.target.onerror = null
                                        }}
                                    />
                                </div>
                            )}
                            <div>
                                <h3 className="text-xl font-semibold mb-2">{selectedAd.title}</h3>
                                {selectedAd.description && (
                                    <p className="text-gray-600 dark:text-gray-300 mb-4">{selectedAd.description}</p>
                                )}
                            </div>
                            
                            {/* Причина отклонения */}
                            {selectedAd.status === 'rejected' && selectedAd.moderation_reason && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                    <div className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                                        Причина отклонения:
                                    </div>
                                    <div className="text-sm text-red-600 dark:text-red-400">
                                        {selectedAd.moderation_reason}
                                    </div>
                                    {selectedAd.moderated_at && (
                                        <div className="text-xs text-red-500 dark:text-red-400 mt-2">
                                            Проверено: {formatSuperadminDateTime(selectedAd.moderated_at)}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Компания</div>
                                    <div className="font-semibold">{selectedAd.company?.name || selectedAd.business || 'Без компании'}</div>
                                </div>
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
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Приоритет</div>
                                    <div className="font-semibold">{selectedAd.priority || 0}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Показы</div>
                                    <div className="font-semibold">{(selectedAd.impressions || 0).toLocaleString('en-US')}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Клики</div>
                                    <div className="font-semibold">{selectedAd.clicks || 0}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">CTR</div>
                                    <div className="font-semibold">{selectedAd.ctr ? `${selectedAd.ctr}%` : '0%'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Ссылка</div>
                                    <div className="font-semibold text-sm break-all">{selectedAd.link || '-'}</div>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Модалка размещения */}
            {selectedAd && (
                <PlacementModal
                    isOpen={isPlacementModalOpen}
                    onClose={() => {
                        setIsPlacementModalOpen(false)
                        setSelectedAd(null)
                    }}
                    advertisement={selectedAd}
                />
            )}

            {/* Диалог подтверждения удаления */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                type="danger"
                title="Удалить объявление?"
                confirmText="Удалить"
                onConfirm={confirmDelete}
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

            {/* Модалка статистики */}
            <AdvertisementStatsModal
                isOpen={isStatsModalOpen}
                onClose={() => {
                    setIsStatsModalOpen(false)
                    setStatsAdId(null)
                }}
                advertisementId={statsAdId}
            />

        </>
    )
}

// PlacementModal компонент
const PlacementModal = ({ isOpen, onClose, advertisement }) => {
    const [placement, setPlacement] = useState({
        priority: advertisement?.priority || 1,
    })

    if (!advertisement) return null

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={500}>
            <div className="flex flex-col h-full max-h-[85vh]">
                {/* Заголовок - зафиксирован сверху */}
                <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Настройка размещения</h4>
                    <Button
                        variant="plain"
                        size="sm"
                        icon={<TbX />}
                        onClick={onClose}
                    />
                </div>
                
                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <div className="space-y-4">
                        <FormItem label="Приоритет">
                            <Input
                                type="number"
                                min="1"
                                max="10"
                                value={placement.priority}
                                onChange={(e) => setPlacement({ ...placement, priority: parseInt(e.target.value) || 1 })}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Чем выше приоритет, тем выше позиция (1-10)
                            </p>
                        </FormItem>
                    </div>
                </div>

                {/* Кнопки - зафиксированы снизу */}
                <div className="flex-shrink-0 px-6 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <Button variant="plain" onClick={onClose}>Отмена</Button>
                    <Button variant="solid" onClick={onClose}>Сохранить</Button>
                </div>
            </div>
        </Dialog>
    )
}

export default AdvertisementsTable


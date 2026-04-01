'use client'
import { useState } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { FormItem } from '@/components/ui/Form'
import { PiEye, PiCursorClick, PiGear, PiCheck, PiX } from 'react-icons/pi'
import { TbX } from 'react-icons/tb'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { approveAdvertisement, rejectAdvertisement, updateAdvertisementPlacement } from '@/lib/api/superadmin'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

const PlacementModal = ({ isOpen, onClose, advertisement }) => {
    const [placement, setPlacement] = useState({
        position: 'top',
        page: 'services',
        priority: 1,
        startDate: '',
        endDate: '',
    })

    const positionOptions = [
        { value: 'top', label: 'Вверху страницы' },
        { value: 'sidebar', label: 'Боковая панель' },
        { value: 'bottom', label: 'Внизу страницы' },
        { value: 'inline', label: 'Внутри контента' },
    ]

    const pageOptions = [
        { value: 'services', label: 'Каталог услуг' },
        { value: 'marketplace', label: 'Профиль бизнеса' },
        { value: 'landing', label: 'Главная страница' },
    ]

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
                        <FormItem label="Позиция">
                            <Select
                                options={positionOptions}
                                value={positionOptions.find((opt) => opt.value === placement.position)}
                                onChange={(option) =>
                                    setPlacement((prev) => ({
                                        ...prev,
                                        position: option.value,
                                    }))
                                }
                            />
                        </FormItem>
                        <FormItem label="Страница">
                            <Select
                                options={pageOptions}
                                value={pageOptions.find((opt) => opt.value === placement.page)}
                                onChange={(option) =>
                                    setPlacement((prev) => ({
                                        ...prev,
                                        page: option.value,
                                    }))
                                }
                            />
                        </FormItem>
                        <FormItem label="Приоритет">
                            <Input
                                type="number"
                                min="1"
                                max="10"
                                value={placement.priority}
                                onChange={(e) =>
                                    setPlacement((prev) => ({
                                        ...prev,
                                        priority: parseInt(e.target.value) || 1,
                                    }))
                                }
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Чем выше приоритет, тем выше позиция (1-10)
                            </p>
                        </FormItem>
                        <div className="grid grid-cols-2 gap-4">
                            <FormItem label="Дата начала">
                                <DatePicker
                                    size="sm"
                                    type="date"
                                    inputtable={false}
                                    placeholder="Дата начала"
                                    value={
                                        placement.startDate
                                            ? dayjs(placement.startDate, 'YYYY-MM-DD').toDate()
                                            : null
                                    }
                                    onChange={(d) =>
                                        setPlacement((prev) => ({
                                            ...prev,
                                            startDate: d
                                                ? dayjs(d).format('YYYY-MM-DD')
                                                : '',
                                        }))
                                    }
                                />
                            </FormItem>
                            <FormItem label="Дата окончания">
                                <DatePicker
                                    size="sm"
                                    type="date"
                                    inputtable={false}
                                    placeholder="Дата окончания"
                                    minDate={
                                        placement.startDate
                                            ? dayjs(placement.startDate, 'YYYY-MM-DD').toDate()
                                            : undefined
                                    }
                                    value={
                                        placement.endDate
                                            ? dayjs(placement.endDate, 'YYYY-MM-DD').toDate()
                                            : null
                                    }
                                    onChange={(d) =>
                                        setPlacement((prev) => ({
                                            ...prev,
                                            endDate: d
                                                ? dayjs(d).format('YYYY-MM-DD')
                                                : '',
                                        }))
                                    }
                                />
                            </FormItem>
                        </div>
                    </div>
                </div>

                {/* Кнопки - зафиксированы снизу */}
                <div className="flex-shrink-0 px-6 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <Button variant="plain" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button
                        variant="solid"
                        onClick={() => {
                            // TODO: Сохранить настройки размещения
                            console.log('Save placement:', placement)
                            onClose()
                        }}
                    >
                        Сохранить
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

const AdvertisementsList = ({ advertisements = [] }) => {
    const queryClient = useQueryClient()
    const [selectedAd, setSelectedAd] = useState(null)
    const [isPlacementModalOpen, setIsPlacementModalOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState('all')

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

    const typeLabels = {
        featured: 'Спонсированное',
        banner: 'Баннер',
        promo: 'Промо-блок',
    }

    const statusLabels = {
        pending: 'На модерации',
        approved: 'Одобрено',
        rejected: 'Отклонено',
        active: 'Активно',
        inactive: 'Неактивно',
    }

    const statusColors = {
        pending: 'bg-yellow-500',
        approved: 'bg-emerald-500',
        rejected: 'bg-red-500',
        active: 'bg-blue-500',
        inactive: 'bg-gray-500',
    }

    const handlePlacement = (ad) => {
        setSelectedAd(ad)
        setIsPlacementModalOpen(true)
    }

    const handleApprove = (adId) => {
        approveMutation.mutate(adId)
    }

    const handleReject = (adId) => {
        rejectMutation.mutate(adId)
    }

    const filteredAds = statusFilter === 'all' 
        ? advertisements 
        : advertisements.filter(ad => ad.status === statusFilter)

    return (
        <>
            {/* Фильтр по статусу */}
            <div className="mb-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAds.map((ad) => (
                    <Card key={ad.id}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <h4 className="mb-1">{ad.title}</h4>
                                <p className="text-sm text-gray-500">{ad.company?.name || ad.business || 'Без компании'}</p>
                                {ad.description && (
                                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{ad.description}</p>
                                )}
                            </div>
                            <Badge className={statusColors[ad.status] || 'bg-gray-500'}>
                                {statusLabels[ad.status] || ad.status}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 mb-4">
                            <div>
                                <div className="text-xs text-gray-500 mb-1">Показы</div>
                                <div className="flex items-center gap-1">
                                    <PiEye className="text-gray-400" />
                                    <span className="font-semibold">
                                        {(ad.impressions || 0).toLocaleString('en-US')}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 mb-1">Клики</div>
                                <div className="flex items-center gap-1">
                                    <PiCursorClick className="text-gray-400" />
                                    <span className="font-semibold">{ad.clicks || 0}</span>
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 mb-1">CTR</div>
                                <div className="font-semibold">{ad.ctr ? `${ad.ctr}%` : '0%'}</div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {ad.status === 'pending' && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="solid"
                                        size="sm"
                                        icon={<PiCheck />}
                                        className="flex-1"
                                        onClick={() => handleApprove(ad.id)}
                                        loading={approveMutation.isPending}
                                    >
                                        Одобрить
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        icon={<PiX />}
                                        className="flex-1"
                                        onClick={() => handleReject(ad.id)}
                                        loading={rejectMutation.isPending}
                                    >
                                        Отклонить
                                    </Button>
                                </div>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                icon={<PiGear />}
                                className="w-full"
                                onClick={() => handlePlacement(ad)}
                            >
                                Настроить размещение
                            </Button>
                        </div>
                    </Card>
                ))}
                {filteredAds.length === 0 && (
                    <div className="col-span-2 text-center py-12">
                        <p className="text-gray-500">
                            {statusFilter === 'all' 
                                ? 'Нет объявлений' 
                                : `Нет объявлений со статусом "${statusLabels[statusFilter] || statusFilter}"`}
                        </p>
                    </div>
                )}
            </div>
            <PlacementModal
                isOpen={isPlacementModalOpen}
                onClose={() => {
                    setIsPlacementModalOpen(false)
                    setSelectedAd(null)
                }}
                advertisement={selectedAd}
            />
        </>
    )
}

export default AdvertisementsList


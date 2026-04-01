'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Switcher from '@/components/ui/Switcher'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Tag from '@/components/ui/Tag'
import Table from '@/components/ui/Table'
import { PiEye, PiEyeSlash, PiSparkle, PiInfo, PiPlus, PiPencil, PiTrash } from 'react-icons/pi'
import Tooltip from '@/components/ui/Tooltip'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    getMarketplaceSettings, 
    updateMarketplaceSettings,
    getBusinessAdvertisements,
    deleteBusinessAdvertisement
} from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Link from 'next/link'
import { normalizeImageUrl } from '@/utils/imageUtils'

const { Tr, Td, TBody, THead, Th } = Table

const MarketplaceTab = () => {
    const queryClient = useQueryClient()
    const router = useRouter()
    const [formData, setFormData] = useState({
        visible: true,
        featured: false,
        showInSearch: true,
        showInFeatured: false,
        allowBooking: true,
        showReviews: true,
        showPortfolio: true,
        seoTitle: '',
        seoDescription: '',
        metaKeywords: '',
    })
    
    // Advertisements state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [adToDelete, setAdToDelete] = useState(null)

    const { data: settings, isLoading } = useQuery({
        queryKey: ['business-marketplace-settings'],
        queryFn: getMarketplaceSettings,
    })

    const { data: advertisementsData, isLoading: adsLoading } = useQuery({
        queryKey: ['business-advertisements'],
        queryFn: getBusinessAdvertisements,
    })
    
    // Извлекаем массив объявлений из ответа API
    const advertisements = Array.isArray(advertisementsData?.data) 
        ? advertisementsData.data 
        : Array.isArray(advertisementsData) 
            ? advertisementsData 
            : []

    const updateSettingsMutation = useMutation({
        mutationFn: updateMarketplaceSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-marketplace-settings'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Настройки маркетплейса успешно сохранены
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось сохранить настройки
                </Notification>,
            )
        },
    })

    const deleteAdMutation = useMutation({
        mutationFn: deleteBusinessAdvertisement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-advertisements'] })
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

    useEffect(() => {
        if (settings) {
            setFormData({
                visible: settings.visible ?? true,
                featured: settings.featured ?? false,
                showInSearch: settings.showInSearch ?? true,
                showInFeatured: settings.showInFeatured ?? false,
                allowBooking: settings.allowBooking ?? true,
                showReviews: settings.showReviews ?? true,
                showPortfolio: settings.showPortfolio ?? true,
                seoTitle: settings.seoTitle || '',
                seoDescription: settings.seoDescription || '',
                metaKeywords: settings.metaKeywords || '',
            })
        }
    }, [settings])

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        updateSettingsMutation.mutate(formData)
    }

    const handleDeleteAd = (ad) => {
        setAdToDelete(ad)
        setIsDeleteDialogOpen(true)
    }

    const confirmDeleteAd = () => {
        if (adToDelete) {
            deleteAdMutation.mutate(adToDelete.id)
        }
    }

    const getStatusBadge = (status) => {
        const statusMap = {
            pending: { label: 'На модерации', className: 'bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100' },
            approved: { label: 'Одобрено', className: 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100' },
            rejected: { label: 'Отклонено', className: 'bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100' },
            active: { label: 'Активно', className: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100' },
            inactive: { label: 'Неактивно', className: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' },
        }
        const statusInfo = statusMap[status] || statusMap.pending
        return (
            <Tag className={statusInfo.className}>
                {statusInfo.label}
            </Tag>
        )
    }

    const getTypeBadge = (type) => {
        return (
            <Tag className={type === 'advertisement' ? 'bg-purple-200 dark:bg-purple-700 text-purple-900 dark:text-purple-100' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}>
                {type === 'advertisement' ? 'Рекламный' : 'Обычный'}
            </Tag>
        )
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loading loading />
            </div>
        )
    }

    return (
        <FormContainer>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6 w-full">
                    {/* Видимость на маркетплейсе */}
                    <Card className="p-4 sm:p-6 w-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <h4>Видимость на маркетплейсе</h4>
                                <Tooltip title="Управление видимостью вашего бизнеса на платформе">
                                    <PiInfo className="text-gray-400 cursor-help" />
                                </Tooltip>
                            </div>
                            <Tag
                                className={
                                    formData.visible
                                        ? 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100 flex items-center gap-1'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center gap-1'
                                }
                            >
                                {formData.visible ? (
                                    <>
                                        <PiEye className="inline" />
                                        Видим
                                    </>
                                ) : (
                                    <>
                                        <PiEyeSlash className="inline" />
                                        Скрыт
                                    </>
                                )}
                            </Tag>
                        </div>
                        <div className="space-y-4">
                            <FormItem label="Видим на маркетплейсе">
                                <Switcher
                                    checked={formData.visible}
                                    onChange={(checked) =>
                                        handleChange('visible', checked)
                                    }
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Если выключено, ваш бизнес не будет отображаться в каталоге
                                </p>
                            </FormItem>
                            <FormItem label="Отображать в поиске">
                                <Switcher
                                    checked={formData.showInSearch}
                                    onChange={(checked) =>
                                        handleChange('showInSearch', checked)
                                    }
                                />
                            </FormItem>
                            <FormItem label="Разрешить онлайн-бронирование">
                                <Switcher
                                    checked={formData.allowBooking}
                                    onChange={(checked) =>
                                        handleChange('allowBooking', checked)
                                    }
                                />
                            </FormItem>
                        </div>
                    </Card>

                    {/* Реклама и продвижение */}
                    <Card className="p-4 sm:p-6 w-full">
                        <div className="flex items-center gap-2 mb-4">
                            <h4>Реклама и продвижение</h4>
                            <Tooltip title="Настройки спонсированных предложений и рекламы">
                                <PiInfo className="text-gray-400 cursor-help" />
                            </Tooltip>
                        </div>
                        <div className="space-y-4">
                            <FormItem label="Спонсированное предложение (Featured)">
                                <Switcher
                                    checked={formData.featured}
                                    onChange={(checked) =>
                                        handleChange('featured', checked)
                                    }
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Показывать ваш бизнес в разделе "Рекомендуемые"
                                </p>
                            </FormItem>
                            {formData.featured && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <PiSparkle className="text-blue-600 dark:text-blue-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                                Спонсированное предложение
                                            </p>
                                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                                Ваш бизнес будет выделен в каталоге и показываться первым в результатах поиска.
                                                Стоимость: $50/месяц
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <FormItem label="Показывать в разделе 'Рекомендуемые'">
                                <Switcher
                                    checked={formData.showInFeatured}
                                    onChange={(checked) =>
                                        handleChange('showInFeatured', checked)
                                    }
                                />
                            </FormItem>
                        </div>
                    </Card>

                    {/* Отображение контента */}
                    <Card className="p-4">
                        <h4 className="mb-4">Отображение контента</h4>
                        <div className="space-y-4">
                            <FormItem label="Показывать отзывы">
                                <Switcher
                                    checked={formData.showReviews}
                                    onChange={(checked) =>
                                        handleChange('showReviews', checked)
                                    }
                                />
                            </FormItem>
                            <FormItem label="Показывать портфолио">
                                <Switcher
                                    checked={formData.showPortfolio}
                                    onChange={(checked) =>
                                        handleChange('showPortfolio', checked)
                                    }
                                />
                            </FormItem>
                        </div>
                    </Card>

                    {/* SEO настройки */}
                    <Card className="p-4 sm:p-6 w-full">
                        <h4 className="mb-4">SEO настройки</h4>
                        <div className="space-y-4">
                            <FormItem label="SEO заголовок">
                                <Input
                                    value={formData.seoTitle}
                                    onChange={(e) =>
                                        handleChange('seoTitle', e.target.value)
                                    }
                                    placeholder="Заголовок для поисковых систем"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Рекомендуемая длина: 50-60 символов
                                </p>
                            </FormItem>
                            <FormItem label="SEO описание">
                                <Input
                                    textArea
                                    rows={3}
                                    value={formData.seoDescription}
                                    onChange={(e) =>
                                        handleChange(
                                            'seoDescription',
                                            e.target.value
                                        )
                                    }
                                    placeholder="Описание для поисковых систем"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Рекомендуемая длина: 150-160 символов
                                </p>
                            </FormItem>
                            <FormItem label="Мета-ключевые слова">
                                <Input
                                    value={formData.metaKeywords}
                                    onChange={(e) =>
                                        handleChange('metaKeywords', e.target.value)
                                    }
                                    placeholder="Ключевые слова через запятую"
                                />
                            </FormItem>
                        </div>
                    </Card>

                    {/* Управление объявлениями */}
                    <Card className="p-4 sm:p-6 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                            <div>
                                <h4>Мои объявления</h4>
                            </div>
                            <Link href="/business/settings/advertisements/create" className="w-full sm:w-auto">
                                <Button
                                    type="button"
                                    variant="solid"
                                    size="sm"
                                    icon={<PiPlus />}
                                    className="w-full sm:w-auto"
                                >
                                    Создать объявление
                                </Button>
                            </Link>
                        </div>
                        
                        {adsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loading loading />
                            </div>
                        ) : advertisements.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>У вас пока нет объявлений</p>
                                <p className="text-sm mt-1">Создайте первое объявление для продвижения вашего бизнеса</p>
                            </div>
                        ) : (
                            <>
                                {/* Десктопная таблица */}
                                <div className="hidden md:block overflow-x-auto table-scroll">
                                    <Table>
                                        <THead>
                                            <Tr>
                                                <Th>Название</Th>
                                                <Th>Тип</Th>
                                                <Th>Статус</Th>
                                                <Th>Размещение</Th>
                                                <Th>Дата создания</Th>
                                                <Th>Действия</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {advertisements.map((ad) => (
                                                <Tr key={ad.id}>
                                                    <Td>
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            {(ad.image || ad.img || ad.photo || (ad.images && Array.isArray(ad.images) && ad.images[0])) && (
                                                                <img
                                                                    src={normalizeImageUrl(ad.image || ad.img || ad.photo || (ad.images && Array.isArray(ad.images) && ad.images[0]))}
                                                                    alt={ad.title || 'Объявление'}
                                                                    className="w-10 h-10 rounded object-cover shrink-0"
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none'
                                                                    }}
                                                                />
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-medium truncate">{ad.title}</div>
                                                                {ad.description && (
                                                                    <div className="text-sm text-gray-500 truncate">
                                                                        {ad.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Td>
                                                    <Td>{getTypeBadge(ad.type)}</Td>
                                                    <Td>{getStatusBadge(ad.status)}</Td>
                                                    <Td>
                                                        <span className="text-sm capitalize">{ad.placement}</span>
                                                    </Td>
                                                    <Td>
                                                        <span className="text-sm text-gray-500">
                                                            {ad.created_at ? new Date(ad.created_at).toLocaleDateString('ru-RU') : '-'}
                                                        </span>
                                                    </Td>
                                                    <Td>
                                                        <div className="flex items-center gap-2">
                                                            <Link href={`/business/settings/advertisements/create?edit=${ad.id}`}>
                                                                <Button
                                                                    type="button"
                                                                    variant="plain"
                                                                    size="sm"
                                                                    icon={<PiPencil />}
                                                                />
                                                            </Link>
                                                            <Button
                                                                type="button"
                                                                variant="plain"
                                                                size="sm"
                                                                icon={<PiTrash />}
                                                                onClick={() => handleDeleteAd(ad)}
                                                            />
                                                        </div>
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                </div>

                                {/* Мобильные карточки */}
                                <div className="md:hidden space-y-3 w-full">
                                    {advertisements.map((ad) => (
                                        <div key={ad.id} className="p-4 sm:p-6 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                            <div className="flex items-start gap-3 mb-3">
                                                {(ad.image || ad.img || ad.photo || (ad.images && Array.isArray(ad.images) && ad.images[0])) && (
                                                    <img
                                                        src={normalizeImageUrl(ad.image || ad.img || ad.photo || (ad.images && Array.isArray(ad.images) && ad.images[0]))}
                                                        alt={ad.title || 'Объявление'}
                                                        className="w-16 h-16 rounded object-cover shrink-0"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none'
                                                        }}
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                                        {ad.title}
                                                    </h5>
                                                    {ad.description && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                                                            {ad.description}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                                        {getTypeBadge(ad.type)}
                                                        {getStatusBadge(ad.status)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                <div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        Размещение
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                                        {ad.placement || '—'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        Дата создания
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {ad.created_at ? new Date(ad.created_at).toLocaleDateString('ru-RU') : '—'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Link href={`/business/settings/advertisements/create?edit=${ad.id}`} className="flex-1">
                                                    <Button
                                                        type="button"
                                                        variant="twoTone"
                                                        size="sm"
                                                        icon={<PiPencil />}
                                                        className="w-full"
                                                    >
                                                        Редактировать
                                                    </Button>
                                                </Link>
                                                <Button
                                                    type="button"
                                                    variant="twoTone"
                                                    size="sm"
                                                    color="red-600"
                                                    icon={<PiTrash />}
                                                    onClick={() => handleDeleteAd(ad)}
                                                    className="flex-1"
                                                >
                                                    Удалить
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button 
                            type="button" 
                            variant="plain"
                            onClick={() => {
                                if (settings) {
                                    setFormData({
                                        visible: settings.visible ?? true,
                                        featured: settings.featured ?? false,
                                        showInSearch: settings.showInSearch ?? true,
                                        showInFeatured: settings.showInFeatured ?? false,
                                        allowBooking: settings.allowBooking ?? true,
                                        showReviews: settings.showReviews ?? true,
                                        showPortfolio: settings.showPortfolio ?? true,
                                        seoTitle: settings.seoTitle || '',
                                        seoDescription: settings.seoDescription || '',
                                        metaKeywords: settings.metaKeywords || '',
                                    })
                                }
                            }}
                        >
                            Отмена
                        </Button>
                        <Button 
                            type="submit" 
                            variant="solid"
                            loading={updateSettingsMutation.isPending}
                        >
                            Сохранить
                        </Button>
                    </div>
                </div>
            </form>

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
        </FormContainer>
    )
}

export default MarketplaceTab


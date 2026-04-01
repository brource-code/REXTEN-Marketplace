'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Switcher from '@/components/ui/Switcher'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Tag from '@/components/ui/Tag'
import Table from '@/components/ui/Table'
import { PiEye, PiEyeSlash, PiInfo, PiPlus, PiPencil, PiTrash } from 'react-icons/pi'
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
import useDebounce from '@/utils/hooks/useDebounce'
import { formatDate } from '@/utils/dateTime'

const { Tr, Td, TBody, THead, Th } = Table

const MarketplaceTab = () => {
    const t = useTranslations('business.settings.marketplace')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()
    const router = useRouter()
    const [formData, setFormData] = useState({
        visible: true,
        showInSearch: true,
        allowBooking: true,
        showReviews: true,
        showPortfolio: true,
        seoTitle: '',
        seoDescription: '',
        metaKeywords: '',
    })
    const isInitialMount = useRef(true)
    const hasChanges = useRef(false)
    
    // Advertisements state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [adToDelete, setAdToDelete] = useState(null)

    const { data: settings, isLoading, refetch } = useQuery({
        queryKey: ['business-marketplace-settings'],
        queryFn: getMarketplaceSettings,
        refetchOnMount: 'always',
        staleTime: 0,
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
        onSuccess: async () => {
            // Принудительно перезагружаем данные
            await refetch()
            hasChanges.current = false
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.saved')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.saveError')}
                </Notification>,
            )
        },
    })

    // Автосохранение с debounce — используем ref для актуальных данных (избегаем stale closure)
    const formDataRef = useRef(formData)
    formDataRef.current = formData
    const mutationRef = useRef(updateSettingsMutation)
    mutationRef.current = updateSettingsMutation

    const debouncedSave = useMemo(
        () =>
            useDebounce(() => {
                if (hasChanges.current && !isInitialMount.current) {
                    mutationRef.current.mutate(formDataRef.current)
                }
            }, 1000),
        [],
    )

    const deleteAdMutation = useMutation({
        mutationFn: deleteBusinessAdvertisement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-advertisements'] })
            setIsDeleteDialogOpen(false)
            setAdToDelete(null)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.adDeleted')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.adDeleteError')}
                </Notification>,
            )
        },
    })

    useEffect(() => {
        if (settings) {
            setFormData({
                visible: settings.visible ?? true,
                showInSearch: settings.showInSearch ?? true,
                allowBooking: settings.allowBooking ?? true,
                showReviews: settings.showReviews ?? true,
                showPortfolio: settings.showPortfolio ?? true,
                seoTitle: settings.seoTitle || '',
                seoDescription: settings.seoDescription || '',
                metaKeywords: settings.metaKeywords || '',
            })
            isInitialMount.current = true
            hasChanges.current = false
            // Даем время на установку начальных значений
            setTimeout(() => {
                isInitialMount.current = false
            }, 150)
        }
    }, [settings])

    // Автосохранение при изменении данных
    useEffect(() => {
        if (!isInitialMount.current && hasChanges.current) {
            debouncedSave()
        }
    }, [formData, debouncedSave])

    const handleChange = (field, value) => {
        hasChanges.current = true
        setFormData((prev) => ({ ...prev, [field]: value }))
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
            pending: { label: t('advertisements.statuses.pending'), className: 'bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100' },
            approved: { label: t('advertisements.statuses.approved'), className: 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100' },
            rejected: { label: t('advertisements.statuses.rejected'), className: 'bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100' },
            active: { label: t('advertisements.statuses.active'), className: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100' },
            inactive: { label: t('advertisements.statuses.inactive'), className: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' },
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
                {type === 'advertisement' ? t('advertisements.types.advertisement') : t('advertisements.types.regular')}
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
            <div className="flex flex-col gap-6 w-full">
                    {/* Видимость на маркетплейсе */}
                    <Card className="p-4 sm:p-6 w-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('visibility.title')}</h4>
                                <Tooltip title={t('visibility.tooltip')}>
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
                                        {t('visibility.visible')}
                                    </>
                                ) : (
                                    <>
                                        <PiEyeSlash className="inline" />
                                        {t('visibility.hidden')}
                                    </>
                                )}
                            </Tag>
                        </div>
                        <div className="space-y-4">
                            <FormItem label={t('visibility.visibleOnMarketplace')}>
                                <Switcher
                                    checked={formData.visible}
                                    onChange={(checked) =>
                                        handleChange('visible', checked)
                                    }
                                />
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                    {t('visibility.visibleHint')}
                                </p>
                            </FormItem>
                            <FormItem label={t('visibility.showInSearch')}>
                                <Switcher
                                    checked={formData.showInSearch}
                                    onChange={(checked) =>
                                        handleChange('showInSearch', checked)
                                    }
                                />
                            </FormItem>
                            <FormItem label={t('visibility.allowBooking')}>
                                <Switcher
                                    checked={formData.allowBooking}
                                    onChange={(checked) =>
                                        handleChange('allowBooking', checked)
                                    }
                                />
                            </FormItem>
                        </div>
                    </Card>

                    {/* Отображение контента */}
                    <Card className="p-4">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('content.title')}</h4>
                        <div className="space-y-4">
                            <FormItem label={t('content.showReviews')}>
                                <Switcher
                                    checked={formData.showReviews}
                                    onChange={(checked) =>
                                        handleChange('showReviews', checked)
                                    }
                                />
                            </FormItem>
                            <FormItem label={t('content.showPortfolio')}>
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
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('seo.title')}</h4>
                        <div className="space-y-4">
                            <FormItem label={t('seo.seoTitle')}>
                                <Input
                                    value={formData.seoTitle}
                                    onChange={(e) =>
                                        handleChange('seoTitle', e.target.value)
                                    }
                                    placeholder={t('seo.seoTitlePlaceholder')}
                                />
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                    {t('seo.seoTitleHint')}
                                </p>
                            </FormItem>
                            <FormItem label={t('seo.seoDescription')}>
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
                                    placeholder={t('seo.seoDescriptionPlaceholder')}
                                />
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                    {t('seo.seoDescriptionHint')}
                                </p>
                            </FormItem>
                            <FormItem label={t('seo.metaKeywords')}>
                                <Input
                                    value={formData.metaKeywords}
                                    onChange={(e) =>
                                        handleChange('metaKeywords', e.target.value)
                                    }
                                    placeholder={t('seo.metaKeywordsPlaceholder')}
                                />
                            </FormItem>
                        </div>
                    </Card>

                    {/* Управление объявлениями */}
                    <Card className="p-4 sm:p-6 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                                <div>
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('advertisements.title')}</h4>
                            </div>
                            <Link href="/business/settings/advertisements/create" className="w-full sm:w-auto">
                                <Button
                                    type="button"
                                    variant="solid"
                                    size="sm"
                                    icon={<PiPlus />}
                                    className="w-full sm:w-auto"
                                >
                                    {t('advertisements.createAd')}
                                </Button>
                            </Link>
                        </div>
                        
                        {adsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loading loading />
                            </div>
                        ) : advertisements.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('advertisements.noAds')}</p>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('advertisements.noAdsHint')}</p>
                            </div>
                        ) : (
                            <>
                                {/* Десктопная таблица */}
                                <div className="hidden md:block overflow-x-auto">
                                    <div className="min-w-full inline-block">
                                        <Table>
                                            <THead>
                                                <Tr>
                                                    <Th className="min-w-[200px] max-w-[300px]">{t('advertisements.columns.title')}</Th>
                                                    <Th className="whitespace-nowrap">{t('advertisements.columns.type')}</Th>
                                                    <Th className="whitespace-nowrap">{t('advertisements.columns.status')}</Th>
                                                    <Th className="whitespace-nowrap">{t('advertisements.columns.placement')}</Th>
                                                    <Th className="whitespace-nowrap">{t('advertisements.columns.createdAt')}</Th>
                                                    <Th className="whitespace-nowrap">{t('advertisements.columns.actions')}</Th>
                                                </Tr>
                                            </THead>
                                            <TBody>
                                                {advertisements.map((ad) => (
                                                    <Tr key={ad.id}>
                                                        <Td className="min-w-[200px] max-w-[300px]">
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
                                                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 truncate" title={ad.title}>
                                                                        {ad.title}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Td>
                                                        <Td className="whitespace-nowrap">{getTypeBadge(ad.type)}</Td>
                                                        <Td className="whitespace-nowrap">{getStatusBadge(ad.status)}</Td>
                                                        <Td className="whitespace-nowrap">
                                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 capitalize">{ad.placement}</span>
                                                        </Td>
                                                        <Td className="whitespace-nowrap">
                                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                                {ad.created_at ? formatDate(ad.created_at, 'America/Los_Angeles', 'short') : '-'}
                                                            </span>
                                                        </Td>
                                                        <Td className="whitespace-nowrap">
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
                                                    <h5 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                                        {ad.title}
                                                    </h5>
                                                    {ad.description && (
                                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
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
                                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                        {t('advertisements.columns.placement')}
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 capitalize">
                                                        {ad.placement || '—'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {t('advertisements.columns.createdAt')}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {ad.created_at ? formatDate(ad.created_at, 'America/Los_Angeles', 'short') : '—'}
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
                                                        {t('advertisements.edit')}
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
                                                    {t('advertisements.delete')}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </Card>
                </div>

            {/* Диалог подтверждения удаления */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                type="danger"
                title={t('advertisements.deleteConfirm.title')}
                confirmText={tCommon('delete')}
                onConfirm={confirmDeleteAd}
                onCancel={() => {
                    setIsDeleteDialogOpen(false)
                    setAdToDelete(null)
                }}
            >
                <p>
                    {t('advertisements.deleteConfirm.message', { title: adToDelete?.title || '' })}
                </p>
            </ConfirmDialog>
        </FormContainer>
    )
}

export default MarketplaceTab


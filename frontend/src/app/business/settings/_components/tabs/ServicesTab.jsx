'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import { PiPlus, PiPencil, PiTrash } from 'react-icons/pi'
import { TbPencil, TbTrash, TbPlus } from 'react-icons/tb'
import { NumericFormat } from 'react-number-format'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Checkbox from '@/components/ui/Checkbox'
import { Radio } from '@/components/ui/Radio'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    getBusinessServices, 
    createBusinessService, 
    updateBusinessService, 
    deleteBusinessService 
} from '@/lib/api/business'
import { 
    getAdditionalServices,
    createAdditionalService,
    updateAdditionalService,
    deleteAdditionalService
} from '@/lib/api/additionalServices'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { formatDuration } from '@/utils/formatDuration'
import SubscriptionLimitAlert from '@/components/shared/SubscriptionLimitAlert'
import useSubscriptionLimits from '@/hooks/useSubscriptionLimits'

const { Tr, Td, TBody, THead, Th } = Table

const ServicesTab = () => {
    const t = useTranslations('business.settings.services')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()
    const { canCreate } = useSubscriptionLimits()
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [editingService, setEditingService] = useState(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [serviceToDelete, setServiceToDelete] = useState(null)
    const [isAdditionalServicesModalOpen, setIsAdditionalServicesModalOpen] = useState(false)
    const [selectedServiceForAdditional, setSelectedServiceForAdditional] = useState(null)

    const { data: services = [], isLoading } = useQuery({
        queryKey: ['business-services', 'full'],
        queryFn: () => getBusinessServices({ includeInactive: true }),
    })

    const createServiceMutation = useMutation({
        mutationFn: createBusinessService,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-services'] })
            queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
            setIsAddModalOpen(false)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.created')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.createError')}
                </Notification>,
            )
        },
    })

    const updateServiceMutation = useMutation({
        mutationFn: ({ id, data }) => updateBusinessService(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-services'] })
            setEditingService(null)
            setIsAddModalOpen(false)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.updated')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.updateError')}
                </Notification>,
            )
        },
    })

    const deleteServiceMutation = useMutation({
        mutationFn: deleteBusinessService,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-services'] })
            queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.deleted')}
                </Notification>,
            )
            setIsDeleteDialogOpen(false)
            setServiceToDelete(null)
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.deleteError')}
                </Notification>,
            )
        },
    })

    const handleAdd = () => {
        setEditingService(null)
        setIsAddModalOpen(true)
    }

    const handleEdit = (service) => {
        setEditingService(service)
        setIsAddModalOpen(true)
    }

    const handleDelete = (serviceId) => {
        setServiceToDelete(serviceId)
        setIsDeleteDialogOpen(true)
    }

    const handleConfirmDelete = () => {
        if (serviceToDelete) {
            deleteServiceMutation.mutate(serviceToDelete)
        }
    }

    const handleSave = (serviceData) => {
        // Преобразуем duration в duration_minutes для API
        const apiData = {
            ...serviceData,
            duration_minutes: serviceData.duration || serviceData.duration_minutes || 60,
        }
        // Удаляем duration, если есть duration_minutes
        if (apiData.duration_minutes) {
            delete apiData.duration
        }
        
        if (editingService) {
            updateServiceMutation.mutate({
                id: editingService.id,
                data: apiData,
            })
        } else {
            createServiceMutation.mutate({
                ...apiData,
                status: 'active',
            })
        }
    }

    return (
        <>
            <div className="flex flex-col gap-4 w-full">
                <SubscriptionLimitAlert resource="services" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
                    <div className="flex-1">
                        <h4>{t('title')}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                            {t('description')}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            💡 {t('hint')}
                        </p>
                    </div>
                    <Button
                        variant="solid"
                        icon={<PiPlus />}
                        onClick={handleAdd}
                        disabled={!canCreate('services')}
                        className="w-full sm:w-auto shrink-0"
                    >
                        {t('addService')}
                    </Button>
                </div>

                <Card className="p-0 sm:p-6 w-full">
                    {/* Десктопная таблица */}
                    <div className="hidden md:block p-6">
                        <Table>
                            <THead>
                                <Tr>
                                    <Th>{t('columns.name')}</Th>
                                    <Th>{t('columns.category')}</Th>
                                    <Th>{t('columns.duration')}</Th>
                                    <Th>{t('columns.price')}</Th>
                                    <Th>{t('columns.status')}</Th>
                                    <Th></Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {services.map((service) => (
                                    <Tr key={service.id}>
                                        <Td>
                                            <div className="font-semibold">{service.name}</div>
                                        </Td>
                                        <Td>
                                            <span className="text-sm text-gray-500">
                                                {service.category}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className="text-sm">
                                                {formatDuration(service.duration, service.duration_unit || 'hours') || '—'}
                                            </span>
                                        </Td>
                                        <Td>
                                            <NumericFormat
                                                displayType="text"
                                                value={service.price}
                                                prefix={'$'}
                                                thousandSeparator={true}
                                                className="font-semibold"
                                            />
                                        </Td>
                                        <Td>
                                            <Tag
                                                className={
                                                    service.status === 'active'
                                                        ? 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                                }
                                            >
                                                {service.status === 'active' ? t('statuses.active') : t('statuses.inactive')}
                                            </Tag>
                                        </Td>
                                        <Td>
                                            <div className="flex items-center gap-2">
                                                <Tooltip title={t('additionalServices.title')}>
                                                    <div
                                                        className="text-xl cursor-pointer hover:text-blue-600"
                                                        onClick={() => {
                                                            setSelectedServiceForAdditional(service)
                                                            setIsAdditionalServicesModalOpen(true)
                                                        }}
                                                    >
                                                        <TbPlus />
                                                    </div>
                                                </Tooltip>
                                                <Tooltip title={tCommon('edit')}>
                                                    <div
                                                        className="text-xl cursor-pointer hover:text-primary"
                                                        onClick={() => handleEdit(service)}
                                                    >
                                                        <TbPencil />
                                                    </div>
                                                </Tooltip>
                                                <Tooltip title={tCommon('delete')}>
                                                    <div
                                                        className="text-xl cursor-pointer hover:text-red-600"
                                                        onClick={() => handleDelete(service.id)}
                                                    >
                                                        <TbTrash />
                                                    </div>
                                                </Tooltip>
                                            </div>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>

                    {/* Мобильные карточки */}
                    <div className="md:hidden space-y-3 w-full">
                        {services.map((service) => (
                            <Card key={service.id} className="p-4 sm:p-6 w-full">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex-1">
                                        <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                            {service.name}
                                        </h5>
                                        {service.category && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {service.category}
                                            </p>
                                        )}
                                    </div>
                                    <Tag
                                        className={
                                            service.status === 'active'
                                                ? 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100 shrink-0'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 shrink-0'
                                        }
                                    >
                                        {service.status === 'active' ? t('statuses.active') : t('statuses.inactive')}
                                    </Tag>
                                </div>

                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex flex-col gap-1">
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('columns.duration')}
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {formatDuration(service.duration, service.duration_unit || 'hours') || '—'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('columns.price')}
                                        </div>
                                        <NumericFormat
                                            displayType="text"
                                            value={service.price}
                                            prefix={'$'}
                                            thousandSeparator={true}
                                            className="text-sm font-semibold text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <Tooltip title={t('additionalServices.title')}>
                                        <button
                                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                                            onClick={() => {
                                                setSelectedServiceForAdditional(service)
                                                setIsAdditionalServicesModalOpen(true)
                                            }}
                                        >
                                            <TbPlus className="w-5 h-5" />
                                        </button>
                                    </Tooltip>
                                    <Tooltip title={tCommon('edit')}>
                                        <button
                                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary transition"
                                            onClick={() => handleEdit(service)}
                                        >
                                            <TbPencil className="w-5 h-5" />
                                        </button>
                                    </Tooltip>
                                    <Tooltip title={tCommon('delete')}>
                                        <button
                                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 transition"
                                            onClick={() => handleDelete(service.id)}
                                        >
                                            <TbTrash className="w-5 h-5" />
                                        </button>
                                    </Tooltip>
                                </div>
                            </Card>
                        ))}
                    </div>
                </Card>
            </div>

            <ServiceModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false)
                    setEditingService(null)
                }}
                service={editingService}
                onSave={handleSave}
            />
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                type="danger"
                title={t('deleteConfirm.title')}
                onCancel={() => {
                    setIsDeleteDialogOpen(false)
                    setServiceToDelete(null)
                }}
                onConfirm={handleConfirmDelete}
                confirmText={t('deleteConfirm.confirm')}
                cancelText={tCommon('cancel')}
            >
                <p>{t('deleteConfirm.message')}</p>
            </ConfirmDialog>

            <AdditionalServicesModal
                isOpen={isAdditionalServicesModalOpen}
                onClose={() => {
                    setIsAdditionalServicesModalOpen(false)
                    setSelectedServiceForAdditional(null)
                }}
                service={selectedServiceForAdditional}
            />
        </>
    )
}

const ServiceModal = ({ isOpen, onClose, service, onSave }) => {
    const t = useTranslations('business.settings.services')
    const tCommon = useTranslations('business.common')
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        duration: 60,
        price: 0,
        service_type: 'onsite',
    })

    // Обновляем форму при изменении service или открытии модалки
    useEffect(() => {
        if (isOpen && service) {
            setFormData({
                name: service.name || '',
                category: service.category || '',
                duration: service.duration || service.duration_minutes || 60,
                price: service.price || 0,
                service_type: service.service_type || 'onsite',
            })
        } else if (isOpen && !service) {
            // Сброс формы для новой услуги
            setFormData({
                name: '',
                category: '',
                duration: 60,
                price: 0,
                service_type: 'onsite',
            })
        }
    }, [isOpen, service])

    const handleSubmit = (e) => {
        e.preventDefault()
        onSave(formData)
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={500}>
            <div className="flex flex-col h-full max-h-[85vh]">
                {/* Заголовок */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{service ? t('editService') : t('addService')}</h4>
                </div>
                
                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4" id="service-form">
                            <FormItem label={t('form.name')}>
                                <Input
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                                    }
                                    placeholder={t('form.namePlaceholder')}
                                    required
                                />
                            </FormItem>
                            <FormItem label={t('form.category')}>
                                <Input
                                    value={formData.category}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            category: e.target.value,
                                        }))
                                    }
                                    placeholder={t('form.categoryPlaceholder')}
                                />
                            </FormItem>
                            <div className="grid grid-cols-2 gap-4">
                                <FormItem label={t('form.duration')}>
                                    <Input
                                        type="number"
                                        value={formData.duration}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setFormData((prev) => ({
                                                ...prev,
                                                duration: value === '' ? '' : value,
                                            }))
                                        }}
                                        min="15"
                                        step="15"
                                    />
                                </FormItem>
                                <FormItem label={t('form.price')}>
                                    <Input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setFormData((prev) => ({
                                                ...prev,
                                                price: value === '' ? '' : value,
                                            }))
                                        }}
                                        min="0"
                                    />
                                </FormItem>
                            </div>
                            <FormItem label={t('form.serviceType')}>
                                <Radio.Group
                                    value={formData.service_type}
                                    onChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            service_type: value,
                                        }))
                                    }
                                    className="space-y-2"
                                >
                                    <Radio value="onsite">{t('form.onsite')}</Radio>
                                    <Radio value="offsite">{t('form.offsite')}</Radio>
                                    <Radio value="hybrid">{t('form.hybrid')}</Radio>
                                </Radio.Group>
                            </FormItem>
                    </form>
                </div>

                {/* Кнопки - зафиксированы снизу */}
                <div className="flex-shrink-0 px-6 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <Button type="button" variant="plain" onClick={onClose}>
                        {tCommon('cancel')}
                    </Button>
                    <Button 
                        type="button" 
                        variant="solid"
                        onClick={(e) => {
                            e.preventDefault()
                            const form = document.getElementById('service-form')
                            if (form) {
                                form.requestSubmit()
                            }
                        }}
                    >
                        {tCommon('save')}
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

const AdditionalServicesModal = ({ isOpen, onClose, service }) => {
    const t = useTranslations('business.settings.services.additionalServices')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [editingAdditionalService, setEditingAdditionalService] = useState(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [additionalServiceToDelete, setAdditionalServiceToDelete] = useState(null)

    const { data: additionalServices = [], isLoading } = useQuery({
        queryKey: ['additional-services', service?.id],
        queryFn: () => getAdditionalServices(service?.id),
        enabled: isOpen && !!service?.id,
    })

    const createMutation = useMutation({
        mutationFn: createAdditionalService,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['additional-services', service?.id] })
            setIsAddModalOpen(false)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.created')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.createError')}
                </Notification>,
            )
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateAdditionalService(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['additional-services', service?.id] })
            setEditingAdditionalService(null)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.updated')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.updateError')}
                </Notification>,
            )
        },
    })

    const deleteMutation = useMutation({
        mutationFn: deleteAdditionalService,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['additional-services', service?.id] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.deleted')}
                </Notification>,
            )
            setIsDeleteDialogOpen(false)
            setAdditionalServiceToDelete(null)
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.deleteError')}
                </Notification>,
            )
        },
    })

    const handleAdd = () => {
        setEditingAdditionalService(null)
        setIsAddModalOpen(true)
    }

    const handleEdit = (additionalService) => {
        setEditingAdditionalService(additionalService)
        setIsAddModalOpen(true)
    }

    const handleDelete = (id) => {
        setAdditionalServiceToDelete(id)
        setIsDeleteDialogOpen(true)
    }

    const handleSave = (data) => {
        if (editingAdditionalService) {
            updateMutation.mutate({
                id: editingAdditionalService.id,
                data,
            })
        } else {
            createMutation.mutate({
                ...data,
                service_id: service.id,
                is_active: true,
            })
        }
    }

    if (!service) return null

    return (
        <>
            <Dialog isOpen={isOpen} onClose={onClose} width={800}>
                <div className="flex flex-col h-full max-h-[85vh]">
                    <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h4 className="text-lg">{t('title')}</h4>
                        <p className="text-sm text-gray-500 mt-1">{t('forService')}: {service.name}</p>
                    </div>

                    <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-gray-600">
                                {t('manageFor')} "{service.name}"
                            </p>
                            <Button size="sm" variant="solid" icon={<TbPlus />} onClick={handleAdd}>
                                {t('add')}
                            </Button>
                        </div>

                        {isLoading ? (
                            <Loading loading />
                        ) : additionalServices.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                {t('noItems')}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {additionalServices.map((addService) => (
                                    <Card key={addService.id} className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="font-medium">{addService.name}</div>
                                                {addService.description && (
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {addService.description}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-4 mt-2 text-sm">
                                                    <span className="font-semibold">
                                                        ${(() => {
                                                            const price = typeof addService.price === 'number' ? addService.price : (typeof addService.price === 'string' ? parseFloat(addService.price) : 0);
                                                            const numericPrice = isNaN(price) ? 0 : price;
                                                            return numericPrice.toFixed(2);
                                                        })()}
                                                    </span>
                                                    {addService.duration && (
                                                        <span className="text-gray-500">
                                                            {formatDuration(addService.duration, 'minutes')}
                                                        </span>
                                                    )}
                                                    <Tag
                                                        className={
                                                            addService.is_active
                                                                ? 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100'
                                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                                        }
                                                    >
                                                        {addService.is_active ? t('statuses.active') : t('statuses.inactive')}
                                                    </Tag>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Tooltip title={tCommon('edit')}>
                                                    <div
                                                        className="text-xl cursor-pointer hover:text-primary"
                                                        onClick={() => handleEdit(addService)}
                                                    >
                                                        <TbPencil />
                                                    </div>
                                                </Tooltip>
                                                <Tooltip title={tCommon('delete')}>
                                                    <div
                                                        className="text-xl cursor-pointer hover:text-red-600"
                                                        onClick={() => handleDelete(addService.id)}
                                                    >
                                                        <TbTrash />
                                                    </div>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Dialog>

            <AdditionalServiceFormModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false)
                    setEditingAdditionalService(null)
                }}
                additionalService={editingAdditionalService}
                onSave={handleSave}
            />

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                type="danger"
                title={t('deleteConfirm.title')}
                onCancel={() => {
                    setIsDeleteDialogOpen(false)
                    setAdditionalServiceToDelete(null)
                }}
                onConfirm={() => deleteMutation.mutate(additionalServiceToDelete)}
                confirmText={t('deleteConfirm.confirm')}
                cancelText={tCommon('cancel')}
            >
                <p>{t('deleteConfirm.message')}</p>
            </ConfirmDialog>
        </>
    )
}

const AdditionalServiceFormModal = ({ isOpen, onClose, additionalService, onSave }) => {
    const t = useTranslations('business.settings.services.additionalServices')
    const tCommon = useTranslations('business.common')
    const [formData, setFormData] = useState({
        name: additionalService?.name || '',
        description: additionalService?.description || '',
        price: additionalService?.price || 0,
        duration: additionalService?.duration || 0,
        is_active: additionalService?.is_active !== undefined ? additionalService.is_active : true,
        sort_order: additionalService?.sort_order || 0,
    })

    useEffect(() => {
        if (additionalService) {
            setFormData({
                name: additionalService.name || '',
                description: additionalService.description || '',
                price: additionalService.price || 0,
                duration: additionalService.duration || 0,
                is_active: additionalService.is_active !== undefined ? additionalService.is_active : true,
                sort_order: additionalService.sort_order || 0,
            })
        } else {
            setFormData({
                name: '',
                description: '',
                price: 0,
                duration: 0,
                is_active: true,
                sort_order: 0,
            })
        }
    }, [additionalService])

    const handleSubmit = (e) => {
        e.preventDefault()
        onSave(formData)
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={500}>
            <div className="flex flex-col h-full max-h-[85vh]">
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h4 className="text-lg">
                        {additionalService ? t('edit') : t('add')}
                    </h4>
                </div>

                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4" id="additional-service-form">
                        <FormItem label={t('form.name')} required>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder={t('form.namePlaceholder')}
                                required
                            />
                        </FormItem>

                        <FormItem label={t('form.description')}>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder={t('form.descriptionPlaceholder')}
                                textArea
                                rows={3}
                            />
                        </FormItem>

                        <div className="grid grid-cols-2 gap-4">
                            <FormItem label={t('form.price')} required>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.price}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        setFormData((prev) => ({ ...prev, price: value === '' ? '' : value }))
                                    }}
                                    required
                                />
                            </FormItem>

                            <FormItem label={t('form.duration')}>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.duration}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        setFormData((prev) => ({ ...prev, duration: value === '' ? '' : value }))
                                    }}
                                />
                            </FormItem>
                        </div>

                        <FormItem label={t('form.sortOrder')}>
                            <Input
                                type="number"
                                min="0"
                                value={formData.sort_order}
                                onChange={(e) => {
                                    const value = e.target.value
                                    setFormData((prev) => ({ ...prev, sort_order: value === '' ? '' : value }))
                                }}
                            />
                        </FormItem>

                        <FormItem label={t('form.active')}>
                            <Checkbox
                                checked={formData.is_active}
                                onChange={(v) => setFormData((prev) => ({ ...prev, is_active: v }))}
                                checkboxClass="shrink-0 !m-0"
                                className="text-sm font-bold text-gray-500 dark:text-gray-400"
                            >
                                <span>{t('form.showInBooking')}</span>
                            </Checkbox>
                        </FormItem>
                    </form>
                </div>

                <div className="flex-shrink-0 px-6 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <Button type="button" variant="plain" onClick={onClose}>
                        {tCommon('cancel')}
                    </Button>
                    <Button
                        type="submit"
                        variant="solid"
                        onClick={(e) => {
                            e.preventDefault()
                            const form = document.getElementById('additional-service-form')
                            if (form) {
                                form.requestSubmit()
                            }
                        }}
                    >
                        {additionalService ? tCommon('save') : t('add')}
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

export default ServicesTab

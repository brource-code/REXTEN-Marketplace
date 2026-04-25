'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    getAdditionalServices,
    createAdditionalService,
    updateAdditionalService,
    deleteAdditionalService,
} from '@/lib/api/additionalServices'
import { formatDurationMinutesI18n } from '@/utils/formatDurationMinutesI18n'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { TbPlus, TbPencil, TbTrash } from 'react-icons/tb'
import { AdditionalServiceFormModal } from './AdditionalServiceFormModal'
import { STABLE_EMPTY_ARRAY } from './advertisementCreateConstants'

export function ServiceAdditionalServicesManager({
    serviceId,
    serviceName,
    isNewService = false,
    serviceData = null,
    onUpdateService = null,
}) {
    const tAdd = useTranslations('business.advertisements.create.additionalServices')
    const tCommon = useTranslations('business.common')
    const tDur = useTranslations('common.durationMinutes')
    const queryClient = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isFormModalOpen, setIsFormModalOpen] = useState(false)
    const [editingAdditionalService, setEditingAdditionalService] = useState(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [additionalServiceToDelete, setAdditionalServiceToDelete] = useState(null)

    const isRealServiceId = serviceId && typeof serviceId === 'number' && serviceId < 1000000
    const { data: additionalServicesData, isLoading } = useQuery({
        queryKey: ['additional-services', serviceId],
        queryFn: () => getAdditionalServices(serviceId),
        enabled: !!isRealServiceId,
    })
    const additionalServices = additionalServicesData ?? STABLE_EMPTY_ARRAY

    const createMutation = useMutation({
        mutationFn: createAdditionalService,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['additional-services', serviceId] })
            setIsFormModalOpen(false)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {tAdd('added')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {tAdd('addError')}
                </Notification>,
            )
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateAdditionalService(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['additional-services', serviceId] })
            setEditingAdditionalService(null)
            setIsFormModalOpen(false)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {tAdd('updated')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {tAdd('updateError')}
                </Notification>,
            )
        },
    })

    const deleteMutation = useMutation({
        mutationFn: deleteAdditionalService,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['additional-services', serviceId] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {tAdd('deleted')}
                </Notification>,
            )
            setIsDeleteDialogOpen(false)
            setAdditionalServiceToDelete(null)
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {tAdd('deleteError')}
                </Notification>,
            )
        },
    })

    const handleAdd = () => {
        setEditingAdditionalService(null)
        setIsFormModalOpen(true)
    }

    const handleEdit = (additionalService) => {
        setEditingAdditionalService(additionalService)
        setIsFormModalOpen(true)
    }

    const handleDelete = (id) => {
        setAdditionalServiceToDelete(id)
        setIsDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = () => {
        if (!additionalServiceToDelete) return

        if (isNewService && onUpdateService && serviceData) {
            const currentAdditionalServices = serviceData?.additional_services || []
            const updatedAdditionalServices = currentAdditionalServices.filter(
                (item) => item.id !== additionalServiceToDelete,
            )

            onUpdateService({
                ...serviceData,
                additional_services: updatedAdditionalServices,
            })

            setIsDeleteDialogOpen(false)
            setAdditionalServiceToDelete(null)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {tAdd('deleted')}
                </Notification>,
            )
            return
        }

        deleteMutation.mutate(additionalServiceToDelete)
    }

    const handleSave = (data) => {
        if (isNewService && onUpdateService && serviceData) {
            const currentAdditionalServices = serviceData?.additional_services || []
            let updatedAdditionalServices

            if (editingAdditionalService) {
                updatedAdditionalServices = currentAdditionalServices.map((item) =>
                    item.id === editingAdditionalService.id ? { ...item, ...data } : item,
                )
            } else {
                const newId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                updatedAdditionalServices = [
                    ...currentAdditionalServices,
                    {
                        id: newId,
                        ...data,
                        is_active: true,
                    },
                ]
            }

            onUpdateService({
                ...serviceData,
                additional_services: updatedAdditionalServices,
            })

            setIsFormModalOpen(false)
            setEditingAdditionalService(null)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {editingAdditionalService ? tAdd('updated') : tAdd('added')}
                </Notification>,
            )
            return
        }

        const realId = serviceId && typeof serviceId === 'number' && serviceId < 1000000
        if (!realId) {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {tAdd('saveError')}
                </Notification>,
            )
            return
        }

        if (editingAdditionalService) {
            updateMutation.mutate({
                id: editingAdditionalService.id,
                data,
            })
        } else {
            createMutation.mutate({
                ...data,
                service_id: serviceId,
                is_active: true,
            })
        }
    }

    const allAdditionalServices =
        isNewService && serviceData?.additional_services
            ? serviceData.additional_services
            : additionalServices.filter((s) => s.is_active)

    return (
        <>
            <Card className="mt-4 border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{tAdd('title')}</p>
                        <p className="mt-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                            {tAdd('description')}
                        </p>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="solid"
                        icon={<TbPlus />}
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIsModalOpen(true)
                        }}
                    >
                        {tAdd('manage')}
                    </Button>
                </div>
                {isLoading && !isNewService ? (
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400">{tAdd('loading')}</div>
                ) : allAdditionalServices.length === 0 ? (
                    <div className="rounded border border-gray-200 bg-white p-3 text-sm font-bold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        {tAdd('noServicesManage')}
                    </div>
                ) : (
                    <div className="space-y-2 rounded border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                        {allAdditionalServices.map((addService) => {
                            const price =
                                typeof addService.price === 'number'
                                    ? addService.price
                                    : typeof addService.price === 'string'
                                      ? parseFloat(addService.price)
                                      : 0
                            const numericPrice = Number.isNaN(price) ? 0 : price
                            return (
                                <div
                                    key={addService.id}
                                    className="flex items-center justify-between border-b border-gray-200 py-2 text-sm last:border-0 dark:border-gray-700"
                                >
                                    <span className="font-bold text-gray-900 dark:text-gray-100">{addService.name}</span>
                                    <span className="font-bold text-gray-900 dark:text-gray-100">
                                        ${numericPrice.toFixed(2)}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </Card>

            <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} width={800}>
                <div className="flex h-full max-h-[85vh] flex-col">
                    <div className="flex-shrink-0 border-b border-gray-200 px-6 pb-4 pt-6 dark:border-gray-700">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tAdd('manageTitle')}</h4>
                        <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                            {tAdd('serviceLabel')}: {serviceName}
                        </p>
                    </div>

                    <div className="booking-modal-scroll flex-1 overflow-y-auto px-6 py-4">
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {tAdd('manageTitle')}
                                {serviceId ? (
                                    <span className="ml-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                                        ({tAdd('fromDb')})
                                    </span>
                                ) : null}
                            </p>
                            <Button
                                type="button"
                                size="sm"
                                variant="solid"
                                icon={<TbPlus />}
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleAdd()
                                }}
                                disabled={false}
                            >
                                {tAdd('addButton')}
                            </Button>
                        </div>

                        {isLoading && serviceId ? (
                            <Loading loading />
                        ) : allAdditionalServices.length === 0 ? (
                            <div className="py-8 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                                {tAdd('noServices')}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {allAdditionalServices.map((addService) => (
                                    <Card key={addService.id} className="border border-gray-200 p-4 dark:border-gray-700">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h5 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {addService.name}
                                                </h5>
                                                {addService.description ? (
                                                    <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                                                        {addService.description}
                                                    </p>
                                                ) : null}
                                                <div className="mt-2 flex items-center gap-4">
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        $
                                                        {(() => {
                                                            const p =
                                                                typeof addService.price === 'number'
                                                                    ? addService.price
                                                                    : typeof addService.price === 'string'
                                                                      ? parseFloat(addService.price)
                                                                      : 0
                                                            const n = Number.isNaN(p) ? 0 : p
                                                            return n.toFixed(2)
                                                        })()}
                                                    </span>
                                                    {addService.duration ? (
                                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                            {formatDurationMinutesI18n(addService.duration, tDur)}
                                                        </span>
                                                    ) : null}
                                                    <span
                                                        className={`rounded px-2 py-1 text-xs ${
                                                            addService.is_active
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                        }`}
                                                    >
                                                        {addService.is_active ? tAdd('active') : tAdd('inactive')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="plain"
                                                    icon={<TbPencil />}
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleEdit(addService)
                                                    }}
                                                />
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="plain"
                                                    icon={<TbTrash />}
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleDelete(addService.id)
                                                    }}
                                                />
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
                isOpen={isFormModalOpen}
                onClose={() => {
                    setIsFormModalOpen(false)
                    setEditingAdditionalService(null)
                }}
                additionalService={editingAdditionalService}
                onSave={handleSave}
            />

            {isDeleteDialogOpen ? (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
                    <Card className="w-full max-w-md">
                        <div className="p-6">
                            <h4 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">{tAdd('deleteTitle')}</h4>
                            <p className="mb-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                {tAdd('deleteMessage')}
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="plain"
                                    onClick={() => {
                                        setIsDeleteDialogOpen(false)
                                        setAdditionalServiceToDelete(null)
                                    }}
                                >
                                    {tAdd('cancel')}
                                </Button>
                                <Button variant="solid" color="red" onClick={handleDeleteConfirm}>
                                    {tAdd('delete')}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            ) : null}
        </>
    )
}

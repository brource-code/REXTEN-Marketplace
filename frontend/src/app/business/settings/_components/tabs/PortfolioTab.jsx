'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Image from 'next/image'
import Tooltip from '@/components/ui/Tooltip'
import { PiUpload, PiImage } from 'react-icons/pi'
import { TbTrash } from 'react-icons/tb'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    getPortfolioItems, 
    createPortfolioItem, 
    deletePortfolioItem 
} from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

const PortfolioTab = () => {
    const t = useTranslations('business.settings.portfolio')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [workToDelete, setWorkToDelete] = useState(null)

    const { data: portfolio = [], isLoading } = useQuery({
        queryKey: ['business-portfolio'],
        queryFn: getPortfolioItems,
    })

    const createPortfolioMutation = useMutation({
        mutationFn: createPortfolioItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-portfolio'] })
            setIsUploadModalOpen(false)
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

    const deletePortfolioMutation = useMutation({
        mutationFn: deletePortfolioItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-portfolio'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.deleted')}
                </Notification>,
            )
            setIsDeleteDialogOpen(false)
            setWorkToDelete(null)
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.deleteError')}
                </Notification>,
            )
        },
    })

    const handleUpload = (workData) => {
        if (!workData.file) {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.selectImage')}
                </Notification>,
            )
            return
        }
        createPortfolioMutation.mutate({
            title: workData.title,
            category: workData.category,
            file: workData.file,
        })
    }

    const handleDelete = (workId) => {
        setWorkToDelete(workId)
        setIsDeleteDialogOpen(true)
    }

    const handleConfirmDelete = () => {
        if (workToDelete) {
            deletePortfolioMutation.mutate(workToDelete)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loading loading />
            </div>
        )
    }

    return (
        <>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4>{t('title')}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                            {t('description')}
                        </p>
                    </div>
                    <Button
                        variant="solid"
                        icon={<PiUpload />}
                        onClick={() => setIsUploadModalOpen(true)}
                    >
                        {t('uploadWork')}
                    </Button>
                </div>

                {portfolio.length === 0 ? (
                    <Card>
                        <div className="text-center py-12">
                            <PiImage className="text-4xl text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">{t('noWorks')}</p>
                            <p className="text-sm text-gray-400 mt-2">
                                {t('noWorksHint')}
                            </p>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {portfolio.map((work) => (
                            <Card key={work.id} className="p-0 overflow-hidden group relative">
                                <div className="aspect-square relative bg-gray-100 dark:bg-gray-800">
                                    <Image
                                        src={work.image}
                                        alt={work.title}
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Tooltip title={tCommon('delete')}>
                                            <div
                                                className="text-white cursor-pointer hover:text-red-400"
                                                onClick={() => handleDelete(work.id)}
                                            >
                                                <TbTrash className="text-xl" />
                                            </div>
                                        </Tooltip>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <div className="font-semibold text-sm mb-1">{work.title}</div>
                                    <div className="text-xs text-gray-500">{work.category}</div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <UploadWorkModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSave={handleUpload}
            />
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                type="danger"
                title={t('deleteConfirm.title')}
                onCancel={() => {
                    setIsDeleteDialogOpen(false)
                    setWorkToDelete(null)
                }}
                onConfirm={handleConfirmDelete}
                confirmText={t('deleteConfirm.confirm')}
                cancelText={tCommon('cancel')}
            >
                <p>{t('deleteConfirm.message')}</p>
            </ConfirmDialog>
        </>
    )
}

const UploadWorkModal = ({ isOpen, onClose, onSave }) => {
    const t = useTranslations('business.settings.portfolio')
    const tCommon = useTranslations('business.common')
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        file: null,
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        if (formData.title) {
            onSave(formData)
            setFormData({ title: '', category: '', file: null })
        }
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={500}>
            <div className="flex flex-col h-full max-h-[85vh]">
                {/* Заголовок */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h4 className="text-lg">{t('form.title')}</h4>
                    </div>
                
                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4" id="portfolio-form">
                            <FormItem label={t('form.workTitle')}>
                                <Input
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                                    }
                                    placeholder={t('form.workTitlePlaceholder')}
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
                            <FormItem label={t('form.image')}>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            file: e.target.files[0],
                                        }))
                                    }
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('form.imageHint')}
                                </p>
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
                            const form = document.getElementById('portfolio-form')
                            if (form) {
                                form.requestSubmit()
                            }
                        }}
                    >
                        {t('form.upload')}
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

export default PortfolioTab

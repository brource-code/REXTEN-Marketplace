'use client'
import { useState } from 'react'
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
                <Notification title="Успешно" type="success">
                    Работа успешно добавлена
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось добавить работу
                </Notification>,
            )
        },
    })

    const deletePortfolioMutation = useMutation({
        mutationFn: deletePortfolioItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-portfolio'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Работа успешно удалена
                </Notification>,
            )
            setIsDeleteDialogOpen(false)
            setWorkToDelete(null)
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось удалить работу
                </Notification>,
            )
        },
    })

    const handleUpload = (workData) => {
        if (!workData.file) {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Пожалуйста, выберите изображение
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
                        <h4>Портфолио</h4>
                        <p className="text-sm text-gray-500 mt-1">
                            Загрузка и управление работами
                        </p>
                    </div>
                    <Button
                        variant="solid"
                        icon={<PiUpload />}
                        onClick={() => setIsUploadModalOpen(true)}
                    >
                        Загрузить работу
                    </Button>
                </div>

                {portfolio.length === 0 ? (
                    <Card>
                        <div className="text-center py-12">
                            <PiImage className="text-4xl text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">Нет загруженных работ</p>
                            <p className="text-sm text-gray-400 mt-2">
                                Загрузите работы, чтобы показать их клиентам
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
                                        <Tooltip title="Удалить">
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
                title="Удалить работу?"
                onCancel={() => {
                    setIsDeleteDialogOpen(false)
                    setWorkToDelete(null)
                }}
                onConfirm={handleConfirmDelete}
                confirmText="Удалить"
                cancelText="Отмена"
            >
                <p>Вы уверены, что хотите удалить эту работу?</p>
            </ConfirmDialog>
        </>
    )
}

const UploadWorkModal = ({ isOpen, onClose, onSave }) => {
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
                    <h4 className="text-lg">Загрузить работу</h4>
                    </div>
                
                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4" id="portfolio-form">
                            <FormItem label="Название работы">
                                <Input
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                                    }
                                    placeholder="Например: Стрижка мужская"
                                    required
                                />
                            </FormItem>
                            <FormItem label="Категория">
                                <Input
                                    value={formData.category}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            category: e.target.value,
                                        }))
                                    }
                                    placeholder="Например: Стрижки"
                                />
                            </FormItem>
                            <FormItem label="Изображение">
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
                                    Рекомендуемый размер: 800x800px
                                </p>
                            </FormItem>
                    </form>
                </div>

                {/* Кнопки - зафиксированы снизу */}
                <div className="flex-shrink-0 px-6 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <Button type="button" variant="plain" onClick={onClose}>
                        Отмена
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
                        Загрузить
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

export default PortfolioTab

'use client'
import { useState, useEffect } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import { FormItem } from '@/components/ui/Form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCategory, updateCategory } from '@/lib/api/superadmin'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

const CreateCategoryModal = ({ isOpen, onClose, category = null }) => {
    const queryClient = useQueryClient()
    const isEdit = !!category

    const [formData, setFormData] = useState({
        name: category?.name || '',
        slug: category?.slug || '',
        description: category?.description || '',
        icon: category?.icon || '',
        sort_order: category?.sort_order || 0,
        is_active: category?.is_active !== undefined ? category.is_active : true,
    })

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name || '',
                slug: category.slug || '',
                description: category.description || '',
                icon: category.icon || '',
                sort_order: category.sort_order || 0,
                is_active: category.is_active !== undefined ? category.is_active : true,
            })
        } else {
            setFormData({
                name: '',
                slug: '',
                description: '',
                icon: '',
                sort_order: 0,
                is_active: true,
            })
        }
    }, [category, isOpen])

    const createMutation = useMutation({
        mutationFn: createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries(['categories'])
            toast.push(
                <Notification title="Успешно" type="success">
                    Категория создана
                </Notification>
            )
            onClose()
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message || 
                                (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(', ') : 'Не удалось создать категорию')
            toast.push(
                <Notification title="Ошибка" type="danger">
                    {errorMessage}
                </Notification>
            )
        },
    })

    const updateMutation = useMutation({
        mutationFn: (data) => updateCategory(category.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['categories'])
            toast.push(
                <Notification title="Успешно" type="success">
                    Категория обновлена
                </Notification>
            )
            onClose()
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message || 
                                (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(', ') : 'Не удалось обновить категорию')
            toast.push(
                <Notification title="Ошибка" type="danger">
                    {errorMessage}
                </Notification>
            )
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        
        if (isEdit) {
            updateMutation.mutate(formData)
        } else {
            createMutation.mutate(formData)
        }
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={600}>
            <div className="flex flex-col h-full max-h-[85vh]">
                {/* Заголовок - снаружи скролла */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h4 className="text-lg">{isEdit ? 'Редактировать категорию' : 'Создать категорию'}</h4>
                </div>

                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-3" id="create-category-form">
                    <FormItem label="Название" required>
                        <Input
                            size="sm"
                            value={formData.name}
                            onChange={(e) => {
                                const name = e.target.value
                                setFormData({ 
                                    ...formData, 
                                    name,
                                    slug: isEdit ? formData.slug : formData.slug || name.toLowerCase().replace(/\s+/g, '-')
                                })
                            }}
                            placeholder="Введите название категории"
                            required
                        />
                    </FormItem>

                    <FormItem label="Slug (URL)" required>
                        <Input
                            size="sm"
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                            placeholder="category-slug"
                            required
                        />
                    </FormItem>

                    <FormItem label="Описание">
                        <Input
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Введите описание категории"
                            textArea
                            rows={2}
                        />
                    </FormItem>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormItem label="Иконка">
                            <Input
                                size="sm"
                                value={formData.icon}
                                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                placeholder="Название иконки"
                            />
                        </FormItem>
                        <FormItem label="Порядок сортировки">
                            <Input
                                size="sm"
                                type="number"
                                min="0"
                                value={formData.sort_order}
                                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                placeholder="0"
                            />
                        </FormItem>
                    </div>

                    <FormItem label="Активна">
                        <Switcher
                            checked={formData.is_active}
                            onChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
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
                        loading={createMutation.isPending || updateMutation.isPending}
                        onClick={(e) => {
                            e.preventDefault()
                            const form = document.getElementById('create-category-form')
                            if (form) {
                                form.requestSubmit()
                            }
                        }}
                    >
                        {isEdit ? 'Сохранить' : 'Создать'}
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

export default CreateCategoryModal


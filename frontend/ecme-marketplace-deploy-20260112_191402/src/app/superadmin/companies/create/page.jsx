'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem, FormContainer } from '@/components/ui/Form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCompany, getUsers, getCategories } from '@/lib/api/superadmin'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { PiArrowLeft, PiPlus } from 'react-icons/pi'
import CreateOwnerModal from './_components/CreateOwnerModal'

export default function CreateCompanyPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false)

    // Получаем список пользователей для выбора владельца
    const { data: usersData, refetch: refetchUsers } = useQuery({
        queryKey: ['users-for-company'],
        queryFn: () => getUsers({ role: 'BUSINESS_OWNER' }),
    })

    // Получаем список категорий
    const { data: categoriesData } = useQuery({
        queryKey: ['categories-for-company'],
        queryFn: () => getCategories({ is_active: true }),
    })

    const [formData, setFormData] = useState({
        owner_id: '',
        name: '',
        slug: '',
        description: '',
        email: '',
        phone: '',
        category: '',
        status: 'pending',
        subscription_plan: 'basic',
    })

    const createMutation = useMutation({
        mutationFn: createCompany,
        onSuccess: () => {
            // Инвалидируем все запросы компаний с разными параметрами
            queryClient.invalidateQueries({ queryKey: ['companies'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Компания создана
                </Notification>
            )
            router.push('/superadmin/companies')
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message || 
                                (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(', ') : 'Не удалось создать компанию')
            toast.push(
                <Notification title="Ошибка" type="danger">
                    {errorMessage}
                </Notification>
            )
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        createMutation.mutate({
            owner_id: parseInt(formData.owner_id),
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            email: formData.email,
            phone: formData.phone,
            category: formData.category,
        })
    }

    const statusOptions = [
        { value: 'pending', label: 'Ожидает' },
        { value: 'active', label: 'Активен' },
        { value: 'suspended', label: 'Приостановлен' },
        { value: 'rejected', label: 'Отклонен' },
    ]

    const subscriptionOptions = [
        { value: 'basic', label: 'Базовый' },
        { value: 'premium', label: 'Премиум' },
        { value: 'enterprise', label: 'Корпоративный' },
    ]

    const ownerOptions = usersData?.data?.map(user => ({
        value: user.id,
        label: `${user.name} (${user.email})`,
    })) || []

    const categoryOptions = categoriesData?.data?.map(category => ({
        value: category.name, // Передаем название, так как бэкенд ожидает строку
        label: category.name,
        categoryId: category.id, // Сохраняем ID для возможного будущего использования
    })) || []

    const handleOwnerCreated = (newUser) => {
        // Обновляем список пользователей
        refetchUsers()
        // Автоматически выбираем созданного владельца
        setFormData(prev => ({ ...prev, owner_id: newUser.id }))
    }

    return (
        <Container>
            <div className="mb-4">
                <Button
                    variant="plain"
                    size="sm"
                    icon={<PiArrowLeft />}
                    onClick={() => router.back()}
                >
                    Назад к списку
                </Button>
            </div>

            <Card>
                <div className="p-6">
                    <div className="mb-6">
                        <h3>Создать компанию</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Заполните форму для создания новой компании
                        </p>
                    </div>

                    <FormContainer>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <FormItem label="Владелец" required>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Select
                                            size="sm"
                                            options={ownerOptions}
                                            value={ownerOptions.find(opt => opt.value === formData.owner_id)}
                                            onChange={(option) => setFormData({ ...formData, owner_id: option.value })}
                                            placeholder="Выберите владельца"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        icon={<PiPlus />}
                                        onClick={() => setIsOwnerModalOpen(true)}
                                    >
                                        Создать
                                    </Button>
                                </div>
                            </FormItem>

                            <FormItem label="Название компании" required>
                                <Input
                                    size="sm"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Введите название компании"
                                    required
                                />
                            </FormItem>

                            <FormItem label="Slug (URL)" required>
                                <Input
                                    size="sm"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                    placeholder="company-slug"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Используется в URL компании. Только латинские буквы, цифры и дефисы.
                                </p>
                            </FormItem>

                            <FormItem label="Описание">
                                <Input
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Введите описание компании"
                                    textArea
                                    rows={4}
                                />
                            </FormItem>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormItem label="Email">
                                    <Input
                                        size="sm"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="company@example.com"
                                    />
                                </FormItem>
                                <FormItem label="Телефон">
                                    <Input
                                        size="sm"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+7 (999) 123-45-67"
                                    />
                                </FormItem>
                            </div>

                            <FormItem label="Категория">
                                <Select
                                    size="sm"
                                    isSearchable
                                    isClearable
                                    options={categoryOptions}
                                    value={categoryOptions.find(opt => opt.value === formData.category)}
                                    onChange={(option) => setFormData({ ...formData, category: option?.value || '' })}
                                    placeholder="Выберите категорию бизнеса"
                                    menuPortalTarget={document.body}
                                    menuPosition="fixed"
                                />
                            </FormItem>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormItem label="Статус">
                                    <Select
                                        size="sm"
                                        options={statusOptions}
                                        value={statusOptions.find(opt => opt.value === formData.status)}
                                        onChange={(option) => setFormData({ ...formData, status: option.value })}
                                    />
                                </FormItem>
                                <FormItem label="Подписка">
                                    <Select
                                        size="sm"
                                        options={subscriptionOptions}
                                        value={subscriptionOptions.find(opt => opt.value === formData.subscription_plan)}
                                        onChange={(option) => setFormData({ ...formData, subscription_plan: option.value })}
                                    />
                                </FormItem>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-gray-200 dark:border-gray-700">
                                <Button 
                                    type="button" 
                                    variant="plain" 
                                    onClick={() => router.back()}
                                >
                                    Отмена
                                </Button>
                                <Button
                                    type="submit"
                                    variant="solid"
                                    loading={createMutation.isPending}
                                >
                                    Создать компанию
                                </Button>
                            </div>
                        </form>
                    </FormContainer>
                </div>
            </Card>

            <CreateOwnerModal
                isOpen={isOwnerModalOpen}
                onClose={() => setIsOwnerModalOpen(false)}
                onOwnerCreated={handleOwnerCreated}
            />
        </Container>
    )
}


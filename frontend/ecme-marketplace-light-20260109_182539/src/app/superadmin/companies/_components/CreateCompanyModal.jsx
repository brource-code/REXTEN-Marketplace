'use client'
import { useState, useEffect } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCompany, updateCompany, getUsers } from '@/lib/api/superadmin'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

const CreateCompanyModal = ({ isOpen, onClose, company = null }) => {
    const queryClient = useQueryClient()
    const isEdit = !!company

    // Получаем полные данные компании из API при редактировании
    const { data: companyData, isLoading: isLoadingCompany } = useQuery({
        queryKey: ['company', company?.id],
        queryFn: async () => {
            const response = await LaravelAxios.get(`/admin/companies/${company.id}`)
            return response.data
        },
        enabled: isOpen && isEdit && !!company?.id,
    })

    // Получаем список пользователей для выбора владельца
    const { data: usersData } = useQuery({
        queryKey: ['users-for-company'],
        queryFn: () => getUsers({ role: 'BUSINESS_OWNER' }),
        enabled: isOpen && !isEdit,
    })

    const currentCompany = companyData?.data || company

    const [formData, setFormData] = useState({
        owner_id: currentCompany?.owner_id || '',
        name: currentCompany?.name || '',
        slug: currentCompany?.slug || '',
        description: currentCompany?.description || '',
        email: currentCompany?.email || '',
        phone: currentCompany?.phone || '',
        category: currentCompany?.category || '',
        status: currentCompany?.status || 'pending',
        subscription_plan: currentCompany?.subscription_plan || currentCompany?.subscription || 'basic',
    })

    useEffect(() => {
        if (currentCompany) {
            setFormData({
                owner_id: currentCompany.owner_id || '',
                name: currentCompany.name || '',
                slug: currentCompany.slug || '',
                description: currentCompany.description || '',
                email: currentCompany.email || '',
                phone: currentCompany.phone || '',
                category: currentCompany.category || '',
                status: currentCompany.status || 'pending',
                subscription_plan: currentCompany.subscription_plan || currentCompany.subscription || 'basic',
            })
        } else {
            setFormData({
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
        }
    }, [currentCompany, isOpen])

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
            onClose()
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

    const updateMutation = useMutation({
        mutationFn: (data) => updateCompany(currentCompany.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] })
            queryClient.invalidateQueries({ queryKey: ['company', currentCompany.id] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Компания обновлена
                </Notification>
            )
            onClose()
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message || 
                                (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(', ') : 'Не удалось обновить компанию')
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
            // При редактировании отправляем только изменяемые поля
            const updateData = {
                name: formData.name,
                slug: formData.slug,
                description: formData.description,
                status: formData.status,
            }
            updateMutation.mutate(updateData)
        } else {
            // При создании отправляем все поля
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

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={700}>
            <div className="flex flex-col h-full max-h-[85vh]">
                {/* Заголовок - снаружи скролла */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h4 className="text-lg">{isEdit ? 'Редактировать компанию' : 'Создать компанию'}</h4>
                </div>

                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    {isEdit && isLoadingCompany ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-sm text-gray-500">Загрузка данных компании...</div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-3">
                    {!isEdit && (
                        <FormItem label="Владелец" required>
                            <Select
                                size="sm"
                                options={ownerOptions}
                                value={ownerOptions.find(opt => opt.value === formData.owner_id)}
                                onChange={(option) => setFormData({ ...formData, owner_id: option.value })}
                                placeholder="Выберите владельца"
                            />
                        </FormItem>
                    )}

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
                    </FormItem>

                    <FormItem label="Описание">
                        <Input
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Введите описание"
                            textArea
                            rows={2}
                        />
                    </FormItem>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormItem label="Email">
                            <Input
                                type="email"
                                size="sm"
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
                        <Input
                            size="sm"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            placeholder="Категория бизнеса"
                        />
                    </FormItem>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        </form>
                    )}
                </div>

                {/* Кнопки - зафиксированы снизу */}
                {!isEdit || !isLoadingCompany ? (
                    <div className="flex-shrink-0 px-6 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                        <Button type="button" variant="plain" onClick={onClose}>
                            Отмена
                        </Button>
                        <Button
                            type="button"
                            variant="solid"
                            loading={createMutation.isPending || updateMutation.isPending}
                            disabled={isEdit && isLoadingCompany}
                            onClick={(e) => {
                                e.preventDefault()
                                const form = document.querySelector('form')
                                if (form) {
                                    form.requestSubmit()
                                }
                            }}
                        >
                            {isEdit ? 'Сохранить' : 'Создать'}
                        </Button>
                    </div>
                ) : null}
            </div>
        </Dialog>
    )
}

export default CreateCompanyModal


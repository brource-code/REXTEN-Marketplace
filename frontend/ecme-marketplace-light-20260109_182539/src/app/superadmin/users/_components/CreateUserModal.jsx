'use client'
import { useState, useEffect } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createUser, updateUser } from '@/lib/api/superadmin'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { CLIENT, BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'

const CreateUserModal = ({ isOpen, onClose, user = null }) => {
    const queryClient = useQueryClient()
    const isEdit = !!user

    const [formData, setFormData] = useState({
        email: user?.email || '',
        password: '',
        role: user?.role || CLIENT,
        firstName: user?.name?.split(' ')[0] || '',
        lastName: user?.name?.split(' ').slice(1).join(' ') || '',
        isActive: user?.isActive !== undefined ? user.isActive : true,
    })

    useEffect(() => {
        if (user) {
            setFormData({
                email: user.email || '',
                password: '',
                role: user.role || CLIENT,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                isActive: user.isActive !== undefined ? user.isActive : true,
            })
        } else {
            setFormData({
                email: '',
                password: '',
                role: CLIENT,
                firstName: '',
                lastName: '',
                isActive: true,
            })
        }
    }, [user, isOpen])

    const createMutation = useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            queryClient.invalidateQueries(['users'])
            toast.push(
                <Notification title="Успешно" type="success">
                    Пользователь создан
                </Notification>
            )
            onClose()
        },
        onError: (error) => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    {error.response?.data?.message || 'Не удалось создать пользователя'}
                </Notification>
            )
        },
    })

    const updateMutation = useMutation({
        mutationFn: (data) => updateUser(user.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['users'])
            toast.push(
                <Notification title="Успешно" type="success">
                    Пользователь обновлен
                </Notification>
            )
            onClose()
        },
        onError: (error) => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    {error.response?.data?.message || 'Не удалось обновить пользователя'}
                </Notification>
            )
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        
        if (isEdit) {
            // При редактировании не отправляем пароль, если он не заполнен
            const updateData = { ...formData }
            if (!updateData.password) {
                delete updateData.password
            }
            updateMutation.mutate(updateData)
        } else {
            if (!formData.password) {
                toast.push(
                    <Notification title="Ошибка" type="danger">
                        Пароль обязателен для нового пользователя
                    </Notification>
                )
                return
            }
            createMutation.mutate(formData)
        }
    }

    const roleOptions = [
        { value: CLIENT, label: 'Клиент' },
        { value: BUSINESS_OWNER, label: 'Владелец бизнеса' },
        { value: SUPERADMIN, label: 'Супер-админ' },
    ]

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={600}>
            <div className="flex flex-col h-full max-h-[85vh]">
                {/* Заголовок - снаружи скролла */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h4 className="text-lg">{isEdit ? 'Редактировать пользователя' : 'Создать пользователя'}</h4>
                </div>

                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-3" id="create-user-form">
                    <FormItem label="Email" required>
                        <Input
                            size="sm"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="user@example.com"
                            required
                            disabled={isEdit}
                        />
                    </FormItem>

                    <FormItem label={isEdit ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль'} required={!isEdit}>
                        <Input
                            size="sm"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Введите пароль"
                            required={!isEdit}
                        />
                    </FormItem>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormItem label="Имя">
                            <Input
                                size="sm"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                placeholder="Имя"
                            />
                        </FormItem>
                        <FormItem label="Фамилия">
                            <Input
                                size="sm"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                placeholder="Фамилия"
                            />
                        </FormItem>
                    </div>

                    <FormItem label="Роль" required>
                        <Select
                            size="sm"
                            options={roleOptions}
                            value={roleOptions.find(opt => opt.value === formData.role)}
                            onChange={(option) => setFormData({ ...formData, role: option.value })}
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
                            const form = document.getElementById('create-user-form')
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

export default CreateUserModal


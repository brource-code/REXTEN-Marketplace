'use client'
import { useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createUser } from '@/lib/api/superadmin'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { BUSINESS_OWNER } from '@/constants/roles.constant'

const CreateOwnerModal = ({ isOpen, onClose, onOwnerCreated }) => {
    const queryClient = useQueryClient()

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
    })

    const createMutation = useMutation({
        mutationFn: createUser,
        onSuccess: (newUser) => {
            queryClient.invalidateQueries(['users-for-company'])
            toast.push(
                <Notification title="Успешно" type="success">
                    Владелец создан
                </Notification>
            )
            // Вызываем callback с новым пользователем
            onOwnerCreated?.(newUser)
            // Сбрасываем форму
            setFormData({
                email: '',
                password: '',
                firstName: '',
                lastName: '',
            })
            onClose()
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message || 
                                (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(', ') : 'Не удалось создать владельца')
            toast.push(
                <Notification title="Ошибка" type="danger">
                    {errorMessage}
                </Notification>
            )
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.password) {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Пароль обязателен
                </Notification>
            )
            return
        }
        createMutation.mutate({
            email: formData.email,
            password: formData.password,
            role: BUSINESS_OWNER,
            firstName: formData.firstName,
            lastName: formData.lastName,
        })
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={600}>
            <div className="flex flex-col h-full max-h-[85vh]">
                {/* Заголовок - снаружи скролла */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h4 className="text-lg">Создать владельца бизнеса</h4>
                </div>

                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-3" id="create-owner-form">
                    <FormItem label="Email" required>
                        <Input
                            size="sm"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="owner@example.com"
                            required
                        />
                    </FormItem>

                    <FormItem label="Пароль" required>
                        <Input
                            size="sm"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Введите пароль"
                            required
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
                        loading={createMutation.isPending}
                        onClick={(e) => {
                            e.preventDefault()
                            const form = document.getElementById('create-owner-form')
                            if (form) {
                                form.requestSubmit()
                            }
                        }}
                    >
                        Создать
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

export default CreateOwnerModal


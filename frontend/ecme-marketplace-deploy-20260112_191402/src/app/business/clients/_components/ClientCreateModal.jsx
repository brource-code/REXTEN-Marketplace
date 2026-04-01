'use client'
import { useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Select from '@/components/ui/Select'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/api/business'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import GooglePlacesAutocomplete from '@/components/shared/GooglePlacesAutocomplete'

const ClientCreateModal = ({ isOpen, onClose, onSuccess }) => {
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        status: 'regular',
    })

    const statusOptions = [
        { value: 'regular', label: 'Обычный' },
        { value: 'permanent', label: 'Постоянный' },
        { value: 'vip', label: 'VIP' },
    ]

    const createMutation = useMutation({
        mutationFn: (data) => createClient(data),
        onSuccess: (response) => {
            const newClient = response?.data || response
            
            queryClient.invalidateQueries({ queryKey: ['business-clients'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Клиент успешно создан
                </Notification>,
            )
            
            // Если передан callback onSuccess, вызываем его с данными нового клиента
            if (onSuccess && newClient) {
                onSuccess(newClient)
            }
            
            // Сброс формы
            setFormData({
                name: '',
                email: '',
                phone: '',
                address: '',
                status: 'regular',
            })
            onClose()
        },
        onError: (error) => {
            // Обработка ошибок валидации
            let errorMessage = 'Не удалось создать клиента'
            
            if (error?.response?.data?.errors) {
                // Laravel валидация - показываем первую ошибку
                const errors = error.response.data.errors
                const firstError = Object.values(errors).flat()[0]
                errorMessage = firstError || errorMessage
            } else if (error?.response?.data?.message) {
                errorMessage = error.response.data.message
            } else if (error?.message) {
                errorMessage = error.message
            }
            
            toast.push(
                <Notification title="Ошибка" type="danger">
                    {errorMessage}
                </Notification>,
            )
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        createMutation.mutate({
            name: formData.name,
            email: formData.email || undefined, // Отправляем только если указан
            phone: formData.phone || undefined,
            address: formData.address || undefined,
            status: formData.status,
        })
    }

    const handleStatusChange = (option) => {
        if (option) {
            setFormData(prev => ({ ...prev, status: option.value }))
        }
    }

    const handleClose = () => {
        // Сброс формы при закрытии
        setFormData({
            name: '',
            email: '',
            phone: '',
            address: '',
            status: 'regular',
        })
        onClose()
    }

    return (
        <Dialog isOpen={isOpen} onClose={handleClose} width={600}>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col h-full max-h-[85vh]">
                    {/* Заголовок */}
                    <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h3 className="text-lg">Создать клиента</h3>
                    </div>
                    
                    {/* Скроллируемый контент */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <FormItem label="Имя" required>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Введите имя клиента"
                                required
                            />
                        </FormItem>

                        <FormItem label="Email">
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="Введите email (необязательно)"
                            />
                        </FormItem>

                        <FormItem label="Телефон">
                            <Input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="Введите телефон"
                            />
                        </FormItem>

                        <FormItem label="Адрес">
                            <GooglePlacesAutocomplete
                                value={formData.address}
                                onChange={(address) => setFormData(prev => ({ ...prev, address }))}
                                placeholder="Введите адрес (необязательно)"
                            />
                        </FormItem>

                        <FormItem label="Статус">
                            <Select
                                value={statusOptions.find(opt => opt.value === formData.status) || statusOptions[0]}
                                options={statusOptions}
                                onChange={handleStatusChange}
                            />
                        </FormItem>
                    </div>

                    {/* Футер */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end gap-2">
                        <Button variant="plain" onClick={handleClose}>
                            Отмена
                        </Button>
                        <Button
                            variant="solid"
                            type="submit"
                            loading={createMutation.isPending}
                        >
                            Создать
                        </Button>
                    </div>
                </div>
            </form>
        </Dialog>
    )
}

export default ClientCreateModal


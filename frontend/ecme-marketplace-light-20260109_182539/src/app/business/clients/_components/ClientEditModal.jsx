'use client'
import { useState, useEffect } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Select from '@/components/ui/Select'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateClient } from '@/lib/api/business'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

const ClientEditModal = ({ isOpen, onClose, client }) => {
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        status: 'regular',
    })

    useEffect(() => {
        if (client) {
            setFormData({
                name: client.name || '',
                email: client.email || '',
                phone: client.phone || '',
                status: client.status || 'regular',
            })
        }
    }, [client])

    const statusOptions = [
        { value: 'regular', label: 'Обычный' },
        { value: 'permanent', label: 'Постоянный' },
        { value: 'vip', label: 'VIP' },
    ]

    const updateMutation = useMutation({
        mutationFn: (data) => updateClient(client.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-clients'] })
            queryClient.invalidateQueries({ queryKey: ['client-details', client.id] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Данные клиента обновлены
                </Notification>,
            )
            onClose()
        },
        onError: (error) => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось обновить данные: {error.response?.data?.message || error.message}
                </Notification>,
            )
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        updateMutation.mutate({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            status: formData.status,
        })
    }

    const handleStatusChange = (option) => {
        if (option) {
            setFormData(prev => ({ ...prev, status: option.value }))
        }
    }

    if (!client) return null

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={600}>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col h-full max-h-[85vh]">
                    {/* Заголовок */}
                    <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h3 className="text-lg">Редактировать клиента</h3>
                    </div>
                    
                    {/* Скроллируемый контент */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <FormItem label="Имя">
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Введите имя клиента"
                            />
                        </FormItem>

                        <FormItem label="Email">
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="Введите email"
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
                        <Button variant="plain" onClick={onClose}>
                            Отмена
                        </Button>
                        <Button
                            variant="solid"
                            type="submit"
                            loading={updateMutation.isPending}
                        >
                            Сохранить
                        </Button>
                    </div>
                </div>
            </form>
        </Dialog>
    )
}

export default ClientEditModal


'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Select from '@/components/ui/Select'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/api/business'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import AddressAutocomplete from '@/components/shared/AddressAutocomplete'

const ClientCreateModal = ({ isOpen, onClose, onSuccess }) => {
    const t = useTranslations('business.clients.createModal')
    const tStatuses = useTranslations('business.clients.statuses')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        status: 'regular',
    })

    const statusOptions = [
        { value: 'regular', label: tStatuses('regular') },
        { value: 'permanent', label: tStatuses('permanent') },
        { value: 'vip', label: tStatuses('vip') },
    ]

    const createMutation = useMutation({
        mutationFn: (data) => createClient(data),
        onSuccess: (response) => {
            const newClient = response?.data || response
            
            queryClient.invalidateQueries({ queryKey: ['business-clients'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('success')}
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
            let errorMessage = t('error')
            
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
                <Notification title={tCommon('error')} type="danger">
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
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                    </div>
                    
                    {/* Скроллируемый контент */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <FormItem label={t('name')} required>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={t('namePlaceholder')}
                                required
                            />
                        </FormItem>

                        <FormItem label={t('email')}>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder={t('emailPlaceholder')}
                            />
                        </FormItem>

                        <FormItem label={t('phone')}>
                            <Input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder={t('phonePlaceholder')}
                            />
                        </FormItem>

                        <FormItem label={t('address')}>
                            <AddressAutocomplete
                                value={formData.address}
                                onChange={(address) => setFormData(prev => ({ ...prev, address }))}
                                placeholder={t('addressPlaceholder')}
                            />
                        </FormItem>

                        <FormItem label={t('status')}>
                            <Select
                                value={statusOptions.find(opt => opt.value === formData.status) || statusOptions[0]}
                                options={statusOptions}
                                onChange={handleStatusChange}
                                isSearchable={false}
                            />
                        </FormItem>
                    </div>

                    {/* Футер */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end gap-2">
                        <Button type="button" variant="plain" onClick={handleClose}>
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="solid"
                            type="submit"
                            loading={createMutation.isPending}
                        >
                            {t('create')}
                        </Button>
                    </div>
                </div>
            </form>
        </Dialog>
    )
}

export default ClientCreateModal


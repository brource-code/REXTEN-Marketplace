'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Select from '@/components/ui/Select'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateClient } from '@/lib/api/business'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import AddressAutocomplete from '@/components/shared/AddressAutocomplete'

const ClientEditModal = ({ isOpen, onClose, client }) => {
    const t = useTranslations('business.clients.editModal')
    const tCreate = useTranslations('business.clients.createModal')
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

    useEffect(() => {
        if (client) {
            setFormData({
                name: client.name || '',
                email: client.email || '',
                phone: client.phone || '',
                address: client.address || '',
                status: client.status || 'regular',
            })
        }
    }, [client])

    const statusOptions = [
        { value: 'regular', label: tStatuses('regular') },
        { value: 'permanent', label: tStatuses('permanent') },
        { value: 'vip', label: tStatuses('vip') },
    ]

    const updateMutation = useMutation({
        mutationFn: (data) => updateClient(client.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-clients'] })
            queryClient.invalidateQueries({ queryKey: ['client-details', client.id] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('success')}
                </Notification>,
            )
            onClose()
        },
        onError: (error) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('error')}: {error.response?.data?.message || error.message}
                </Notification>,
            )
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        
        // Проверяем, является ли email placeholder или невалидным
        const isPlaceholderEmail = formData.email && (
            formData.email.includes('@local.local') || 
            !formData.email.includes('@') ||
            formData.email.trim() === ''
        )
        
        updateMutation.mutate({
            name: formData.name,
            email: (formData.email && !isPlaceholderEmail) ? formData.email : undefined,
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

    if (!client) return null

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={600}>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col h-full max-h-[85vh]">
                    {/* Заголовок */}
                    <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                    </div>
                    
                    {/* Скроллируемый контент */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <FormItem label={tCreate('name')}>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={t('namePlaceholder')}
                            />
                        </FormItem>

                        <FormItem label={tCreate('email')}>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder={t('emailPlaceholder')}
                            />
                        </FormItem>

                        <FormItem label={tCreate('phone')}>
                            <Input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder={t('phonePlaceholder')}
                            />
                        </FormItem>

                        <FormItem label={tCreate('address')}>
                            <AddressAutocomplete
                                value={formData.address}
                                onChange={(address) => setFormData(prev => ({ ...prev, address }))}
                                placeholder={t('addressPlaceholder')}
                            />
                        </FormItem>

                        <FormItem label={tCreate('status')}>
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
                        <Button variant="plain" onClick={onClose}>
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="solid"
                            type="submit"
                            loading={updateMutation.isPending}
                        >
                            {t('save')}
                        </Button>
                    </div>
                </div>
            </form>
        </Dialog>
    )
}

export default ClientEditModal


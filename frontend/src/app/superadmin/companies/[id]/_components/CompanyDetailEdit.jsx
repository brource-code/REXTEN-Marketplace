'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem, FormContainer } from '@/components/ui/Form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { updateCompany, getCategories, getUsers } from '@/lib/api/superadmin'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useTranslations } from 'next-intl'

export default function CompanyDetailEdit({ company, companyId }) {
    const t = useTranslations('superadmin.companyDetail.edit')
    const queryClient = useQueryClient()

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        email: '',
        phone: '',
        category: '',
        status: 'pending',
        subscription_plan: 'basic',
        owner_id: '',
    })

    // Получаем список категорий
    const { data: categoriesData } = useQuery({
        queryKey: ['categories-for-company'],
        queryFn: () => getCategories({ is_active: true }),
    })

    // Получаем список пользователей для смены владельца
    const { data: usersData } = useQuery({
        queryKey: ['users-for-company'],
        queryFn: () => getUsers({ role: 'BUSINESS_OWNER' }),
    })

    useEffect(() => {
        if (company) {
            setFormData({
                name: company.name || '',
                slug: company.slug || '',
                description: company.description || '',
                email: company.email || '',
                phone: company.phone || '',
                category: company.category || '',
                status: company.status || 'pending',
                subscription_plan: company.subscription_plan || 'basic',
                owner_id: company.owner_id || company.owner?.id || '',
            })
        }
    }, [company])

    const updateMutation = useMutation({
        mutationFn: (data) => updateCompany(companyId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] })
            queryClient.invalidateQueries({ queryKey: ['superadmin-company', companyId] })
            toast.push(
                <Notification title={t('successTitle')} type="success">
                    {t('successMessage')}
                </Notification>,
            )
        },
        onError: (error) => {
            const msg =
                error.response?.data?.message ||
                (error.response?.data?.errors
                    ? Object.values(error.response.data.errors).flat().join(', ')
                    : t('errorMessage'))
            toast.push(
                <Notification title={t('errorTitle')} type="danger">
                    {msg}
                </Notification>,
            )
        },
    })

    const statusOptions = [
        { value: 'pending', label: t('statusPending') },
        { value: 'active', label: t('statusActive') },
        { value: 'suspended', label: t('statusSuspended') },
        { value: 'rejected', label: t('statusRejected') },
    ]

    const subscriptionOptions = [
        { value: 'basic', label: t('subscriptionBasic') },
        { value: 'premium', label: t('subscriptionPremium') },
        { value: 'enterprise', label: t('subscriptionEnterprise') },
    ]

    const categoryOptions = categoriesData?.data?.map(category => ({
        value: category.name,
        label: category.name,
    })) || []

    const ownerOptions = usersData?.data?.map(user => ({
        value: user.id,
        label: `${user.name} (${user.email})`,
    })) || []

    const handleSubmit = (e) => {
        e.preventDefault()
        updateMutation.mutate({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            email: formData.email,
            phone: formData.phone,
            category: formData.category,
            status: formData.status,
            subscription_plan: formData.subscription_plan,
            owner_id: formData.owner_id ? parseInt(formData.owner_id) : undefined,
        })
    }

    if (!company) return null

    return (
        <Card className="p-4">
            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('title')}</h4>
            <FormContainer>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <FormItem label={t('owner')}>
                        <Select
                            size="sm"
                            isSearchable
                            options={ownerOptions}
                            value={ownerOptions.find(opt => opt.value === formData.owner_id)}
                            onChange={(option) => setFormData({ ...formData, owner_id: option?.value || '' })}
                            placeholder={t('selectOwner')}
                            isClearable
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {t('ownerHint')}
                        </p>
                    </FormItem>

                    <FormItem label={t('name')} required>
                        <Input
                            size="sm"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder={t('namePlaceholder')}
                            required
                        />
                    </FormItem>

                    <FormItem label={t('slug')} required>
                        <Input
                            size="sm"
                            value={formData.slug}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                                })
                            }
                            placeholder="company-slug"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {t('slugHint')}
                        </p>
                    </FormItem>

                    <FormItem label={t('description')}>
                        <Input
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder={t('descriptionPlaceholder')}
                            textArea
                            rows={4}
                        />
                    </FormItem>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormItem label={t('email')}>
                            <Input
                                size="sm"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="company@example.com"
                            />
                        </FormItem>
                        <FormItem label={t('phone')}>
                            <Input
                                size="sm"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+7 (999) 123-45-67"
                            />
                        </FormItem>
                    </div>

                    <FormItem label={t('category')}>
                        <Select
                            size="sm"
                            isSearchable
                            isClearable
                            options={categoryOptions}
                            value={categoryOptions.find(opt => opt.value === formData.category)}
                            onChange={(option) => setFormData({ ...formData, category: option?.value || '' })}
                            placeholder={t('selectCategory')}
                        />
                    </FormItem>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormItem label={t('status')}>
                            <Select
                                size="sm"
                                options={statusOptions}
                                value={statusOptions.find((opt) => opt.value === formData.status)}
                                onChange={(option) => setFormData({ ...formData, status: option.value })}
                            />
                        </FormItem>
                        <FormItem label={t('subscription')}>
                            <Select
                                size="sm"
                                options={subscriptionOptions}
                                value={subscriptionOptions.find((opt) => opt.value === formData.subscription_plan)}
                                onChange={(option) => setFormData({ ...formData, subscription_plan: option.value })}
                            />
                        </FormItem>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-gray-200 dark:border-gray-700">
                        <Button type="submit" variant="solid" loading={updateMutation.isPending}>
                            {t('save')}
                        </Button>
                    </div>
                </form>
            </FormContainer>
        </Card>
    )
}

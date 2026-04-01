'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Select from '@/components/ui/Select'
import { PiUserPlus } from 'react-icons/pi'
import { TbTrash, TbMail, TbCrown, TbUser } from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getCompanyUsers,
    inviteCompanyUser,
    removeCompanyUser,
    getCompanyRoles,
} from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { usePermission } from '@/hooks/usePermission'

const UsersTab = () => {
    const t = useTranslations('business.settings.users')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [removeTarget, setRemoveTarget] = useState(null)
    const canManageUsers = usePermission('manage_users')

    const { data: usersData, isLoading } = useQuery({
        queryKey: ['business-company-users'],
        queryFn: async () => {
            const res = await getCompanyUsers()
            return res.members || []
        },
    })

    const { data: rolesData } = useQuery({
        queryKey: ['business-company-roles'],
        queryFn: async () => {
            const res = await getCompanyRoles()
            return res.roles || []
        },
    })

    const members = usersData || []
    const roles = rolesData || []

    const removeMutation = useMutation({
        mutationFn: (id) => removeCompanyUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-company-users'] })
            setRemoveTarget(null)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('removeSuccess')}
                </Notification>,
            )
        },
        onError: (err) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {err?.response?.data?.message || err?.message || 'Error'}
                </Notification>,
            )
        },
    })

    const getInitials = (name) => {
        if (!name) return '?'
        const parts = String(name).trim().split(' ')
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        return name[0].toUpperCase()
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loading loading />
            </div>
        )
    }

    return (
        <>
            <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
                    <div className="flex-1">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {t('description')}
                        </p>
                    </div>
                    {canManageUsers && (
                        <Button variant="solid" icon={<PiUserPlus />} onClick={() => setIsInviteOpen(true)} className="w-full sm:w-auto shrink-0">
                            {t('invite')}
                        </Button>
                    )}
                </div>

                {members.length === 0 ? (
                    <Card className="p-8">
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 text-center">
                            {t('noUsers')}
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {members.map((member) => (
                            <Card key={member.id} className="p-4 sm:p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                                            member.is_owner 
                                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}>
                                            {member.is_owner ? (
                                                <TbCrown className="w-6 h-6" />
                                            ) : (
                                                getInitials(member.name)
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900 dark:text-white">
                                                {member.name || member.email}
                                            </div>
                                            <div className="flex items-center gap-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                                                <TbMail className="w-4 h-4" />
                                                {member.email}
                                            </div>
                                        </div>
                                    </div>
                                    {canManageUsers && !member.is_owner && (
                                        <Tooltip title={tCommon('delete')}>
                                            <div
                                                className="text-xl cursor-pointer hover:text-red-600"
                                                onClick={() => setRemoveTarget(member)}
                                            >
                                                <TbTrash />
                                            </div>
                                        </Tooltip>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {member.is_owner ? (
                                        <Tag className="bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100">
                                            {t('owner')}
                                        </Tag>
                                    ) : member.role ? (
                                        <Tag className={`${
                                            member.role.is_system
                                                ? 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                        }`}>
                                            {member.role.name}
                                        </Tag>
                                    ) : null}
                                    {member.is_active === false && (
                                        <Tag className="bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100">
                                            {t('inactive')}
                                        </Tag>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <InviteModal
                isOpen={isInviteOpen}
                onClose={() => setIsInviteOpen(false)}
                roles={roles}
            />

            <ConfirmDialog
                isOpen={!!removeTarget}
                type="danger"
                title={t('removeConfirm.title')}
                onCancel={() => setRemoveTarget(null)}
                onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
                confirmText={t('removeConfirm.confirm')}
                cancelText={tCommon('cancel')}
            >
                <p>{t('removeConfirm.message', { name: removeTarget?.name || removeTarget?.email })}</p>
            </ConfirmDialog>
        </>
    )
}

const InviteModal = ({ isOpen, onClose, roles }) => {
    const t = useTranslations('business.settings.users')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        email: '',
        first_name: '',
        last_name: '',
        role_id: null,
    })

    const assignableRoles = roles.filter((r) => !r.is_system || r.slug === 'manager')

    useEffect(() => {
        if (isOpen) {
            setFormData({
                email: '',
                first_name: '',
                last_name: '',
                role_id: null,
            })
        }
    }, [isOpen])

    const inviteMutation = useMutation({
        mutationFn: (data) => inviteCompanyUser(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['business-company-users'] })
            onClose()
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('inviteSuccess')}
                    {data.temporary_password && (
                        <span className="block mt-1 text-xs">
                            {t('tempPassword')}: <strong>{data.temporary_password}</strong>
                        </span>
                    )}
                </Notification>,
            )
        },
        onError: (err) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {err?.response?.data?.message || err?.message || 'Error'}
                </Notification>,
            )
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.email || !formData.role_id) return
        inviteMutation.mutate({ 
            email: formData.email, 
            role_id: formData.role_id,
            first_name: formData.first_name || undefined,
            last_name: formData.last_name || undefined,
        })
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={500}>
            <div className="flex flex-col h-full max-h-[85vh]">
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {t('inviteTitle')}
                    </h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                        {t('inviteDescription')}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4" id="invite-form">
                        <div className="grid grid-cols-2 gap-4">
                            <FormItem label={t('firstName')}>
                                <Input
                                    value={formData.first_name}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
                                    placeholder={t('firstNamePlaceholder')}
                                />
                            </FormItem>
                            <FormItem label={t('lastName')}>
                                <Input
                                    value={formData.last_name}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                                    placeholder={t('lastNamePlaceholder')}
                                />
                            </FormItem>
                        </div>

                        <FormItem label={t('email')} required>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                                placeholder={t('emailPlaceholder')}
                                required
                            />
                        </FormItem>

                        <FormItem label={t('role')} required>
                            <Select
                                value={assignableRoles.find((r) => r.id === formData.role_id) 
                                    ? { value: formData.role_id, label: assignableRoles.find((r) => r.id === formData.role_id)?.name } 
                                    : null
                                }
                                onChange={(opt) => setFormData((prev) => ({ ...prev, role_id: opt?.value ?? null }))}
                                options={assignableRoles.map((r) => ({ value: r.id, label: r.name }))}
                                placeholder={t('selectRole')}
                            />
                        </FormItem>

                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
                                {t('inviteHint')}
                            </p>
                        </div>
                    </form>
                </div>

                <div className="flex-shrink-0 px-6 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <Button type="button" variant="plain" onClick={onClose}>
                        {tCommon('cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant="solid"
                        loading={inviteMutation.isPending}
                        disabled={!formData.email || !formData.role_id}
                        onClick={(e) => {
                            e.preventDefault()
                            const form = document.getElementById('invite-form')
                            if (form) {
                                form.requestSubmit()
                            }
                        }}
                    >
                        {t('invite')}
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

export default UsersTab

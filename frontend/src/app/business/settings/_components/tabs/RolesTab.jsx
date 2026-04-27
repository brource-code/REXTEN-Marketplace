'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Checkbox from '@/components/ui/Checkbox'
import { FormItem } from '@/components/ui/Form'
import { PiPlus } from 'react-icons/pi'
import { TbPencil, TbTrash, TbShieldCheck } from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getCompanyRoles,
    getCompanyPermissions,
    createCompanyRole,
    updateCompanyRole,
    deleteCompanyRole,
} from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { usePermission } from '@/hooks/usePermission'

const RolePermissionsChips = ({ role, getPermissionName, onShowMore, showRemainingAria }) => {
    const perms = role.permissions || []
    const restCount = Math.max(0, perms.length - 3)

    return (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
            {perms.slice(0, 3).map((p) => (
                <Tag
                    key={p}
                    className="!text-xs !px-2 !py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                    {getPermissionName(p)}
                </Tag>
            ))}
            {restCount > 0 && (
                <button
                    type="button"
                    className="inline-flex items-center rounded-md border-0 !text-xs !px-2 !py-0.5 font-bold bg-gray-200 text-gray-700 transition hover:bg-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                    onClick={onShowMore}
                    aria-label={showRemainingAria}
                >
                    +{restCount}
                </button>
            )}
        </div>
    )
}

const RolesTab = () => {
    const t = useTranslations('business.settings.roles')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingRole, setEditingRole] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [overflowRole, setOverflowRole] = useState(null)
    const canManageRoles = usePermission('manage_roles')

    // Функция для получения названия разрешения
    const getPermissionName = (slug) => {
        return t(`permissionNames.${slug}`, { defaultValue: slug })
    }

    const { data: rolesData, isLoading } = useQuery({
        queryKey: ['business-company-roles'],
        queryFn: async () => {
            const res = await getCompanyRoles()
            return res.roles || []
        },
    })

    const { data: permsData } = useQuery({
        queryKey: ['business-company-permissions'],
        queryFn: async () => {
            const res = await getCompanyPermissions()
            return res.permissions || {}
        },
    })

    const roles = rolesData || []
    const permissions = permsData || {}

    const deleteMutation = useMutation({
        mutationFn: (id) => deleteCompanyRole(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-company-roles'] })
            setDeleteTarget(null)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('deleteSuccess')}
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

    const handleAdd = () => {
        setEditingRole(null)
        setIsModalOpen(true)
    }

    const handleEdit = (role) => {
        setEditingRole(role)
        setIsModalOpen(true)
    }

    const customRoles = roles.filter((r) => !r.is_system)
    const systemRoles = roles.filter((r) => r.is_system)

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
                    {canManageRoles && (
                        <Button variant="solid" icon={<PiPlus />} onClick={handleAdd} className="w-full sm:w-auto shrink-0">
                            {t('add')}
                        </Button>
                    )}
                </div>

                {/* Системные роли */}
                {systemRoles.length > 0 && (
                    <div>
                        <h6 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">
                            {t('systemRoles')}
                        </h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {systemRoles.map((role) => (
                                <Card key={role.id} className="p-4 sm:p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                                                <TbShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    {role.name}
                                                </div>
                                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    {role.slug}
                                                </div>
                                            </div>
                                        </div>
                                        <Tag className="!text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 shrink-0">
                                            {t('systemRole')}
                                        </Tag>
                                    </div>
                                    <RolePermissionsChips
                                        role={role}
                                        getPermissionName={getPermissionName}
                                        onShowMore={() =>
                                            setOverflowRole({
                                                name: role.name,
                                                slugs: (role.permissions || []).slice(3),
                                            })
                                        }
                                        showRemainingAria={t('showRemainingPermissions')}
                                    />
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Кастомные роли */}
                <div>
                    <h6 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">
                        {t('customRoles')}
                    </h6>
                    {customRoles.length === 0 ? (
                        <Card className="p-8">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 text-center">
                                {t('noRoles')}
                            </p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {customRoles.map((role) => (
                                <Card key={role.id} className="p-4 sm:p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                                <TbShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    {role.name}
                                                </div>
                                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    {role.slug}
                                                </div>
                                            </div>
                                        </div>
                                        {canManageRoles && (
                                            <div className="flex items-center gap-2">
                                                <Tooltip title={tCommon('edit')}>
                                                    <div
                                                        className="text-xl cursor-pointer hover:text-primary"
                                                        onClick={() => handleEdit(role)}
                                                    >
                                                        <TbPencil />
                                                    </div>
                                                </Tooltip>
                                                <Tooltip title={tCommon('delete')}>
                                                    <div
                                                        className="text-xl cursor-pointer hover:text-red-600"
                                                        onClick={() => setDeleteTarget(role)}
                                                    >
                                                        <TbTrash />
                                                    </div>
                                                </Tooltip>
                                            </div>
                                        )}
                                    </div>
                                    <RolePermissionsChips
                                        role={role}
                                        getPermissionName={getPermissionName}
                                        onShowMore={() =>
                                            setOverflowRole({
                                                name: role.name,
                                                slugs: (role.permissions || []).slice(3),
                                            })
                                        }
                                        showRemainingAria={t('showRemainingPermissions')}
                                    />
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Dialog
                isOpen={!!overflowRole}
                onClose={() => setOverflowRole(null)}
                width={400}
            >
                <div className="p-5 sm:p-4">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 pr-8">
                        {overflowRole?.name}
                    </h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                        {t('overflowPermissionsDescription')}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5 max-h-[min(50vh,280px)] overflow-y-auto booking-modal-scroll">
                        {(overflowRole?.slugs || []).map((p) => (
                            <Tag
                                key={p}
                                className="!text-xs !px-2 !py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                            >
                                {getPermissionName(p)}
                            </Tag>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button variant="plain" onClick={() => setOverflowRole(null)}>
                            {tCommon('cancel')}
                        </Button>
                    </div>
                </div>
            </Dialog>

            <RoleModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingRole(null)
                }}
                role={editingRole}
                permissions={permissions}
            />

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title={t('deleteConfirm.title')}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                confirmText={t('deleteConfirm.confirm')}
                cancelText={tCommon('cancel')}
            >
                <p>{t('deleteConfirm.message', { name: deleteTarget?.name })}</p>
            </ConfirmDialog>
        </>
    )
}

const RoleModal = ({ isOpen, onClose, role, permissions }) => {
    const t = useTranslations('business.settings.roles')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        selectedPermIds: [],
    })

    const permGroups = Object.entries(permissions || {})

    useEffect(() => {
        if (isOpen && role) {
            setFormData({
                name: role.name || '',
                slug: role.slug || '',
                selectedPermIds: role.permissions || [],
            })
        } else if (isOpen && !role) {
            setFormData({
                name: '',
                slug: '',
                selectedPermIds: [],
            })
        }
    }, [isOpen, role])

    const createMutation = useMutation({
        mutationFn: (data) => createCompanyRole(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-company-roles'] })
            onClose()
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('createSuccess')}
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

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateCompanyRole(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-company-roles'] })
            onClose()
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('updateSuccess')}
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
        const permIds = permGroups.flatMap(([, items]) =>
            items.filter((p) => formData.selectedPermIds.includes(p.slug)).map((p) => p.id),
        )
        
        if (role) {
            updateMutation.mutate({ id: role.id, data: { name: formData.name, permission_ids: permIds } })
        } else {
            if (!formData.name || !formData.slug) return
            createMutation.mutate({
                name: formData.name,
                slug: formData.slug.replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, ''),
                permission_ids: permIds,
            })
        }
    }

    const togglePerm = (slug) => {
        setFormData((prev) => ({
            ...prev,
            selectedPermIds: prev.selectedPermIds.includes(slug)
                ? prev.selectedPermIds.filter((s) => s !== slug)
                : [...prev.selectedPermIds, slug],
        }))
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={500}>
            <div className="flex flex-col h-full max-h-[85vh]">
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {role ? t('editRole') : t('add')}
                    </h4>
                </div>

                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4" id="role-form">
                        <FormItem label={t('name')} required>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder={t('namePlaceholder')}
                                disabled={!!role}
                                required
                            />
                        </FormItem>

                        {!role && (
                            <FormItem label={t('slug')} required>
                                <Input
                                    value={formData.slug}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            slug: e.target.value.replace(/\s+/g, '_').toLowerCase(),
                                        }))
                                    }
                                    placeholder={t('slugPlaceholder')}
                                    required
                                />
                            </FormItem>
                        )}

                        <FormItem label={t('permissions')}>
                            <div className="space-y-4 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                {permGroups.map(([group, items]) => (
                                    <div key={group}>
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase">
                                            {group}
                                        </p>
                                        <div className="flex flex-wrap gap-3">
                                            {items.map((p) => (
                                                <Checkbox
                                                    key={p.id}
                                                    checked={formData.selectedPermIds.includes(p.slug)}
                                                    onChange={() => togglePerm(p.slug)}
                                                >
                                                    <span className="text-sm">{p.name}</span>
                                                </Checkbox>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </FormItem>
                    </form>
                </div>

                <div className="flex-shrink-0 px-6 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <Button type="button" variant="plain" onClick={onClose}>
                        {tCommon('cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant="solid"
                        loading={createMutation.isPending || updateMutation.isPending}
                        disabled={!formData.name || (!role && !formData.slug)}
                        onClick={(e) => {
                            e.preventDefault()
                            const form = document.getElementById('role-form')
                            if (form) {
                                form.requestSubmit()
                            }
                        }}
                    >
                        {tCommon('save')}
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

export default RolesTab

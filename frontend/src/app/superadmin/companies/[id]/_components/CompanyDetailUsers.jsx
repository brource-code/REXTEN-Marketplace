'use client'

import { useMemo, useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import Loading from '@/components/shared/Loading'
import DataTable from '@/components/shared/DataTable'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import FormItem from '@/components/ui/Form/FormItem'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getCompanyUsers,
    getCompanyRolesForAdmin,
    updateCompanyUser,
} from '@/lib/api/superadmin'
import { useTranslations } from 'next-intl'
import { formatSuperadminDateOnly, formatSuperadminTimeOnly } from '@/utils/dateTime'
import { PiCrown, PiEnvelope, PiPhone, PiPencilSimple } from 'react-icons/pi'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

const roleColors = {
    owner: 'bg-amber-200 dark:bg-amber-900/40 text-gray-900 dark:text-gray-100',
    admin: 'bg-purple-200 dark:bg-purple-900/40 text-gray-900 dark:text-gray-100',
    manager: 'bg-blue-200 dark:bg-blue-900/40 text-gray-900 dark:text-gray-100',
    staff: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
}

const statusColors = {
    active: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    blocked: 'bg-red-200 dark:bg-red-900/40 text-gray-900 dark:text-gray-100',
}

function getInitials(name) {
    if (!name) return '?'
    return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
}

export default function CompanyDetailUsers({ companyId }) {
    const t = useTranslations('superadmin.companyDetail.users')
    const tDetail = useTranslations('superadmin.companyDetail')
    const queryClient = useQueryClient()
    const [editOpen, setEditOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        role_id: null,
        is_blocked: false,
    })

    const { data, isLoading } = useQuery({
        queryKey: ['company-users', companyId],
        queryFn: () => getCompanyUsers(companyId),
        enabled: !!companyId,
    })

    const { data: roles = [] } = useQuery({
        queryKey: ['company-roles-admin', companyId],
        queryFn: () => getCompanyRolesForAdmin(companyId),
        enabled: !!companyId && editOpen,
    })

    const roleOptions = useMemo(
        () => roles.map((r) => ({ value: r.id, label: r.name })),
        [roles],
    )

    const mutation = useMutation({
        mutationFn: (payload) => updateCompanyUser(companyId, editing.id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-users', companyId] })
            setEditOpen(false)
            setEditing(null)
            toast.push(
                <Notification title={t('saved')} type="success">
                    {t('saved')}
                </Notification>,
            )
        },
        onError: (e) => {
            toast.push(
                <Notification title={t('saveError')} type="danger">
                    {e.response?.data?.message || t('saveError')}
                </Notification>,
            )
        },
    })

    const openEdit = (user) => {
        setEditing(user)
        setForm({
            first_name: user.first_name ?? '',
            last_name: user.last_name ?? '',
            phone: user.phone ?? '',
            role_id: user.role_id ?? null,
            is_blocked: user.status === 'blocked',
        })
        setEditOpen(true)
    }

    useEffect(() => {
        if (!editOpen) setEditing(null)
    }, [editOpen])

    const handleSave = () => {
        if (!editing) return
        const payload = {
            first_name: form.first_name,
            last_name: form.last_name,
            phone: form.phone || undefined,
        }
        if (editing.role !== 'owner') {
            payload.is_blocked = form.is_blocked
            if (form.role_id != null) {
                payload.role_id = form.role_id
            }
        }
        mutation.mutate(payload)
    }

    const columns = useMemo(
        () => [
            {
                header: t('table.user'),
                accessorKey: 'name',
                cell: (props) => {
                    const user = props.row.original
                    const isOwner = user.role === 'owner'
                    return (
                        <div className="flex items-center gap-3">
                            <Avatar size={40} shape="circle" src={user.avatar}>
                                {!user.avatar && getInitials(user.name)}
                            </Avatar>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {user.name}
                                    </span>
                                    {isOwner && (
                                        <PiCrown className="text-amber-500" title={t('owner')} />
                                    )}
                                </div>
                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {user.email}
                                </div>
                            </div>
                        </div>
                    )
                },
            },
            {
                header: t('table.role'),
                accessorKey: 'role',
                cell: (props) => {
                    const user = props.row.original
                    return (
                        <Tag className={roleColors[user.role] || roleColors.staff}>
                            {user.role_name}
                        </Tag>
                    )
                },
            },
            {
                header: t('table.contacts'),
                accessorKey: 'phone',
                cell: (props) => {
                    const user = props.row.original
                    return (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                                <PiEnvelope className="text-gray-400 shrink-0" />
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {user.email}
                                </span>
                            </div>
                            {user.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                    <PiPhone className="text-gray-400 shrink-0" />
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {user.phone}
                                    </span>
                                </div>
                            )}
                        </div>
                    )
                },
            },
            {
                header: t('table.status'),
                accessorKey: 'status',
                cell: (props) => {
                    const status = props.row.original.status
                    return (
                        <Tag className={statusColors[status] || statusColors.active}>
                            {t(`statuses.${status}`)}
                        </Tag>
                    )
                },
            },
            {
                header: t('table.lastLogin'),
                accessorKey: 'last_login',
                cell: (props) => {
                    const lastLogin = props.row.original.last_login
                    if (!lastLogin) {
                        return (
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('neverLoggedIn')}
                            </span>
                        )
                    }
                    return (
                        <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {formatSuperadminDateOnly(lastLogin)}
                            </div>
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {formatSuperadminTimeOnly(lastLogin)}
                            </div>
                        </div>
                    )
                },
            },
            {
                header: t('table.actions'),
                id: 'actions',
                cell: (props) => (
                    <Button
                        size="sm"
                        variant="default"
                        icon={<PiPencilSimple />}
                        onClick={() => openEdit(props.row.original)}
                    >
                        {t('edit')}
                    </Button>
                ),
            },
        ],
        [t],
    )

    const MobileUserCard = ({ user }) => {
        const isOwner = user.role === 'owner'
        return (
            <Card className="p-4 mb-4">
                <div className="flex items-start gap-3">
                    <Avatar size={48} shape="circle" src={user.avatar}>
                        {!user.avatar && getInitials(user.name)}
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {user.name}
                            </span>
                            {isOwner && <PiCrown className="text-amber-500" />}
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                            <Tag className={roleColors[user.role] || roleColors.staff}>
                                {user.role_name}
                            </Tag>
                            <Tag
                                className={
                                    statusColors[user.status] || statusColors.active
                                }
                            >
                                {t(`statuses.${user.status}`)}
                            </Tag>
                        </div>
                        <Button
                            size="sm"
                            className="mt-2"
                            icon={<PiPencilSimple />}
                            onClick={() => openEdit(user)}
                        >
                            {t('edit')}
                        </Button>
                    </div>
                </div>
            </Card>
        )
    }

    if (isLoading) {
        return (
            <Card className="p-6">
                <div className="flex justify-center py-12">
                    <Loading loading />
                </div>
            </Card>
        )
    }

    const users = data?.data || []

    return (
        <div className="space-y-4">
            <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {t('title')}
                    </h4>
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('total', { count: users.length })}
                    </span>
                </div>

                {users.length > 0 ? (
                    <>
                        <div className="md:hidden">
                            {users.map((user) => (
                                <MobileUserCard key={user.id} user={user} />
                            ))}
                        </div>
                        <div className="hidden md:block">
                            <DataTable columns={columns} data={users} noData={false} />
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12 text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('noUsers')}
                    </div>
                )}
            </Card>

            <Dialog
                isOpen={editOpen}
                onClose={() => setEditOpen(false)}
                width={480}
                closable={false}
            >
                <div className="p-6 pt-8">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                        {t('editTitle')}
                    </h4>
                    {editing?.role === 'owner' && (
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">
                            {t('ownerNote')}
                        </p>
                    )}
                    <div className="space-y-4">
                        <FormItem label={t('firstName')}>
                            <Input
                                value={form.first_name}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, first_name: e.target.value }))
                                }
                            />
                        </FormItem>
                        <FormItem label={t('lastName')}>
                            <Input
                                value={form.last_name}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, last_name: e.target.value }))
                                }
                            />
                        </FormItem>
                        <FormItem label={t('phone')}>
                            <Input
                                value={form.phone}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, phone: e.target.value }))
                                }
                            />
                        </FormItem>
                        {editing?.role !== 'owner' && roleOptions.length > 0 && (
                            <FormItem label={t('roleInCompany')}>
                                <Select
                                    options={roleOptions}
                                    value={roleOptions.find((o) => o.value === form.role_id)}
                                    onChange={(opt) =>
                                        setForm((f) => ({
                                            ...f,
                                            role_id: opt?.value ?? null,
                                        }))
                                    }
                                />
                            </FormItem>
                        )}
                        {editing?.role !== 'owner' && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.is_blocked}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            is_blocked: e.target.checked,
                                        }))
                                    }
                                    className="rounded border-gray-300"
                                />
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {t('blockedLabel')}
                                </span>
                            </label>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="plain" onClick={() => setEditOpen(false)}>
                            {tDetail('cancel')}
                        </Button>
                        <Button
                            variant="solid"
                            loading={mutation.isPending}
                            onClick={handleSave}
                        >
                            {t('save')}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

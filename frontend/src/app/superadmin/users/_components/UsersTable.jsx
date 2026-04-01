'use client'
import { useMemo, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import DataTable from '@/components/shared/DataTable'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { TbPencil, TbEye, TbBan, TbCheck, TbTrash, TbDotsVertical } from 'react-icons/tb'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import CreateUserModal from './CreateUserModal'
import UserDetailsModal from './UserDetailsModal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { blockUser, unblockUser, deleteUser } from '@/lib/api/superadmin'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { CLIENT, BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'
import { formatSuperadminDateTime } from '@/utils/dateTime'

const statusColor = {
    active: 'bg-emerald-200 dark:bg-emerald-200 text-gray-900 dark:text-gray-900',
    blocked: 'bg-red-200 dark:bg-red-200 text-gray-900 dark:text-gray-900',
}

const roleLabels = {
    [CLIENT]: 'Клиент',
    [BUSINESS_OWNER]: 'Владелец бизнеса',
    [SUPERADMIN]: 'Супер-админ',
}

const roleColors = {
    [CLIENT]: 'bg-blue-200 dark:bg-blue-200 text-gray-900 dark:text-gray-900',
    [BUSINESS_OWNER]: 'bg-purple-200 dark:bg-purple-200 text-gray-900 dark:text-gray-900',
    [SUPERADMIN]: 'bg-amber-200 dark:bg-amber-200 text-gray-900 dark:text-gray-900',
}

const NameColumn = ({ row }) => {
    return (
        <div className="flex items-center">
            <Avatar size={40} shape="circle" src={row.img} />
            <div className="ml-2 rtl:mr-2">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {row.name}
                </div>
                <div className="text-xs text-gray-500">{row.email}</div>
            </div>
        </div>
    )
}

const ActionColumn = ({ onEdit, onView, onBlock, onUnblock, onDelete, status }) => {
    return (
        <Dropdown
            renderTitle={
                <div className="text-xl cursor-pointer select-none font-semibold hover:text-primary">
                    <TbDotsVertical />
                </div>
            }
            placement="bottom-end"
        >
            <Dropdown.Item eventKey="view" onClick={onView}>
                <span className="flex items-center gap-2">
                    <TbEye className="text-lg" />
                    <span>Просмотр</span>
                </span>
            </Dropdown.Item>
            <Dropdown.Item eventKey="edit" onClick={onEdit}>
                <span className="flex items-center gap-2">
                    <TbPencil className="text-lg" />
                    <span>Редактировать</span>
                </span>
            </Dropdown.Item>
            <Dropdown.Item variant="divider" />
            {status === 'active' ? (
                <Dropdown.Item eventKey="block" onClick={onBlock}>
                    <span className="flex items-center gap-2 text-red-600">
                        <TbBan className="text-lg" />
                        <span>Заблокировать</span>
                    </span>
                </Dropdown.Item>
            ) : (
                <Dropdown.Item eventKey="unblock" onClick={onUnblock}>
                    <span className="flex items-center gap-2 text-emerald-600">
                        <TbCheck className="text-lg" />
                        <span>Разблокировать</span>
                    </span>
                </Dropdown.Item>
            )}
            <Dropdown.Item variant="divider" />
            <Dropdown.Item eventKey="delete" onClick={onDelete}>
                <span className="flex items-center gap-2 text-red-600">
                    <TbTrash className="text-lg" />
                    <span>Удалить</span>
                </span>
            </Dropdown.Item>
        </Dropdown>
    )
}

const UsersTable = ({
    usersList = [],
    usersTotal = 0,
    pageIndex = 1,
    pageSize = 10,
}) => {
    const queryClient = useQueryClient()
    const { onAppendQueryParams } = useAppendQueryParams()
    const [selectedUser, setSelectedUser] = useState(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [viewingUser, setViewingUser] = useState(null)
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: null,
    })

    const blockMutation = useMutation({
        mutationFn: blockUser,
        onSuccess: () => {
            queryClient.invalidateQueries(['users'])
            toast.push(
                <Notification title="Успешно" type="success">
                    Пользователь заблокирован
                </Notification>
            )
            setConfirmDialog({ ...confirmDialog, isOpen: false })
        },
        onError: (error) => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    {error.response?.data?.message || 'Не удалось заблокировать пользователя'}
                </Notification>
            )
        },
    })

    const unblockMutation = useMutation({
        mutationFn: unblockUser,
        onSuccess: () => {
            queryClient.invalidateQueries(['users'])
            toast.push(
                <Notification title="Успешно" type="success">
                    Пользователь разблокирован
                </Notification>
            )
            setConfirmDialog({ ...confirmDialog, isOpen: false })
        },
        onError: (error) => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    {error.response?.data?.message || 'Не удалось разблокировать пользователя'}
                </Notification>
            )
        },
    })

    const deleteMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries(['users'])
            toast.push(
                <Notification title="Успешно" type="success">
                    Пользователь удален
                </Notification>
            )
            setConfirmDialog({ ...confirmDialog, isOpen: false })
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message || 'Не удалось удалить пользователя'
            toast.push(
                <Notification title="Ошибка" type="danger">
                    {errorMessage}
                </Notification>
            )
        },
    })

    const handleEdit = (user) => {
        setSelectedUser(user)
        setIsEditModalOpen(true)
    }

    const handleView = (user) => {
        setViewingUser(user)
        setIsViewModalOpen(true)
    }

    const handleBlock = (user) => {
        setConfirmDialog({
            isOpen: true,
            type: 'danger',
            title: 'Заблокировать пользователя?',
            message: `Вы уверены, что хотите заблокировать пользователя "${user.name}"?`,
            onConfirm: () => blockMutation.mutate(user.id),
        })
    }

    const handleUnblock = (user) => {
        setConfirmDialog({
            isOpen: true,
            type: 'success',
            title: 'Разблокировать пользователя?',
            message: `Вы уверены, что хотите разблокировать пользователя "${user.name}"?`,
            onConfirm: () => unblockMutation.mutate(user.id),
        })
    }

    const handleDelete = (user) => {
        setConfirmDialog({
            isOpen: true,
            type: 'danger',
            title: 'Удалить пользователя?',
            message: `Вы уверены, что хотите удалить пользователя "${user.name}"? Это действие нельзя отменить.`,
            onConfirm: () => deleteMutation.mutate(user.id),
        })
    }

    const columns = useMemo(
        () => [
            {
                header: 'Пользователь',
                accessorKey: 'name',
                cell: (props) => {
                    const row = props.row.original
                    return <NameColumn row={row} />
                },
            },
            {
                header: 'Роль',
                accessorKey: 'role',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <Tag
                            className={
                                roleColors[row.role] || roleColors[CLIENT]
                            }
                        >
                            <span>{roleLabels[row.role] || row.role}</span>
                        </Tag>
                    )
                },
            },
            {
                header: 'Статус',
                accessorKey: 'status',
                cell: (props) => {
                    const row = props.row.original
                    const status = row.isBlocked ? 'blocked' : (row.isActive ? 'active' : 'blocked')
                    const statusLabels = {
                        active: 'Активен',
                        blocked: 'Заблокирован',
                    }
                    return (
                        <Tag className={statusColor[status] || statusColor.active}>
                            <span>{statusLabels[status] || status}</span>
                        </Tag>
                    )
                },
            },
            {
                header: 'Регистрация',
                accessorKey: 'createdAt',
                cell: (props) => (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatSuperadminDateTime(props.row.original.createdAt)}
                    </span>
                ),
            },
            {
                header: 'Последний вход',
                accessorKey: 'lastLogin',
                cell: (props) => {
                    // TODO: Добавить поле lastLogin в API
                    return (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            -
                        </span>
                    )
                },
            },
            {
                header: '',
                id: 'action',
                cell: (props) => (
                    <ActionColumn
                        onEdit={() => handleEdit(props.row.original)}
                        onView={() => handleView(props.row.original)}
                        onBlock={() => handleBlock(props.row.original)}
                        onUnblock={() => handleUnblock(props.row.original)}
                        onDelete={() => handleDelete(props.row.original)}
                        status={props.row.original.isBlocked ? 'blocked' : (props.row.original.isActive ? 'active' : 'blocked')}
                    />
                ),
            },
        ],
        [],
    )

    const handlePaginationChange = (page) => {
        onAppendQueryParams({
            pageIndex: String(page),
        })
    }

    const handleSelectChange = (value) => {
        onAppendQueryParams({
            pageSize: String(value),
            pageIndex: '1',
        })
    }

    const handleSort = (sort) => {
        onAppendQueryParams({
            order: sort.order,
            sortKey: sort.key,
        })
    }

    const statusLabels = {
        active: 'Активен',
        blocked: 'Заблокирован',
    }

    // Мобильная версия - карточки
    const MobileCard = ({ user }) => {
        const userStatus = user.isBlocked ? 'blocked' : (user.isActive ? 'active' : 'blocked')

        return (
            <Card className="mb-4">
                <div className="flex gap-4">
                    <Avatar size={60} shape="circle" src={user.img} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    {user.name}
                                </h4>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                            <Tag className={statusColor[userStatus] || statusColor.active}>
                                {statusLabels[userStatus] || userStatus}
                            </Tag>
                        </div>

                        <div className="space-y-2 mb-3">
                            <div>
                                <Tag
                                    className={
                                        roleColors[user.role] || roleColors[CLIENT]
                                    }
                                >
                                    {roleLabels[user.role] || user.role}
                                </Tag>
                            </div>
                            <div className="text-xs text-gray-500 space-y-1">
                                <div>
                                    <span className="text-gray-400">Регистрация: </span>
                                    {formatSuperadminDateTime(user.createdAt)}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon={<TbEye />}
                                    onClick={() => handleView(user)}
                                    className="flex-1"
                                >
                                    Просмотр
                                </Button>
                                <Button
                                    variant="plain"
                                    size="sm"
                                    icon={<TbPencil />}
                                    onClick={() => handleEdit(user)}
                                    className="flex-1"
                                >
                                    Редактировать
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                {userStatus === 'active' ? (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        icon={<TbBan />}
                                        onClick={() => handleBlock(user)}
                                        className="flex-1"
                                    >
                                        Заблокировать
                                    </Button>
                                ) : (
                                    <Button
                                        variant="solid"
                                        size="sm"
                                        icon={<TbCheck />}
                                        onClick={() => handleUnblock(user)}
                                        className="flex-1"
                                    >
                                        Разблокировать
                                    </Button>
                                )}
                                <Button
                                    variant="default"
                                    size="sm"
                                    icon={<TbTrash />}
                                    onClick={() => handleDelete(user)}
                                    className="flex-1"
                                    color="red"
                                >
                                    Удалить
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        )
    }

    return (
        <>
            {/* Мобильная версия - карточки */}
            <div className="md:hidden space-y-4">
                {usersList.length > 0 ? (
                    usersList.map((user) => (
                        <MobileCard key={user.id} user={user} />
                    ))
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Нет пользователей</p>
                    </div>
                )}
            </div>

            {/* Десктопная версия - таблица */}
            <div className="hidden md:block">
                <DataTable
                    columns={columns}
                    data={usersList}
                    noData={usersList.length === 0}
                    skeletonAvatarColumns={[0]}
                    skeletonAvatarProps={{ width: 40, height: 40 }}
                    loading={false}
                    pagingData={{
                        total: usersTotal,
                        pageIndex,
                        pageSize,
                    }}
                    onPaginationChange={handlePaginationChange}
                    onSelectChange={handleSelectChange}
                    onSort={handleSort}
                />
            </div>
            <CreateUserModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false)
                    setSelectedUser(null)
                }}
                user={selectedUser}
            />
            <UserDetailsModal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false)
                    setViewingUser(null)
                }}
                user={viewingUser}
                onEdit={() => {
                    if (!viewingUser) return
                    setIsViewModalOpen(false)
                    handleEdit(viewingUser)
                    setViewingUser(null)
                }}
                onBlock={() => {
                    if (!viewingUser) return
                    setIsViewModalOpen(false)
                    handleBlock(viewingUser)
                    setViewingUser(null)
                }}
                onUnblock={() => {
                    if (!viewingUser) return
                    setIsViewModalOpen(false)
                    handleUnblock(viewingUser)
                    setViewingUser(null)
                }}
            />
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                type={confirmDialog.type}
                title={confirmDialog.title}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                onConfirm={confirmDialog.onConfirm}
                confirmText="Подтвердить"
                cancelText="Отмена"
            >
                <p>{confirmDialog.message}</p>
            </ConfirmDialog>
        </>
    )
}

export default UsersTable


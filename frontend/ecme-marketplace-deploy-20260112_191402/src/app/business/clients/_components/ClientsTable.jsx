'use client'
import { useMemo, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import DataTable from '@/components/shared/DataTable'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { useRouter } from 'next/navigation'
import { TbPencil, TbEye, TbPhone } from 'react-icons/tb'
import { NumericFormat } from 'react-number-format'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ClientEditModal from './ClientEditModal'

const statusColor = {
    regular: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    regular_client: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    permanent: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100',
    permanent_client: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100',
    vip: 'bg-orange-200 dark:bg-orange-700 text-orange-900 dark:text-orange-100',
    vip_client: 'bg-orange-200 dark:bg-orange-700 text-orange-900 dark:text-orange-100',
}

const statusLabels = {
    regular: 'Обычный',
    regular_client: 'Обычный',
    permanent: 'Постоянный',
    permanent_client: 'Постоянный',
    vip: 'VIP',
    vip_client: 'VIP',
}

const NameColumn = ({ row }) => {
    // Получаем инициалы для аватара
    const getInitials = (name) => {
        if (!name) return 'U'
        const parts = name.trim().split(' ')
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        }
        return name[0].toUpperCase()
    }

    return (
        <div className="flex items-center">
            <Avatar size={40} shape="circle" src={row.img || undefined}>
                {!row.img && getInitials(row.name)}
            </Avatar>
            <div className="ml-2 rtl:mr-2">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {row.name}
                </div>
                {row.phone && (
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <TbPhone className="text-xs" />
                        <span>{row.phone}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

const ActionColumn = ({ onEdit, onViewDetail }) => {
    return (
        <div className="flex items-center gap-3">
            <Tooltip title="Просмотр">
                <div
                    className="text-xl cursor-pointer select-none font-semibold hover:text-primary"
                    role="button"
                    onClick={onViewDetail}
                >
                    <TbEye />
                </div>
            </Tooltip>
            <Tooltip title="Редактировать">
                <div
                    className="text-xl cursor-pointer select-none font-semibold hover:text-primary"
                    role="button"
                    onClick={onEdit}
                >
                    <TbPencil />
                </div>
            </Tooltip>
        </div>
    )
}

const ClientsTable = ({
    clientsList = [],
    clientsTotal = 0,
    pageIndex = 1,
    pageSize = 10,
}) => {
    const router = useRouter()
    const onAppendQueryParams = useAppendQueryParams()
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingClient, setEditingClient] = useState(null)

    const handleEdit = (client) => {
        setEditingClient(client)
        setIsEditModalOpen(true)
    }

    const handleViewDetails = (client) => {
        router.push(`/business/clients/${client.id}`)
    }

    const columns = useMemo(
        () => [
            {
                header: 'Клиент',
                accessorKey: 'name',
                cell: (props) => {
                    const row = props.row.original
                    return <NameColumn row={row} />
                },
            },
            {
                header: 'Email',
                accessorKey: 'email',
            },
            {
                header: 'Бронирований',
                accessorKey: 'totalBookings',
                cell: (props) => {
                    return (
                        <span className="font-semibold">
                            {props.row.original.totalBookings}
                        </span>
                    )
                },
            },
            {
                header: 'Потрачено',
                accessorKey: 'totalSpent',
                cell: (props) => {
                    const rawValue = props.row.original.totalSpent
                    const value = rawValue !== null && rawValue !== undefined ? parseFloat(rawValue) : 0
                    return (
                        <NumericFormat
                            className="font-semibold"
                            displayType="text"
                            value={isNaN(value) ? 0 : value}
                            prefix={'₽'}
                            thousandSeparator={true}
                        />
                    )
                },
            },
            {
                header: 'Последний визит',
                accessorKey: 'lastVisit',
                cell: (props) => {
                    const date = new Date(props.row.original.lastVisit)
                    return (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {date.toLocaleDateString('ru-RU')}
                        </span>
                    )
                },
            },
            {
                header: 'Статус',
                accessorKey: 'status',
                cell: (props) => {
                    const row = props.row.original
                    const currentStatus = row.status || 'regular'
                    return (
                        <div className="flex items-center">
                            <Tag className={statusColor[currentStatus] || statusColor.regular}>
                                {statusLabels[currentStatus] || 'Обычный'}
                            </Tag>
                        </div>
                    )
                },
            },
            {
                header: '',
                id: 'action',
                cell: (props) => (
                    <ActionColumn
                        onEdit={() => handleEdit(props.row.original)}
                        onViewDetail={() => handleViewDetails(props.row.original)}
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

    // Мобильная версия - карточки
    const MobileCard = ({ client }) => {
        const lastVisitDate = new Date(client.lastVisit)

        // Получаем инициалы для аватара
        const getInitials = (name) => {
            if (!name) return 'U'
            const parts = name.trim().split(' ')
            if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            }
            return name[0].toUpperCase()
        }

        return (
            <Card className="mb-4">
                <div className="flex gap-4">
                    <Avatar size={60} shape="circle" src={client.img || undefined}>
                        {!client.img && getInitials(client.name)}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    {client.name}
                                </h4>
                                <p className="text-xs text-gray-500 truncate">{client.email}</p>
                                {client.phone && (
                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                        <TbPhone className="text-xs" />
                                        <span>{client.phone}</span>
                                    </div>
                                )}
                            </div>
                            <Tag className={statusColor[client.status] || statusColor.regular}>
                                {statusLabels[client.status] || 'Обычный'}
                            </Tag>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                            <div>
                                <span className="text-gray-500 text-xs">Бронирований</span>
                                <div className="font-semibold">{client.totalBookings || 0}</div>
                            </div>
                            <div>
                                <span className="text-gray-500 text-xs">Потрачено</span>
                                <div className="font-semibold">
                                    <NumericFormat
                                        displayType="text"
                                        value={client.totalSpent !== null && client.totalSpent !== undefined ? parseFloat(client.totalSpent) : 0}
                                        prefix={'₽'}
                                        thousandSeparator={true}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="text-xs text-gray-500 mb-3">
                            <span className="text-gray-400">Последний визит: </span>
                            {lastVisitDate.toLocaleDateString('ru-RU')}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                icon={<TbEye />}
                                onClick={() => handleViewDetails(client)}
                                className="flex-1"
                            >
                                Детали
                            </Button>
                            <Button
                                variant="plain"
                                size="sm"
                                icon={<TbPencil />}
                                onClick={() => handleEdit(client)}
                            />
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
                {clientsList.length > 0 ? (
                    clientsList.map((client) => (
                        <MobileCard key={client.id} client={client} />
                    ))
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Нет клиентов</p>
                    </div>
                )}
            </div>

            {/* Десктопная версия - таблица */}
            <div className="hidden md:block">
                <DataTable
                    columns={columns}
                    data={clientsList}
                    noData={clientsList.length === 0}
                    skeletonAvatarColumns={[0]}
                    skeletonAvatarProps={{ width: 40, height: 40 }}
                    loading={false}
                    pagingData={{
                        total: clientsTotal,
                        pageIndex,
                        pageSize,
                    }}
                    onPaginationChange={handlePaginationChange}
                    onSelectChange={handleSelectChange}
                    onSort={handleSort}
                />
            </div>

            <ClientEditModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false)
                    setEditingClient(null)
                }}
                client={editingClient}
            />
        </>
    )
}

export default ClientsTable


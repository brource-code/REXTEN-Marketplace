'use client'
import { useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
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
import { formatDate } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'

const statusColor = {
    regular: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    regular_client: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    permanent: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100',
    permanent_client: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100',
    vip: 'bg-orange-200 dark:bg-orange-700 text-orange-900 dark:text-orange-100',
    vip_client: 'bg-orange-200 dark:bg-orange-700 text-orange-900 dark:text-orange-100',
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
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {row.name}
                </div>
                {row.phone && (
                    <div className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1 mt-1">
                        <TbPhone className="text-xs" />
                        <span>{row.phone}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

const ActionColumn = ({ onEdit, onViewDetail, t }) => {
    return (
        <div className="flex items-center gap-3">
            <Tooltip title={t('actions.view')}>
                <div
                    className="text-xl cursor-pointer select-none font-semibold hover:text-primary"
                    role="button"
                    onClick={onViewDetail}
                >
                    <TbEye />
                </div>
            </Tooltip>
            <Tooltip title={t('actions.edit')}>
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
    const t = useTranslations('business.clients')
    const tStatuses = useTranslations('business.clients.statuses')
    const locale = useLocale()
    const router = useRouter()
    
    const { settings } = useBusinessStore()
    const timezone = settings?.timezone || 'America/Los_Angeles'
    const { onAppendQueryParams } = useAppendQueryParams()
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingClient, setEditingClient] = useState(null)

    const handleEdit = (client) => {
        setEditingClient(client)
        setIsEditModalOpen(true)
    }

    const handleViewDetails = (client) => {
        router.push(`/business/clients/${client.id}`)
    }

    const getStatusLabel = (status) => {
        const normalizedStatus = status?.replace('_client', '') || 'regular'
        return tStatuses(normalizedStatus)
    }

    const columns = useMemo(
        () => [
            {
                header: t('columns.client'),
                accessorKey: 'name',
                cell: (props) => {
                    const row = props.row.original
                    return <NameColumn row={row} />
                },
            },
            {
                header: t('columns.email'),
                accessorKey: 'email',
            },
            {
                header: t('columns.bookings'),
                accessorKey: 'totalBookings',
                cell: (props) => {
                    return (
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {props.row.original.totalBookings}
                        </span>
                    )
                },
            },
            {
                header: t('columns.spent'),
                accessorKey: 'totalSpent',
                cell: (props) => {
                    const rawValue = props.row.original.totalSpent
                    const value = rawValue !== null && rawValue !== undefined ? parseFloat(rawValue) : 0
                    return (
                        <NumericFormat
                            className="text-sm font-bold text-gray-900 dark:text-gray-100"
                            displayType="text"
                            value={isNaN(value) ? 0 : value}
                            prefix={'$'}
                            thousandSeparator={true}
                        />
                    )
                },
            },
            {
                header: t('columns.lastVisit'),
                accessorKey: 'lastVisit',
                cell: (props) => {
                    return (
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {formatDate(props.row.original.lastVisit, timezone, 'short')}
                        </span>
                    )
                },
            },
            {
                header: t('columns.status'),
                accessorKey: 'status',
                cell: (props) => {
                    const row = props.row.original
                    const currentStatus = row.status || 'regular'
                    return (
                        <div className="flex items-center">
                            <Tag className={statusColor[currentStatus] || statusColor.regular}>
                                {getStatusLabel(currentStatus)}
                            </Tag>
                        </div>
                    )
                },
            },
            {
                header: '',
                id: 'action',
                meta: { stopRowClick: true },
                cell: (props) => (
                    <ActionColumn
                        onEdit={() => handleEdit(props.row.original)}
                        onViewDetail={() => handleViewDetails(props.row.original)}
                        t={t}
                    />
                ),
            },
        ],
        [t, tStatuses],
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
            <Card
                className="mb-4 cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => handleViewDetails(client)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleViewDetails(client)
                    }
                }}
            >
                <div className="flex gap-4">
                    <Avatar size={60} shape="circle" src={client.img || undefined}>
                        {!client.img && getInitials(client.name)}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
                                    {client.name}
                                </h4>
                                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{client.email}</p>
                                {client.phone && (
                                    <div className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1 mt-1">
                                        <TbPhone className="text-xs" />
                                        <span>{client.phone}</span>
                                    </div>
                                )}
                            </div>
                            <Tag className={statusColor[client.status] || statusColor.regular}>
                                {getStatusLabel(client.status)}
                            </Tag>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                            <div>
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('columns.bookings')}</span>
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{client.totalBookings || 0}</div>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('columns.spent')}</span>
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    <NumericFormat
                                        displayType="text"
                                        value={client.totalSpent !== null && client.totalSpent !== undefined ? parseFloat(client.totalSpent) : 0}
                                        prefix={'$'}
                                        thousandSeparator={true}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3">
                            <span>{t('columns.lastVisit')}: </span>
                            <span className="text-gray-900 dark:text-gray-100">{formatDate(client.lastVisit, timezone, 'short')}</span>
                        </div>

                        <div
                            className="flex gap-2"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                icon={<TbEye />}
                                onClick={() => handleViewDetails(client)}
                                className="flex-1"
                            >
                                {t('actions.details')}
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
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('noClients')}</p>
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
                    onRowClick={handleViewDetails}
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


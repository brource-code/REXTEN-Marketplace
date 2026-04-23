'use client'
import { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import dayjs from 'dayjs'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import DataTable from '@/components/shared/DataTable'
import EmptyStatePanel from '@/components/shared/EmptyStatePanel'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { useRouter } from 'next/navigation'
import { PiUsers, PiEnvelope, PiCurrencyDollar, PiCalendar } from 'react-icons/pi'
import { TbPencil, TbEye, TbPhone } from 'react-icons/tb'
import { NumericFormat } from 'react-number-format'
import ClientEditModal from './ClientEditModal'
import { formatDate } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'
import classNames from '@/utils/classNames'

const statusColor = {
    regular: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    regular_client: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    permanent: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100',
    permanent_client: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100',
    vip: 'bg-amber-200 dark:bg-amber-800/40 text-amber-950 dark:text-amber-100',
    vip_client: 'bg-amber-200 dark:bg-amber-800/40 text-amber-950 dark:text-amber-100',
}

function getInitials(name) {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name[0].toUpperCase()
}

const NameColumn = ({ row }) => {
    return (
        <div className="flex items-center">
            <Avatar size={40} shape="circle" src={row.img || undefined}>
                {!row.img && getInitials(row.name)}
            </Avatar>
            <div className="ml-2 rtl:mr-2">
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{row.name}</div>
                {row.phone ? (
                    <div className="mt-1 flex items-center gap-1 text-xs font-bold text-gray-900 dark:text-gray-100">
                        <TbPhone className="text-xs text-gray-400 dark:text-gray-500" aria-hidden />
                        <span>{row.phone}</span>
                    </div>
                ) : null}
            </div>
        </div>
    )
}

const ActionColumn = ({ onEdit, onViewDetail, t }) => {
    return (
        <div className="flex items-center gap-3">
            <Tooltip title={t('actions.view')}>
                <div
                    className="cursor-pointer select-none text-xl font-semibold hover:text-primary"
                    role="button"
                    onClick={onViewDetail}
                >
                    <TbEye />
                </div>
            </Tooltip>
            <Tooltip title={t('actions.edit')}>
                <div
                    className="cursor-pointer select-none text-xl font-semibold hover:text-primary"
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
    const tm = useTranslations('business.clients.mobile')

    const clientsEmptyState = (
        <EmptyStatePanel icon={PiUsers} title={t('emptyTitle')} hint={t('emptyHint')} />
    )
    const tStatuses = useTranslations('business.clients.statuses')
    const router = useRouter()

    const { settings } = useBusinessStore()
    const timezone = settings?.timezone || 'America/Los_Angeles'
    const { onAppendQueryParams } = useAppendQueryParams()
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingClient, setEditingClient] = useState(null)

    const handleEdit = useCallback((client) => {
        setEditingClient(client)
        setIsEditModalOpen(true)
    }, [])

    const handleViewDetails = useCallback(
        (client) => {
            router.push(`/business/clients/${client.id}`)
        },
        [router],
    )

    const getStatusLabel = (status) => {
        const normalizedStatus = status?.replace('_client', '') || 'regular'
        return tStatuses(normalizedStatus)
    }

    const lastVisitHint = (iso) => {
        if (!iso) return tm('never')
        const d = dayjs(iso)
        if (!d.isValid()) return '—'
        const days = dayjs().diff(d, 'day')
        if (days <= 0) return tm('today')
        return tm('daysAgo', { count: days })
    }

    const columns = useMemo(
        () => [
            {
                header: t('columns.client'),
                accessorKey: 'name',
                enableSorting: false,
                cell: (props) => {
                    const row = props.row.original
                    return <NameColumn row={row} />
                },
            },
            {
                header: t('columns.email'),
                accessorKey: 'email',
                enableSorting: false,
                cell: (props) => {
                    const email = props.row.original.email
                    if (!email) {
                        return <span className="text-sm font-bold text-gray-400 dark:text-gray-500">—</span>
                    }
                    return (
                        <Tooltip title={email}>
                            <span className="block max-w-[220px] truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                                {email}
                            </span>
                        </Tooltip>
                    )
                },
            },
            {
                header: t('columns.bookings'),
                accessorKey: 'totalBookings',
                enableSorting: false,
                cell: (props) => {
                    const n = props.row.original.totalBookings ?? 0
                    return (
                        <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-bold tabular-nums text-gray-900 dark:bg-gray-700 dark:text-gray-100">
                            {n}
                        </span>
                    )
                },
            },
            {
                header: t('columns.spent'),
                accessorKey: 'totalSpent',
                enableSorting: false,
                cell: (props) => {
                    const rawValue = props.row.original.totalSpent
                    const value = rawValue !== null && rawValue !== undefined ? parseFloat(rawValue) : 0
                    return (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-sm font-bold tabular-nums text-gray-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                            <PiCurrencyDollar className="text-base text-emerald-600 dark:text-emerald-400" aria-hidden />
                            <NumericFormat
                                displayType="text"
                                value={Number.isNaN(value) ? 0 : value}
                                prefix="$"
                                thousandSeparator
                            />
                        </span>
                    )
                },
            },
            {
                header: t('columns.lastVisit'),
                accessorKey: 'lastVisit',
                enableSorting: false,
                cell: (props) => {
                    const iso = props.row.original.lastVisit
                    return (
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                {iso ? formatDate(iso, timezone, 'short') : '—'}
                            </span>
                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                {lastVisitHint(iso)}
                            </span>
                        </div>
                    )
                },
            },
            {
                header: t('columns.status'),
                accessorKey: 'status',
                enableSorting: false,
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
                enableSorting: false,
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
        [t, tStatuses, timezone, tm, handleEdit, handleViewDetails],
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

    const MobileCard = ({ client }) => {
        const spentValue = client.totalSpent != null ? parseFloat(client.totalSpent) : 0
        const currentStatus = client.status || 'regular'
        const contactPrimary = client.phone || client.email || ''
        const contactTitle = [client.phone, client.email].filter(Boolean).join(' · ')
        const lastVisitTitle = client.lastVisit
            ? `${formatDate(client.lastVisit, timezone, 'short')} · ${lastVisitHint(client.lastVisit)}`
            : lastVisitHint(null)

        return (
            <div
                className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm transition-colors active:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/40 dark:active:bg-gray-800/60"
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
                <div className="flex gap-2">
                    <Avatar size={40} shape="circle" src={client.img || undefined}>
                        {!client.img && getInitials(client.name)}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                    <span className="min-w-0 truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {client.name}
                                    </span>
                                    <Tag
                                        className={classNames(
                                            'shrink-0 !px-1.5 !py-0 !text-[11px] leading-none',
                                            statusColor[currentStatus] || statusColor.regular,
                                        )}
                                    >
                                        {getStatusLabel(currentStatus)}
                                    </Tag>
                                </div>
                                {contactPrimary ? (
                                    <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] font-bold text-gray-900 dark:text-gray-100">
                                        {client.phone ? (
                                            <TbPhone className="size-3 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
                                        ) : (
                                            <PiEnvelope className="size-3 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
                                        )}
                                        <span className="truncate" title={contactTitle || undefined}>
                                            {contactPrimary}
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                            <div className="flex shrink-0 gap-0.5">
                                <button
                                    type="button"
                                    className="inline-flex size-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                    aria-label={t('actions.view')}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleViewDetails(client)
                                    }}
                                >
                                    <TbEye className="text-base" />
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex size-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                    aria-label={t('actions.edit')}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleEdit(client)
                                    }}
                                >
                                    <TbPencil className="text-base" />
                                </button>
                            </div>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-1 border-t border-gray-100 pt-2 dark:border-gray-700/80">
                            <div className="min-w-0">
                                <div className="truncate text-[9px] font-bold uppercase leading-none tracking-wide text-gray-500 dark:text-gray-400">
                                    {tm('bookings')}
                                </div>
                                <div className="mt-0.5 text-xs font-bold tabular-nums leading-tight text-gray-900 dark:text-gray-100">
                                    {client.totalBookings ?? 0}
                                </div>
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-[9px] font-bold uppercase leading-none tracking-wide text-gray-500 dark:text-gray-400">
                                    {tm('spent')}
                                </div>
                                <div className="mt-0.5 text-xs font-bold tabular-nums leading-tight text-gray-900 dark:text-gray-100">
                                    <NumericFormat
                                        displayType="text"
                                        value={Number.isNaN(spentValue) ? 0 : spentValue}
                                        prefix="$"
                                        thousandSeparator
                                    />
                                </div>
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-[9px] font-bold uppercase leading-none tracking-wide text-gray-500 dark:text-gray-400">
                                    {tm('lastVisit')}
                                </div>
                                <div
                                    className="mt-0.5 truncate text-xs font-bold leading-tight text-gray-900 dark:text-gray-100"
                                    title={lastVisitTitle}
                                >
                                    {client.lastVisit
                                        ? `${formatDate(client.lastVisit, timezone, 'short')} · ${lastVisitHint(client.lastVisit)}`
                                        : lastVisitHint(null)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="flex flex-col gap-1.5 md:hidden">
                {clientsList.length > 0 ? (
                    clientsList.map((client) => <MobileCard key={client.id} client={client} />)
                ) : (
                    clientsEmptyState
                )}
            </div>

            <div className="hidden md:block">
                <DataTable
                    columns={columns}
                    data={clientsList}
                    emptyState={clientsEmptyState}
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

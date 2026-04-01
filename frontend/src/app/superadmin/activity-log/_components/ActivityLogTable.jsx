'use client'

import { useMemo, useState } from 'react'
import DataTable from '@/components/shared/DataTable'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { PiEye, PiDotsThreeVertical } from 'react-icons/pi'
import Dropdown from '@/components/ui/Dropdown'
import Tag from '@/components/ui/Tag'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ActivityLogDetails from './ActivityLogDetails'
import { formatSuperadminDateOnly, formatSuperadminTimeOnly } from '@/utils/dateTime'
import { useTranslations } from 'next-intl'

const actionColors = {
    create: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    update: 'bg-blue-200 dark:bg-blue-900/40 text-gray-900 dark:text-gray-100',
    delete: 'bg-red-200 dark:bg-red-900/40 text-gray-900 dark:text-gray-100',
    approve: 'bg-green-200 dark:bg-green-900/40 text-gray-900 dark:text-gray-100',
    reject: 'bg-orange-200 dark:bg-orange-900/40 text-gray-900 dark:text-gray-100',
    block: 'bg-red-200 dark:bg-red-900/40 text-gray-900 dark:text-gray-100',
    unblock: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    login: 'bg-cyan-200 dark:bg-cyan-900/40 text-gray-900 dark:text-gray-100',
    logout: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    cancel: 'bg-amber-200 dark:bg-amber-900/40 text-gray-900 dark:text-gray-100',
    complete: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    confirm: 'bg-blue-200 dark:bg-blue-900/40 text-gray-900 dark:text-gray-100',
    register: 'bg-purple-200 dark:bg-purple-900/40 text-gray-900 dark:text-gray-100',
}

const segmentColors = {
    admin: 'bg-purple-200 dark:bg-purple-900/40 text-gray-900 dark:text-gray-100',
    business: 'bg-blue-200 dark:bg-blue-900/40 text-gray-900 dark:text-gray-100',
    client: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    system: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
}

const ActivityLogTable = ({
    logsList = [],
    logsTotal = 0,
    pageIndex = 1,
    pageSize = 10,
}) => {
    const t = useTranslations('superadmin.activity')
    const { onAppendQueryParams } = useAppendQueryParams()
    const [selectedLog, setSelectedLog] = useState(null)
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

    const handleView = (log) => {
        setSelectedLog(log)
        setIsDetailsModalOpen(true)
    }

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

    const columns = useMemo(
        () => [
            {
                header: t('table.date'),
                accessorKey: 'created_at',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {formatSuperadminDateOnly(row.created_at)}
                            </div>
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {formatSuperadminTimeOnly(row.created_at)}
                            </div>
                        </div>
                    )
                },
            },
            {
                header: t('table.user'),
                accessorKey: 'user',
                cell: (props) => {
                    const row = props.row.original
                    return row.user ? (
                        <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {row.user.name}
                            </div>
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {row.user.email}
                            </div>
                        </div>
                    ) : (
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('table.system')}
                        </span>
                    )
                },
            },
            {
                header: t('table.segment'),
                accessorKey: 'segment',
                cell: (props) => {
                    const row = props.row.original
                    const segment = row.segment || 'system'
                    return (
                        <Tag className={segmentColors[segment] || segmentColors.system}>
                            {t(`segments.${segment}`, { defaultValue: segment })}
                        </Tag>
                    )
                },
            },
            {
                header: t('table.action'),
                accessorKey: 'action',
                cell: (props) => {
                    const row = props.row.original
                    const color = actionColors[row.action] || 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    return (
                        <Tag className={color}>
                            {t(`actions.${row.action}`, { defaultValue: row.action })}
                        </Tag>
                    )
                },
            },
            {
                header: t('table.description'),
                accessorKey: 'description',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {row.description || row.entity_name || '-'}
                            </div>
                            {row.entity_type && (
                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {row.entity_type} {row.entity_id ? `#${row.entity_id}` : ''}
                                </div>
                            )}
                        </div>
                    )
                },
            },
            {
                header: t('table.company'),
                accessorKey: 'company',
                cell: (props) => {
                    const row = props.row.original
                    return row.company ? (
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {row.company.name}
                        </span>
                    ) : (
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">-</span>
                    )
                },
            },
            {
                header: '',
                id: 'actions',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <Dropdown
                            renderTitle={
                                <button
                                    type="button"
                                    className="p-1.5 rounded-lg cursor-pointer text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary transition-colors"
                                    aria-label={t('viewDetails')}
                                >
                                    <PiDotsThreeVertical className="text-xl" />
                                </button>
                            }
                            placement="bottom-end"
                        >
                            <Dropdown.Item eventKey="view" onClick={() => handleView(row)}>
                                <span className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                                    <PiEye className="text-lg shrink-0 text-gray-700 dark:text-gray-200" />
                                    {t('viewDetails')}
                                </span>
                            </Dropdown.Item>
                        </Dropdown>
                    )
                },
            },
        ],
        [t]
    )

    const pageCount = Math.max(1, Math.ceil(logsTotal / pageSize))

    const MobileCard = ({ log }) => {
        const segment = log.segment || 'system'
        const actionColor = actionColors[log.action] || 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
        return (
            <Card className="p-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {formatSuperadminDateOnly(log.created_at)}
                            </div>
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {formatSuperadminTimeOnly(log.created_at)}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Tag className={segmentColors[segment]}>
                                {t(`segments.${segment}`, { defaultValue: segment })}
                            </Tag>
                            <Tag className={actionColor}>
                                {t(`actions.${log.action}`, { defaultValue: log.action })}
                            </Tag>
                        </div>
                    </div>
                    {log.user ? (
                        <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{log.user.name}</div>
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{log.user.email}</div>
                        </div>
                    ) : (
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('table.system')}</span>
                    )}
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2">
                        {log.description || log.entity_name || '-'}
                    </div>
                    {log.company && (
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{log.company.name}</div>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        icon={<PiEye className="text-lg" />}
                        onClick={() => handleView(log)}
                        className="w-full justify-center mt-1"
                    >
                        {t('viewDetails')}
                    </Button>
                </div>
            </Card>
        )
    }

    return (
        <>
            {/* Мобильная версия — карточки */}
            <div className="md:hidden space-y-4">
                {logsList.length > 0 ? (
                    <>
                        {logsList.map((log, idx) => (
                            <MobileCard key={log.id ?? `log-${idx}`} log={log} />
                        ))}
                        {pageCount > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pageIndex <= 1}
                                    onClick={() => handlePaginationChange(pageIndex - 1)}
                                >
                                    {t('table.prev')}
                                </Button>
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {pageIndex} / {pageCount}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pageIndex >= pageCount}
                                    onClick={() => handlePaginationChange(pageIndex + 1)}
                                >
                                    {t('table.next')}
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-8 text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('notFound')}
                    </div>
                )}
            </div>

            {/* Десктопная версия — таблица */}
            <div className="hidden md:block">
                <DataTable
                    columns={columns}
                    data={logsList}
                    noData={logsList.length === 0}
                    loading={false}
                    pagingData={{
                        total: logsTotal,
                        pageIndex,
                        pageSize,
                    }}
                    onPaginationChange={handlePaginationChange}
                    onSelectChange={handleSelectChange}
                />
            </div>

            <ActivityLogDetails
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false)
                    setSelectedLog(null)
                }}
                log={selectedLog}
            />
        </>
    )
}

export default ActivityLogTable

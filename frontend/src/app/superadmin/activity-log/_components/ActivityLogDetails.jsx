'use client'

import Dialog from '@/components/ui/Dialog'
import Tag from '@/components/ui/Tag'
import { getActivityLog } from '@/lib/api/superadmin'
import { useQuery } from '@tanstack/react-query'
import Loading from '@/components/shared/Loading'
import { useTranslations } from 'next-intl'
import { formatSuperadminDateTime } from '@/utils/dateTime'

const actionColors = {
    create: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    update: 'bg-blue-200 dark:bg-blue-900/40 text-gray-900 dark:text-gray-100',
    delete: 'bg-red-200 dark:bg-red-900/40 text-gray-900 dark:text-gray-100',
    approve: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    reject: 'bg-amber-200 dark:bg-amber-900/40 text-gray-900 dark:text-gray-100',
    block: 'bg-red-200 dark:bg-red-900/40 text-gray-900 dark:text-gray-100',
    unblock: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    login: 'bg-cyan-200 dark:bg-cyan-900/40 text-gray-900 dark:text-gray-100',
    logout: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    register: 'bg-purple-200 dark:bg-purple-900/40 text-gray-900 dark:text-gray-100',
}

const ActivityLogDetails = ({ isOpen, onClose, log }) => {
    const t = useTranslations('superadmin.activity')
    const td = useTranslations('superadmin.activity.details')

    const { data: logDetails, isLoading } = useQuery({
        queryKey: ['activity-log', log?.id],
        queryFn: () => getActivityLog(log.id),
        enabled: isOpen && !!log?.id,
    })

    const displayLog = logDetails || log
    if (!displayLog) return null

    const actionColor =
        actionColors[displayLog.action] ||
        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={720} closable>
            <div className="flex flex-col max-h-[85vh] pt-2">
                <div className="flex-shrink-0 px-6 pt-2 pb-4 border-b border-gray-200 dark:border-gray-700 ltr:pr-14 rtl:pl-14">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {td('title')}
                    </h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                        {td('idLabel')}:{' '}
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {displayLog.id}
                        </span>
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loading loading />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                                    {td('sectionMain')}
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 shrink-0">
                                            {td('dateTime')}
                                        </span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 sm:text-right">
                                            {formatSuperadminDateTime(displayLog.created_at)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {td('user')}
                                        </span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 sm:text-right break-words max-w-md">
                                            {displayLog.user
                                                ? `${displayLog.user.name} (${displayLog.user.email})`
                                                : td('systemUser')}
                                        </span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {td('action')}
                                        </span>
                                        <Tag className={actionColor}>
                                            {t(`actions.${displayLog.action}`, {
                                                defaultValue: displayLog.action,
                                            })}
                                        </Tag>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {td('entityType')}
                                        </span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {displayLog.entity_type || '—'}
                                        </span>
                                    </div>
                                    {displayLog.entity_name && (
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                {td('entityName')}
                                            </span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 sm:text-right max-w-md">
                                                {displayLog.entity_name}
                                            </span>
                                        </div>
                                    )}
                                    {displayLog.description && (
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 shrink-0">
                                                {td('description')}
                                            </span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 sm:text-right max-w-md">
                                                {displayLog.description}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {(displayLog.ip_address || displayLog.user_agent) && (
                                <div>
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                                        {td('sectionTech')}
                                    </h4>
                                    <div className="space-y-3">
                                        {displayLog.ip_address && (
                                            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                    {td('ip')}
                                                </span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
                                                    {displayLog.ip_address}
                                                </span>
                                            </div>
                                        )}
                                        {displayLog.user_agent && (
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                    {td('userAgent')}
                                                </span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 break-all bg-gray-50 dark:bg-gray-800/80 rounded-lg p-3">
                                                    {displayLog.user_agent}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {displayLog.action === 'update' &&
                                (displayLog.old_values || displayLog.new_values) && (
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                                            {td('changes')}
                                        </h4>
                                        <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                            {displayLog.old_values &&
                                                Object.keys(displayLog.old_values).length > 0 && (
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                                            {td('oldValues')}
                                                        </div>
                                                        <pre className="text-sm font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-40 border border-gray-200 dark:border-gray-700">
                                                            {JSON.stringify(displayLog.old_values, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            {displayLog.new_values &&
                                                Object.keys(displayLog.new_values).length > 0 && (
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                                            {td('newValues')}
                                                        </div>
                                                        <pre className="text-sm font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-40 border border-gray-200 dark:border-gray-700">
                                                            {JSON.stringify(displayLog.new_values, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                )}
                        </div>
                    )}
                </div>
            </div>
        </Dialog>
    )
}

export default ActivityLogDetails

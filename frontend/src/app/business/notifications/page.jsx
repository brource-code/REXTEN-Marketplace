'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import classNames from 'classnames'
import { useTranslations } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Button from '@/components/ui/Button'
import Loading from '@/components/shared/Loading'
import { PiBell, PiX } from 'react-icons/pi'
import {
    getBusinessNotifications,
    markBusinessNotificationAsRead,
    markAllBusinessNotificationsAsRead,
    deleteBusinessNotification,
    deleteAllBusinessNotifications,
} from '@/lib/api/business'
import { formatDateTime } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'

/** Совпадает с колокольчиком — общий кеш списка */
const QUERY_KEY = ['business-notifications']

export default function BusinessNotificationsPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const t = useTranslations('business.notifications')
    const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false)
    const { settings } = useBusinessStore()
    const timezone = settings?.timezone || 'America/Los_Angeles'

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: getBusinessNotifications,
    })

    const markAsReadMutation = useMutation({
        mutationFn: markBusinessNotificationAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY })
        },
    })

    const markAllAsReadMutation = useMutation({
        mutationFn: markAllBusinessNotificationsAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: deleteBusinessNotification,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY })
        },
    })

    const deleteAllMutation = useMutation({
        mutationFn: deleteAllBusinessNotifications,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY })
            setClearAllDialogOpen(false)
        },
    })

    const unreadCount = notifications.filter((n) => !n.read).length

    const handleRowClick = (n) => {
        if (!n.read) {
            markAsReadMutation.mutate(n.id)
        }
        if (n.link) {
            router.push(n.link)
        }
    }

    const onDelete = (e, id) => {
        e.stopPropagation()
        deleteMutation.mutate(id)
    }

    const onClearAllClick = () => {
        setClearAllDialogOpen(true)
    }

    const onConfirmClearAll = () => {
        deleteAllMutation.mutate()
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4 max-w-full overflow-x-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                            {notifications.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    loading={deleteAllMutation.isPending}
                                    disabled={markAllAsReadMutation.isPending}
                                    onClick={onClearAllClick}
                                >
                                    {t('clearAll')}
                                </Button>
                            )}
                            {unreadCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    loading={markAllAsReadMutation.isPending}
                                    disabled={deleteAllMutation.isPending}
                                    onClick={() => markAllAsReadMutation.mutate()}
                                >
                                    {t('markAllAsRead')}
                                </Button>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <Loading loading />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/30">
                            <PiBell className="text-5xl text-gray-400 mb-3" />
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('empty')}</p>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1 max-w-md">{t('emptyHint')}</p>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    role={n.link || !n.read ? 'button' : undefined}
                                    tabIndex={n.link || !n.read ? 0 : undefined}
                                    onClick={() => {
                                        if (n.link) {
                                            handleRowClick(n)
                                        } else if (!n.read) {
                                            markAsReadMutation.mutate(n.id)
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key !== 'Enter' && e.key !== ' ') return
                                        e.preventDefault()
                                        if (n.link) {
                                            handleRowClick(n)
                                        } else if (!n.read) {
                                            markAsReadMutation.mutate(n.id)
                                        }
                                    }}
                                    className={classNames(
                                        'relative flex gap-3 px-4 py-4 transition-colors',
                                        (n.link || !n.read) &&
                                            'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80',
                                        !n.read && 'bg-blue-50/80 dark:bg-blue-900/15',
                                    )}
                                >
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-start gap-2 mb-1">
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate flex-1">
                                                {n.title}
                                            </span>
                                            {!n.read && (
                                                <span
                                                    className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5"
                                                    aria-hidden
                                                />
                                            )}
                                        </div>
                                        {n.message ? (
                                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 line-clamp-3">
                                                {n.message}
                                            </p>
                                        ) : null}
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-2">
                                            {n.createdAt
                                                ? formatDateTime(n.createdAt, null, timezone, 'short')
                                                : '—'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={(e) => onDelete(e, n.id)}
                                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title={t('delete')}
                                            aria-label={t('delete')}
                                        >
                                            <PiX className="text-lg" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </AdaptiveCard>

            <ConfirmDialog
                isOpen={clearAllDialogOpen}
                type="danger"
                title={t('clearAllDialog.title')}
                onCancel={() => setClearAllDialogOpen(false)}
                onConfirm={onConfirmClearAll}
                confirmText={t('clearAllDialog.confirm')}
                cancelText={t('clearAllDialog.cancel')}
                confirmButtonProps={{
                    loading: deleteAllMutation.isPending,
                    disabled: deleteAllMutation.isPending,
                }}
            >
                <p>{t('clearAllDialog.message')}</p>
            </ConfirmDialog>
        </Container>
    )
}

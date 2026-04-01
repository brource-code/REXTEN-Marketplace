'use client'

import { useEffect, useState, useRef } from 'react'
import classNames from 'classnames'
import Dropdown from '@/components/ui/Dropdown'
import ScrollBar from '@/components/ui/ScrollBar'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClientNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '@/lib/api/client'
import { PiBell, PiBellFill, PiCheck, PiX } from 'react-icons/pi'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { formatDateTime } from '@/utils/dateTime'

const notificationHeight = 'h-[280px]'

const ClientNotification = () => {
    const router = useRouter()
    const queryClient = useQueryClient()
    const notificationDropdownRef = useRef(null)
    const t = useTranslations('components.notification')
    const locale = useLocale()

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['client-notifications'],
        queryFn: getClientNotifications,
    })

    const markAsReadMutation = useMutation({
        mutationFn: markNotificationAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-notifications'] })
        },
    })

    const markAllAsReadMutation = useMutation({
        mutationFn: markAllNotificationsAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-notifications'] })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: deleteNotification,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-notifications'] })
        },
    })

    const unreadCount = notifications.filter((n) => !n.read).length

    const onDelete = (e, id) => {
        e.stopPropagation()
        deleteMutation.mutate(id)
    }

    const onMarkAllAsRead = () => {
        markAllAsReadMutation.mutate()
    }

    const onMarkAsRead = (id) => {
        markAsReadMutation.mutate(id)
    }

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            onMarkAsRead(notification.id)
        }
        if (notification.link) {
            router.push(notification.link)
            if (notificationDropdownRef.current) {
                notificationDropdownRef.current.handleDropdownClose?.()
            }
        }
    }

    const handleViewAll = () => {
        router.push('/profile')
        if (notificationDropdownRef.current) {
            notificationDropdownRef.current.handleDropdownClose?.()
        }
    }

    return (
        <Dropdown
            ref={notificationDropdownRef}
            renderTitle={
                <div className="relative cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                    {unreadCount > 0 ? (
                        <Badge badgeStyle={{ top: '4px', right: '4px' }}>
                            <PiBellFill className="text-xl text-gray-700 dark:text-gray-300" />
                        </Badge>
                    ) : (
                        <PiBell className="text-xl text-gray-700 dark:text-gray-300" />
                    )}
                </div>
            }
            menuClass="min-w-[280px] md:min-w-[340px] !outline-none [&_*]:!outline-none focus:!outline-none [&_*]:focus:!outline-none"
            placement="bottom-end"
        >
            <Dropdown.Item variant="header">
                <div className="dark:border-gray-700 px-2 flex items-center justify-between mb-1">
                    <h6>{t('title')}</h6>
                    {unreadCount > 0 && (
                        <Button
                            variant="plain"
                            shape="circle"
                            size="sm"
                            icon={<PiCheck className="text-xl" />}
                            title={t('markAllAsRead')}
                            onClick={onMarkAllAsRead}
                            loading={markAllAsReadMutation.isPending}
                        />
                    )}
                </div>
            </Dropdown.Item>
            <ScrollBar className={classNames('overflow-y-auto', notificationHeight)} style={{ outline: 'none' }}>
                {isLoading ? (
                    <div
                        className={classNames(
                            'flex items-center justify-center',
                            notificationHeight,
                        )}
                    >
                        <Spinner size={40} />
                    </div>
                ) : notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                        <div key={notification.id}>
                            <div
                                className={classNames(
                                    'relative rounded-xl flex px-4 py-3 cursor-pointer hover:bg-gray-100 active:bg-gray-100 dark:hover:bg-gray-700 transition outline-none focus:outline-none',
                                    !notification.read && 'bg-blue-50 dark:bg-blue-900/20'
                                )}
                                onClick={() => handleNotificationClick(notification)}
                                tabIndex={-1}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-2 mb-1">
                                        <h6 className="font-semibold text-sm text-gray-900 dark:text-white truncate flex-1">
                                            {notification.title}
                                        </h6>
                                        {!notification.read && (
                                            <Badge
                                                className="bg-blue-500 flex-shrink-0"
                                                innerClass="w-2 h-2 p-0"
                                            />
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 line-clamp-2">
                                        {notification.message}
                                    </p>
                                    <span className="text-xs text-gray-400">
                                        {formatDateTime(notification.createdAt, null, 'America/Los_Angeles', 'short')}
                                    </span>
                                </div>
                                {/* Кнопка удаления */}
                                <button
                                    onClick={(e) => onDelete(e, notification.id)}
                                    className="ml-2 p-1 flex-shrink-0 outline-none focus:outline-none"
                                    title={t('delete') || 'Удалить'}
                                >
                                    <PiX className="text-gray-400 hover:text-red-500 text-sm transition-colors" />
                                </button>
                            </div>
                            {index < notifications.length - 1 && (
                                <div className="border-b border-gray-200 dark:border-gray-700 my-2" />
                            )}
                        </div>
                    ))
                ) : (
                    <div
                        className={classNames(
                            'flex items-center justify-center',
                            notificationHeight,
                        )}
                    >
                        <div className="text-center px-4">
                            <PiBell className="text-4xl text-gray-400 mx-auto mb-2" />
                            <h6 className="font-semibold text-sm">{t('noNotifications')}</h6>
                            <p className="mt-1 text-xs text-gray-500">
                                {t('noNotificationsDescription')}
                            </p>
                        </div>
                    </div>
                )}
            </ScrollBar>
            {notifications.length > 0 && (
                <Dropdown.Item variant="header">
                    <div className="pt-4">
                        <Button block variant="solid" onClick={handleViewAll}>
                            {t('viewAll')}
                        </Button>
                    </div>
                </Dropdown.Item>
            )}
        </Dropdown>
    )
}

export default ClientNotification


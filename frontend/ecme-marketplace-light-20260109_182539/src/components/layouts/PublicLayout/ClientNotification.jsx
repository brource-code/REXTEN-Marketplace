'use client'

import { useEffect, useState, useRef } from 'react'
import classNames from 'classnames'
import Dropdown from '@/components/ui/Dropdown'
import ScrollBar from '@/components/ui/ScrollBar'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClientNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/api/client'
import { PiBell, PiBellFill, PiCheck } from 'react-icons/pi'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const notificationHeight = 'h-[280px]'

const ClientNotification = () => {
    const router = useRouter()
    const queryClient = useQueryClient()
    const notificationDropdownRef = useRef(null)

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

    const unreadCount = notifications.filter((n) => !n.read).length

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
            menuClass="min-w-[280px] md:min-w-[340px]"
            placement="bottom-end"
        >
            <Dropdown.Item variant="header">
                <div className="dark:border-gray-700 px-2 flex items-center justify-between mb-1">
                    <h6>Уведомления</h6>
                    {unreadCount > 0 && (
                        <Button
                            variant="plain"
                            shape="circle"
                            size="sm"
                            icon={<PiCheck className="text-xl" />}
                            title="Отметить все как прочитанные"
                            onClick={onMarkAllAsRead}
                            loading={markAllAsReadMutation.isPending}
                        />
                    )}
                </div>
            </Dropdown.Item>
            <ScrollBar className={classNames('overflow-y-auto', notificationHeight)}>
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
                                    'relative rounded-xl flex px-4 py-3 cursor-pointer hover:bg-gray-100 active:bg-gray-100 dark:hover:bg-gray-700 transition',
                                    !notification.read && 'bg-blue-50 dark:bg-blue-900/20'
                                )}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-2 mb-1">
                                        <h6 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
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
                                        {new Date(notification.createdAt).toLocaleDateString('ru-RU', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
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
                            <h6 className="font-semibold text-sm">Нет уведомлений</h6>
                            <p className="mt-1 text-xs text-gray-500">
                                Здесь будут появляться ваши уведомления
                            </p>
                        </div>
                    </div>
                )}
            </ScrollBar>
            {notifications.length > 0 && (
                <Dropdown.Item variant="header">
                    <div className="pt-4">
                        <Button block variant="solid" onClick={handleViewAll}>
                            Все уведомления
                        </Button>
                    </div>
                </Dropdown.Item>
            )}
        </Dropdown>
    )
}

export default ClientNotification


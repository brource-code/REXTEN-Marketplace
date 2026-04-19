'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Switcher from '@/components/ui/Switcher'
import { FormItem } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getBusinessNotificationSettings,
    updateBusinessNotificationSettings,
    getBusinessTelegramStatus,
    connectBusinessTelegram,
    disconnectBusinessTelegram,
} from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

const NotificationsTab = () => {
    const t = useTranslations('business.settings.notifications')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()
    const [settings, setSettings] = useState({
        email: true,
        telegram: false,
        newBookings: true,
        cancellations: true,
        payments: true,
        reviews: true,
    })

    const { data: notificationSettings, isLoading } = useQuery({
        queryKey: ['business-notification-settings'],
        queryFn: getBusinessNotificationSettings,
    })

    const { data: tgStatus, isLoading: tgLoading } = useQuery({
        queryKey: ['business-telegram-status'],
        queryFn: getBusinessTelegramStatus,
        refetchInterval: 5000,
    })

    const updateSettingsMutation = useMutation({
        mutationFn: updateBusinessNotificationSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-notification-settings'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.saved')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.saveError')}
                </Notification>,
            )
        },
    })

    const connectMutation = useMutation({
        mutationFn: connectBusinessTelegram,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['business-telegram-status'] })
            if (data?.deepLink) {
                if (typeof window !== 'undefined') {
                    window.open(data.deepLink, '_blank', 'noopener')
                }
            }
        },
        onError: (err) => {
            const message =
                err?.response?.status === 503
                    ? t('telegram.errorNotConfigured')
                    : t('telegram.errorConnect')
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {message}
                </Notification>,
            )
        },
    })

    const disconnectMutation = useMutation({
        mutationFn: disconnectBusinessTelegram,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-telegram-status'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('telegram.disconnected')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('telegram.errorDisconnect')}
                </Notification>,
            )
        },
    })

    useEffect(() => {
        if (notificationSettings) {
            setSettings(notificationSettings)
        }
    }, [notificationSettings])

    const handleToggle = (field) => {
        const newSettings = { ...settings, [field]: !settings[field] }
        setSettings(newSettings)
        updateSettingsMutation.mutate(newSettings)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loading loading />
            </div>
        )
    }

    const tgConnected = !!tgStatus?.connected
    const botConfigured = !!tgStatus?.botConfigured

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                    {t('description')}
                </p>
            </div>

            <Card>
                <div className="space-y-6">
                    <FormItem label={t('emailNotifications')}>
                        <Switcher
                            checked={settings.email}
                            onChange={() => handleToggle('email')}
                            loading={updateSettingsMutation.isPending}
                        />
                    </FormItem>
                    <FormItem label={t('telegramNotifications')}>
                        <Switcher
                            checked={!!settings.telegram}
                            onChange={() => handleToggle('telegram')}
                            loading={updateSettingsMutation.isPending}
                        />
                    </FormItem>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1">
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {t('telegram.title')}
                                </div>
                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                    {tgLoading
                                        ? '…'
                                        : tgConnected
                                            ? t('telegram.connectedAs', {
                                                  username: tgStatus?.username
                                                      ? `@${tgStatus.username}`
                                                      : t('telegram.unknownUsername'),
                                              })
                                            : botConfigured
                                                ? t('telegram.notConnected')
                                                : t('telegram.notConfigured')}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {tgConnected ? (
                                    <Button
                                        size="sm"
                                        variant="plain"
                                        loading={disconnectMutation.isPending}
                                        onClick={() => disconnectMutation.mutate()}
                                    >
                                        {t('telegram.disconnect')}
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="solid"
                                        disabled={!botConfigured}
                                        loading={connectMutation.isPending}
                                        onClick={() => connectMutation.mutate()}
                                    >
                                        {t('telegram.connect')}
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2">
                            {t('telegram.staffHint')}
                        </div>
                    </div>

                    <FormItem label={t('newBookingsNotifications')}>
                        <Switcher
                            checked={settings.newBookings}
                            onChange={() => handleToggle('newBookings')}
                            loading={updateSettingsMutation.isPending}
                        />
                    </FormItem>
                    <FormItem label={t('cancellationsNotifications')}>
                        <Switcher
                            checked={settings.cancellations}
                            onChange={() => handleToggle('cancellations')}
                            loading={updateSettingsMutation.isPending}
                        />
                    </FormItem>
                    <FormItem label={t('paymentsNotifications')}>
                        <Switcher
                            checked={settings.payments}
                            onChange={() => handleToggle('payments')}
                            loading={updateSettingsMutation.isPending}
                        />
                    </FormItem>
                    <FormItem label={t('reviewsNotifications')}>
                        <Switcher
                            checked={settings.reviews}
                            onChange={() => handleToggle('reviews')}
                            loading={updateSettingsMutation.isPending}
                        />
                    </FormItem>
                </div>
            </Card>
        </div>
    )
}

export default NotificationsTab

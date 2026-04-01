'use client'
import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Switcher from '@/components/ui/Switcher'
import { FormItem } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    getBusinessNotificationSettings, 
    updateBusinessNotificationSettings 
} from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

const NotificationsTab = () => {
    const queryClient = useQueryClient()
    const [settings, setSettings] = useState({
        email: true,
        sms: false,
        newBookings: true,
        cancellations: true,
        payments: true,
        reviews: true,
    })

    const { data: notificationSettings, isLoading } = useQuery({
        queryKey: ['business-notification-settings'],
        queryFn: getBusinessNotificationSettings,
    })

    const updateSettingsMutation = useMutation({
        mutationFn: updateBusinessNotificationSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-notification-settings'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Настройки уведомлений успешно сохранены
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось сохранить настройки
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

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h4>Уведомления</h4>
                <p className="text-sm text-gray-500 mt-1">
                    Настройки email и SMS уведомлений
                </p>
            </div>

            <Card>
                <div className="space-y-6">
                    <FormItem label="Email уведомления">
                        <Switcher 
                            checked={settings.email}
                            onChange={() => handleToggle('email')}
                            loading={updateSettingsMutation.isPending}
                        />
                    </FormItem>
                    <FormItem label="SMS уведомления">
                        <Switcher 
                            checked={settings.sms}
                            onChange={() => handleToggle('sms')}
                            loading={updateSettingsMutation.isPending}
                        />
                    </FormItem>
                    <FormItem label="Уведомления о новых бронированиях">
                        <Switcher 
                            checked={settings.newBookings}
                            onChange={() => handleToggle('newBookings')}
                            loading={updateSettingsMutation.isPending}
                        />
                    </FormItem>
                    <FormItem label="Уведомления об отменах">
                        <Switcher 
                            checked={settings.cancellations}
                            onChange={() => handleToggle('cancellations')}
                            loading={updateSettingsMutation.isPending}
                        />
                    </FormItem>
                    <FormItem label="Уведомления о платежах">
                        <Switcher 
                            checked={settings.payments}
                            onChange={() => handleToggle('payments')}
                            loading={updateSettingsMutation.isPending}
                        />
                    </FormItem>
                    <FormItem label="Уведомления об отзывах">
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


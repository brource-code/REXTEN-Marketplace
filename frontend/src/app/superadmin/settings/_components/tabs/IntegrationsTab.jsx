'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Switcher from '@/components/ui/Switcher'
import Loading from '@/components/shared/Loading'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { PiPlug, PiCheck, PiWarningCircle, PiStripeLogo, PiEnvelope, PiDeviceMobile } from 'react-icons/pi'
import {
    getIntegrationSettings,
    updateIntegrationSettings,
} from '@/lib/api/superadmin'

const statusTagClass = {
    ok: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    warn: 'bg-amber-200 dark:bg-amber-900/40 text-gray-900 dark:text-gray-100',
    off: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
}

const IntegrationsTab = () => {
    const queryClient = useQueryClient()

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['admin-integrations-settings'],
        queryFn: getIntegrationSettings,
    })

    const toggleStripeMutation = useMutation({
        mutationFn: (stripeEnabled) => updateIntegrationSettings({ stripeEnabled }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-integrations-settings'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Настройки интеграций обновлены
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось обновить настройки интеграций
                </Notification>,
            )
        },
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loading loading />
            </div>
        )
    }

    if (isError || !data) {
        return (
            <Card className="p-4">
                <div className="text-center">
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">
                        Не удалось загрузить интеграции
                    </p>
                    <Button size="sm" onClick={() => refetch()}>
                        Повторить
                    </Button>
                </div>
            </Card>
        )
    }

    const stripeStatus = data.stripeEnabled
        ? data.stripeConfigured
            ? 'ok'
            : 'warn'
        : 'off'

    return (
        <div className="space-y-4">
            <Card className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <PiStripeLogo className="text-xl text-indigo-600 dark:text-indigo-300" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">Stripe</h4>
                                <Tag className={statusTagClass[stripeStatus]}>
                                    {stripeStatus === 'ok'
                                        ? 'Подключено'
                                        : stripeStatus === 'warn'
                                          ? 'Ключи не настроены'
                                          : 'Выключено'}
                                </Tag>
                            </div>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                Управление онлайн-платежами и вебхуками
                            </p>
                            <div className="mt-3 space-y-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                                <div>Public key: {data.stripePublicConfigured ? 'OK' : 'Not set'}</div>
                                <div>Secret key: {data.stripeConfigured ? 'OK' : 'Not set'}</div>
                                <div>Webhook secret: {data.stripeWebhookConfigured ? 'OK' : 'Not set'}</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Switcher
                            checked={Boolean(data.stripeEnabled)}
                            onChange={(checked) => toggleStripeMutation.mutate(Boolean(checked))}
                            loading={toggleStripeMutation.isPending}
                        />
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            Включить Stripe
                        </span>
                    </div>
                </div>
            </Card>

            <Card className="p-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <PiEnvelope className="text-xl text-emerald-600 dark:text-emerald-300" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">Email (SMTP)</h4>
                            <Tag className={statusTagClass[data.emailConfigured ? 'ok' : 'warn']}>
                                {data.emailConfigured ? 'Подключено' : 'Не настроено'}
                            </Tag>
                        </div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            Канал email-уведомлений для системы
                        </p>
                    </div>
                </div>
            </Card>

            <Card className="p-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <PiDeviceMobile className="text-xl text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">SMS</h4>
                            <Tag className={statusTagClass[data.smsConfigured ? 'ok' : 'off']}>
                                {data.smsConfigured ? 'Подключено' : 'Не подключено'}
                            </Tag>
                        </div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            SMS-канал пока выключен
                        </p>
                    </div>
                </div>
            </Card>

            <Card className="p-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <PiPlug className="text-xl text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">Лог-каналы</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            Каналы логирования из Laravel (`config/logging.php`)
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {data.logChannels.channels.map((ch) => (
                                <Tag key={ch} className={ch === data.logChannels.default ? statusTagClass.ok : statusTagClass.off}>
                                    {ch === data.logChannels.default ? <PiCheck className="mr-1" /> : <PiWarningCircle className="mr-1" />}
                                    {ch}
                                </Tag>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}

export default IntegrationsTab

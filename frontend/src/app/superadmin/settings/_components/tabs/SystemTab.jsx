'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Loading from '@/components/shared/Loading'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { PiDatabase, PiLightning, PiCpu, PiHardDrives, PiClock, PiBroom } from 'react-icons/pi'
import {
    clearSystemCache,
    getHealthStatus,
    getSystemSettings,
    updateSystemSettings,
} from '@/lib/api/superadmin'

const statusClass = {
    healthy: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    degraded: 'bg-amber-200 dark:bg-amber-900/40 text-gray-900 dark:text-gray-100',
    unhealthy: 'bg-red-200 dark:bg-red-900/40 text-gray-900 dark:text-gray-100',
}

const SystemTab = () => {
    const queryClient = useQueryClient()

    const { data: settings, isLoading: isSettingsLoading } = useQuery({
        queryKey: ['admin-system-settings'],
        queryFn: getSystemSettings,
    })

    const {
        data: health,
        isLoading: isHealthLoading,
        refetch: refetchHealth,
    } = useQuery({
        queryKey: ['admin-health-status'],
        queryFn: getHealthStatus,
        refetchInterval: 30000,
    })

    const [formData, setFormData] = useState({
        maintenanceMode: false,
        registrationEnabled: true,
        emailVerification: true,
        smsVerification: false,
        twoFactorAuth: false,
        sessionTimeout: 30,
        maxUploadSize: 10,
        cacheEnabled: true,
        cacheDuration: 60,
        logLevel: 'info',
        apiRateLimit: 100,
    })

    useEffect(() => {
        if (settings) {
            setFormData({
                maintenanceMode: Boolean(settings.maintenanceMode),
                registrationEnabled: Boolean(settings.registrationEnabled),
                emailVerification: Boolean(settings.emailVerification),
                smsVerification: Boolean(settings.smsVerification),
                twoFactorAuth: Boolean(settings.twoFactorAuth),
                sessionTimeout: Number(settings.sessionTimeout || 30),
                maxUploadSize: Number(settings.maxUploadSize || 10),
                cacheEnabled: Boolean(settings.cacheEnabled),
                cacheDuration: Number(settings.cacheDuration || 60),
                logLevel: settings.logLevel || 'info',
                apiRateLimit: Number(settings.apiRateLimit || 100),
            })
        }
    }, [settings])

    const saveMutation = useMutation({
        mutationFn: updateSystemSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-system-settings'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Системные настройки сохранены
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось сохранить системные настройки
                </Notification>,
            )
        },
    })

    const clearCacheMutation = useMutation({
        mutationFn: clearSystemCache,
        onSuccess: () => {
            toast.push(
                <Notification title="Успешно" type="success">
                    Кэш успешно очищен
                </Notification>,
            )
            refetchHealth()
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось очистить кэш
                </Notification>,
            )
        },
    })

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        saveMutation.mutate(formData)
    }

    const diskUsedPercent = health?.server?.disk_used_percent
    const uptimeSec = health?.server?.uptime_seconds
    const uptimeLabel =
        uptimeSec != null
            ? `${Math.floor(uptimeSec / 86400)}д ${Math.floor((uptimeSec % 86400) / 3600)}ч`
            : null

    const formatBytes = (b) => {
        if (b == null || b === undefined) return '—'
        const n = Number(b)
        if (Number.isNaN(n)) return '—'
        const gb = n / 1024 ** 3
        if (gb >= 1) return `${gb.toFixed(1)} ГБ`
        const mb = n / 1024 ** 2
        return `${mb.toFixed(0)} МБ`
    }

    const load = health?.server?.load_average
    const memPct = health?.server?.host_memory_used_percent

    return (
        <FormContainer>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-4">
                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                Состояние сервера и здоровье системы
                            </h4>
                            <Button size="sm" onClick={() => refetchHealth()} type="button">
                                Обновить
                            </Button>
                        </div>

                        {isHealthLoading ? (
                            <div className="flex justify-center py-8">
                                <Loading loading />
                            </div>
                        ) : (
                            <>
                                {health?.overall_hint && (
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">
                                        {health.overall_hint}
                                    </p>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <Card className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Общий статус</div>
                                                <Tag className={statusClass[health?.overall_status || 'degraded']}>
                                                    {health?.overall_status || 'unknown'}
                                                </Tag>
                                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2 max-w-[220px]">
                                                    healthy — БД и кэш в порядке; degraded — предупреждения; unhealthy — критично
                                                </div>
                                            </div>
                                            <PiCpu className="text-2xl text-gray-400" />
                                        </div>
                                    </Card>
                                    <Card className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Uptime (хост)</div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {uptimeLabel ?? '—'}
                                                </div>
                                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                                    {health?.server?.uptime_note || '—'}
                                                </div>
                                            </div>
                                            <PiClock className="text-2xl text-gray-400" />
                                        </div>
                                    </Card>
                                    <Card className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Нерешённые алерты</div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {health?.alerts?.unresolved_count ?? 0}
                                                </div>
                                            </div>
                                            <PiLightning className="text-2xl text-gray-400" />
                                        </div>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <Card className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400">База данных</div>
                                            <PiDatabase className="text-xl text-gray-400" />
                                        </div>
                                        <Tag className={statusClass[health?.systems?.database?.status || 'degraded']}>
                                            {health?.systems?.database?.status || 'unknown'}
                                        </Tag>
                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-2">
                                            {health?.systems?.database?.message || '—'}
                                        </div>
                                    </Card>
                                    <Card className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Cache</div>
                                            <PiLightning className="text-xl text-gray-400" />
                                        </div>
                                        <Tag className={statusClass[health?.systems?.cache?.status || 'degraded']}>
                                            {health?.systems?.cache?.status || 'unknown'}
                                        </Tag>
                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-2">
                                            {health?.systems?.cache?.message || '—'}
                                        </div>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                    <Card className="p-4">
                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Нагрузка (load avg)</div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {load
                                                ? `${load['1m']} / ${load['5m']} / ${load['15m']}`
                                                : '—'}
                                        </div>
                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">1 / 5 / 15 мин</div>
                                    </Card>
                                    <Card className="p-4">
                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">ОЗУ хоста</div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {memPct != null ? `${memPct}%` : '—'}
                                        </div>
                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                            {health?.server?.host_memory_note || ''}
                                        </div>
                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                            всего {formatBytes(health?.server?.host_memory_total_bytes)} · занято{' '}
                                            {formatBytes(health?.server?.host_memory_used_bytes)}
                                        </div>
                                    </Card>
                                    <Card className="p-4">
                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Память PHP (этот запрос)</div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {health?.server?.memory_usage_mb ?? '—'} МБ
                                        </div>
                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                            пик {health?.server?.memory_peak_mb ?? '—'} МБ
                                        </div>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card className="p-4">
                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">PHP</div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{health?.server?.php_version || '—'}</div>
                                    </Card>
                                    <Card className="p-4">
                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Laravel</div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{health?.server?.laravel_version || '—'}</div>
                                    </Card>
                                    <Card className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Диск (проект)</div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {diskUsedPercent !== null && diskUsedPercent !== undefined
                                                        ? `${diskUsedPercent}%`
                                                        : '—'}
                                                </div>
                                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                                    {health?.server?.disk_note || ''}
                                                </div>
                                            </div>
                                            <PiHardDrives className="text-xl text-gray-400" />
                                        </div>
                                    </Card>
                                </div>
                            </>
                        )}
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">Системные параметры</h4>
                            <Button
                                variant="default"
                                type="button"
                                icon={<PiBroom />}
                                loading={clearCacheMutation.isPending}
                                onClick={() => clearCacheMutation.mutate()}
                            >
                                Очистить кэш
                            </Button>
                        </div>

                        {isSettingsLoading ? (
                            <div className="flex justify-center py-8">
                                <Loading loading />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <FormItem label="Режим обслуживания">
                                    <Switcher
                                        checked={formData.maintenanceMode}
                                        onChange={(checked) => handleChange('maintenanceMode', checked)}
                                    />
                                </FormItem>
                                <FormItem label="Разрешить регистрацию">
                                    <Switcher
                                        checked={formData.registrationEnabled}
                                        onChange={(checked) => handleChange('registrationEnabled', checked)}
                                    />
                                </FormItem>
                                <FormItem label="Требовать подтверждение email">
                                    <Switcher
                                        checked={formData.emailVerification}
                                        onChange={(checked) => handleChange('emailVerification', checked)}
                                    />
                                </FormItem>
                                <FormItem label="Требовать подтверждение SMS">
                                    <Switcher
                                        checked={formData.smsVerification}
                                        onChange={(checked) => handleChange('smsVerification', checked)}
                                    />
                                </FormItem>
                                <FormItem label="Двухфакторная аутентификация">
                                    <Switcher
                                        checked={formData.twoFactorAuth}
                                        onChange={(checked) => handleChange('twoFactorAuth', checked)}
                                    />
                                </FormItem>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormItem label="Таймаут сессии (минут)">
                                        <Input
                                            type="number"
                                            value={formData.sessionTimeout}
                                            onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value, 10) || 30)}
                                        />
                                    </FormItem>
                                    <FormItem label="Лимит API запросов (в минуту)">
                                        <Input
                                            type="number"
                                            value={formData.apiRateLimit}
                                            onChange={(e) => handleChange('apiRateLimit', parseInt(e.target.value, 10) || 100)}
                                        />
                                    </FormItem>
                                    <FormItem label="Максимальный размер файла (МБ)">
                                        <Input
                                            type="number"
                                            value={formData.maxUploadSize}
                                            onChange={(e) => handleChange('maxUploadSize', parseInt(e.target.value, 10) || 10)}
                                        />
                                    </FormItem>
                                    <FormItem label="Уровень логирования">
                                        <Input
                                            value={formData.logLevel}
                                            onChange={(e) => handleChange('logLevel', e.target.value)}
                                            placeholder="debug, info, warning, error, critical"
                                        />
                                    </FormItem>
                                </div>

                                <FormItem label="Кэширование">
                                    <Switcher
                                        checked={formData.cacheEnabled}
                                        onChange={(checked) => handleChange('cacheEnabled', checked)}
                                    />
                                </FormItem>
                                {formData.cacheEnabled && (
                                    <FormItem label="Длительность кэша (минут)">
                                        <Input
                                            type="number"
                                            value={formData.cacheDuration}
                                            onChange={(e) => handleChange('cacheDuration', parseInt(e.target.value, 10) || 60)}
                                        />
                                    </FormItem>
                                )}
                            </div>
                        )}
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="plain">
                            Отмена
                        </Button>
                        <Button type="submit" variant="solid" loading={saveMutation.isPending}>
                            Сохранить
                        </Button>
                    </div>
                </div>
            </form>
        </FormContainer>
    )
}

export default SystemTab

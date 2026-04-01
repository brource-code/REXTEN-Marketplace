'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import Loading from '@/components/shared/Loading'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { useState, useEffect } from 'react'
import {
    getSubscriptionSettings,
    updateSubscriptionSettings,
} from '@/lib/api/superadmin'

const SubscriptionsTab = () => {
    const queryClient = useQueryClient()
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['admin-subscription-settings'],
        queryFn: getSubscriptionSettings,
    })

    const [enabled, setEnabled] = useState(false)
    const [plans, setPlans] = useState([])

    useEffect(() => {
        if (data) {
            setEnabled(Boolean(data.enabled))
            setPlans(Array.isArray(data.plans) ? data.plans : [])
        }
    }, [data])

    const saveMutation = useMutation({
        mutationFn: updateSubscriptionSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-subscription-settings'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Настройки подписок сохранены
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось сохранить настройки подписок
                </Notification>,
            )
        },
    })

    const updatePlanField = (index, field, value) => {
        setPlans((prev) => prev.map((plan, i) => (i === index ? { ...plan, [field]: value } : plan)))
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loading loading />
            </div>
        )
    }

    if (isError) {
        return (
            <Card className="p-6 text-center">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">
                    Не удалось загрузить настройки подписок
                </p>
                <Button size="sm" onClick={() => refetch()}>
                    Повторить
                </Button>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <Card className="p-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">Подписки</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            Декоративный режим: уровни подписки отображаются в админке, интеграция оплаты будет добавлена позже
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Включить</span>
                        <Switcher checked={enabled} onChange={(val) => setEnabled(Boolean(val))} />
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan, index) => (
                    <Card key={plan.key || index} className="p-6">
                        <div className="space-y-3">
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Уровень {index + 1}</div>
                            <Input
                                value={plan.name || ''}
                                onChange={(e) => updatePlanField(index, 'name', e.target.value)}
                                placeholder="Название"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="number"
                                    value={plan.price ?? 0}
                                    onChange={(e) => updatePlanField(index, 'price', Number(e.target.value || 0))}
                                    placeholder="Цена"
                                />
                                <Input
                                    value={plan.currency || 'USD'}
                                    onChange={(e) => updatePlanField(index, 'currency', e.target.value.toUpperCase())}
                                    placeholder="Валюта"
                                />
                            </div>
                            <div className="space-y-1">
                                {(plan.features || []).map((feature, i) => (
                                    <div key={`${plan.key || index}-${i}`} className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                        - {feature}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="flex justify-end">
                <Button
                    variant="solid"
                    loading={saveMutation.isPending}
                    onClick={() => saveMutation.mutate({ enabled, plans })}
                >
                    Сохранить
                </Button>
            </div>
        </div>
    )
}

export default SubscriptionsTab

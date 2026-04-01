'use client'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { PiCheckCircle, PiXCircle, PiClock, PiUserPlus } from 'react-icons/pi'
import { useQuery } from '@tanstack/react-query'
import { getRecentActivity } from '@/lib/api/superadmin'
import Loading from '@/components/shared/Loading'

const RecentActivity = () => {
    // Получаем данные активности из API
    // TODO: Создать эндпоинт /admin/dashboard/recent-activity на бэкенде
    const { data: activities = [], isLoading } = useQuery({
        queryKey: ['superadmin-recent-activity'],
        queryFn: getRecentActivity,
        retry: false, // Не повторять запрос при ошибке, если эндпоинт еще не создан
    })

    const statusConfig = {
        pending: {
            label: 'Ожидает',
            color: 'bg-amber-500',
        },
        approved: {
            label: 'Одобрено',
            color: 'bg-emerald-500',
        },
        rejected: {
            label: 'Отклонено',
            color: 'bg-red-500',
        },
        completed: {
            label: 'Завершено',
            color: 'bg-blue-500',
        },
    }

    // Маппинг иконок для типов активности
    const getActivityIcon = (type) => {
        switch (type) {
            case 'business_registered':
            case 'user_registered':
                return <PiUserPlus />
            case 'business_approved':
            case 'payment_received':
                return <PiCheckCircle />
            case 'business_rejected':
                return <PiXCircle />
            default:
                return <PiClock />
        }
    }

    if (isLoading) {
        return (
            <Card>
                <h4 className="mb-6">Последняя активность</h4>
                <div className="flex items-center justify-center py-12">
                    <Loading loading />
                </div>
            </Card>
        )
    }

    if (activities.length === 0) {
        return (
            <Card>
                <h4 className="mb-6">Последняя активность</h4>
                <div className="text-center py-12">
                    <p className="text-gray-500">Нет данных об активности</p>
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <h4 className="mb-6">Последняя активность</h4>
            <div className="space-y-4">
                {activities.map((activity) => {
                    const icon = getActivityIcon(activity.type)
                    const config = statusConfig[activity.status] || statusConfig.pending
                    return (
                        <div
                            key={activity.id}
                            className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                {icon}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold">{activity.title}</span>
                                    <Badge className={config.color} />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {activity.description}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {activity.time}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}

export default RecentActivity


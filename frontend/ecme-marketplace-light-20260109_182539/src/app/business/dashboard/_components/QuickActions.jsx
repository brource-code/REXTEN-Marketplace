'use client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    PiCalendarPlus,
    PiUserPlus,
    PiGear,
    PiClock,
    PiChartLine,
    PiUsers,
    PiEye,
    PiArrowSquareOut,
} from 'react-icons/pi'
import { useQuery } from '@tanstack/react-query'
import { getBusinessProfile } from '@/lib/api/business'

const QuickActions = () => {
    const router = useRouter()

    const { data: profile } = useQuery({
        queryKey: ['business-profile'],
        queryFn: getBusinessProfile,
    })

    const actions = [
        {
            title: 'Новое бронирование',
            description: 'Создать бронирование вручную',
            icon: <PiCalendarPlus className="text-2xl" />,
            color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
            onClick: () => router.push('/business/schedule'),
        },
        {
            title: 'Добавить клиента',
            description: 'Зарегистрировать нового клиента',
            icon: <PiUserPlus className="text-2xl" />,
            color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
            onClick: () => router.push('/business/clients'),
        },
        {
            title: 'Настройки',
            description: 'Управление настройками бизнеса',
            icon: <PiGear className="text-2xl" />,
            color: 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400',
            onClick: () => router.push('/business/settings'),
        },
        {
            title: 'Расписание',
            description: 'Управление расписанием',
            icon: <PiClock className="text-2xl" />,
            color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
            onClick: () => router.push('/business/schedule'),
        },
    ]

    // Получаем slug из профиля бизнеса
    const businessSlug = profile?.slug || profile?.name?.toLowerCase().replace(/\s+/g, '-') || 'my-business'

    return (
        <Card className="w-full">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Быстрые действия</h4>
                <Link 
                    href={`/marketplace/${businessSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                >
                    <Button
                        variant="outline"
                        size="sm"
                        icon={<PiArrowSquareOut />}
                    >
                        <span className="hidden sm:inline">Просмотр профиля</span>
                        <span className="sm:hidden">Профиль</span>
                    </Button>
                </Link>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-1 gap-3">
                {actions.map((action, index) => (
                    <button
                        key={index}
                        onClick={action.onClick}
                        className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left w-full"
                    >
                        <div
                            className={`flex items-center justify-center w-12 h-12 rounded-lg flex-shrink-0 ${action.color}`}
                        >
                            {action.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold mb-1 text-sm">{action.title}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                {action.description}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </Card>
    )
}

export default QuickActions


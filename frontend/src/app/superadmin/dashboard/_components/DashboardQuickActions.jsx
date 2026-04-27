'use client'

import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Link from 'next/link'
import {
    PiBuildings,
    PiUsers,
    PiMegaphone,
    PiClockCounterClockwise,
    PiGear,
    PiWarningCircle,
} from 'react-icons/pi'
import { useTranslations } from 'next-intl'

export default function DashboardQuickActions({ stats }) {
    const router = useRouter()
    const t = useTranslations('superadmin.dashboard.quickActions')
    const c = stats?.companies ?? {}
    const a = stats?.advertisements ?? {}

    const pendingCompanies = c.pending ?? 0
    const pendingAds = a.pending_moderation ?? 0

    const actions = [
        {
            title: t('companies'),
            description:
                pendingCompanies > 0
                    ? t('companiesDescPending', { count: pendingCompanies })
                    : t('companiesDesc'),
            icon: <PiBuildings className="text-xl" />,
            color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
            onClick: () => router.push('/superadmin/companies'),
        },
        {
            title: t('users'),
            description: t('usersDesc'),
            icon: <PiUsers className="text-xl" />,
            color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
            onClick: () => router.push('/superadmin/users'),
        },
        {
            title: t('advertisements'),
            description:
                pendingAds > 0
                    ? t('adsDescPending', { count: pendingAds })
                    : t('adsDesc'),
            icon: <PiMegaphone className="text-xl" />,
            color: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
            onClick: () => router.push('/superadmin/advertisements'),
        },
        {
            title: t('activityLog'),
            description: t('activityLogDesc'),
            icon: <PiClockCounterClockwise className="text-xl" />,
            color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
            onClick: () => router.push('/superadmin/activity-log'),
        },
        {
            title: t('reviews'),
            description: t('reviewsDesc'),
            icon: <PiWarningCircle className="text-xl" />,
            color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
            onClick: () => router.push('/superadmin/reviews'),
        },
        {
            title: t('settings'),
            description: t('settingsDesc'),
            icon: <PiGear className="text-xl" />,
            color: 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400',
            onClick: () => router.push('/superadmin/settings'),
        },
    ]

    return (
        <Card className="w-full">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                <Link
                    href="/superadmin/companies"
                    className="text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0"
                >
                    {t('manage')}
                </Link>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-1 gap-3">
                {actions.map((action, index) => (
                    <button
                        key={index}
                        type="button"
                        onClick={action.onClick}
                        className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left w-full"
                    >
                        <div
                            className={`flex items-center justify-center w-12 h-12 rounded-lg flex-shrink-0 ${action.color}`}
                        >
                            {action.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                {action.title}
                            </div>
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

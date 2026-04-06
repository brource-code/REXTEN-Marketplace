 'use client'

import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Loading from '@/components/shared/Loading'
import { getRealtimeMetrics } from '@/lib/api/superadmin'
import classNames from '@/utils/classNames'
import {
    PiUsers,
    PiBrowsers,
    PiClock,
    PiCalendarCheck,
    PiUserPlus,
    PiBuildings,
    PiChartLine,
} from 'react-icons/pi'

/** Единый нейтральный бейдж роли — без «радуги», как обычные теги в админке */
function roleBadgeClass() {
    return 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
}

const StatCard = ({ label, value, icon: Icon, valueClassName }) => (
    <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">{label}</div>
                <div
                    className={classNames(
                        'font-bold text-gray-900 dark:text-gray-100 mt-1',
                        valueClassName ?? 'text-2xl tabular-nums',
                    )}
                >
                    {value}
                </div>
            </div>
            {Icon ? <Icon className="shrink-0 text-2xl text-gray-400" aria-hidden /> : null}
        </div>
    </Card>
)

const RealtimeTab = () => {
    const t = useTranslations('superadmin.settingsPlatform.realtime')

    const { data, isLoading, refetch, dataUpdatedAt, isFetching } = useQuery({
        queryKey: ['admin-realtime-metrics'],
        queryFn: getRealtimeMetrics,
        refetchInterval: 10_000,
    })

    const fmtTime = (iso) => {
        if (!iso) return '—'
        try {
            return new Date(iso).toLocaleString()
        } catch {
            return iso
        }
    }

    const roleLabel = (role) => t(`roles.${role}`, { defaultValue: role ?? '—' })

    const rows = data?.recent_sessions ?? []

    const Field = ({ k, v }) => (
        <div className="space-y-0.5">
            <div className="text-sm font-bold text-gray-500 dark:text-gray-400">{k}</div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 break-all">{v}</div>
        </div>
    )

    return (
        <div className="flex flex-col gap-6">
            <Card className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="min-w-0">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1 max-w-3xl">
                            {t('description')}
                        </p>
                    </div>
                    <Button size="sm" type="button" className="shrink-0" loading={isFetching} onClick={() => refetch()}>
                        {t('refresh')}
                    </Button>
                </div>
                {data?.online_threshold_seconds != null && (
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
                        {t('thresholdHint', { seconds: data.online_threshold_seconds })}
                    </p>
                )}
            </Card>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loading loading />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <StatCard label={t('onlineUsers')} value={data?.online_users_count ?? 0} icon={PiUsers} />
                        <StatCard label={t('onlineSessions')} value={data?.online_sessions_count ?? 0} icon={PiBrowsers} />
                        <StatCard
                            label={t('serverTime')}
                            value={fmtTime(data?.server_time)}
                            icon={PiClock}
                            valueClassName="text-sm sm:text-base leading-snug break-words"
                        />
                        <StatCard label={t('bookingsToday')} value={data?.bookings_today ?? 0} icon={PiCalendarCheck} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <StatCard label={t('newUsersToday')} value={data?.new_users_today ?? 0} icon={PiUserPlus} />
                        <StatCard label={t('usersTotal')} value={data?.users_total ?? 0} icon={PiChartLine} />
                        <StatCard label={t('companiesTotal')} value={data?.companies_total ?? 0} icon={PiBuildings} />
                    </div>

                    {data?.online_by_role && Object.keys(data.online_by_role).length > 0 && (
                        <Card className="p-6">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('onlineByRole')}</h4>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(data.online_by_role).map(([role, count]) => (
                                    <span
                                        key={role}
                                        className={classNames(
                                            'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-bold',
                                            roleBadgeClass(),
                                        )}
                                    >
                                        <span className="text-gray-900 dark:text-gray-100">{roleLabel(role)}</span>
                                        <span className="text-gray-900 dark:text-gray-100 tabular-nums">{count}</span>
                                    </span>
                                ))}
                            </div>
                        </Card>
                    )}

                    {dataUpdatedAt ? (
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            {t('lastUpdated', { time: fmtTime(new Date(dataUpdatedAt).toISOString()) })}
                        </p>
                    ) : null}

                    <Card className="p-0 overflow-hidden">
                        <div className="px-4 py-3 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('sessionsTitle')}</h4>
                        </div>

                        <div className="md:hidden p-4 space-y-3">
                            {rows.length === 0 ? (
                                <div className="text-center py-10 text-sm font-bold text-gray-500 dark:text-gray-400 px-2">
                                    {t('empty')}
                                </div>
                            ) : (
                                rows.map((row, i) => (
                                    <Card
                                        key={`${row.user_id}-${row.client_session_id_short}-${i}`}
                                        className="p-4"
                                    >
                                        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                                            <span
                                                className={classNames(
                                                    'text-xs font-bold rounded-md px-2 py-0.5',
                                                    roleBadgeClass(),
                                                )}
                                            >
                                                {roleLabel(row.role)}
                                            </span>
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {fmtTime(row.last_seen_at)}
                                            </span>
                                        </div>
                                        <Field k={t('colEmail')} v={row.email ?? '—'} />
                                        <div className="mt-2">
                                            <Field k={t('colSession')} v={row.client_session_id_short ?? '—'} />
                                        </div>
                                        <div className="mt-2">
                                            <Field k={t('colUa')} v={row.user_agent_short ?? '—'} />
                                        </div>
                                        <div className="mt-2">
                                            <Field k={t('colIp')} v={row.ip_address ?? '—'} />
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>

                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                                        <th className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {t('colEmail')}
                                        </th>
                                        <th className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {t('colRole')}
                                        </th>
                                        <th className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {t('colLastSeen')}
                                        </th>
                                        <th className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {t('colSession')}
                                        </th>
                                        <th className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 min-w-[160px]">
                                            {t('colUa')}
                                        </th>
                                        <th className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {t('colIp')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-4 py-8 text-center text-sm font-bold text-gray-500 dark:text-gray-400"
                                            >
                                                {t('empty')}
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, i) => (
                                            <tr
                                                key={`${row.user_id}-${row.client_session_id_short}-${i}`}
                                                className="border-b border-gray-100 dark:border-gray-700"
                                            >
                                                <td className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {row.email ?? '—'}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span
                                                        className={classNames(
                                                            'inline-block text-xs font-bold rounded-md px-2 py-0.5',
                                                            roleBadgeClass(),
                                                        )}
                                                    >
                                                        {roleLabel(row.role)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                    {fmtTime(row.last_seen_at)}
                                                </td>
                                                <td className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-gray-100 font-mono text-xs">
                                                    {row.client_session_id_short ?? '—'}
                                                </td>
                                                <td className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-gray-100 max-w-[220px] truncate">
                                                    {row.user_agent_short ?? '—'}
                                                </td>
                                                <td className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                    {row.ip_address ?? '—'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    )
}

export default RealtimeTab

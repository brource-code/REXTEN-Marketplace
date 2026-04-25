'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import Progress from '@/components/ui/Progress'
import Avatar from '@/components/ui/Avatar'
import AbbreviateNumber from '@/components/shared/AbbreviateNumber'
import { useTranslations } from 'next-intl'
import { PiListBullets } from 'react-icons/pi'
import classNames from '@/utils/classNames'

const PERIODS = ['thisWeek', 'thisMonth', 'thisYear']

function formatPctChange(v) {
    const n = Number(v)
    if (Number.isNaN(n)) {
        return '0.0%'
    }
    const sign = n > 0 ? '+' : ''
    return `${sign}${n.toFixed(1)}%`
}

/**
 * Правая колонка дашборда: цель по бронированиям и топ услуг (как в шаблоне REXTEN).
 */
export default function DashboardInsightsColumn({ stats }) {
    const t = useTranslations('business.dashboard')
    const tGoal = useTranslations('business.dashboard.bookingsGoal')
    const tTop = useTranslations('business.dashboard.topServices')

    const [period, setPeriod] = useState('thisMonth')

    const periodOptions = useMemo(
        () =>
            PERIODS.map((value) => ({
                value,
                label: t(`periods.${value}`),
            })),
        [t],
    )

    const selectedOption =
        periodOptions.find((o) => o.value === period) ?? periodOptions[1] ?? null

    const goal = stats?.bookingsGoal?.[period] ?? { current: 0, target: 0, percent: 0 }
    const topList = stats?.topServices?.[period] ?? []

    const captionKey =
        period === 'thisWeek' ? 'captionWeek' : period === 'thisYear' ? 'captionYear' : 'captionMonth'

    return (
        <div className="flex w-full flex-col gap-4 lg:w-[320px] lg:shrink-0">
            <Card className="w-full">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tGoal('title')}</h4>
                    <Select
                        instanceId="dashboard-bookings-goal-period"
                        className="w-[140px]"
                        size="sm"
                        isSearchable={false}
                        value={selectedOption}
                        options={periodOptions}
                        isOptionEqualToValue={(a, b) => a?.value === b?.value}
                        onChange={(opt) => opt?.value && setPeriod(opt.value)}
                    />
                </div>
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0">
                            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                <AbbreviateNumber value={goal.current} />
                            </span>
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {' '}
                                / <AbbreviateNumber value={goal.target} /> {tGoal('units')}
                            </span>
                        </div>
                        <p className="mt-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                            {tGoal(captionKey)}
                        </p>
                        <Link
                            href="/business/settings"
                            className="mt-1 inline-block text-xs font-bold text-primary transition-colors hover:text-primary-deep hover:underline"
                        >
                            {tGoal('adjustInSettings')}
                        </Link>
                    </div>
                    <div className="shrink-0">
                        <Progress
                            variant="circle"
                            percent={goal.percent}
                            width={100}
                            strokeWidth={8}
                            strokeLinecap="round"
                        />
                    </div>
                </div>
            </Card>

            <Card className="w-full">
                <div className="mb-4 flex items-center justify-between gap-2">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tTop('title')}</h4>
                    <Link
                        href="/business/schedule/reports"
                        className="shrink-0 text-sm font-bold text-primary transition-colors hover:text-primary-deep hover:underline whitespace-nowrap"
                    >
                        {tTop('viewAll')}
                    </Link>
                </div>
                {topList.length === 0 ? (
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{tTop('empty')}</p>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {topList.map((row) => (
                            <li key={row.serviceId} className="flex items-center gap-3">
                                {row.image ? (
                                    <Avatar size={44} shape="round" className="shrink-0" src={row.image} />
                                ) : (
                                    <Avatar
                                        size={44}
                                        shape="round"
                                        className="shrink-0 bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                                        icon={
                                            <PiListBullets
                                                className="h-[22px] w-[22px] shrink-0"
                                                aria-hidden
                                            />
                                        }
                                    />
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {row.name}
                                    </div>
                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                        {tTop('booked', { count: row.count })}
                                    </div>
                                </div>
                                <span
                                    className={classNames(
                                        'shrink-0 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums',
                                        row.growShrink >= 0
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                            : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
                                    )}
                                >
                                    {formatPctChange(row.growShrink)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    )
}

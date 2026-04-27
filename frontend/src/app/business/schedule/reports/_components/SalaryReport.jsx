'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Loading from '@/components/shared/Loading'
import { useSalaryReport } from '@/hooks/api/useBusinessSalary'
import { NumericFormat } from 'react-number-format'
import Table from '@/components/ui/Table'
import Tooltip from '@/components/ui/Tooltip'
import {
    PiCurrencyDollar,
    PiUsers,
    PiChartBar,
    PiWarning,
    PiGearSix,
    PiUserCircleMinus,
} from 'react-icons/pi'
import SalarySettingsModal from '@/components/business/SalarySettingsModal'

export default function SalaryReport({ filters }) {
    const t = useTranslations('nav.business.schedule.reports')
    const tSalary = useTranslations('business.salary')
    const { data, isLoading, error } = useSalaryReport(filters)
    const [settingsModal, setSettingsModal] = useState({ isOpen: false, specialistId: null, specialistName: '' })

    if (isLoading) {
        return (
            <Card>
                <div className="flex items-center justify-center min-h-[200px]">
                    <Loading loading />
                </div>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <div className="text-center text-red-500 dark:text-red-400 py-8">
                    {tSalary('loadError')}: {error?.message || tSalary('unknownError')}
                </div>
            </Card>
        )
    }

    if (!data) {
        return (
            <Card>
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    {t('noData')}
                </div>
            </Card>
        )
    }

    const hasNoSettings = data.bySpecialist?.some(s => !s.has_salary_settings)
    const hasUnassigned = data.unassignedBookings?.count > 0

    const statsList = [
        {
            title: tSalary('overview.totalSalary'),
            value: data.totalSalary || 0,
            prefix: '$',
            icon: <PiCurrencyDollar className="text-xl" />,
            color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        },
        {
            title: tSalary('overview.specialists'),
            value: data.totalSpecialists || 0,
            icon: <PiUsers className="text-xl" />,
            color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
        },
        {
            title: tSalary('overview.averageSalary'),
            value: data.averageSalary || 0,
            prefix: '$',
            icon: <PiChartBar className="text-xl" />,
            color: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {tSalary('title')}
            </h4>

            {/* Карточки статистики */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {statsList.map((stat, index) => (
                    <Card key={index}>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                    {stat.title}
                                </div>
                                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    {stat.prefix ? (
                                        <NumericFormat
                                            displayType="text"
                                            value={stat.value}
                                            prefix={stat.prefix}
                                            thousandSeparator={true}
                                            decimalScale={2}
                                        />
                                    ) : (
                                        stat.value
                                    )}
                                </div>
                            </div>
                            <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${stat.color}`}>
                                {stat.icon}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Предупреждения */}
            {(hasUnassigned || hasNoSettings) && (
                <div className="flex flex-col gap-3">
                    {hasUnassigned && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex-shrink-0">
                                <PiUserCircleMinus className="text-lg" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {tSalary('unassignedBookingsWarning')}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    {tSalary('unassignedBookingsDescription', {
                                        count: data.unassignedBookings.count,
                                        revenue: data.unassignedBookings.revenue?.toFixed(2) || '0.00'
                                    })}
                                </p>
                            </div>
                        </div>
                    )}

                    {hasNoSettings && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex-shrink-0">
                                <PiWarning className="text-lg" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {tSalary('noSettingsWarning')}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    {tSalary('noSettingsDescription')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Таблица по исполнителям */}
            <Card>
                <div className="flex flex-col gap-4">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {tSalary('detailsBySpecialist')}
                    </h4>

                    {data.bySpecialist && data.bySpecialist.length > 0 ? (
                        <div className="max-w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 [-webkit-overflow-scrolling:touch]">
                            <Table overflow={false}>
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-800/50">
                                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {tSalary('columns.specialist')}
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {tSalary('columns.bookings')}
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {tSalary('columns.hours')}
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {tSalary('columns.salary')}
                                    </th>
                                    <th
                                        className="sticky right-0 z-20 w-14 min-w-[3.25rem] bg-gray-50/95 px-2 py-3 text-center text-sm font-bold text-gray-500 dark:border-l dark:border-gray-700 dark:bg-gray-800/95 dark:text-gray-400 border-l border-gray-200 shadow-[-8px_0_12px_-6px_rgba(15,23,42,0.12)] dark:shadow-[-8px_0_12px_-6px_rgba(0,0,0,0.35)]"
                                        aria-label={tSalary('settingsTooltip')}
                                    />
                                </tr>
                            </thead>
                            <tbody>
                                {data.bySpecialist.map((specialist) => (
                                    <tr
                                        key={specialist.specialist_id}
                                        className="border-b border-gray-100 last:border-0 dark:border-gray-800/80"
                                    >
                                        <td className="px-4 py-3 align-middle">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {specialist.specialist_name}
                                                </span>
                                                {!specialist.has_salary_settings && (
                                                    <Tooltip title={tSalary('noSettingsTooltip')}>
                                                        <span className="text-amber-500 dark:text-amber-400">
                                                            <PiWarning className="text-base" />
                                                        </span>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right align-middle">
                                            <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                                {specialist.total_bookings || 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right align-middle">
                                            <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                                {specialist.total_hours ? specialist.total_hours.toFixed(2) : '0.00'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right align-middle">
                                            <span className={`text-sm font-bold ${specialist.has_salary_settings ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                <NumericFormat
                                                    displayType="text"
                                                    value={specialist.total_salary || 0}
                                                    prefix={'$'}
                                                    thousandSeparator={true}
                                                    decimalScale={2}
                                                />
                                            </span>
                                        </td>
                                        <td className="sticky right-0 z-10 w-14 min-w-[3.25rem] border-l border-gray-100 bg-white px-2 py-3 text-center align-middle shadow-[-8px_0_12px_-6px_rgba(15,23,42,0.08)] dark:border-gray-800 dark:bg-gray-950 dark:shadow-[-8px_0_12px_-6px_rgba(0,0,0,0.4)]">
                                            <Tooltip title={tSalary('settingsTooltip')}>
                                                <div
                                                    className="inline-flex cursor-pointer select-none items-center justify-center text-xl font-semibold text-gray-600 hover:text-primary dark:text-gray-400"
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => setSettingsModal({
                                                        isOpen: true,
                                                        specialistId: specialist.specialist_id,
                                                        specialistName: specialist.specialist_name,
                                                    })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault()
                                                            setSettingsModal({
                                                                isOpen: true,
                                                                specialistId: specialist.specialist_id,
                                                                specialistName: specialist.specialist_name,
                                                            })
                                                        }
                                                    }}
                                                >
                                                    <PiGearSix />
                                                </div>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-6">
                            {tSalary('noSpecialistsData')}
                        </div>
                    )}
                </div>
            </Card>

            <SalarySettingsModal
                isOpen={settingsModal.isOpen}
                onClose={() =>
                    setSettingsModal({ isOpen: false, specialistId: null, specialistName: '' })
                }
                specialistId={settingsModal.specialistId}
                specialistName={settingsModal.specialistName}
            />
        </div>
    )
}

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Loading from '@/components/shared/Loading'
import { useSalaryReport } from '@/hooks/api/useBusinessSalary'
import { NumericFormat } from 'react-number-format'
import Table from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Tooltip from '@/components/ui/Tooltip'
import { TbAlertTriangle, TbSettings, TbUserQuestion } from 'react-icons/tb'
import SalarySettingsModal from '@/components/business/SalarySettingsModal'

export default function SalaryReport({ filters }) {
    const t = useTranslations('nav.business.schedule.reports')
    const tSalary = useTranslations('business.salary')
    const { data, isLoading, error, refetch } = useSalaryReport(filters)
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
        console.error('SalaryReport error:', error)
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


    return (
        <Card>
            <div className="mb-6">
                <h2 className="h4 heading-text mb-4">{tSalary('title')}</h2>
                
                {/* Общая статистика */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            {tSalary('overview.totalSalary')}
                        </div>
                        <div className="text-2xl font-bold heading-text">
                            <NumericFormat
                                displayType="text"
                                value={data.totalSalary || 0}
                                prefix={'$'}
                                thousandSeparator={true}
                                decimalScale={2}
                            />
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            {tSalary('overview.specialists')}
                        </div>
                        <div className="text-2xl font-bold heading-text">
                            {data.totalSpecialists || 0}
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            {tSalary('overview.averageSalary')}
                        </div>
                        <div className="text-2xl font-bold heading-text">
                            <NumericFormat
                                displayType="text"
                                value={data.averageSalary || 0}
                                prefix={'$'}
                                thousandSeparator={true}
                                decimalScale={2}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Предупреждение о бронированиях без специалиста */}
            {data.unassignedBookings && data.unassignedBookings.count > 0 && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                        <TbUserQuestion className="text-blue-600 dark:text-blue-400 text-xl flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                                {tSalary('unassignedBookingsWarning') || 'Бронирования без исполнителя'}
                            </h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                {tSalary('unassignedBookingsDescription', { 
                                    count: data.unassignedBookings.count,
                                    revenue: data.unassignedBookings.revenue?.toFixed(2) || '0.00'
                                }) || `${data.unassignedBookings.count} завершённых бронирований на сумму $${data.unassignedBookings.revenue?.toFixed(2) || '0.00'} не имеют назначенного исполнителя и не учитываются в расчёте зарплаты.`}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Предупреждение о специалистах без настроек */}
            {data.bySpecialist && data.bySpecialist.some(s => !s.has_salary_settings) && (
                <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start gap-3">
                        <TbAlertTriangle className="text-yellow-600 dark:text-yellow-400 text-xl flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                                {tSalary('noSettingsWarning') || 'Не настроена оплата'}
                            </h4>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                {tSalary('noSettingsDescription') || 'У некоторых специалистов не настроены параметры оплаты. Зарплата для них не рассчитывается. Нажмите на кнопку настройки рядом с именем специалиста.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Детальная таблица по исполнителям */}
            {data.bySpecialist && Array.isArray(data.bySpecialist) && data.bySpecialist.length > 0 ? (
                <div>
                    <h3 className="text-sm font-semibold heading-text mb-4">{tSalary('detailsBySpecialist')}</h3>
                    <Table>
                        <thead>
                            <tr>
                                <th>{tSalary('columns.specialist')}</th>
                                <th>{tSalary('columns.bookings')}</th>
                                <th>{tSalary('columns.hours')}</th>
                                <th>{tSalary('columns.salary')}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.bySpecialist.map((specialist) => (
                                <tr key={specialist.specialist_id}>
                                    <td className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {specialist.specialist_name}
                                            {!specialist.has_salary_settings && (
                                                <Tooltip title={tSalary('noSettingsTooltip') || 'Не настроена оплата'}>
                                                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                        <TbAlertTriangle className="text-sm" />
                                                    </Badge>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </td>
                                    <td>{specialist.total_bookings || 0}</td>
                                    <td>{specialist.total_hours ? specialist.total_hours.toFixed(2) : '0.00'}</td>
                                    <td>
                                        <span className={`font-semibold ${specialist.has_salary_settings ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                            <NumericFormat
                                                displayType="text"
                                                value={specialist.total_salary || 0}
                                                prefix={'$'}
                                                thousandSeparator={true}
                                                decimalScale={2}
                                            />
                                        </span>
                                    </td>
                                    <td>
                                        <Tooltip title={tSalary('settingsTooltip') || 'Настроить оплату'}>
                                            <Button
                                                size="xs"
                                                variant={specialist.has_salary_settings ? 'plain' : 'solid'}
                                                color={specialist.has_salary_settings ? 'default' : 'yellow'}
                                                icon={<TbSettings />}
                                                onClick={() => setSettingsModal({
                                                    isOpen: true,
                                                    specialistId: specialist.specialist_id,
                                                    specialistName: specialist.specialist_name,
                                                })}
                                            />
                                        </Tooltip>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    {tSalary('noSpecialistsData')}
                </div>
            )}

            {/* Модалка настройки зарплаты */}
            <SalarySettingsModal
                isOpen={settingsModal.isOpen}
                onClose={() => {
                    setSettingsModal({ isOpen: false, specialistId: null, specialistName: '' })
                    refetch()
                }}
                specialistId={settingsModal.specialistId}
                specialistName={settingsModal.specialistName}
            />
        </Card>
    )
}

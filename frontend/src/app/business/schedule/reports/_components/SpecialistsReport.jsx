'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import { NumericFormat } from 'react-number-format'
import { HiChevronDown, HiChevronRight } from 'react-icons/hi'
import { useSpecialistsReport } from '@/hooks/api/useBusinessReports'
import Loading from '@/components/shared/Loading'
export default function SpecialistsReport({ filters }) {
    const t = useTranslations('nav.business.schedule.reports.specialists')
    const tCommon = useTranslations('nav.business.schedule.reports')
    const tTable = useTranslations('nav.business.schedule.reports.table')
    
    const { data, isLoading, error } = useSpecialistsReport(filters)
    const [expandedRows, setExpandedRows] = useState(new Set())

    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedRows(newExpanded)
    }

    if (isLoading) {
        return (
            <Card>
                <div className="flex items-center justify-center min-h-[200px]">
                    <Loading loading />
                </div>
            </Card>
        )
    }

    if (error || !data || data.length === 0) {
        return (
            <Card>
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    {tCommon('noData')}
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <div className="mb-4">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
            </div>

            <Table>
                <thead>
                    <tr>
                        <th></th>
                        <th>{tTable('specialist')}</th>
                        <th>{t('bookingsCount')}</th>
                        <th>{t('revenue')}</th>
                        <th>{t('cancellations')}</th>
                        <th>{t('completed')}</th>
                        <th>{t('active')}</th>
                        <th>{t('averageCheck')}</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((specialist) => {
                        const isExpanded = expandedRows.has(specialist.id)
                        return (
                            <React.Fragment key={specialist.id}>
                                <tr
                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                    onClick={() => toggleRow(specialist.id)}
                                >
                                    <td>
                                        {isExpanded ? (
                                            <HiChevronDown className="text-lg" />
                                        ) : (
                                            <HiChevronRight className="text-lg" />
                                        )}
                                    </td>
                                    <td>
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{specialist.name}</span>
                                    </td>
                                    <td>
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{specialist.bookingsCount}</span>
                                    </td>
                                    <td>
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            <NumericFormat
                                                displayType="text"
                                                value={specialist.revenue}
                                                prefix="$"
                                                thousandSeparator={true}
                                                decimalScale={2}
                                            />
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{specialist.cancellations}</span>
                                    </td>
                                    <td>
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{specialist.completed}</span>
                                    </td>
                                    <td>
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{specialist.active}</span>
                                    </td>
                                    <td>
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            <NumericFormat
                                                displayType="text"
                                                value={specialist.averageCheck}
                                                prefix="$"
                                                thousandSeparator={true}
                                                decimalScale={2}
                                            />
                                        </span>
                                    </td>
                                </tr>
                                {isExpanded && specialist.clients && specialist.clients.length > 0 && (
                                    <tr>
                                        <td colSpan={8} className="bg-gray-50 dark:bg-gray-800">
                                            <div className="p-4">
                                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{t('clients')}</div>
                                                <Table>
                                                    <thead>
                                                        <tr>
                                                            <th>{tCommon('overview.uniqueClients')}</th>
                                                            <th>{t('bookingsCount')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {specialist.clients.map((client, clientIndex) => (
                                                            <tr key={`${specialist.id}-client-${client.id || client.name || clientIndex}`}>
                                                                <td>
                                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{client.name}</span>
                                                                </td>
                                                                <td>
                                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{client.bookings}</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        )
                    })}
                </tbody>
            </Table>
        </Card>
    )
}


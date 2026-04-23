'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import { NumericFormat } from 'react-number-format'
import { HiChevronDown, HiChevronRight } from 'react-icons/hi'
import { PiCurrencyDollar } from 'react-icons/pi'
import classNames from '@/utils/classNames'
import { useSpecialistsReport } from '@/hooks/api/useBusinessReports'
import Loading from '@/components/shared/Loading'

function MetricPill({ children, className }) {
    return (
        <span
            className={classNames(
                'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                className,
            )}
        >
            {children}
        </span>
    )
}

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
                <div className="flex min-h-[200px] items-center justify-center">
                    <Loading loading />
                </div>
            </Card>
        )
    }

    if (error || !data || data.length === 0) {
        return (
            <Card>
                <div className="py-8 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
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

            <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <Table overflow>
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-800/50">
                            <th className="w-10 px-3 py-3" aria-hidden />
                            <th className="px-3 py-3 text-left text-sm font-bold text-gray-500 dark:text-gray-400">
                                {tTable('specialist')}
                            </th>
                            <th className="px-3 py-3 text-right text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('bookingsCount')}
                            </th>
                            <th className="px-3 py-3 text-right text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('revenue')}
                            </th>
                            <th className="px-3 py-3 text-right text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('cancellations')}
                            </th>
                            <th className="px-3 py-3 text-right text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('completed')}
                            </th>
                            <th className="px-3 py-3 text-right text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('active')}
                            </th>
                            <th className="px-3 py-3 text-right text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('averageCheck')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((specialist) => {
                            const isExpanded = expandedRows.has(specialist.id)
                            return (
                                <React.Fragment key={specialist.id}>
                                    <tr
                                        className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50/80 dark:border-gray-800/80 dark:hover:bg-gray-800/40"
                                        onClick={() => toggleRow(specialist.id)}
                                    >
                                        <td className="px-3 py-3 align-middle text-gray-500 dark:text-gray-400">
                                            {isExpanded ? (
                                                <HiChevronDown className="text-lg" aria-hidden />
                                            ) : (
                                                <HiChevronRight className="text-lg" aria-hidden />
                                            )}
                                        </td>
                                        <td className="px-3 py-3 align-middle">
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {specialist.name}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-right align-middle">
                                            <MetricPill className="bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200">
                                                {specialist.bookingsCount}
                                            </MetricPill>
                                        </td>
                                        <td className="px-3 py-3 text-right align-middle">
                                            <span className="inline-flex items-center justify-end gap-0.5 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                                <PiCurrencyDollar className="text-base shrink-0" aria-hidden />
                                                <NumericFormat
                                                    displayType="text"
                                                    value={specialist.revenue}
                                                    prefix="$"
                                                    thousandSeparator
                                                    decimalScale={2}
                                                />
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-right align-middle">
                                            <MetricPill className="bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">
                                                {specialist.cancellations}
                                            </MetricPill>
                                        </td>
                                        <td className="px-3 py-3 text-right align-middle">
                                            <MetricPill className="bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                                                {specialist.completed}
                                            </MetricPill>
                                        </td>
                                        <td className="px-3 py-3 text-right align-middle">
                                            <MetricPill className="bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200">
                                                {specialist.active}
                                            </MetricPill>
                                        </td>
                                        <td className="px-3 py-3 text-right align-middle">
                                            <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                                <NumericFormat
                                                    displayType="text"
                                                    value={specialist.averageCheck}
                                                    prefix="$"
                                                    thousandSeparator
                                                    decimalScale={2}
                                                />
                                            </span>
                                        </td>
                                    </tr>
                                    {isExpanded && specialist.clients && specialist.clients.length > 0 && (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="border-b border-gray-100 bg-gray-50/90 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/60"
                                            >
                                                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                    {t('clients')}
                                                </div>
                                                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                                    <Table overflow={false}>
                                                        <thead>
                                                            <tr className="bg-white dark:bg-gray-900/40">
                                                                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 dark:text-gray-400">
                                                                    {tCommon('overview.uniqueClients')}
                                                                </th>
                                                                <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 dark:text-gray-400">
                                                                    {t('bookingsCount')}
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {specialist.clients.map((client, clientIndex) => (
                                                                <tr
                                                                    key={`${specialist.id}-client-${client.id || client.name || clientIndex}`}
                                                                    className="border-t border-gray-100 dark:border-gray-700"
                                                                >
                                                                    <td className="px-3 py-2">
                                                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                                            {client.name}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right">
                                                                        <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                                                            {client.bookings}
                                                                        </span>
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
            </div>

            <div className="flex flex-col gap-2 md:hidden">
                {data.map((specialist) => {
                    const isExpanded = expandedRows.has(specialist.id)
                    return (
                        <div
                            key={specialist.id}
                            className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/40"
                        >
                            <button
                                type="button"
                                className="flex w-full items-start gap-3 p-3 text-left"
                                onClick={() => toggleRow(specialist.id)}
                            >
                                <span className="mt-0.5 text-gray-500 dark:text-gray-400">
                                    {isExpanded ? (
                                        <HiChevronDown className="text-lg" aria-hidden />
                                    ) : (
                                        <HiChevronRight className="text-lg" aria-hidden />
                                    )}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {specialist.name}
                                    </div>
                                    <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-2">
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                {t('bookingsCount')}
                                            </div>
                                            <div className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                                {specialist.bookingsCount}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                {t('completed')}
                                            </div>
                                            <div className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                                {specialist.completed}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                {t('active')}
                                            </div>
                                            <div className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                                {specialist.active}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                {t('cancellations')}
                                            </div>
                                            <div className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                                {specialist.cancellations}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                {t('averageCheck')}
                                            </div>
                                            <div className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                                <NumericFormat
                                                    displayType="text"
                                                    value={specialist.averageCheck}
                                                    prefix="$"
                                                    thousandSeparator
                                                    decimalScale={2}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-700">
                                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                            {t('revenue')}
                                        </div>
                                        <div className="inline-flex items-center gap-0.5 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                            <PiCurrencyDollar className="text-base" aria-hidden />
                                            <NumericFormat
                                                displayType="text"
                                                value={specialist.revenue}
                                                prefix="$"
                                                thousandSeparator
                                                decimalScale={2}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </button>
                            {isExpanded && specialist.clients && specialist.clients.length > 0 && (
                                <div className="border-t border-gray-200 bg-gray-50/90 px-3 pb-3 pt-2 dark:border-gray-700 dark:bg-gray-800/60">
                                    <div className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                                        {t('clients')}
                                    </div>
                                    <ul className="flex flex-col gap-2">
                                        {specialist.clients.map((client, clientIndex) => (
                                            <li
                                                key={`${specialist.id}-m-client-${client.id || client.name || clientIndex}`}
                                                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30"
                                            >
                                                <span className="min-w-0 truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {client.name}
                                                </span>
                                                <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                                    {client.bookings}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}

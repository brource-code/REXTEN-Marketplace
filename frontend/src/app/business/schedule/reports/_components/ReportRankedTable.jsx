'use client'

import Table from '@/components/ui/Table'
import classNames from '@/utils/classNames'
import { NumericFormat } from 'react-number-format'
import { PiCurrencyDollar } from 'react-icons/pi'

export function RankBadge({ rank }) {
    const base =
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums'
    const cls =
        rank === 1
            ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200'
            : rank === 2
              ? 'bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-100'
              : rank === 3
                ? 'bg-orange-100 text-orange-900 dark:bg-orange-500/20 dark:text-orange-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    return <span className={classNames(base, cls)}>{rank}</span>
}

export function MoneyValue({ value, prefix = '$' }) {
    return (
        <span className="inline-flex items-center gap-0.5 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            <PiCurrencyDollar className="text-base shrink-0" aria-hidden />
            <NumericFormat
                displayType="text"
                value={value}
                prefix={prefix}
                thousandSeparator
                decimalScale={2}
            />
        </span>
    )
}

/**
 * @param {object} props
 * @param {Array<object>} props.rows
 * @param {(row: object, index: number) => string|number} props.getRowKey
 * @param {Array<{ header: string, align?: 'left'|'right', thClassName?: string, render: (row: object, index: number) => import('react').ReactNode }>} props.columns
 * @param {string} [props.mobileValueLabel] — подпись значения в мобильной карточке (последняя колонка)
 */
export default function ReportRankedTable({ rows, getRowKey, columns, mobileValueLabel }) {
    if (!rows?.length) return null

    const lastCol = columns[columns.length - 1]

    return (
        <>
            <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <Table overflow className="!overflow-visible">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-800/50">
                            {columns.map((col) => (
                                <th
                                    key={col.header}
                                    className={classNames(
                                        'px-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400',
                                        col.align === 'right' ? 'text-right' : 'text-left',
                                        col.thClassName,
                                    )}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr
                                key={getRowKey(row, index)}
                                className="border-b border-gray-100 last:border-0 dark:border-gray-800/80"
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.header}
                                        className={classNames(
                                            'px-4 py-3 align-middle',
                                            col.align === 'right' ? 'text-right' : 'text-left',
                                        )}
                                    >
                                        {col.render(row, index)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            <div className="flex flex-col gap-2 md:hidden">
                {rows.map((row, index) => (
                    <div
                        key={getRowKey(row, index)}
                        className="flex items-stretch gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800/40"
                    >
                        <div className="flex shrink-0 flex-col items-center justify-center">
                            {columns[0]?.render(row, index)}
                        </div>
                        <div className="min-w-0 flex-1">
                            {columns.length > 2 ? (
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {columns[1].render(row, index)}
                                </div>
                            ) : null}
                            {mobileValueLabel ? (
                                <div className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                                    {mobileValueLabel}
                                </div>
                            ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end justify-center text-right">
                            {lastCol.render(row, index)}
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
}

'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Loading from '@/components/shared/Loading'
import { useQuery } from '@tanstack/react-query'
import {
    getSuperadminBillingForecast,
    getSuperadminBillingAdSpend,
    getSuperadminBillingCampaigns,
    downloadSuperadminBillingExport,
} from '@/lib/api/superadmin-billing'
import { useTranslations } from 'next-intl'
import { NumericFormat } from 'react-number-format'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

export default function BillingReportsColumn() {
    const t = useTranslations('superadmin.billing.reports')
    const tToast = useTranslations('superadmin.billing')
    const [from, setFrom] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d.toISOString().slice(0, 10)
    })
    const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
    const [exporting, setExporting] = useState(false)

    const { data: forecast, isLoading: fLoad } = useQuery({
        queryKey: ['superadmin-billing-forecast'],
        queryFn: getSuperadminBillingForecast,
        staleTime: 120_000,
    })

    const { data: adSpend, isLoading: aLoad } = useQuery({
        queryKey: ['superadmin-billing-ad-spend'],
        queryFn: getSuperadminBillingAdSpend,
        staleTime: 120_000,
    })

    const { data: campaigns, isLoading: cLoad } = useQuery({
        queryKey: ['superadmin-billing-campaigns'],
        queryFn: () => getSuperadminBillingCampaigns(12),
        staleTime: 120_000,
    })

    const setPreset = (preset) => {
        const end = new Date()
        const start = new Date()
        if (preset === 'today') {
            /* same day */
        } else if (preset === 'week') {
            start.setDate(end.getDate() - 7)
        } else if (preset === 'month') {
            start.setDate(end.getDate() - 30)
        }
        setFrom(start.toISOString().slice(0, 10))
        setTo(end.toISOString().slice(0, 10))
    }

    const handleExport = async () => {
        if (!from || !to) {
            toast.push(
                <Notification title={tToast('toastSelectDates')} type="warning" />,
            )
            return
        }
        setExporting(true)
        try {
            await downloadSuperadminBillingExport(from, to)
            toast.push(
                <Notification title={tToast('toastExportOk')} type="success" />,
            )
        } catch {
            toast.push(
                <Notification title={tToast('toastExportErr')} type="danger" />,
            )
        } finally {
            setExporting(false)
        }
    }

    const showStripe = forecast?.stripe_configured !== false

    if (!showStripe && !fLoad) {
        return (
            <div className="flex flex-col gap-4">
                <Card>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('stripeOff')}</p>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('forecastTitle')}</h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">{t('forecastHint')}</p>
                {fLoad ? (
                    <Loading loading className="py-4" />
                ) : (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-bold">
                            <span className="text-gray-500 dark:text-gray-400">{t('last7')}</span>
                            <span className="text-gray-900 dark:text-gray-100">
                                <NumericFormat
                                    displayType="text"
                                    value={forecast?.last_7_days_total ?? 0}
                                    prefix="$"
                                    thousandSeparator
                                    decimalScale={0}
                                />
                            </span>
                        </div>
                        <div className="flex justify-between text-sm font-bold">
                            <span className="text-gray-500 dark:text-gray-400">{t('dailyAvg')}</span>
                            <span className="text-gray-900 dark:text-gray-100">
                                <NumericFormat
                                    displayType="text"
                                    value={forecast?.daily_avg ?? 0}
                                    prefix="$"
                                    thousandSeparator
                                    decimalScale={0}
                                />
                            </span>
                        </div>
                        <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-gray-500 dark:text-gray-400">{t('projected')}</span>
                            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                <NumericFormat
                                    displayType="text"
                                    value={forecast?.projected_month ?? 0}
                                    prefix="$"
                                    thousandSeparator
                                    decimalScale={0}
                                />
                            </span>
                        </div>
                    </div>
                )}
            </Card>

            <Card>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('adSpendTitle')}</h4>
                {aLoad ? (
                    <Loading loading className="py-4" />
                ) : (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-bold">
                            <span className="text-gray-500 dark:text-gray-400">{t('thisMonth')}</span>
                            <span className="text-gray-900 dark:text-gray-100">
                                <NumericFormat
                                    displayType="text"
                                    value={adSpend?.this_month ?? 0}
                                    prefix="$"
                                    thousandSeparator
                                    decimalScale={0}
                                />
                            </span>
                        </div>
                        <div className="flex justify-between text-sm font-bold">
                            <span className="text-gray-500 dark:text-gray-400">{t('lastMonth')}</span>
                            <span className="text-gray-900 dark:text-gray-100">
                                <NumericFormat
                                    displayType="text"
                                    value={adSpend?.last_month ?? 0}
                                    prefix="$"
                                    thousandSeparator
                                    decimalScale={0}
                                />
                            </span>
                        </div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2">
                            {t('adTx')}{' '}
                            <span className="text-gray-900 dark:text-gray-100">
                                {adSpend?.transactions_count ?? 0}
                            </span>
                        </p>
                    </div>
                )}
            </Card>

            <Card>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('recentAds')}</h4>
                {cLoad ? (
                    <Loading loading className="py-4" />
                ) : !campaigns?.items?.length ? (
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('noCampaigns')}</p>
                ) : (
                    <ul className="space-y-3 max-h-[280px] overflow-y-auto">
                        {campaigns.items.map((item, i) => (
                            <li
                                key={`${item.created}-${i}`}
                                className="text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0"
                            >
                                <div className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2">
                                    {item.description}
                                </div>
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                    {item.company_name} · {item.package_id || '—'}
                                </div>
                                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                    <NumericFormat
                                        displayType="text"
                                        value={item.amount}
                                        prefix="$"
                                        thousandSeparator
                                        decimalScale={2}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <Card>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('exportTitle')}</h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">{t('exportHint')}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                    <Button size="sm" variant="plain" onClick={() => setPreset('today')}>
                        {t('presetToday')}
                    </Button>
                    <Button size="sm" variant="plain" onClick={() => setPreset('week')}>
                        {t('presetWeek')}
                    </Button>
                    <Button size="sm" variant="plain" onClick={() => setPreset('month')}>
                        {t('presetMonth')}
                    </Button>
                </div>
                <div className="flex flex-col gap-2 mb-3">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('from')}</label>
                    <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-bold text-gray-900 dark:text-gray-100"
                    />
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('to')}</label>
                    <input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-bold text-gray-900 dark:text-gray-100"
                    />
                </div>
                <Button block loading={exporting} onClick={handleExport}>
                    {t('downloadCsv')}
                </Button>
            </Card>
        </div>
    )
}

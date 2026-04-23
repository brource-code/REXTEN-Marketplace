'use client'

import { useTranslations, useLocale } from 'next-intl'
import Card from '@/components/ui/Card'
import { PiCalendar, PiTrendUp, PiCurrencyDollar, PiPercent, PiStar, PiUser } from 'react-icons/pi'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'

const SummaryItem = ({ icon: Icon, iconBg, iconColor, label, value, hint }) => (
    <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center h-10 w-10 rounded-full flex-shrink-0 ${iconBg} ${iconColor}`}>
            <Icon className="text-xl" />
        </div>
        <div className="min-w-0">
            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                {label}
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {value}
            </div>
            {hint ? (
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                    {hint}
                </div>
            ) : null}
        </div>
    </div>
)

const ClientSummaryCard = ({ summary, currency = 'USD' }) => {
    const t = useTranslations('business.clients.summary')
    const locale = useLocale()
    const { settings } = useBusinessStore()
    const timezone = settings?.timezone || 'America/Los_Angeles'
    
    if (!summary) return null

    const getVisitFrequencyText = () => {
        if (summary.visitFrequency <= 0) return '—'
        const freq = summary.visitFrequency
        let timesText = t('times.many')
        if (freq === 1) {
            timesText = t('times.one')
        } else if (freq < 5) {
            timesText = t('times.few')
        }
        return `~${freq} ${timesText} ${t('timesPerMonth')}`
    }

    const getConversionText = () => {
        if (summary.conversionRate <= 0) return '—'
        return `${summary.conversionRate}% (${summary.completedBookings}/${summary.totalBookings})`
    }

    return (
        <Card>
            <h4 className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100 sm:mb-4 sm:text-base">
                {t('title')}
            </h4>

            <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4 md:gap-x-6 md:gap-y-5">
                {/* Первый визит */}
                <SummaryItem
                    icon={PiCalendar}
                    iconBg="bg-blue-100 dark:bg-blue-500/20"
                    iconColor="text-blue-600 dark:text-blue-400"
                    label={t('firstVisit')}
                    value={formatDate(summary.firstVisit, timezone, 'long')}
                />

                {/* Последний завершённый визит */}
                <SummaryItem
                    icon={PiCalendar}
                    iconBg="bg-blue-100 dark:bg-blue-500/20"
                    iconColor="text-blue-600 dark:text-blue-400"
                    label={t('lastCompletedVisit')}
                    value={
                        summary.lastVisit
                            ? formatDate(summary.lastVisit, timezone, 'long')
                            : '—'
                    }
                />

                {/* Частота визитов (по завершённым) */}
                <SummaryItem
                    icon={PiTrendUp}
                    iconBg="bg-purple-100 dark:bg-purple-500/20"
                    iconColor="text-purple-600 dark:text-purple-400"
                    label={t('visitFrequency')}
                    value={getVisitFrequencyText()}
                    hint={t('visitFrequencyHint')}
                />

                {/* Средний чек */}
                <SummaryItem
                    icon={PiCurrencyDollar}
                    iconBg="bg-amber-100 dark:bg-amber-500/20"
                    iconColor="text-amber-600 dark:text-amber-400"
                    label={t('averageCheck')}
                    value={summary.averageCheck > 0 ? formatCurrency(summary.averageCheck, currency) : '—'}
                />

                {/* Доля завершённых от всех бронирований */}
                <SummaryItem
                    icon={PiPercent}
                    iconBg="bg-emerald-100 dark:bg-emerald-500/20"
                    iconColor="text-emerald-600 dark:text-emerald-400"
                    label={t('conversionRate')}
                    value={getConversionText()}
                    hint={t('conversionHint')}
                />

                {/* Любимая услуга */}
                {summary.favoriteService && (
                    <SummaryItem
                        icon={PiStar}
                        iconBg="bg-yellow-100 dark:bg-yellow-500/20"
                        iconColor="text-yellow-600 dark:text-yellow-400"
                        label={t('favoriteService')}
                        value={summary.favoriteService.name}
                    />
                )}

                {/* Любимый мастер */}
                {summary.favoriteSpecialist && (
                    <SummaryItem
                        icon={PiUser}
                        iconBg="bg-indigo-100 dark:bg-indigo-500/20"
                        iconColor="text-indigo-600 dark:text-indigo-400"
                        label={t('favoriteSpecialist')}
                        value={summary.favoriteSpecialist.name}
                    />
                )}
            </div>
        </Card>
    )
}

export default ClientSummaryCard

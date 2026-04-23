'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { PiArrowCounterClockwise } from 'react-icons/pi'
import ExportButton from './ExportButton'
import {
    getBusinessPresetDateRange,
    detectBusinessPresetFromDates,
} from '@/utils/businessDashboardPeriodRange'
import useBusinessStore from '@/store/businessStore'

export default function ReportsHeader({ filters, onFiltersChange }) {
    const t = useTranslations('nav.business.schedule.reports.filters')
    const { settings } = useBusinessStore()
    const businessTz = settings?.timezone || 'America/Los_Angeles'

    const [localFilters, setLocalFilters] = useState(filters)

    useEffect(() => {
        setLocalFilters(filters)
    }, [filters])

    const handleQuickPeriod = (period) => {
        const { dateFrom, dateTo } = getBusinessPresetDateRange(period, businessTz)
        const newFilters = {
            date_from: dateFrom,
            date_to: dateTo,
        }
        setLocalFilters(newFilters)
        onFiltersChange(newFilters)
    }

    const handleFilterChange = (key, value) => {
        const newFilters = { ...localFilters, [key]: value }
        setLocalFilters(newFilters)
        onFiltersChange(newFilters)
    }

    const handleReset = () => {
        const defaultFilters = {
            date_from: null,
            date_to: null,
        }
        setLocalFilters(defaultFilters)
        onFiltersChange(defaultFilters)
    }

    const periodOptions = [
        { value: 'today', label: t('today') },
        { value: 'week', label: t('week') },
        { value: 'month', label: t('month') },
        { value: 'quarter', label: t('quarter') },
        { value: 'year', label: t('year') },
    ]

    const currentPeriod = useMemo(() => {
        return detectBusinessPresetFromDates(localFilters.date_from, localFilters.date_to, businessTz)
    }, [localFilters.date_from, localFilters.date_to, businessTz])

    const currentPeriodValue = currentPeriod
        ? periodOptions.find((opt) => opt.value === currentPeriod) || null
        : null

    return (
        <Card>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-end">
                    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:flex-1 xl:min-w-0">
                        <div className="min-w-0 sm:max-w-xs">
                            <label className="mb-1.5 block text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('dateFrom')}
                            </label>
                            <DatePicker
                                clearable
                                value={
                                    localFilters.date_from
                                        ? dayjs(localFilters.date_from).toDate()
                                        : null
                                }
                                onChange={(date) => {
                                    const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : null
                                    handleFilterChange('date_from', dateStr)
                                }}
                                placeholder={t('dateFrom')}
                                size="sm"
                            />
                        </div>
                        <div className="min-w-0 sm:max-w-xs">
                            <label className="mb-1.5 block text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('dateTo')}
                            </label>
                            <DatePicker
                                clearable
                                value={
                                    localFilters.date_to ? dayjs(localFilters.date_to).toDate() : null
                                }
                                onChange={(date) => {
                                    const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : null
                                    handleFilterChange('date_to', dateStr)
                                }}
                                placeholder={t('dateTo')}
                                size="sm"
                            />
                        </div>
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:gap-3 xl:w-auto xl:shrink-0">
                        <div className="min-w-0 flex-1 sm:max-w-[200px]">
                            <label className="mb-1.5 block text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('period')}
                            </label>
                            <Select
                                placeholder={t('selectPeriod')}
                                value={currentPeriodValue}
                                options={periodOptions}
                                onChange={(option) => {
                                    if (option && option.value) {
                                        handleQuickPeriod(option.value)
                                    }
                                }}
                                isClearable
                                isSearchable={false}
                                menuPlacement="auto"
                            />
                        </div>
                        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                            <Button
                                size="sm"
                                variant="plain"
                                type="button"
                                className="inline-flex w-full min-w-0 items-center justify-center gap-1.5 sm:w-auto"
                                onClick={handleReset}
                            >
                                <PiArrowCounterClockwise className="shrink-0 text-base text-gray-500 dark:text-gray-400" />
                                <span className="truncate">{t('reset')}</span>
                            </Button>
                            <div className="min-w-0 w-full sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">
                                <ExportButton filters={localFilters} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
                    <div className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                        {t('quickPeriods')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {periodOptions.map((opt) => (
                            <Button
                                key={opt.value}
                                type="button"
                                size="sm"
                                variant={currentPeriod === opt.value ? 'solid' : 'outline'}
                                className="shrink-0 font-bold"
                                onClick={() => handleQuickPeriod(opt.value)}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    )
}

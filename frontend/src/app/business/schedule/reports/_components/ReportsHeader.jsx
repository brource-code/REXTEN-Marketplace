'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import ExportButton from './ExportButton'

export default function ReportsHeader({ filters, onFiltersChange }) {
    const t = useTranslations('nav.business.schedule.reports.filters')
    
    const [localFilters, setLocalFilters] = useState(filters)

    // Синхронизируем localFilters с filters из пропсов
    useEffect(() => {
        setLocalFilters(filters)
    }, [filters])

    // Определяем текущий период на основе дат
    const detectPeriod = (dateFrom, dateTo) => {
        if (!dateFrom || !dateTo) return null

        const from = dayjs(dateFrom)
        const to = dayjs(dateTo)
        const now = dayjs()
        const today = now.format('YYYY-MM-DD')

        // Проверяем "Сегодня"
        if (dateFrom === today && dateTo === today) {
            return 'today'
        }

        // Проверяем "Неделя" - последние 7 дней
        const weekStart = now.subtract(7, 'day').format('YYYY-MM-DD')
        if (dateFrom === weekStart && dateTo === today) {
            return 'week'
        }

        // Проверяем "Месяц" - последний месяц
        const monthStart = now.subtract(1, 'month').format('YYYY-MM-DD')
        if (dateFrom === monthStart && dateTo === today) {
            return 'month'
        }

        // Проверяем "Квартал" - последние 3 месяца
        const quarterStart = now.subtract(3, 'month').format('YYYY-MM-DD')
        if (dateFrom === quarterStart && dateTo === today) {
            return 'quarter'
        }

        // Проверяем "Год" - с начала года
        const yearStart = now.startOf('year').format('YYYY-MM-DD')
        if (dateFrom === yearStart && dateTo === today) {
            return 'year'
        }

        return null
    }

    const handleQuickPeriod = (period) => {
        const now = dayjs()
        let dateFrom
        let dateTo = now.format('YYYY-MM-DD')

        switch (period) {
            case 'today':
                dateFrom = dateTo
                break
            case 'week':
                dateFrom = now.subtract(7, 'day').format('YYYY-MM-DD')
                break
            case 'month':
                dateFrom = now.subtract(1, 'month').format('YYYY-MM-DD')
                break
            case 'quarter':
                // Последние 3 месяца
                dateFrom = now.subtract(3, 'month').format('YYYY-MM-DD')
                break
            case 'year':
                // С начала года
                dateFrom = now.startOf('year').format('YYYY-MM-DD')
                break
            default:
                dateFrom = now.subtract(1, 'month').format('YYYY-MM-DD')
        }

        const newFilters = { 
            date_from: dateFrom, 
            date_to: dateTo 
        }
        
        // Обновляем локальное состояние и вызываем callback синхронно
        setLocalFilters(newFilters)
        // Вызываем callback сразу, чтобы обновить родительский компонент
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

    // Определяем текущий период на основе дат
    const currentPeriod = useMemo(() => {
        return detectPeriod(localFilters.date_from, localFilters.date_to)
    }, [localFilters.date_from, localFilters.date_to])

    // Текущее значение для Select
    const currentPeriodValue = currentPeriod 
        ? periodOptions.find(opt => opt.value === currentPeriod) || null
        : null

    return (
        <Card>
            <div className="space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium mb-2">{t('dateFrom')}</label>
                        <DatePicker
                            clearable
                            value={localFilters.date_from ? dayjs(localFilters.date_from).toDate() : null}
                            onChange={(date) => {
                                const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : null
                                handleFilterChange('date_from', dateStr)
                            }}
                            placeholder={t('dateFrom')}
                            size="sm"
                        />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium mb-2">{t('dateTo')}</label>
                        <DatePicker
                            clearable
                            value={localFilters.date_to ? dayjs(localFilters.date_to).toDate() : null}
                            onChange={(date) => {
                                const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : null
                                handleFilterChange('date_to', dateStr)
                            }}
                            placeholder={t('dateTo')}
                            size="sm"
                        />
                    </div>
                    <div className="min-w-[150px]">
                        <label className="block text-sm font-medium mb-2">{t('period') || 'Период'}</label>
                        <Select
                            placeholder={t('selectPeriod') || 'Выберите период'}
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
                    <Button size="sm" variant="plain" onClick={handleReset}>
                        {t('reset')}
                    </Button>
                    <div className="ml-auto">
                        <ExportButton filters={localFilters} />
                    </div>
                </div>
            </div>
        </Card>
    )
}


'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { PiX } from 'react-icons/pi'

const BookingsFilter = ({ filters, onFiltersChange, bookingsCount, totalAmount, currency = 'USD' }) => {
    const t = useTranslations('business.clients')
    
    const statusOptions = [
        { value: '', label: t('bookingsFilter.allStatuses') },
        { value: 'new', label: t('detailsModal.bookingStatuses.new') },
        { value: 'pending', label: t('detailsModal.bookingStatuses.pending') },
        { value: 'confirmed', label: t('detailsModal.bookingStatuses.confirmed') },
        { value: 'completed', label: t('detailsModal.bookingStatuses.completed') },
        { value: 'cancelled', label: t('detailsModal.bookingStatuses.cancelled') },
    ]

    const sortByOptions = [
        { value: 'booking_date', label: t('bookingsFilter.sortByDate') },
        { value: 'price', label: t('bookingsFilter.sortByPrice') },
    ]

    const sortOrderOptions = [
        { value: 'desc', label: t('bookingsFilter.sortDesc') },
        { value: 'asc', label: t('bookingsFilter.sortAsc') },
    ]

    const currentStatusValue = useMemo(() => {
        return statusOptions.find(opt => opt.value === (filters.status || '')) || statusOptions[0]
    }, [filters.status])

    const currentSortByValue = useMemo(() => {
        return sortByOptions.find(opt => opt.value === (filters.sort_by || 'booking_date')) || sortByOptions[0]
    }, [filters.sort_by])

    const currentSortOrderValue = useMemo(() => {
        return sortOrderOptions.find(opt => opt.value === (filters.sort_order || 'desc')) || sortOrderOptions[0]
    }, [filters.sort_order])

    const handleStatusChange = (option) => {
        onFiltersChange({ ...filters, status: option?.value || undefined })
    }

    const handleDateFromChange = (date) => {
        const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : null
        onFiltersChange({ ...filters, date_from: dateStr || undefined })
    }

    const handleDateToChange = (date) => {
        const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : null
        onFiltersChange({ ...filters, date_to: dateStr || undefined })
    }

    const handleSortByChange = (option) => {
        onFiltersChange({ ...filters, sort_by: option?.value || 'booking_date' })
    }

    const handleSortOrderChange = (option) => {
        onFiltersChange({ ...filters, sort_order: option?.value || 'desc' })
    }

    const clearFilters = () => {
        onFiltersChange({
            status: undefined,
            date_from: undefined,
            date_to: undefined,
            sort_by: 'booking_date',
            sort_order: 'desc',
        })
    }

    const hasActiveFilters = filters.status || filters.date_from || filters.date_to

    return (
        <div className="space-y-4">
            {/* Основная строка фильтров */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                <div className="flex flex-wrap gap-3 flex-1">
                    <div className="w-full md:w-auto min-w-[180px]">
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{t('bookingsFilter.status')}</label>
                        <Select
                            value={currentStatusValue}
                            options={statusOptions}
                            onChange={handleStatusChange}
                            isClearable={false}
                            isSearchable={false}
                            size="sm"
                        />
                    </div>
                    
                    {/* Даты в одну строку */}
                    <div className="flex gap-3">
                        <div className="w-full md:w-auto min-w-[200px]">
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{t('bookingsFilter.dateFrom')}</label>
                            <DatePicker
                                inputtable
                                clearable
                                inputtableBlurClose={false}
                                value={filters.date_from ? dayjs(filters.date_from).toDate() : null}
                                onChange={handleDateFromChange}
                                placeholder={t('bookingsFilter.dateFrom')}
                                size="sm"
                            />
                        </div>
                        
                        <div className="w-full md:w-auto min-w-[200px]">
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{t('bookingsFilter.dateTo')}</label>
                            <DatePicker
                                inputtable
                                clearable
                                inputtableBlurClose={false}
                                value={filters.date_to ? dayjs(filters.date_to).toDate() : null}
                                onChange={handleDateToChange}
                                placeholder={t('bookingsFilter.dateTo')}
                                size="sm"
                            />
                        </div>
                    </div>
                    
                    <div className="w-full md:w-auto min-w-[140px]">
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{t('bookingsFilter.sortBy')}</label>
                        <Select
                            value={currentSortByValue}
                            options={sortByOptions}
                            onChange={handleSortByChange}
                            isClearable={false}
                            isSearchable={false}
                            size="sm"
                        />
                    </div>
                    
                    <div className="w-full md:w-auto min-w-[160px]">
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{t('bookingsFilter.sortOrder')}</label>
                        <Select
                            value={currentSortOrderValue}
                            options={sortOrderOptions}
                            onChange={handleSortOrderChange}
                            isClearable={false}
                            isSearchable={false}
                            size="sm"
                        />
                    </div>
                </div>
                
                {hasActiveFilters && (
                    <Button
                        variant="plain"
                        size="sm"
                        icon={<PiX />}
                        onClick={clearFilters}
                    >
                        {t('bookingsFilter.reset')}
                    </Button>
                )}
            </div>

            {/* Статистика по фильтру */}
            {bookingsCount !== undefined && (
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    {t('bookingsFilter.found')}: <span className="text-gray-900 dark:text-gray-100">{bookingsCount}</span> {t('bookingsFilter.bookings')}
                    {totalAmount !== undefined && totalAmount > 0 && (
                        <>
                            {' '}{t('bookingsFilter.totalAmount')}{' '}
                            <span className="text-gray-900 dark:text-gray-100">
                                {new Intl.NumberFormat('ru-RU', {
                                    style: 'currency',
                                    currency: currency,
                                    minimumFractionDigits: 0,
                                }).format(totalAmount)}
                            </span>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default BookingsFilter

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
        <div className="space-y-4 min-w-0 max-w-full">
            {/* Основная строка фильтров */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end min-w-0">
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 flex-1 min-w-0 max-w-full">
                    <div className="w-full sm:min-w-[160px] sm:w-auto sm:max-w-[min(100%,280px)] min-w-0">
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
                    
                    {/* Даты: на узком экране столбиком, иначе в ряд */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full min-w-0">
                        <div className="w-full min-w-0 flex-1">
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{t('bookingsFilter.dateFrom')}</label>
                            <DatePicker
                                clearable
                                value={filters.date_from ? dayjs(filters.date_from).toDate() : null}
                                onChange={handleDateFromChange}
                                placeholder={t('bookingsFilter.dateFrom')}
                                size="sm"
                            />
                        </div>
                        
                        <div className="w-full min-w-0 flex-1">
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{t('bookingsFilter.dateTo')}</label>
                            <DatePicker
                                clearable
                                value={filters.date_to ? dayjs(filters.date_to).toDate() : null}
                                onChange={handleDateToChange}
                                placeholder={t('bookingsFilter.dateTo')}
                                size="sm"
                            />
                        </div>
                    </div>
                    
                    <div className="w-full sm:min-w-[130px] sm:w-auto min-w-0">
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
                    
                    <div className="w-full sm:min-w-[140px] sm:w-auto min-w-0">
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
                        className="shrink-0 self-start md:self-end"
                    >
                        {t('bookingsFilter.reset')}
                    </Button>
                )}
            </div>

            {/* Статистика по фильтру */}
            {bookingsCount !== undefined && (
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 break-words">
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

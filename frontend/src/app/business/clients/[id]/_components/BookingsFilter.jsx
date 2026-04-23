'use client'

import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import Select from '@/components/ui/Select'

/**
 * Минимальные фильтры списка бронирований клиента (страница карточки клиента).
 * Сортировка и период — дефолты на бэкенде (по дате брони, desc).
 */
const BookingsFilter = ({ filters, onFiltersChange, bookingsCount, totalAmount, currency = 'USD' }) => {
    const t = useTranslations('business.clients')
    const locale = useLocale()

    const statusOptions = useMemo(
        () => [
            { value: '', label: t('bookingsFilter.allStatuses') },
            { value: 'new', label: t('detailsModal.bookingStatuses.new') },
            { value: 'pending', label: t('detailsModal.bookingStatuses.pending') },
            { value: 'confirmed', label: t('detailsModal.bookingStatuses.confirmed') },
            { value: 'completed', label: t('detailsModal.bookingStatuses.completed') },
            { value: 'cancelled', label: t('detailsModal.bookingStatuses.cancelled') },
        ],
        [t],
    )

    const currentStatusValue = useMemo(() => {
        return statusOptions.find((opt) => opt.value === (filters.status || '')) || statusOptions[0]
    }, [filters.status, statusOptions])

    const handleStatusChange = (option) => {
        onFiltersChange({ ...filters, status: option?.value || undefined })
    }

    return (
        <div className="min-w-0 max-w-full space-y-3">
            <div className="w-full min-w-0 sm:max-w-xs">
                <label className="mb-2 block text-sm font-bold text-gray-500 dark:text-gray-400">
                    {t('bookingsFilter.status')}
                </label>
                <Select
                    value={currentStatusValue}
                    options={statusOptions}
                    onChange={handleStatusChange}
                    isClearable={false}
                    isSearchable={false}
                    size="sm"
                />
            </div>

            {bookingsCount !== undefined && (
                <div className="break-words text-sm font-bold text-gray-500 dark:text-gray-400">
                    {t('bookingsFilter.found')}:{' '}
                    <span className="text-gray-900 dark:text-gray-100">{bookingsCount}</span>{' '}
                    {t('bookingsFilter.bookings')}
                    {totalAmount !== undefined && totalAmount > 0 && (
                        <>
                            {' '}
                            {t('bookingsFilter.totalAmount')}{' '}
                            <span className="text-gray-900 dark:text-gray-100">
                                {new Intl.NumberFormat(locale, {
                                    style: 'currency',
                                    currency,
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

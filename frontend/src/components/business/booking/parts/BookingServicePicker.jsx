'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Select from '@/components/ui/Select'
import { LABEL_CLS, HINT_CLS } from '@/components/business/booking/shared/bookingTypography'
import { useBookingFormErrorMessage } from '@/components/business/booking/hooks/useBookingFormErrorMessage'

function formatDuration(min) {
    const m = Number(min) || 0
    if (m <= 0) return '—'
    const h = Math.floor(m / 60)
    const rest = m % 60
    if (h > 0 && rest === 0) return `${h}h`
    if (h > 0) return `${h}h ${rest}m`
    return `${rest}m`
}

function formatPrice(value, currency = 'USD') {
    const num = Number(value) || 0
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
            maximumFractionDigits: 2,
        }).format(num)
    } catch (_e) {
        return `$${num.toFixed(2)}`
    }
}

/**
 * Селект услуги с подсказкой длительности и цены.
 * Передаём `services` сверху (из useScheduleReferenceData).
 */
export default function BookingServicePicker({
    value,
    onChange,
    services = [],
    label,
    placeholder,
    disabled = false,
    error,
    currency = 'USD',
}) {
    const t = useTranslations('business.schedule.drawer')
    const err = useBookingFormErrorMessage()

    const options = useMemo(
        () =>
            (services || []).map((s) => ({
                value: s.id,
                label: s.name,
                duration: s.duration,
                price: s.price,
                service: s,
            })),
        [services],
    )

    const selected = useMemo(() => {
        if (value == null) return null
        const id = String(value)
        return options.find((o) => String(o.value) === id) || null
    }, [options, value])

    const handleChange = (opt) => {
        if (!opt) {
            onChange?.(null, null)
            return
        }
        onChange?.(opt.value, opt.service)
    }

    return (
        <div>
            {label && <div className={`mb-1 ${LABEL_CLS}`}>{label}</div>}
            <Select
                value={selected}
                options={options}
                onChange={handleChange}
                placeholder={placeholder || t('servicePlaceholder')}
                isClearable
                isDisabled={disabled}
                isSearchable={false}
                formatOptionLabel={(opt) => (
                    <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-gray-900 dark:text-gray-100 truncate">
                            {opt.label}
                        </span>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatDuration(opt.duration)} · {formatPrice(opt.price, currency)}
                        </span>
                    </div>
                )}
            />
            {selected && (
                <div className={`mt-1 ${HINT_CLS}`}>
                    {t('serviceHint', {
                        duration: formatDuration(selected.duration),
                        price: formatPrice(selected.price, currency),
                    })}
                </div>
            )}
            {error && (
                <div className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                    {err(error)}
                </div>
            )}
        </div>
    )
}

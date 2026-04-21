'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Select from '@/components/ui/Select'
import {
    TIME_FORMAT_12H,
    buildTimeSlotOptions,
    parseHHmm,
    snapHHmmToStep,
} from '@/utils/timeFormat'

/**
 * Выбор времени тем же Select, что и duration / остальные поля формы бронирования.
 * Опции — все слоты дня с шагом stepMinutes; хранение в форме — 'HH:mm'.
 */
export default function DesktopTimePicker({
    value,
    onChange,
    stepMinutes = 15,
    format = TIME_FORMAT_12H,
    size = 'sm',
    disabled = false,
    invalid = false,
    placeholder,
    name,
}) {
    const tPicker = useTranslations('business.common.timePicker')

    const labels = useMemo(
        () => ({
            amLabel: tPicker('am', { defaultValue: 'AM' }),
            pmLabel: tPicker('pm', { defaultValue: 'PM' }),
        }),
        [tPicker],
    )

    const options = useMemo(
        () => buildTimeSlotOptions(stepMinutes, format, labels),
        [stepMinutes, format, labels],
    )

    const effectiveValue = useMemo(() => {
        if (!value || typeof value !== 'string') return ''
        const parsed = parseHHmm(value)
        if (!parsed) return ''
        const snapped = snapHHmmToStep(value, stepMinutes)
        return snapped || value
    }, [value, stepMinutes])

    const selected = useMemo(() => {
        if (!effectiveValue) return null
        return options.find((o) => o.value === effectiveValue) ?? null
    }, [options, effectiveValue])

    return (
        <Select
            name={name}
            instanceId={`booking-time-${stepMinutes}-${format}`}
            size={size}
            options={options}
            value={selected}
            placeholder={placeholder || ''}
            isDisabled={disabled}
            invalid={invalid}
            isSearchable={false}
            onChange={(opt) => onChange?.(opt?.value ?? '')}
        />
    )
}

'use client'

import { Input } from '@/components/ui/Input'
import { TIME_FORMAT_12H, parseHHmm, joinHHmm } from '@/utils/timeFormat'

/**
 * Мобильная версия выбора времени — нативный <input type="time">.
 * iOS / Android отрисуют системный wheel-picker с AM/PM (для en-локали),
 * нам не нужно рисовать свой колесо вручную.
 *
 * value/onChange всегда работают со строкой "HH:mm" (24h),
 * так же как и DesktopTimePicker — это формат хранения в форме.
 */
export default function MobileTimePicker({
    value,
    onChange,
    stepMinutes = 15,
    size = 'sm',
    disabled = false,
    invalid = false,
    placeholder,
    name,
    // format не используется напрямую — формат отображения задаёт ОС.
    // eslint-disable-next-line no-unused-vars
    format = TIME_FORMAT_12H,
}) {
    const handleChange = (e) => {
        const v = e.target.value
        if (!v) {
            onChange?.('')
            return
        }
        const parsed = parseHHmm(v)
        if (!parsed) return
        onChange?.(joinHHmm(parsed.h, parsed.m))
    }

    return (
        <Input
            type="time"
            size={size}
            name={name}
            value={value || ''}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            invalid={invalid}
            step={Math.max(60, stepMinutes * 60)}
            autoComplete="off"
        />
    )
}

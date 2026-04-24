'use client'

import { NumericFormat } from 'react-number-format'
import Input from '@/components/ui/Input'

/**
 * Поле суммы/цены: без ведущего нуля (например «05») как у &lt;input type="number"&gt;.
 * value: number | null — null/undefined/NaN = пустое; onValueChange: number | null
 */
const AmountInput = ({
    value,
    onValueChange,
    min = 0,
    max,
    decimalScale = 2,
    className,
    size,
    disabled,
    invalid,
    name,
    placeholder = '0',
    id,
    onBlur,
    onFocus,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    allowNegative = false,
    inputMode = 'decimal',
    allowLeadingZeros = false,
    ...rest
}) => {
    const num =
        value === null || value === undefined
            ? null
            : typeof value === 'string' && value === ''
              ? null
              : Number(value)
    const display = num == null || Number.isNaN(num) ? null : num

    return (
        <NumericFormat
            customInput={Input}
            allowNegative={allowNegative}
            allowLeadingZeros={allowLeadingZeros}
            isAllowed={(vals) => {
                const f = vals.floatValue
                if (f == null) return true
                if (min != null && f < min) return false
                if (max != null && f > max) return false
                return true
            }}
            decimalScale={decimalScale}
            value={display == null ? '' : display}
            onValueChange={({ floatValue }) => {
                onValueChange?.(floatValue === undefined ? null : floatValue)
            }}
            className={className}
            size={size}
            disabled={disabled}
            invalid={invalid}
            name={name}
            placeholder={placeholder}
            id={id}
            onBlur={onBlur}
            onFocus={onFocus}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            inputMode={inputMode}
            {...rest}
        />
    )
}

export default AmountInput

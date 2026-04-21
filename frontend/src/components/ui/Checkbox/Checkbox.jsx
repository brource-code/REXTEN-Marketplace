import { useContext, useCallback, useState } from 'react'
import classNames from 'classnames'
import CheckboxGroupContext from './context'

const Checkbox = (props) => {
    const {
        name: nameContext,
        value: groupValue,
        onChange: onGroupChange,
        checkboxClass: checkboxClassContext,
    } = useContext(CheckboxGroupContext)

    const {
        checked: controlledChecked,
        className,
        checkboxClass,
        onChange,
        children,
        disabled,
        indeterminate = false,
        readOnly,
        name = nameContext,
        defaultChecked,
        value,
        labelRef,
        ref,
        variant = 'default',
        ...rest
    } = props

    const isChecked = useCallback(() => {
        if (typeof groupValue !== 'undefined' && typeof value !== 'undefined') {
            return groupValue.some((i) => i === value)
        }
        return controlledChecked || defaultChecked
    }, [controlledChecked, groupValue, value, defaultChecked])

    const [checkboxChecked, setCheckboxChecked] = useState(isChecked())

    const getControlProps = () => {
        const checkedValue = checkboxChecked

        let groupChecked = { checked: checkedValue }
        const singleChecked = {}

        if (typeof controlledChecked !== 'undefined') {
            singleChecked.checked = controlledChecked
        }

        if (typeof groupValue !== 'undefined') {
            groupChecked = { checked: groupValue.includes(value) }
        }

        if (defaultChecked) {
            singleChecked.defaultChecked = defaultChecked
        }
        return typeof groupValue !== 'undefined' ? groupChecked : singleChecked
    }

    const controlProps = getControlProps()

    const isCheckedNow =
        typeof groupValue !== 'undefined' && typeof value !== 'undefined'
            ? groupValue.includes(value)
            : typeof controlledChecked !== 'undefined'
                ? controlledChecked
                : checkboxChecked

    const onCheckboxChange = useCallback(
        (e) => {
            let nextChecked = !checkboxChecked

            if (typeof groupValue !== 'undefined') {
                nextChecked = !groupValue.includes(value)
            }

            if (disabled || readOnly) {
                return
            }

            setCheckboxChecked(nextChecked)
            onChange?.(nextChecked, e)
            onGroupChange?.(value, nextChecked, e)
        },
        [
            checkboxChecked,
            disabled,
            readOnly,
            setCheckboxChecked,
            onChange,
            value,
            onGroupChange,
            groupValue,
        ],
    )

    const checkboxColor =
        checkboxClass ||
        checkboxClassContext ||
        (variant === 'card' ? 'text-indigo-600 dark:text-indigo-400' : `text-primary`)

    const checkboxDefaultClass = `checkbox peer ${checkboxColor}`
    const checkboxColorClass = disabled && 'disabled'
    const labelDefaultClass = `checkbox-label`
    const labelDisabledClass = disabled && 'disabled'

    const cardShellClass =
        variant === 'card' &&
        classNames(
            '!inline-flex w-full max-w-full flex-row rounded-lg border px-3 py-2.5 transition-colors !items-start gap-3 shadow-none',
            isCheckedNow
                ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500',
        )

    const labelClass = classNames(
        labelDefaultClass,
        labelDisabledClass,
        variant === 'card' && '!items-start',
        cardShellClass,
        className,
    )

    return (
        <label ref={labelRef} className={labelClass}>
            <span className="checkbox-wrapper relative">
                <input
                    ref={ref}
                    className={classNames(
                        checkboxDefaultClass,
                        checkboxColorClass,
                    )}
                    type="checkbox"
                    disabled={disabled}
                    readOnly={readOnly}
                    name={name}
                    onChange={onCheckboxChange}
                    {...controlProps}
                    {...rest}
                />
                <>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5 stroke-neutral fill-neutral opacity-0 transition-opacity peer-checked:opacity-100 pointer-events-none absolute top-2/4 left-2/4 -translate-y-2/4 -translate-x-2/4 mt-[1.25px]"
                        viewBox="0 0 20 20"
                    >
                        {indeterminate ? (
                            <path
                                fillRule="evenodd"
                                d="M5 10a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1z"
                                clipRule="evenodd"
                            />
                        ) : (
                            <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z"
                                clipRule="evenodd"
                            />
                        )}
                    </svg>
                </>
            </span>
            {children ? (
                <span
                    className={classNames(
                        disabled ? 'opacity-50' : '',
                        variant === 'card' && 'min-w-0 flex-1',
                    )}
                >
                    {children}
                </span>
            ) : null}
        </label>
    )
}

export default Checkbox

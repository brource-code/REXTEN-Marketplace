'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import {
    BookingFormSchema,
    BlockTimeFormSchema,
    zodErrorsToFieldMap,
} from '@/components/business/booking/shared/BookingFormSchema'

const SCHEMAS = {
    booking: BookingFormSchema,
    block: BlockTimeFormSchema,
}

/**
 * Единый стейт-менеджер формы бронирования с dirty-tracking
 * и inline-валидацией через zod.
 *
 * @param {Object} options
 * @param {Object} options.initialValues — стартовые значения формы
 * @param {'booking'|'block'} [options.schema='booking']
 */
export function useBookingFormState({ initialValues, schema = 'booking' } = {}) {
    const initialRef = useRef(initialValues || {})
    const [values, setValues] = useState(initialValues || {})
    const [touched, setTouched] = useState({})
    const [externalErrors, setExternalErrors] = useState({})

    const setField = useCallback((field, value) => {
        setValues((prev) => ({ ...prev, [field]: value }))
        setTouched((prev) => ({ ...prev, [field]: true }))
    }, [])

    const setFields = useCallback((patch) => {
        setValues((prev) => ({ ...prev, ...patch }))
        setTouched((prev) => {
            const next = { ...prev }
            for (const key of Object.keys(patch || {})) next[key] = true
            return next
        })
    }, [])

    const touchField = useCallback((field) => {
        setTouched((prev) => ({ ...prev, [field]: true }))
    }, [])

    const reset = useCallback((nextValues) => {
        const nv = nextValues || initialRef.current || {}
        initialRef.current = nv
        setValues(nv)
        setTouched({})
        setExternalErrors({})
    }, [])

    const validation = useMemo(() => {
        const sch = SCHEMAS[schema] || SCHEMAS.booking
        const result = sch.safeParse(values)
        if (result.success) {
            return { isValid: true, errors: {} }
        }
        return { isValid: false, errors: zodErrorsToFieldMap(result.error) }
    }, [schema, values])

    const errors = useMemo(
        () => ({ ...validation.errors, ...externalErrors }),
        [validation.errors, externalErrors],
    )

    const dirty = useMemo(() => {
        const a = initialRef.current || {}
        const b = values || {}
        const keys = new Set([...Object.keys(a), ...Object.keys(b)])
        for (const key of keys) {
            const av = a[key]
            const bv = b[key]
            const aIsEmpty = av === undefined || av === null || av === ''
            const bIsEmpty = bv === undefined || bv === null || bv === ''
            if (aIsEmpty && bIsEmpty) continue
            if (av !== bv) return true
        }
        return false
    }, [values])

    return {
        values,
        setField,
        setFields,
        touchField,
        reset,
        touched,
        errors,
        isValid: validation.isValid,
        dirty,
        setExternalErrors,
    }
}

export default useBookingFormState

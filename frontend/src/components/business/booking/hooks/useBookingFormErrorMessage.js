'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'

/** Дефолтные англоязычные фразы Zod → ключи в business.schedule.validation */
const ZOD_DEFAULT_TO_KEY = {
    'Invalid input': 'invalid_generic',
    'Invalid email': 'invalid_email',
    'Expected number, received string': 'invalid_generic',
    'Expected number, received nan': 'invalid_generic',
}

/**
 * Переводит коды ошибок zod из BookingFormSchema (snake_case) в строки UI.
 */
export function useBookingFormErrorMessage() {
    const t = useTranslations('business.schedule.validation')
    return useCallback(
        (code) => {
            if (code == null || code === '') return undefined
            const raw = String(code)
            const key = ZOD_DEFAULT_TO_KEY[raw] ?? raw
            return t(key, { defaultValue: raw })
        },
        [t],
    )
}

export default useBookingFormErrorMessage

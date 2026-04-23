'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useDemoMagicLogin } from '@/hooks/api/useAuth'

export default function DemoMagicLoginClient() {
    const t = useTranslations('auth.magicDemoLink')
    const { mutate, isError, error } = useDemoMagicLogin()
    const fired = useRef(false)

    useEffect(() => {
        if (fired.current) {
            return
        }
        fired.current = true
        mutate()
    }, [mutate])

    if (isError) {
        const status = error?.response?.status
        const message =
            status === 403
                ? t('disabled')
                : error instanceof Error
                  ? error.message
                  : t('error')
        return (
            <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-16">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{message}</p>
            </div>
        )
    }

    return (
        <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-16">
            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('loading')}</p>
        </div>
    )
}

'use client'
import { useEffect } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { dateLocales } from '@/i18n/dateLocales'
import dayjs from 'dayjs'

const LocaleProvider = ({ messages, children, locale }) => {
    useEffect(() => {
        // Проверяем, что локаль поддерживается
        if (dateLocales[locale] && typeof dateLocales[locale] === 'function') {
            dateLocales[locale]().then(() => {
                dayjs.locale(locale)
            }).catch(() => {
                // Fallback на английский, если локаль не загрузилась
                dayjs.locale('en')
            })
        } else {
            // Fallback на английский, если локаль не поддерживается
            dayjs.locale('en')
        }
    }, [locale])

    return (
        <NextIntlClientProvider
            messages={messages}
            locale={locale}
            timeZone="UTC"
        >
            {children}
        </NextIntlClientProvider>
    )
}

export default LocaleProvider

'use client'
import { useEffect } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { dateLocales } from '@/i18n/dateLocales'
import { APP_LOCALE_TO_DAYJS } from '@/constants/locale.constant'
import dayjs from 'dayjs'

const LocaleProvider = ({ messages, children, locale }) => {
    useEffect(() => {
        // Проверяем, что локаль поддерживается
        if (dateLocales[locale] && typeof dateLocales[locale] === 'function') {
            dateLocales[locale]().then(() => {
                const dayjsLocale = APP_LOCALE_TO_DAYJS[locale] ?? locale
                dayjs.locale(dayjsLocale)
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

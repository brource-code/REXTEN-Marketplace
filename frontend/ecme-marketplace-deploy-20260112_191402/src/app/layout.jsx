import { auth } from '@/auth'
import AuthProvider from '@/components/auth/AuthProvider'
import AuthInitializer from '@/components/auth/AuthInitializer'
import ThemeProvider from '@/components/template/Theme/ThemeProvider'
import QueryProvider from '@/components/providers/QueryProvider'
import pageMetaConfig from '@/configs/page-meta.config'
import LocaleProvider from '@/components/template/LocaleProvider'
import NavigationProvider from '@/components/template/Navigation/NavigationProvider'
import MobileMetaTags from '@/components/shared/MobileMetaTags'
import CookieConsentProvider from '@/components/cookies/CookieConsentProvider'
import { getNavigation } from '@/server/actions/navigation/getNavigation'
import { getTheme } from '@/server/actions/theme'
import { getLocale, getMessages } from 'next-intl/server'
import '@/assets/styles/app.css'

export const metadata = {
    ...pageMetaConfig,
}

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#111827' },
    ],
}

export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }) {
    // Выполняем ВСЕ запросы параллельно для максимального ускорения загрузки
    let session, locale, messages, navigationTree, theme
    
    try {
        // Обертываем auth() в Promise.race с таймаутом, чтобы избежать зависания
        // Улучшенная обработка ошибок для предотвращения падений сервера
        const authPromise = auth().catch((error) => {
            // Логируем ошибку, но не падаем
            if (process.env.NODE_ENV === 'development') {
                console.warn('Auth error (non-critical):', error?.message || error)
            }
            return null
        })
        
        // Таймаут увеличен до 3 секунд для стабильности
        const timeoutPromise = new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('Auth timeout after 3s - using null session')
                }
                resolve(null)
            }, 3000)
            // Очистка таймаута если auth() завершится раньше
            authPromise.finally(() => clearTimeout(timeoutId))
        })
        
        const authResult = await Promise.race([authPromise, timeoutPromise])
        
        // Выполняем остальные запросы параллельно, но с индивидуальной обработкой ошибок
        const results = await Promise.allSettled([
            Promise.resolve(authResult),
            getLocale().catch(() => 'ru'),
            getMessages().catch(() => ({})),
            getNavigation().catch(() => []),
            getTheme().catch(() => ({ mode: 'light', direction: 'ltr' })),
        ])
        
        // Извлекаем значения из результатов, обрабатывая ошибки
        session = results[0].status === 'fulfilled' ? results[0].value : null
        locale = results[1].status === 'fulfilled' ? results[1].value : 'ru'
        messages = results[2].status === 'fulfilled' ? results[2].value : {}
        navigationTree = results[3].status === 'fulfilled' ? results[3].value : []
        theme = results[4].status === 'fulfilled' ? results[4].value : { mode: 'light', direction: 'ltr' }
    } catch (error) {
        // Критическая ошибка - логируем и используем fallback значения
        console.error('Critical error loading layout data:', error)
        // Fallback values
        session = null
        locale = 'ru'
        messages = {}
        navigationTree = []
        theme = { mode: 'light', direction: 'ltr' }
    }

    return (
        <AuthProvider session={session}>
            <html
                className={theme.mode === 'dark' ? 'dark' : 'light'}
                lang={locale}
                dir={theme.direction}
                suppressHydrationWarning
            >
                <head>
                    {/* Fallback for system theme if user has auto theme enabled */}
                    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
                    <meta name="theme-color" content="#111827" media="(prefers-color-scheme: dark)" />
                </head>
                <body suppressHydrationWarning>
                    <MobileMetaTags />
                    <QueryProvider>
                        <ThemeProvider locale={locale} theme={theme}>
                            <LocaleProvider locale={locale} messages={messages}>
                                <NavigationProvider navigationTree={navigationTree}>
                                    <CookieConsentProvider>
                                        <AuthInitializer />
                                        {children}
                                    </CookieConsentProvider>
                                </NavigationProvider>
                            </LocaleProvider>
                        </ThemeProvider>
                    </QueryProvider>
                </body>
            </html>
        </AuthProvider>
    )
}

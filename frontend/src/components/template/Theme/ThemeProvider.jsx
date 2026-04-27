'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import ThemeContext from './ThemeContext'
import ConfigProvider from '@/components/ui/ConfigProvider'
import appConfig from '@/configs/app.config'
import applyTheme from '@/utils/applyThemeSchema'
import presetThemeSchemaConfig from '@/configs/preset-theme-schema.config'
import { setTheme as setThemeCookies } from '@/server/actions/theme'
import {
    MODE_DARK,
    MODE_LIGHT,
    THEME_MANUAL_OVERRIDE_SESSION_KEY,
    resolveLayoutDensity,
} from '@/constants/theme.constant'
import { syncDocumentThemeMode } from '@/utils/syncDocumentThemeMode'

const ThemeProvider = ({ children, theme, locale }) => {
    const pathname = usePathname()
    const [themeState, setThemeState] = useState(theme)
    const [isInitialMount, setIsInitialMount] = useState(true)
    const pendingThemeRef = useRef(null) // Для хранения темы, которую нужно сохранить в cookies

    /** data-density на document: compact для business/superadmin, иначе comfortable; можно переопределить через theme.layout.density */
    useEffect(() => {
        if (typeof document === 'undefined') {
            return
        }
        const density = resolveLayoutDensity(pathname, themeState.layout?.density)
        document.documentElement.setAttribute('data-density', density)
    }, [pathname, themeState.layout?.density])

    // Восстанавливаем тему из localStorage при первой загрузке, если cookies нет
    useEffect(() => {
        if (isInitialMount && typeof window !== 'undefined') {
            try {
                const storedTheme = localStorage.getItem('theme-preview')
                if (storedTheme) {
                    const parsedTheme = JSON.parse(storedTheme)
                    if (parsedTheme.state) {
                        // Синхронизируем с localStorage, если тема из cookies не совпадает
                        const hasDiff = 
                            theme.mode !== parsedTheme.state.mode ||
                            theme.themeSchema !== parsedTheme.state.themeSchema ||
                            theme.direction !== parsedTheme.state.direction ||
                            theme.layout?.contentWidth !== parsedTheme.state.layout?.contentWidth ||
                            theme.layout?.density !== parsedTheme.state.layout?.density
                        
                        if (hasDiff) {
                            // Устанавливаем тему и помечаем, что это инициализация
                            setThemeState(parsedTheme.state)
                            // Сохраняем ссылку для отложенного сохранения в cookies
                            pendingThemeRef.current = parsedTheme.state
                        }
                    }
                }
            } catch (e) {
                // Игнорируем ошибки чтения localStorage
            }
            // Помечаем, что инициализация завершена
            setIsInitialMount(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Запускаем только один раз при монтировании

    // Сохраняем тему в cookies при каждом изменении
    // Используем ref для отслеживания изменений без триггера обновления Router во время рендеринга
    useEffect(() => {
        if (typeof window === 'undefined' || !pendingThemeRef.current) {
            return
        }

        // Используем setTimeout для отложенного сохранения, чтобы избежать обновления Router во время рендеринга
        const timeoutId = setTimeout(() => {
            try {
                const themeData = JSON.stringify({ state: pendingThemeRef.current })
                setThemeCookies(themeData).catch(() => {
                    // Игнорируем ошибки сохранения в cookies
                })
                pendingThemeRef.current = null
            } catch (e) {
                // Игнорируем ошибки
            }
        }, 0)
        
        return () => clearTimeout(timeoutId)
    }, [themeState]) // Запускаем при изменении themeState, но используем ref для получения актуального значения

    const handleSetTheme = useCallback((payload) => {
        setThemeState((prevTheme) => {
            const nextTheme =
                typeof payload === 'function' ? payload(prevTheme) : payload

            // Простая проверка, реально ли что-то изменилось
            const hasChanged =
                prevTheme.mode !== nextTheme.mode ||
                prevTheme.themeSchema !== nextTheme.themeSchema ||
                prevTheme.direction !== nextTheme.direction ||
                prevTheme.layout?.type !== nextTheme.layout?.type ||
                prevTheme.layout?.sideNavCollapse !== nextTheme.layout?.sideNavCollapse ||
                prevTheme.layout?.contentWidth !== nextTheme.layout?.contentWidth ||
                prevTheme.layout?.density !== nextTheme.layout?.density ||
                prevTheme.panelExpand !== nextTheme.panelExpand

            if (!hasChanged) {
                return prevTheme
            }

            // Сохраняем тему в localStorage сразу
            if (typeof window !== 'undefined') {
                try {
                    // Сохраняем в localStorage
                    localStorage.setItem('theme-preview', JSON.stringify({ state: nextTheme }))
                    
                    // Сохраняем ссылку на тему для отложенного сохранения в cookies через useEffect
                    // Это избегает обновления Router во время рендеринга
                    if (!isInitialMount) {
                        pendingThemeRef.current = nextTheme
                    }
                } catch (e) {
                    // Игнорируем ошибки
                }
            }

            return nextTheme
        })
    }, [isInitialMount])

    /** Глобально: тема по prefers-color-scheme, пока пользователь не переключил вручную (setMode → sessionStorage). */
    useEffect(() => {
        if (typeof window === 'undefined' || isInitialMount) {
            return undefined
        }
        try {
            if (sessionStorage.getItem(THEME_MANUAL_OVERRIDE_SESSION_KEY) === '1') {
                return undefined
            }
        } catch {
            // ignore
        }

        const mql = window.matchMedia('(prefers-color-scheme: dark)')
        const applySystemMode = () => {
            try {
                if (sessionStorage.getItem(THEME_MANUAL_OVERRIDE_SESSION_KEY) === '1') {
                    return
                }
            } catch {
                // ignore
            }
            const mode = mql.matches ? MODE_DARK : MODE_LIGHT
            handleSetTheme((prevTheme) => {
                if (prevTheme.mode === mode) {
                    return prevTheme
                }
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        syncDocumentThemeMode(mode)
                    })
                })
                return { ...prevTheme, mode }
            })
        }

        applySystemMode()
        mql.addEventListener('change', applySystemMode)
        return () => mql.removeEventListener('change', applySystemMode)
    }, [isInitialMount, handleSetTheme])

    const contextValue = useMemo(
        () => ({
            theme: themeState,
            setTheme: handleSetTheme,
        }),
        [themeState, handleSetTheme],
    )

    const configProviderValue = useMemo(
        () => ({
            direction: themeState.direction,
            mode: themeState.mode,
            locale: locale || appConfig.locale,
            controlSize: 'md',
        }),
        [themeState.direction, themeState.mode, locale],
    )

    return (
        <ThemeContext.Provider value={contextValue}>
            <ConfigProvider value={configProviderValue}>
                {children}
            </ConfigProvider>
            <script
                suppressHydrationWarning
                dangerouslySetInnerHTML={{
                    __html: `(${applyTheme.toString()})(${JSON.stringify([
                        themeState.themeSchema || 'default',
                        themeState.mode,
                        presetThemeSchemaConfig,
                    ]).slice(1, -1)})`,
                }}
            />
        </ThemeContext.Provider>
    )
}

export default ThemeProvider

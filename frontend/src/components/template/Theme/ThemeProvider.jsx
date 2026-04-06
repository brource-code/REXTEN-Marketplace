'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import ThemeContext from './ThemeContext'
import ConfigProvider from '@/components/ui/ConfigProvider'
import appConfig from '@/configs/app.config'
import applyTheme from '@/utils/applyThemeSchema'
import presetThemeSchemaConfig from '@/configs/preset-theme-schema.config'
import { setTheme as setThemeCookies } from '@/server/actions/theme'

const ThemeProvider = ({ children, theme, locale }) => {
    const [themeState, setThemeState] = useState(theme)
    const [isInitialMount, setIsInitialMount] = useState(true)
    const pendingThemeRef = useRef(null) // Для хранения темы, которую нужно сохранить в cookies

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
                            theme.layout?.contentWidth !== parsedTheme.state.layout?.contentWidth
                        
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

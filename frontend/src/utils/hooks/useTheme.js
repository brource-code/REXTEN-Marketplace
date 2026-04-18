'use client'
import { useContext, useMemo, useCallback } from 'react'
import ThemeContext from '@/components/template/Theme/ThemeContext'
import { MODE_DARK, MODE_LIGHT, THEME_MANUAL_OVERRIDE_SESSION_KEY } from '@/constants/theme.constant'
import presetThemeSchemaConfig from '@/configs/preset-theme-schema.config'
import applyTheme from '@/utils/applyThemeSchema'
import { syncDocumentThemeMode } from '@/utils/syncDocumentThemeMode'

const useTheme = (selector) => {
    const context = useContext(ThemeContext)

    if (context === undefined) {
        throw new Error('useTheme must be used under a ThemeProvider')
    }

    // Мемоизируем функции, чтобы они не пересоздавались при каждом рендере
    const setSchema = useCallback((themeSchema) => {
        context.setTheme((prevTheme) => {
            // Проверяем, изменилась ли схема, чтобы избежать лишних обновлений
            if (prevTheme.themeSchema === themeSchema) {
                return prevTheme
            }
            // Применяем тему асинхронно в следующем тике, чтобы не блокировать UI
            requestAnimationFrame(() => {
                applyTheme(themeSchema, prevTheme.mode, presetThemeSchemaConfig)
            })
            return { ...prevTheme, themeSchema }
        })
    }, [context.setTheme])

    const setMode = useCallback((mode) => {
        try {
            if (typeof window !== 'undefined') {
                sessionStorage.setItem(THEME_MANUAL_OVERRIDE_SESSION_KEY, '1')
            }
        } catch {
            // ignore
        }

        context.setTheme((prevTheme) => {
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
    }, [context.setTheme])

    const setSideNavCollapse = useCallback((sideNavCollapse) => {
        context.setTheme((prevTheme) => {
            if (prevTheme.layout?.sideNavCollapse === sideNavCollapse) {
                return prevTheme
            }
            return {
                ...prevTheme,
                layout: { ...prevTheme.layout, sideNavCollapse },
            }
        })
    }, [context.setTheme])

    const setDirection = useCallback((direction) => {
        context.setTheme((prevTheme) => {
            if (prevTheme.direction === direction) {
                return prevTheme
            }
            const root = window.document.documentElement
            root.setAttribute('dir', direction)
            return { ...prevTheme, direction }
        })
    }, [context.setTheme])

    const setPanelExpand = useCallback((panelExpand) => {
        context.setTheme((prevTheme) => {
            if (prevTheme.panelExpand === panelExpand) {
                return prevTheme
            }
            return { ...prevTheme, panelExpand }
        })
    }, [context.setTheme])

    const setLayout = useCallback((layout) => {
        context.setTheme((prevTheme) => {
            if (prevTheme.layout?.type === layout) {
                return prevTheme
            }
            return {
                ...prevTheme,
                layout: { ...prevTheme.layout, type: layout },
            }
        })
    }, [context.setTheme])

    const setContentWidth = useCallback((contentWidth) => {
        context.setTheme((prevTheme) => {
            if (prevTheme.layout?.contentWidth === contentWidth) {
                return prevTheme
            }
            return {
                ...prevTheme,
                layout: { ...prevTheme.layout, contentWidth },
            }
        })
    }, [context.setTheme])

    // Мемоизируем объект состояния, чтобы избежать лишних перерендеров
    const themeState = useMemo(() => ({
        ...context.theme,
        setSchema,
        setMode,
        setSideNavCollapse,
        setDirection,
        setPanelExpand,
        setLayout,
        setContentWidth,
    }), [context.theme, setSchema, setMode, setSideNavCollapse, setDirection, setPanelExpand, setLayout, setContentWidth])

    return selector(themeState)
}

export default useTheme

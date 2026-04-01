'use client'
import { useContext, useMemo, useCallback } from 'react'
import ThemeContext from '@/components/template/Theme/ThemeContext'
import { MODE_DARK, MODE_LIGHT } from '@/constants/theme.constant'
import presetThemeSchemaConfig from '@/configs/preset-theme-schema.config'
import applyTheme from '@/utils/applyThemeSchema'

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
        context.setTheme((prevTheme) => {
            // Проверяем, изменился ли режим, чтобы избежать лишних обновлений
            if (prevTheme.mode === mode) {
                return prevTheme
            }
            
            // Откладываем все DOM операции на следующий кадр анимации, чтобы не блокировать UI
            // Используем двойной requestAnimationFrame для гарантии, что DOM готов
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const root = window.document.documentElement
                    const isEnabled = mode === MODE_DARK
                    
                    // Батчим все DOM операции вместе
                    root.classList.remove(isEnabled ? MODE_LIGHT : MODE_DARK)
                    root.classList.add(isEnabled ? MODE_DARK : MODE_LIGHT)
                    root.style.colorScheme = isEnabled ? 'dark' : 'light'
                    root.style.setProperty('supported-color-schemes', isEnabled ? 'dark' : 'light')
                    root.setAttribute('data-theme', isEnabled ? 'dark' : 'light')
                    
                    // Обновляем meta теги асинхронно
                    setTimeout(() => {
                        // Обновляем theme-color
                        const themeColor = isEnabled ? '#111827' : '#ffffff'
                        let metaThemeColor = document.querySelector('meta[name="theme-color"]')
                        if (metaThemeColor) {
                            metaThemeColor.content = themeColor
                        } else {
                            metaThemeColor = document.createElement('meta')
                            metaThemeColor.name = 'theme-color'
                            metaThemeColor.content = themeColor
                            document.head.appendChild(metaThemeColor)
                        }
                        
                        // Обновляем apple-mobile-web-app-status-bar-style для Safari
                        const statusBarStyle = isEnabled ? 'black-translucent' : 'default'
                        let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
                        if (appleStatusBar) {
                            appleStatusBar.remove()
                        }
                        appleStatusBar = document.createElement('meta')
                        appleStatusBar.name = 'apple-mobile-web-app-status-bar-style'
                        appleStatusBar.content = statusBarStyle
                        document.head.insertBefore(appleStatusBar, document.head.firstChild)
                        
                        // Для Safari - принудительное обновление через изменение viewport
                        const viewport = document.querySelector('meta[name="viewport"]')
                        if (viewport && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
                            const content = viewport.getAttribute('content')
                            viewport.setAttribute('content', content + ' ')
                            setTimeout(() => {
                                viewport.setAttribute('content', content.trim())
                            }, 0)
                        }
                    }, 0)
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

    // Мемоизируем объект состояния, чтобы избежать лишних перерендеров
    const themeState = useMemo(() => ({
        ...context.theme,
        setSchema,
        setMode,
        setSideNavCollapse,
        setDirection,
        setPanelExpand,
        setLayout,
    }), [context.theme, setSchema, setMode, setSideNavCollapse, setDirection, setPanelExpand, setLayout])

    return selector(themeState)
}

export default useTheme

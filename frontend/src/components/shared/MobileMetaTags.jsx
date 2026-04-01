'use client'

import { useEffect } from 'react'
import useTheme from '@/utils/hooks/useTheme'
import { MODE_DARK } from '@/constants/theme.constant'

const MobileMetaTags = () => {
    const mode = useTheme((state) => state.mode)

    useEffect(() => {
        const themeColor = mode === MODE_DARK ? '#111827' : '#ffffff'
        const statusBarStyle = mode === MODE_DARK ? 'black-translucent' : 'default'

        // Обновляем theme-color (для нижней панели Safari и Android) - работает динамически
        let metaThemeColor = document.querySelector('meta[name="theme-color"]')
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta')
            metaThemeColor.name = 'theme-color'
            document.head.appendChild(metaThemeColor)
        }
        metaThemeColor.content = themeColor

        // Обновляем apple-mobile-web-app-status-bar-style (для верхней панели)
        // Safari может не обновлять динамически, поэтому удаляем и создаем заново
        let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
        if (appleStatusBar) {
            appleStatusBar.remove()
        }
        appleStatusBar = document.createElement('meta')
        appleStatusBar.name = 'apple-mobile-web-app-status-bar-style'
        appleStatusBar.content = statusBarStyle
        document.head.appendChild(appleStatusBar)

        // Обновляем apple-mobile-web-app-capable для активации PWA режима
        let appleCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]')
        if (!appleCapable) {
            appleCapable = document.createElement('meta')
            appleCapable.name = 'apple-mobile-web-app-capable'
            appleCapable.content = 'yes'
            document.head.appendChild(appleCapable)
        }

        let mobileCapable = document.querySelector('meta[name="mobile-web-app-capable"]')
        if (!mobileCapable) {
            mobileCapable = document.createElement('meta')
            mobileCapable.name = 'mobile-web-app-capable'
            mobileCapable.content = 'yes'
            document.head.appendChild(mobileCapable)
        }

        // Обновляем color-scheme на html элементе для автоматического переключения стиля статус-бара
        const root = document.documentElement
        if (mode === MODE_DARK) {
            root.style.colorScheme = 'dark'
        } else {
            root.style.colorScheme = 'light'
        }
    }, [mode])

    return null
}

export default MobileMetaTags


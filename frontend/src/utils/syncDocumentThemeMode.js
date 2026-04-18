import { MODE_DARK, MODE_LIGHT } from '@/constants/theme.constant'

/**
 * Применяет light/dark к <html> и meta (как в useTheme.setMode).
 * Вызывать из requestAnimationFrame (двойной — как в useTheme).
 */
export function syncDocumentThemeMode(mode) {
    if (typeof window === 'undefined') return

    const isEnabled = mode === MODE_DARK
    const root = window.document.documentElement

    root.classList.remove(isEnabled ? MODE_LIGHT : MODE_DARK)
    root.classList.add(isEnabled ? MODE_DARK : MODE_LIGHT)
    root.style.colorScheme = isEnabled ? 'dark' : 'light'
    root.style.setProperty('supported-color-schemes', isEnabled ? 'dark' : 'light')
    root.setAttribute('data-theme', isEnabled ? 'dark' : 'light')

    window.setTimeout(() => {
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

        const statusBarStyle = isEnabled ? 'black-translucent' : 'default'
        let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
        if (appleStatusBar) {
            appleStatusBar.remove()
        }
        appleStatusBar = document.createElement('meta')
        appleStatusBar.name = 'apple-mobile-web-app-status-bar-style'
        appleStatusBar.content = statusBarStyle
        document.head.insertBefore(appleStatusBar, document.head.firstChild)

        const viewport = document.querySelector('meta[name="viewport"]')
        if (viewport && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
            const content = viewport.getAttribute('content')
            viewport.setAttribute('content', `${content} `)
            window.setTimeout(() => {
                viewport.setAttribute('content', content.trim())
            }, 0)
        }
    }, 0)
}

'use server'
import { cookies } from 'next/headers'
import { themeConfig } from '@/configs/theme.config'
import { COOKIES_KEY } from '@/constants/app.constant'

function parseThemeCookie(raw) {
    if (raw == null || typeof raw !== 'string') {
        return null
    }
    const trimmed = raw.trim()
    if (!trimmed) {
        return null
    }
    try {
        return JSON.parse(trimmed)
    } catch {
        try {
            return JSON.parse(decodeURIComponent(trimmed))
        } catch {
            return null
        }
    }
}

export async function getTheme() {
    try {
        const cookieStore = await cookies()
        const storedTheme = cookieStore.get(COOKIES_KEY.THEME)?.value
        const parsed = parseThemeCookie(storedTheme)
        if (parsed && typeof parsed === 'object' && parsed.state && typeof parsed.state === 'object') {
            return { ...themeConfig, ...parsed.state }
        }
    } catch {
        // cookies() или окружение — отдаём дефолт
    }
    return themeConfig
}

export async function setTheme(theme) {
    try {
        const cookieStore = await cookies()
        const value = typeof theme === 'string' ? theme : JSON.stringify(theme)
        cookieStore.set(COOKIES_KEY.THEME, value, { path: '/' })
    } catch (error) {
        console.error('Error saving theme cookie:', error)
    }
}

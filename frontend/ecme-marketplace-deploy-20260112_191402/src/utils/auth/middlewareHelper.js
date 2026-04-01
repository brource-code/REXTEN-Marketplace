/**
 * Утилиты для работы с авторизацией в middleware
 * Так как middleware работает на сервере, мы не можем использовать localStorage напрямую
 * Эти функции используются для проверки токенов из cookies
 */

import { cookies } from 'next/headers'

/**
 * Получить токен из cookies (для серверного middleware)
 */
export function getTokenFromCookies() {
    if (typeof window !== 'undefined') {
        // На клиенте используем localStorage
        return localStorage.getItem('auth_token')
    }
    
    // На сервере пытаемся получить из cookies
    try {
        const cookieStore = cookies()
        return cookieStore.get('auth_token')?.value || null
    } catch (error) {
        return null
    }
}

/**
 * Проверить, валиден ли токен (упрощенная проверка)
 */
export function isValidToken(token) {
    if (!token) return false
    
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return false
        
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
        
        // Проверяем срок действия
        if (payload.exp && payload.exp < Date.now()) {
            return false
        }
        
        return true
    } catch (error) {
        return false
    }
}

/**
 * Получить роль из токена
 */
export function getRoleFromToken(token) {
    if (!token) return null
    
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return null
        
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
        return payload.role || null
    } catch (error) {
        return null
    }
}


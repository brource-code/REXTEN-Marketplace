/**
 * Утилиты для работы с токенами авторизации
 * Поддерживает localStorage и cookies
 */

// Ключи для хранения токенов
const ACCESS_TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

/**
 * Получить access token
 */
export function getAccessToken() {
    if (typeof window === 'undefined') {
        return null
    }
    
    // Сначала пробуем из localStorage
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (token) {
        return token
    }
    
    // Если нет в localStorage, пробуем из cookies
    return getCookie(ACCESS_TOKEN_KEY)
}

/**
 * Получить refresh token
 * 
 * ВАЖНО: Refresh token теперь хранится в httpOnly cookie на сервере
 * и недоступен через JavaScript для безопасности.
 * Эта функция возвращает null, так как токен автоматически отправляется
 * с запросами через withCredentials: true
 */
export function getRefreshToken() {
    // Refresh token хранится в httpOnly cookie и недоступен на клиенте
    // Он автоматически отправляется с запросами через withCredentials: true
    return null
}

/**
 * Сохранить access token
 */
export function setAccessToken(token, useCookie = false) {
    if (typeof window === 'undefined') {
        return
    }
    
    if (useCookie) {
        setCookie(ACCESS_TOKEN_KEY, token, 7) // 7 дней
    } else {
        localStorage.setItem(ACCESS_TOKEN_KEY, token)
    }
}

/**
 * Сохранить refresh token
 * 
 * ВАЖНО: Refresh token теперь устанавливается сервером в httpOnly cookie
 * и не должен сохраняться на клиенте. Эта функция оставлена для обратной
 * совместимости, но не выполняет никаких действий.
 */
export function setRefreshToken(token, useCookie = true) {
    // Refresh token устанавливается сервером в httpOnly cookie
    // Не сохраняем его на клиенте для безопасности
    if (process.env.NODE_ENV === 'development') {
        console.warn('setRefreshToken called, but refresh token is now stored in httpOnly cookie by server')
    }
}

/**
 * Удалить все токены
 * 
 * ВАЖНО: Refresh token в httpOnly cookie удаляется сервером при logout.
 * На клиенте удаляем только access token из localStorage.
 */
export function clearTokens() {
    if (typeof window === 'undefined') {
        return
    }
    
    // Удаляем access token из localStorage
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    
    // Refresh token удаляется сервером при logout через httpOnly cookie
    // Не пытаемся удалить его на клиенте, так как он недоступен
    
    // Удаляем старые cookies на случай миграции (если были установлены ранее)
    deleteCookie(ACCESS_TOKEN_KEY)
    deleteCookie(REFRESH_TOKEN_KEY)
}

/**
 * Проверить, есть ли токен
 */
export function hasToken() {
    return !!getAccessToken()
}

/**
 * Получить cookie по имени
 */
function getCookie(name) {
    if (typeof document === 'undefined') {
        return null
    }
    
    const cookies = document.cookie.split('; ')
    const cookie = cookies.find(row => row.startsWith(`${name}=`))
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : null
}

/**
 * Установить cookie
 */
function setCookie(name, value, days) {
    if (typeof document === 'undefined') {
        return
    }
    
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

/**
 * Удалить cookie
 */
function deleteCookie(name) {
    if (typeof document === 'undefined') {
        return
    }
    
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}


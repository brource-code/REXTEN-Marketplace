/**
 * Утилита для динамического определения URL Laravel API
 * Если фронтенд открыт по IP, использует тот же IP для API
 */
export function getLaravelApiUrl() {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        const protocol = window.location.protocol
        
        // Если фронтенд открыт по IP (не localhost), используем тот же IP для API
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            // Используем тот же протокол и хост, но порт 8000 для API
            return `${protocol}//${hostname}:8000/api`
        }
    }
    // Иначе используем переменную окружения или localhost
    return process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
}

/**
 * Утилита для динамического определения URL фронтенда
 * Используется в backend для редиректов
 */
export function getFrontendUrl() {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        const protocol = window.location.protocol
        const port = window.location.port || (protocol === 'https:' ? '443' : '80')
        
        // Если порт стандартный (80 для http, 443 для https), не добавляем его
        if ((protocol === 'http:' && port === '80') || (protocol === 'https:' && port === '443')) {
            return `${protocol}//${hostname}`
        }
        
        return `${protocol}//${hostname}:${port}`
    }
    // Иначе используем переменную окружения или localhost
    return process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003'
}



import { isLocalhostDirectNextPort } from '@/constants/frontend-ports.constant'

/**
 * Утилита для динамического определения URL Laravel API
 * Если фронтенд открыт по IP, использует тот же IP для API
 */
export function getLaravelApiUrl() {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        const protocol = window.location.protocol
        const port = window.location.port
        
        // Для локального домена через nginx - используем относительный путь
        if (hostname === 'rexten.local' || hostname.endsWith('.local')) {
            return '/api'
        }
        
        // Для localhost через nginx (HTTPS на порту 8443) - используем относительный путь
        if ((hostname === 'localhost' || hostname === '127.0.0.1') && protocol === 'https:' && port === '8443') {
            return '/api'
        }
        
        // localhost:3003 (prod) или :3004 (dev) — прямой доступ без nginx → Laravel :8000
        if (
            (hostname === 'localhost' || hostname === '127.0.0.1') &&
            (isLocalhostDirectNextPort(port) || (port === '' && protocol === 'http:'))
        ) {
            return 'http://localhost:8000/api'
        }

        // Если переменная окружения установлена в /api, используем её (для nginx)
        if (process.env.NEXT_PUBLIC_LARAVEL_API_URL === '/api') {
            // Не подменяем на /api, если это локальный Next на 3003/3004
            if ((hostname !== 'localhost' && hostname !== '127.0.0.1') || (port === '8443' && protocol === 'https:')) {
                return '/api'
            }
        }
        
        // Если фронтенд открыт по IP (не localhost), используем тот же IP для API
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            // Проверяем, что это IP адрес (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
            const ipPattern = /^192\.168\.\d+\.\d+$|^10\.\d+\.\d+\.\d+$|^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/
            if (ipPattern.test(hostname)) {
                // Используем тот же протокол и хост, но порт 8000 для API
                return `${protocol}//${hostname}:8000/api`
            }
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




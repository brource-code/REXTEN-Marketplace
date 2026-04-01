/**
 * Утилиты для работы с изображениями из Laravel storage
 */

/**
 * Получить базовый URL Laravel API для статических файлов
 * Использует Next.js API route как прокси для избежания проблем с IP адресами
 */
function getLaravelApiUrl() {
    // Используем Next.js API route как прокси для статических файлов
    // Это решает проблему с недоступными IP адресами
    if (typeof window !== 'undefined') {
        // Используем тот же origin, что и фронтенд, но через API route
        const origin = window.location.origin
        return origin
    }
    
    // Для SSR используем переменную окружения или localhost
    const envApiUrl = process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_API_URL
    if (envApiUrl) {
        // Убираем /api в конце, если есть
        return envApiUrl.replace(/\/api\/?$/, '')
    }
    
    return 'http://localhost:8000'
}

/**
 * Преобразует URL изображения из Laravel storage в полный URL
 * Обрабатывает различные форматы:
 * - Полный URL (http://...) - возвращает как есть
 * - Относительный путь (/storage/...) - добавляет базовый URL Laravel
 * - Относительный путь без слеша (storage/...) - добавляет базовый URL Laravel
 * 
 * @param {string|null|undefined} imageUrl - URL изображения из API
 * @returns {string|null} Полный URL изображения или null если URL пустой
 */
export function normalizeImageUrl(imageUrl) {
    if (!imageUrl) {
        return null
    }

    // Если URL уже нормализован (начинается с /api/storage/), возвращаем как есть
    // Также проверяем, не содержит ли URL уже /api/storage/ где-то внутри (защита от повторной нормализации)
    if (imageUrl.startsWith('/api/storage/') || imageUrl.includes('/api/storage/')) {
        // Если URL уже содержит /api/storage/, но начинается не с него, извлекаем только путь после /api/storage/
        if (!imageUrl.startsWith('/api/storage/') && imageUrl.includes('/api/storage/')) {
            const apiStorageIndex = imageUrl.indexOf('/api/storage/')
            return imageUrl.substring(apiStorageIndex)
        }
        return imageUrl
    }

    // Если это уже полный URL (http/https), используем Next.js API proxy для статических файлов
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        try {
            const urlObj = new URL(imageUrl)
            const path = urlObj.pathname
            
            // Если путь начинается с /storage/, используем Next.js API route как прокси
            // Это решает проблему с недоступными IP адресами
            if (path.startsWith('/storage/')) {
                // Путь уже содержит /storage/, просто добавляем /api перед ним
                const normalized = `/api${path}`
                if (process.env.NODE_ENV === 'development') {
                    console.log('[normalizeImageUrl] Using Next.js proxy for storage file:', {
                        original: imageUrl,
                        normalized,
                        path
                    })
                }
                return normalized
            }
            
            // Для остальных случаев (внешние URL) возвращаем как есть
            return imageUrl
        } catch (e) {
            // Если не удалось распарсить URL, возвращаем как есть
            console.warn('[normalizeImageUrl] Failed to parse URL:', imageUrl, e)
            return imageUrl
        }
    }

    // Статические пути из папки public (не нужно нормализовать)
    // /img/, /images/, /assets/, /icons/ и другие статические пути
    if (imageUrl.startsWith('/img/') || 
        imageUrl.startsWith('/images/') || 
        imageUrl.startsWith('/assets/') || 
        imageUrl.startsWith('/icons/') ||
        imageUrl.startsWith('/favicon') ||
        imageUrl.startsWith('/logo')) {
        return imageUrl
    }

    // Если это относительный путь от Laravel storage
    if (imageUrl.startsWith('/storage/') || imageUrl.startsWith('storage/')) {
        // Используем Next.js API route как прокси для статических файлов
        // Это решает проблему с недоступными IP адресами
        // Путь уже содержит /storage/, просто заменяем /storage на /api/storage
        const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
        // Заменяем /storage на /api/storage
        return path.replace(/^\/storage/, '/api/storage')
    }

    // Если это просто имя файла (например, из ошибки 404)
    // Проверяем, содержит ли URL расширение изображения
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(imageUrl)
    
    if (hasImageExtension && !imageUrl.includes('/')) {
        // Это просто имя файла без пути - предполагаем, что это из avatars (для аватаров)
        console.warn('[normalizeImageUrl] Filename without path, assuming avatars:', imageUrl)
        return `/api/storage/avatars/${imageUrl}`
    }
    
    // Если это имя файла с путем, но без /storage/
    if (hasImageExtension && !imageUrl.startsWith('/storage/') && !imageUrl.startsWith('storage/') && !imageUrl.startsWith('http')) {
        // Используем Next.js API proxy
        // Если путь содержит advertisements или avatars, используем его
        if (imageUrl.includes('advertisements') || imageUrl.includes('avatars')) {
            const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
            // Убеждаемся, что путь начинается с /storage/
            const normalizedPath = path.startsWith('/storage/') ? path : `/storage${path}`
            return `/api${normalizedPath}`
        }
        // По умолчанию предполагаем avatars для файлов без явного пути
        return `/api/storage/avatars/${imageUrl}`
    }

    // Для остальных случаев возвращаем как есть (может быть относительный путь от фронтенда)
    return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
}

/**
 * Fallback изображение для случаев, когда изображение не загружается
 */
export const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1200&q=80'


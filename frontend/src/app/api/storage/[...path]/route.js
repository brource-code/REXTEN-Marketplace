/**
 * Next.js API route для проксирования статических файлов из Laravel storage
 * Это решает проблему с недоступными IP адресами в URL изображений
 */

import { NextResponse } from 'next/server'

// Получить базовый URL Laravel API
function getLaravelApiUrl(request) {
    try {
        // Определяем host из запроса
        const host = request?.headers?.get('host') || request?.headers?.get('x-forwarded-host') || ''
        const isDevDomain = host.includes('dev.rexten.live')
        const isProdDomain = host.includes('rexten.live') && !host.includes('dev.')
        
        // Если это dev или prod домен, всегда используем внешний HTTPS URL
        // Это более надежно, чем внутренний Docker network
        if (isDevDomain || isProdDomain) {
            return 'https://api.rexten.live'
        }
        
        // Проверяем переменные окружения
        const envApiUrl = process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_API_URL
        if (envApiUrl) {
            // Убираем /api в конце, если есть
            let baseUrl = envApiUrl.replace(/\/api\/?$/, '')
            
            // Если это относительный путь или пустая строка, используем fallback
            if (baseUrl === '/api' || baseUrl === '' || !baseUrl.startsWith('http')) {
                // Если host определен, используем его для определения окружения
                if (host) {
                    if (host.includes('dev.rexten.live') || host.includes('rexten.live')) {
                        return 'https://api.rexten.live'
                    }
                }
                // Fallback для локальной разработки
                return 'http://localhost:8000'
            }
            
            return baseUrl
        }
        
        // Проверяем, работаем ли мы в Docker
        const isDocker = process.env.DOCKER_ENV === 'true' || 
                         process.env.NEXT_PUBLIC_DOCKER_ENV === 'true' ||
                         (process.env.NODE_ENV === 'production' && typeof window === 'undefined') // SSR в production = Docker
        
        // Если в Docker, но не dev/prod домен, пробуем внутренний URL
        if (isDocker) {
            return 'http://backend:8000'
        }
        
        // Финальный fallback - всегда возвращаем валидный URL
        // Если host не определен, но мы в production, используем api.rexten.live
        if (process.env.NODE_ENV === 'production') {
            return 'https://api.rexten.live'
        }
        
        return 'http://localhost:8000'
    } catch (error) {
        console.error('[Storage Proxy] Error in getLaravelApiUrl:', error)
        // В случае любой ошибки возвращаем безопасный fallback
        return 'https://api.rexten.live'
    }
}

export async function GET(request, { params }) {
    try {
        const { path } = params
        const pathSegments = Array.isArray(path) ? path : [path]
        let filePath = pathSegments.join('/')
        
        // Логируем входящий путь для отладки
        console.log('[Storage Proxy] Incoming path:', filePath)
        
        // Путь приходит как avatars/htvEux8nHY8KNqY0XVQadvOrNxfH3g2TIWDLNofh.jpg
        // или storage/avatars/... или /storage/avatars/...
        // Убираем /api/storage если есть (на случай если пришло /api/storage/storage/...)
        filePath = filePath.replace(/^\/?api\/storage\/?/, '')
        
        // Убеждаемся, что путь начинается с /storage/
        if (!filePath.startsWith('/storage/')) {
            // Если путь начинается с /, добавляем storage
            // Если нет, добавляем /storage/
            if (filePath.startsWith('/')) {
                filePath = `/storage${filePath}`
            } else {
                filePath = `/storage/${filePath}`
            }
        }
        
        // Формируем URL к файлу в Laravel storage
        // УПРОЩЕННАЯ ЛОГИКА: для production/dev ВСЕГДА используем https://api.rexten.live
        const host = request?.headers?.get('host') || request?.headers?.get('x-forwarded-host') || ''
        const isDevDomain = host.includes('dev.rexten.live')
        const isProdDomain = host.includes('rexten.live') && !host.includes('dev.')
        const isProduction = process.env.NODE_ENV === 'production'
        
        // ВСЕГДА используем https://api.rexten.live для dev/prod окружений
        // Это гарантирует, что URL всегда будет валидным
        const laravelBaseUrl = (isDevDomain || isProdDomain || isProduction) 
            ? 'https://api.rexten.live' 
            : 'http://localhost:8000'
        
        console.log('[Storage Proxy] URL determination:', {
            laravelBaseUrl,
            host,
            isDevDomain,
            isProdDomain,
            isProduction,
            nodeEnv: process.env.NODE_ENV
        })
        
        // Финальная проверка - если все еще пустой (не должно быть), используем жесткий fallback
        if (!laravelBaseUrl || laravelBaseUrl === '' || !laravelBaseUrl.startsWith('http')) {
            console.error('[Storage Proxy] CRITICAL: laravelBaseUrl is still invalid! Using emergency fallback')
            // Используем жесткий fallback - всегда https://api.rexten.live для production
            const emergencyUrl = 'https://api.rexten.live'
            const cleanFilePath = filePath.startsWith('/') ? filePath : `/${filePath}`
            const fileUrl = `${emergencyUrl}${cleanFilePath}`
            
            console.log('[Storage Proxy] Using emergency fallback URL:', fileUrl)
            
            try {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 10000)
                const response = await fetch(fileUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'image/*, */*',
                        'User-Agent': 'Next.js-Storage-Proxy/1.0',
                    },
                    signal: controller.signal,
                })
                clearTimeout(timeoutId)
                
                if (!response.ok) {
                    return new NextResponse(`Failed to fetch file: ${response.status} ${response.statusText}`, { 
                        status: response.status,
                        headers: { 'Content-Type': 'text/plain' }
                    })
                }
                
                const blob = await response.blob()
                const contentType = response.headers.get('content-type') || 'application/octet-stream'
                return new NextResponse(blob, {
                    status: 200,
                    headers: {
                        'Content-Type': contentType,
                        'Cache-Control': 'public, max-age=31536000, immutable',
                        'Access-Control-Allow-Origin': '*',
                    },
                })
            } catch (fetchError) {
                return new NextResponse(`Failed to fetch file: ${fetchError.message}`, { 
                    status: 500,
                    headers: { 'Content-Type': 'text/plain' }
                })
            }
        }
        
        // Убеждаемся, что baseUrl не заканчивается на /, а filePath начинается с /
        const cleanBaseUrl = laravelBaseUrl.replace(/\/$/, '')
        const cleanFilePath = filePath.startsWith('/') ? filePath : `/${filePath}`
        
        // Убеждаемся, что URL абсолютный (начинается с http:// или https://)
        let fileUrl = `${cleanBaseUrl}${cleanFilePath}`
        
        // КРИТИЧЕСКАЯ ПРОВЕРКА: убеждаемся, что URL абсолютный
        if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
            console.error('[Storage Proxy] URL is not absolute, fixing:', fileUrl)
            // Если URL не абсолютный, используем безопасный fallback
            const host = request?.headers?.get('host') || request?.headers?.get('x-forwarded-host') || ''
            const fallbackBase = (host.includes('dev.rexten.live') || host.includes('rexten.live') || process.env.NODE_ENV === 'production')
                ? 'https://api.rexten.live' 
                : 'http://localhost:8000'
            fileUrl = `${fallbackBase}${cleanFilePath}`
            console.log('[Storage Proxy] Using emergency fallback URL:', fileUrl)
        }
        
        console.log('[Storage Proxy] Fetching file:', {
            originalPath: pathSegments,
            normalizedPath: filePath,
            laravelBaseUrl,
            cleanBaseUrl,
            cleanFilePath,
            fileUrl,
            isDocker: process.env.DOCKER_ENV === 'true' || process.env.NEXT_PUBLIC_DOCKER_ENV === 'true',
            nodeEnv: process.env.NODE_ENV,
            host: request?.headers?.get('host')
        })
        
        // Проксируем запрос к Laravel
        // Пробуем сначала внутренний URL (если в Docker), затем внешний как fallback
        let response
        let lastError = null
        const urlsToTry = []
        
        // Если это внутренний Docker URL, добавляем внешний как fallback
        if (cleanBaseUrl.includes('backend:8000') || cleanBaseUrl.includes('localhost:8000')) {
            // Пробуем сначала внутренний, затем внешний
            urlsToTry.push(fileUrl)
            // Определяем внешний URL на основе запроса
            const host = request.headers.get('host') || ''
            if (host.includes('dev.rexten.live') || (host.includes('rexten.live') && !host.includes('dev.'))) {
                urlsToTry.push(`https://api.rexten.live${cleanFilePath}`)
            }
        } else {
            // Если уже внешний URL, используем только его
            urlsToTry.push(fileUrl)
        }
        
        for (const tryUrl of urlsToTry) {
            try {
                console.log('[Storage Proxy] Trying URL:', tryUrl)
                // Используем timeout для избежания зависаний
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 секунд timeout для каждого попытки
                
                response = await fetch(tryUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'image/*, */*',
                        'User-Agent': 'Next.js-Storage-Proxy/1.0',
                    },
                    signal: controller.signal,
                })
                
                clearTimeout(timeoutId)
                
                // Если получили успешный ответ, выходим из цикла
                if (response.ok) {
                    console.log('[Storage Proxy] Success with URL:', tryUrl)
                    break
                }
                
                // Если это не последний URL, пробуем следующий
                if (tryUrl !== urlsToTry[urlsToTry.length - 1]) {
                    console.log('[Storage Proxy] Failed with URL, trying next:', tryUrl, response.status)
                    continue
                }
            } catch (fetchError) {
                console.error('[Storage Proxy] Fetch error for URL:', {
                    url: tryUrl,
                    error: fetchError.message,
                    name: fetchError.name,
                    code: fetchError.code,
                })
                
                lastError = fetchError
                
                // Если это не последний URL, пробуем следующий
                if (tryUrl !== urlsToTry[urlsToTry.length - 1]) {
                    console.log('[Storage Proxy] Error with URL, trying next:', tryUrl)
                    continue
                }
            }
        }
        
        // Если все попытки не удались
        if (!response || !response.ok) {
            if (lastError) {
                // Если это ошибка сети, возвращаем 503 (Service Unavailable)
                if (lastError.name === 'AbortError' || lastError.code === 'ECONNREFUSED' || lastError.code === 'ETIMEDOUT') {
                    return new NextResponse(`Service temporarily unavailable: ${lastError.message}`, { 
                        status: 503,
                        headers: {
                            'Content-Type': 'text/plain',
                            'Retry-After': '60',
                        }
                    })
                }
                
                return new NextResponse(`Failed to fetch file: ${lastError.message}`, { 
                    status: 500,
                    headers: {
                        'Content-Type': 'text/plain',
                    }
                })
            }
            
            // Если response есть, но не ok
            if (response) {
                const errorText = await response.text().catch(() => 'Unknown error')
                return new NextResponse(errorText || 'Error fetching file', { 
                    status: response.status,
                    headers: {
                        'Content-Type': 'text/plain',
                    }
                })
            }
            
            return new NextResponse('Failed to fetch file: All attempts failed', { 
                status: 500,
                headers: {
                    'Content-Type': 'text/plain',
                }
            })
        }
        
        if (!response.ok) {
            console.error('[Storage Proxy] File not found:', {
                fileUrl,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            })
            
            // Если файл не найден, возвращаем 404
            if (response.status === 404) {
                return new NextResponse('File not found', { status: 404 })
            }
            
            // Для других ошибок возвращаем статус от Laravel
            const errorText = await response.text().catch(() => 'Unknown error')
            return new NextResponse(errorText || 'Error fetching file', { 
                status: response.status,
                headers: {
                    'Content-Type': 'text/plain',
                }
            })
        }
        
        // Получаем данные файла
        const blob = await response.blob()
        const contentType = response.headers.get('content-type') || 'application/octet-stream'
        
        console.log('[Storage Proxy] File loaded successfully:', {
            fileUrl,
            contentType,
            size: blob.size
        })
        
        // Возвращаем файл с правильными заголовками
        return new NextResponse(blob, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
            },
        })
    } catch (error) {
        console.error('[Storage Proxy] Error:', {
            error: error.message,
            stack: error.stack,
            params
        })
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}


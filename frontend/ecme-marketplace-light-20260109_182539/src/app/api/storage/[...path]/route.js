/**
 * Next.js API route для проксирования статических файлов из Laravel storage
 * Это решает проблему с недоступными IP адресами в URL изображений
 */

import { NextResponse } from 'next/server'

// Получить базовый URL Laravel API
function getLaravelApiUrl() {
    const envApiUrl = process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_API_URL
    if (envApiUrl) {
        // Убираем /api в конце, если есть
        return envApiUrl.replace(/\/api\/?$/, '')
    }
    return 'http://localhost:8000'
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
        const laravelBaseUrl = getLaravelApiUrl()
        const fileUrl = `${laravelBaseUrl}${filePath}`
        
        console.log('[Storage Proxy] Fetching file:', {
            originalPath: pathSegments,
            normalizedPath: filePath,
            laravelBaseUrl,
            fileUrl
        })
        
        // Проксируем запрос к Laravel
        let response
        try {
            response = await fetch(fileUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'image/*, */*',
                },
            })
        } catch (fetchError) {
            console.error('[Storage Proxy] Fetch error:', {
                fileUrl,
                error: fetchError.message,
                name: fetchError.name,
                stack: fetchError.stack
            })
            return new NextResponse(`Failed to fetch file: ${fetchError.message}`, { 
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
                statusText: response.statusText
            })
            return new NextResponse('File not found', { status: 404 })
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


/**
 * Middleware для Next.js
 * 
 * ВАЖНО: Проверка авторизации происходит на клиенте через ProtectedRoute компоненты,
 * так как мы используем JWT токены из localStorage, которые недоступны на сервере.
 * 
 * Этот middleware пропускает все запросы, а защита маршрутов реализована
 * через клиентские компоненты ProtectedRoute в layouts.
 */

import {
    authRoutes as _authRoutes,
    publicRoutes as _publicRoutes,
} from '@/configs/routes.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import appConfig from '@/configs/app.config'

const publicRoutes = Object.entries(_publicRoutes).map(([key]) => key)
const authRoutes = Object.entries(_authRoutes).map(([key]) => key)

const apiAuthPrefix = `${appConfig.apiPrefix}/auth`

export default function middleware(req) {
    const { nextUrl } = req

    // Получаем basePath из конфигурации Next.js
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    
    // Нормализуем pathname
    let pathname = nextUrl.pathname
    if (basePath && pathname.startsWith(basePath)) {
        pathname = pathname.slice(basePath.length) || '/'
    }

    // Редирект корневой страницы на /services
    if (pathname === '/') {
        return Response.redirect(new URL('/services', nextUrl))
    }

    const isApiAuthRoute = pathname.startsWith(apiAuthPrefix)
    const isPublicRoute = publicRoutes.includes(pathname)
    const isAuthRoute = authRoutes.includes(pathname)

    // Пропускаем API routes
    if (isApiAuthRoute) {
        return
    }

    // Пропускаем все остальные маршруты - проверка авторизации на клиенте
    // Это необходимо, так как JWT токены хранятся в localStorage и недоступны на сервере
    return
}

export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api)(.*)'],
}

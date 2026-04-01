/**
 * Middleware для Next.js
 *
 * JWT на клиенте — проверка через ProtectedRoute.
 * Режим обслуживания / регистрация — на стороне Laravel (API), без fetch здесь
 * (иначе каждая навигация ждёт бэкенд и сайт «тупит» или падает при недоступном API).
 */

import { NextResponse } from 'next/server'
import appConfig from '@/configs/app.config'

const apiAuthPrefix = `${appConfig.apiPrefix}/auth`

function firstHeaderValue(raw) {
    if (!raw || typeof raw !== 'string') return ''
    return raw.split(',')[0].trim().toLowerCase()
}

export default function middleware(req) {
    try {
        const { nextUrl } = req
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

        let pathname = nextUrl.pathname
        if (basePath && pathname.startsWith(basePath)) {
            pathname = pathname.slice(basePath.length) || '/'
        }

        if (pathname === '/') {
            const forwardedHost =
                req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
            const protoRaw =
                req.headers.get('x-forwarded-proto') ||
                req.headers.get('x-forwarded-scheme') ||
                ''
            const proto = firstHeaderValue(protoRaw) || (nextUrl.protocol === 'https:' ? 'https' : 'http')
            const isHttps = proto === 'https' || proto === 'https:'

            const hostPart = forwardedHost ? forwardedHost.split(':')[0].trim() : (req.headers.get('host') || '').split(':')[0].trim()
            const isLocalhost = hostPart === 'localhost' || hostPart === '127.0.0.1'

            let redirectOrigin
            if (isLocalhost) {
                redirectOrigin = nextUrl.origin
            } else if (forwardedHost) {
                redirectOrigin = isHttps ? `https://${hostPart}` : `http://${hostPart}`
                if (/:(80|443)(\b|$)/.test(redirectOrigin)) {
                    redirectOrigin = redirectOrigin.replace(/:(80|443)(\b|$)/, '')
                }
            } else {
                redirectOrigin = nextUrl.origin
            }

            try {
                const redirectUrl = new URL('/services', redirectOrigin)
                return NextResponse.redirect(redirectUrl)
            } catch {
                return NextResponse.redirect(new URL('/services', nextUrl))
            }
        }

        if (pathname.startsWith(apiAuthPrefix)) {
            return NextResponse.next()
        }

        return NextResponse.next()
    } catch (e) {
        console.error('[middleware]', e)
        try {
            return NextResponse.redirect(new URL('/services', req.nextUrl))
        } catch {
            return new NextResponse('Service temporarily unavailable', { status: 503 })
        }
    }
}

// Не матчим /api/* — там только Next Route Handlers, лишний проход middleware не нужен
export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/'],
}

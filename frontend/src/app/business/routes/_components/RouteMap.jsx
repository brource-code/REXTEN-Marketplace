'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { getLaravelApiUrl } from '@/lib/api/marketplace'

function RouteMapLoading() {
    const t = useTranslations('business.routes')
    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 min-h-[320px] flex items-center justify-center">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('mapLoading')}</span>
        </div>
    )
}

function RouteMapNoToken() {
    const t = useTranslations('business.routes')
    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 min-h-[220px] flex items-center justify-center p-4">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 text-center">{t('mapNoTokenHint')}</p>
        </div>
    )
}

const RouteMapGl = dynamic(() => import('./RouteMapGl'), {
    ssr: false,
    loading: () => <RouteMapLoading />,
})

function mapboxConfigUrl() {
    const base = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BASE_PATH || '' : ''
    return `${base}/api/business/mapbox-config`
}

/**
 * Карта Mapbox: токен из GET /api/business/mapbox-config.
 * 1) Тот же origin (Next в Docker или nginx → frontend) — env контейнера frontend.
 * 2) Если ответ пустой/404: запасной запрос на абсолютный Laravel API (NEXT_PUBLIC_LARAVEL_API_URL), где отдаётся
 *    токен из backend/.env — нужно, если nginx всё ещё шлёт /api только в PHP без сниппета mapbox-next.
 */
export default function RouteMap({
    stops,
    pathLngLat,
    minHeight,
    includeReturnLeg = true,
    fill = false,
    onOpenBooking,
    displayTimezone,
}) {
    const [accessToken, setAccessToken] = useState(null)
    const [fetchFailed, setFetchFailed] = useState(false)

    useEffect(() => {
        let cancelled = false

        const readToken = async (url) => {
            const r = await fetch(url, { credentials: 'omit' })
            if (!r.ok) return null
            const data = await r.json()
            const raw = data?.accessToken
            const tok = typeof raw === 'string' ? raw.trim() : ''
            return tok || null
        }

        ;(async () => {
            try {
                const primary = mapboxConfigUrl()
                let tok = await readToken(primary).catch(() => null)

                if (!tok && typeof window !== 'undefined') {
                    const originUrl = `${window.location.origin}${mapboxConfigUrl()}`
                    const extra = []
                    const apiBase = getLaravelApiUrl().replace(/\/$/, '')
                    if (apiBase.startsWith('http')) {
                        extra.push(`${apiBase}/business/mapbox-config`)
                    }
                    const h = window.location.hostname
                    if (h === 'rexten.live' || h === 'www.rexten.live' || h === 'dev.rexten.live') {
                        extra.push('https://api.rexten.live/api/business/mapbox-config')
                    }
                    for (const u of [...new Set(extra)]) {
                        if (u === originUrl) continue
                        tok = await readToken(u).catch(() => null)
                        if (tok) break
                    }
                }

                if (cancelled) return
                if (tok) {
                    setAccessToken(tok)
                    return
                }
                setFetchFailed(true)
                setAccessToken('')
            } catch {
                if (!cancelled) {
                    setFetchFailed(true)
                    setAccessToken('')
                }
            }
        })()

        return () => {
            cancelled = true
        }
    }, [])

    if (accessToken === null && !fetchFailed) {
        return <RouteMapLoading />
    }

    if (fetchFailed || !accessToken) {
        return <RouteMapNoToken />
    }

    return (
        <RouteMapGl
            stops={stops}
            pathLngLat={pathLngLat}
            minHeight={minHeight}
            accessToken={accessToken}
            includeReturnLeg={includeReturnLeg}
            fill={fill}
            onOpenBooking={onOpenBooking}
            displayTimezone={displayTimezone}
        />
    )
}

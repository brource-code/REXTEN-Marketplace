import { NextResponse } from 'next/server'

/** Не кэшировать: токен приходит из env контейнера / .env.local без пересборки. */
export const dynamic = 'force-dynamic'

/**
 * Публичный токен Mapbox (pk...) для клиента.
 * Приоритет: MAPBOX_PUBLIC_TOKEN (runtime, удобно для Docker + env_file) → NEXT_PUBLIC_MAPBOX_TOKEN (часто уже вшит при build).
 */
export async function GET() {
    const accessToken =
        (typeof process.env.MAPBOX_PUBLIC_TOKEN === 'string' && process.env.MAPBOX_PUBLIC_TOKEN.trim()) ||
        (typeof process.env.NEXT_PUBLIC_MAPBOX_TOKEN === 'string' && process.env.NEXT_PUBLIC_MAPBOX_TOKEN.trim()) ||
        ''

    return NextResponse.json({ accessToken })
}

import { NextResponse } from 'next/server'

/**
 * Прокси к Laravel: POST /api/business/routes/{specialist}/{date}/assist|assist/apply
 * Клиент передаёт Authorization: Bearer и current_company_id в JSON.
 */
function getLaravelApiBaseUrl() {
    const envUrl = process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_API_URL
    if (envUrl && /^https?:\/\//i.test(envUrl)) {
        return String(envUrl).replace(/\/$/, '')
    }
    if (process.env.INTERNAL_LARAVEL_API_URL && /^https?:\/\//i.test(process.env.INTERNAL_LARAVEL_API_URL)) {
        return String(process.env.INTERNAL_LARAVEL_API_URL).replace(/\/$/, '')
    }
    return 'http://localhost:8000/api'
}

export async function POST(request) {
    let body
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
    }

    const { op, specialistId, date, current_company_id: companyId, ...rest } = body
    if (op !== 'assist' && op !== 'apply') {
        return NextResponse.json({ success: false, message: 'Invalid op' }, { status: 400 })
    }
    if (specialistId == null || date == null) {
        return NextResponse.json({ success: false, message: 'Missing specialist or date' }, { status: 400 })
    }

    const auth = request.headers.get('authorization')
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const base = getLaravelApiBaseUrl()
    const suffix = op === 'apply' ? 'assist/apply' : 'assist'
    const url = `${base}/business/routes/${encodeURIComponent(String(specialistId))}/${encodeURIComponent(String(date))}/${suffix}`

    const payload =
        op === 'apply'
            ? {
                  actions: rest.actions,
                  expected_version: rest.expected_version,
                  ...(rest.confirm_remove_bookings === true ? { confirm_remove_bookings: true } : {}),
                  current_company_id: companyId,
              }
            : {
                  messages: rest.messages,
                  locale: rest.locale,
                  intent: rest.intent,
                  current_company_id: companyId,
              }

    let res
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: auth,
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Accept-Language': request.headers.get('accept-language') || 'en',
            },
            body: JSON.stringify(payload),
            cache: 'no-store',
        })
    } catch (e) {
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Proxy error' },
            { status: 502 },
        )
    }

    const text = await res.text()
    let json
    try {
        json = text ? JSON.parse(text) : {}
    } catch {
        return NextResponse.json(
            { success: false, message: 'Invalid upstream response', raw: text.slice(0, 200) },
            { status: 502 },
        )
    }

    return NextResponse.json(json, { status: res.status })
}

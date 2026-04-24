import { getLaravelApiUrl } from '@/lib/api/marketplace'
import { getAccessToken } from '@/utils/auth/tokenStorage'
import useBusinessStore from '@/store/businessStore'
import type { BusinessRoute } from '@/lib/api/business'

type AssistRole = 'system' | 'user' | 'assistant'

export interface RouteAssistMessage {
    role: AssistRole
    content: string
}

export interface RouteAssistSuccessPayload {
    summary?: string
    issues?: Array<{
        type?: string
        stop_n?: number | null
        booking_id?: number | null
        human?: string
    }>
    recommendations?: Array<{
        title?: string
        detail?: string
        expected?: { late_min?: number; idle_min?: number; miles?: number }
    }>
    proposed_actions?: Array<{
        kind: 'set_included' | 'optimize' | 'toggle_return_leg'
        params?: Record<string, unknown>
        explain?: string
        expected?: { late_min?: number; idle_min?: number; miles?: number }
    }>
    [key: string]: unknown
}

/**
 * Прямой вызов Laravel: на хосте rexten.live nginx весь /api — в PHP, маршрут Next.js
 * /api/business/route-assist в проде недоступен. Тот же URL, что и в app/api/.../route.js.
 */
function buildAssistLaravelUrl(op: 'assist' | 'apply', specialistId: number, date: string): string {
    const base = getLaravelApiUrl().replace(/\/$/, '')
    const suffix = op === 'apply' ? 'assist/apply' : 'assist'
    return `${base}/business/routes/${encodeURIComponent(String(specialistId))}/${encodeURIComponent(String(date))}/${suffix}`
}

async function postRouteAssist(
    op: 'assist' | 'apply',
    payload: {
        specialistId: number
        date: string
    } & Record<string, unknown>
): Promise<Response> {
    const token = getAccessToken()
    const businessId = useBusinessStore.getState().businessId
    const { specialistId, date, ...rest } = payload
    const restApply = rest as {
        actions?: unknown
        expected_version?: number
        expectedVersion?: number
        confirm_remove_bookings?: boolean
    }
    const body =
        op === 'apply'
            ? {
                  actions: restApply.actions,
                  expected_version: restApply.expected_version ?? restApply.expectedVersion,
                  ...(restApply.confirm_remove_bookings === true
                      ? { confirm_remove_bookings: true }
                      : {}),
                  current_company_id: businessId,
              }
            : {
                  messages: rest.messages,
                  locale: rest.locale,
                  intent: rest.intent,
                  current_company_id: businessId,
              }
    return fetch(buildAssistLaravelUrl(op, specialistId, date), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    })
}

export async function assistRouteRequest(params: {
    specialistId: number
    date: string
    messages: RouteAssistMessage[]
    locale: string
    /** Аудит дня vs вільне питання (валідується на бекенді) */
    intent?: 'audit' | 'free'
}): Promise<{
    ok: boolean
    status: number
    data?: RouteAssistSuccessPayload
    error?: string
    usage?: { prompt_tokens?: number; completion_tokens?: number }
    period_end?: string
    raw?: unknown
}> {
    const res = await postRouteAssist('assist', {
        specialistId: params.specialistId,
        date: params.date,
        messages: params.messages,
        locale: params.locale,
        intent: params.intent,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
        return {
            ok: false,
            status: res.status,
            error: typeof json?.message === 'string' ? json.message : 'Request failed',
            period_end: typeof json?.period_end === 'string' ? json.period_end : undefined,
            raw: json,
        }
    }
    const data = json?.data
    return {
        ok: true,
        status: res.status,
        data: typeof data === 'object' && data !== null ? (data as RouteAssistSuccessPayload) : undefined,
        usage: json?.usage,
    }
}

export async function applyAssistActionsRequest(params: {
    specialistId: number
    date: string
    actions: Array<{
        kind: 'set_included' | 'optimize' | 'toggle_return_leg'
        params: Record<string, unknown>
    }>
    expectedVersion?: number
    /** Повтор после 409 `remove_requires_confirm` */
    confirmRemoveBookings?: boolean
}): Promise<{
    ok: boolean
    status: number
    route?: BusinessRoute | null
    error?: string
    remove_booking_ids?: number[]
    message?: string
    current_version?: number
    expected_version?: number
    invalid_booking_ids?: number[]
}> {
    const res = await postRouteAssist('apply', {
        specialistId: params.specialistId,
        date: params.date,
        actions: params.actions,
        expected_version: params.expectedVersion,
        confirm_remove_bookings: params.confirmRemoveBookings === true,
    })
    const json = (await res.json().catch(() => ({}))) as {
        error?: string
        message?: string
        remove_booking_ids?: number[]
        current_version?: number
        expected_version?: number
        invalid_booking_ids?: number[]
    }
    if (!res.ok) {
        const errCode =
            typeof json?.error === 'string' && json.error !== '' ? json.error : undefined
        const msg = typeof json?.message === 'string' ? json.message : 'Apply failed'
        const curV = json?.current_version
        const expV = json?.expected_version
        return {
            ok: false,
            status: res.status,
            error: errCode ?? msg,
            message: msg,
            remove_booking_ids: Array.isArray(json?.remove_booking_ids)
                ? (json.remove_booking_ids as number[])
                : undefined,
            current_version: typeof curV === 'number' && Number.isFinite(curV) ? curV : undefined,
            expected_version: typeof expV === 'number' && Number.isFinite(expV) ? expV : undefined,
            invalid_booking_ids: Array.isArray(json?.invalid_booking_ids)
                ? (json.invalid_booking_ids as number[])
                : undefined,
        }
    }
    return {
        ok: true,
        status: res.status,
        route: (json?.data as BusinessRoute | undefined) ?? null,
    }
}

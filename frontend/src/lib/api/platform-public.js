/**
 * Публичные флаги платформы (без JWT). Используются в middleware и на клиенте.
 */

function buildPublicSettingsUrl(origin) {
    const envBase = process.env.NEXT_PUBLIC_LARAVEL_API_URL || ''
    if (envBase.startsWith('http')) {
        return `${envBase.replace(/\/$/, '')}/settings/public`
    }
    const override = process.env.PLATFORM_PUBLIC_SETTINGS_URL
    if (override && override.startsWith('http')) {
        return override.replace(/\/$/, '')
    }
    return `${origin}/api/settings/public`
}

/**
 * @param {string} origin — req.nextUrl.origin
 * @returns {Promise<{ maintenanceMode?: boolean, registrationEnabled?: boolean, stripePaymentsEnabled?: boolean } | null>}
 */
export async function fetchPlatformPublicFlags(origin) {
    const url = buildPublicSettingsUrl(origin)
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 2500)
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
            cache: 'no-store',
        })
        if (!res.ok) {
            return null
        }
        const json = await res.json()
        const data = json?.data || json
        return {
            maintenanceMode: Boolean(data.maintenanceMode),
            registrationEnabled: data.registrationEnabled !== false,
            stripePaymentsEnabled: data.stripePaymentsEnabled !== false,
        }
    } catch {
        return null
    } finally {
        clearTimeout(t)
    }
}

'use server'

import { cookies } from 'next/headers'

const LOCATION_COOKIE_KEY = 'location'

function parseLocationCookie(raw) {
    if (raw == null || typeof raw !== 'string') {
        return null
    }
    const trimmed = raw.trim()
    if (!trimmed) {
        return null
    }
    try {
        return JSON.parse(trimmed)
    } catch {
        try {
            return JSON.parse(decodeURIComponent(trimmed))
        } catch {
            return null
        }
    }
}

/**
 * Получить локацию из cookies
 * @returns {Promise<{state: string|null, city: string|null, updatedAt: number|null}>}
 */
export async function getLocation() {
    try {
        const cookieStore = await cookies()
        const locationCookie = cookieStore.get(LOCATION_COOKIE_KEY)?.value

        if (locationCookie) {
            const parsed = parseLocationCookie(locationCookie)
            if (parsed && typeof parsed === 'object') {
                return {
                    state: parsed.state || null,
                    city: parsed.city || null,
                    updatedAt: parsed.updatedAt || null,
                }
            }
        }

        return { state: null, city: null, updatedAt: null }
    } catch (error) {
        console.error('Error reading location from cookies:', error)
        return { state: null, city: null, updatedAt: null }
    }
}

/**
 * Сохранить локацию в cookies
 * @param {string|null} state - ID штата
 * @param {string|null} city - Название города
 */
export async function setLocation(state, city) {
    try {
        const cookieStore = await cookies()
        const locationData = JSON.stringify({
            state: state || null,
            city: city || null,
            updatedAt: Date.now(),
        })
        
        // Сохраняем в cookie на 1 год
        cookieStore.set(LOCATION_COOKIE_KEY, locationData, {
            maxAge: 365 * 24 * 60 * 60, // 1 год в секундах
            path: '/',
            sameSite: 'lax',
            httpOnly: false, // Нужен доступ на клиенте для синхронизации с localStorage
        })
    } catch (error) {
        console.error('Error saving location to cookies:', error)
    }
}

/**
 * Удалить локацию из cookies
 */
export async function clearLocation() {
    try {
        const cookieStore = await cookies()
        cookieStore.delete(LOCATION_COOKIE_KEY)
    } catch (error) {
        console.error('Error clearing location from cookies:', error)
    }
}

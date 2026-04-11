// Location Service - API клиент для работы с локациями

import { State, City, LocationSearchResult, LocationValidationResult, LocationApiResponse } from './types'
import { US_STATES, US_CITIES_BY_STATE } from '@/constants/us-locations.constant'
import { isLocalhostDirectNextPort } from '@/constants/frontend-ports.constant'
import { logClientApiWarn } from '@/utils/logClientApiError'

// Функция для динамического определения API URL
const getLaravelApiUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        const protocol = window.location.protocol
        const port = window.location.port
        
        // Для локального домена через nginx - используем относительный путь
        if (hostname === 'rexten.local' || hostname.endsWith('.local')) {
            return '/api'
        }
        
        // Для localhost через nginx (HTTPS на порту 8443) - используем относительный путь
        if ((hostname === 'localhost' || hostname === '127.0.0.1') && protocol === 'https:' && port === '8443') {
            return '/api'
        }
        
        if (
            (hostname === 'localhost' || hostname === '127.0.0.1') &&
            (isLocalhostDirectNextPort(port) || (port === '' && protocol === 'http:'))
        ) {
            return 'http://localhost:8000/api'
        }

        if (process.env.NEXT_PUBLIC_LARAVEL_API_URL === '/api') {
            if ((hostname !== 'localhost' && hostname !== '127.0.0.1') || (port === '8443' && protocol === 'https:')) {
                return '/api'
            }
        }
        
        // Если фронтенд открыт по IP (не localhost), используем тот же IP для API
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            // Проверяем, что это IP адрес (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
            const ipPattern = /^192\.168\.\d+\.\d+$|^10\.\d+\.\d+\.\d+$|^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/
            if (ipPattern.test(hostname)) {
                // Используем тот же протокол и хост, но порт 8000 для API
                return `${protocol}//${hostname}:8000/api`
            }
        }
    }
    // Иначе используем переменную окружения или localhost
    return process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
}

// Кэш для локаций (in-memory cache)
const cache = {
    states: null as State[] | null,
    cities: new Map<string, City[]>(),
    cacheTime: {
        states: 0,
        cities: new Map<string, number>(),
    },
    TTL: 3600000, // 1 час в миллисекундах
}

/**
 * Получить список всех штатов
 */
export async function getStates(activeOnly: boolean = false): Promise<State[]> {
    const cacheKey = activeOnly ? 'active' : 'all'
    const now = Date.now()
    
    // Проверяем кэш
    if (cache.states && (now - cache.cacheTime.states) < cache.TTL) {
        if (activeOnly) {
            // Фильтруем только активные штаты (если нужно)
            return cache.states
        }
        return cache.states
    }

    try {
        const response = await fetch(`${getLaravelApiUrl()}/locations/states?active_only=${activeOnly}`)
        
        if (!response.ok) {
            throw new Error(`Failed to fetch states: ${response.status}`)
        }

        const result: LocationApiResponse<State[]> = await response.json()
        
        if (result.success && Array.isArray(result.data)) {
            // Сохраняем в кэш
            cache.states = result.data
            cache.cacheTime.states = now
            return result.data
        }

        throw new Error('Invalid response format')
    } catch (error) {
        logClientApiWarn('Error fetching states from API, using fallback', error)
        
        // Fallback на статические данные
        const fallbackStates: State[] = US_STATES.map(s => ({
            id: s.id,
            name: s.name,
        }))
        
        // Сохраняем fallback в кэш
        cache.states = fallbackStates
        cache.cacheTime.states = now
        
        return fallbackStates
    }
}

/**
 * Получить список городов по штату
 */
export async function getCities(
    stateId: string,
    options: {
        search?: string
        limit?: number
        activeOnly?: boolean
    } = {}
): Promise<City[]> {
    const { search = '', limit = 100, activeOnly = false } = options
    
    if (!stateId) {
        return []
    }

    const cacheKey = `${stateId}:${activeOnly ? 'active' : 'all'}`
    const now = Date.now()
    
    // Проверяем кэш (только если нет поиска)
    if (!search && cache.cities.has(cacheKey)) {
        const cacheTime = cache.cacheTime.cities.get(cacheKey) || 0
        if ((now - cacheTime) < cache.TTL) {
            const cachedCities = cache.cities.get(cacheKey)!
            if (limit > 0) {
                return cachedCities.slice(0, limit)
            }
            return cachedCities
        }
    }

    try {
        const params = new URLSearchParams({
            state: stateId,
            limit: limit.toString(),
            active_only: activeOnly.toString(),
        })
        
        if (search) {
            params.append('search', search)
        }

        const response = await fetch(`${getLaravelApiUrl()}/locations/cities?${params}`)
        
        if (!response.ok) {
            throw new Error(`Failed to fetch cities: ${response.status}`)
        }

        const result: LocationApiResponse<City[]> = await response.json()
        
        if (result.success && Array.isArray(result.data)) {
            // Сохраняем в кэш (только если нет поиска)
            if (!search) {
                cache.cities.set(cacheKey, result.data)
                cache.cacheTime.cities.set(cacheKey, now)
            }
            return result.data
        }

        throw new Error('Invalid response format')
    } catch (error) {
        logClientApiWarn('Error fetching cities from API, using fallback', error, { stateId })
        
        // Fallback на статические данные
        const fallbackCities: City[] = (US_CITIES_BY_STATE[stateId] || []).map(city => ({
            id: city.toLowerCase().replace(/\s+/g, '-'),
            name: city,
            stateId: stateId,
        }))
        
        // Применяем поиск
        let filteredCities = fallbackCities
        if (search) {
            filteredCities = fallbackCities.filter(city =>
                city.name.toLowerCase().includes(search.toLowerCase())
            )
        }
        
        // Применяем лимит
        if (limit > 0) {
            filteredCities = filteredCities.slice(0, limit)
        }
        
        // Сохраняем fallback в кэш (только если нет поиска)
        if (!search) {
            cache.cities.set(cacheKey, fallbackCities)
            cache.cacheTime.cities.set(cacheKey, now)
        }
        
        return filteredCities
    }
}

/**
 * Поиск локаций (штаты и города)
 */
export async function searchLocations(
    query: string,
    options: {
        type?: 'state' | 'city' | 'all'
        limit?: number
    } = {}
): Promise<LocationSearchResult> {
    const { type = 'all', limit = 20 } = options

    if (!query || query.length < 2) {
        return { states: [], cities: [] }
    }

    try {
        const params = new URLSearchParams({
            q: query,
            type,
            limit: limit.toString(),
        })

        const response = await fetch(`${getLaravelApiUrl()}/locations/search?${params}`)
        
        if (!response.ok) {
            throw new Error(`Failed to search locations: ${response.status}`)
        }

        const result: LocationApiResponse<LocationSearchResult> = await response.json()
        
        if (result.success && result.data) {
            return result.data
        }

        throw new Error('Invalid response format')
    } catch (error) {
        logClientApiWarn('Error searching locations from API, using fallback', error, { query })
        
        // Fallback на локальный поиск
        const results: LocationSearchResult = {
            states: [],
            cities: [],
        }

        const lowerQuery = query.toLowerCase()

        // Поиск штатов
        if (type === 'all' || type === 'state') {
            results.states = US_STATES
                .filter(s => 
                    s.name.toLowerCase().includes(lowerQuery) ||
                    s.id.toLowerCase().includes(lowerQuery)
                )
                .slice(0, limit)
                .map(s => ({
                    id: s.id,
                    name: s.name,
                }))
        }

        // Поиск городов
        if (type === 'all' || type === 'city') {
            const cities: City[] = []
            for (const state of US_STATES) {
                const stateCities = US_CITIES_BY_STATE[state.id] || []
                for (const cityName of stateCities) {
                    if (cityName.toLowerCase().includes(lowerQuery)) {
                        cities.push({
                            id: cityName.toLowerCase().replace(/\s+/g, '-'),
                            name: cityName,
                            stateId: state.id,
                            stateName: state.name,
                        })
                        if (cities.length >= limit) {
                            break
                        }
                    }
                }
                if (cities.length >= limit) {
                    break
                }
            }
            results.cities = cities
        }

        return results
    }
}

/**
 * Валидация локации
 */
export async function validateLocation(
    stateId: string,
    cityName?: string
): Promise<LocationValidationResult> {
    if (!stateId) {
        return {
            valid: false,
            data: null,
        }
    }

    try {
        const params = new URLSearchParams({ state: stateId })
        if (cityName) {
            params.append('city', cityName)
        }

        const response = await fetch(`${getLaravelApiUrl()}/locations/validate?${params}`)
        
        if (!response.ok) {
            throw new Error(`Failed to validate location: ${response.status}`)
        }

        const result: LocationApiResponse<LocationValidationResult['data']> = await response.json()
        
        if (result.success) {
            return {
                valid: result.data !== null,
                data: result.data,
            }
        }

        throw new Error('Invalid response format')
    } catch (error) {
        logClientApiWarn('Error validating location from API, using fallback', error, { stateId, cityName })
        
        // Fallback на локальную валидацию
        const state = US_STATES.find(s => s.id === stateId || s.name === stateId)
        
        if (!state) {
            return {
                valid: false,
                data: null,
            }
        }

        let city = null
        if (cityName) {
            const cities = US_CITIES_BY_STATE[state.id] || []
            const foundCity = cities.find(c => c.toLowerCase() === cityName.toLowerCase())
            if (foundCity) {
                city = {
                    id: foundCity.toLowerCase().replace(/\s+/g, '-'),
                    name: foundCity,
                }
            }
        }

        return {
            valid: true,
            data: {
                state: {
                    id: state.id,
                    name: state.name,
                },
                city,
            },
        }
    }
}

const US_STATE_ID_SET = new Set((US_STATES as State[]).map(s => s.id))

/**
 * Принимает только двухбуквенный код штата (CA, NY, DC …), как в API после унификации.
 * Полные имена и произвольный текст не маппятся — отбрасываются.
 */
export function parseUsStateCode(raw: string | null | undefined): string | null {
    if (raw == null || typeof raw !== 'string') return null
    const t = raw.trim()
    if (!t) return null
    const upper = t.toUpperCase()
    if (upper === 'US' || upper === 'USA' || upper === 'U.S.' || upper === 'U.S.A.') {
        return null
    }
    if (upper.length !== 2) return null
    if (!US_STATE_ID_SET.has(upper)) return null
    return upper
}

/**
 * Получить название штата по ID
 */
export function getStateName(stateId: string | null, states: State[] = []): string {
    if (!stateId) return ''
    
    // Сначала ищем в переданных штатах
    const state = states.find(s => s.id === stateId || s.name === stateId)
    if (state) return state.name
    
    // Fallback на статические данные
    const staticState = US_STATES.find(s => s.id === stateId || s.name === stateId)
    return staticState ? staticState.name : ''
}

/**
 * Очистить кэш
 */
export function clearLocationCache(): void {
    cache.states = null
    cache.cities.clear()
    cache.cacheTime.states = 0
    cache.cacheTime.cities.clear()
}


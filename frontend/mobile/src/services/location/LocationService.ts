// Location Service - API клиент для работы с локациями (React Native)

import axios from 'axios';
import { API_BASE_URL } from '../../api/config';
import { State, City, LocationSearchResult, LocationValidationResult, LocationApiResponse } from './types';
import { US_STATES, US_CITIES_BY_STATE } from '../../constants/us-locations';

// Создаем axios инстанс для API
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
});

// Кэш для локаций (in-memory cache)
const cache = {
    states: null as State[] | null,
    cities: new Map<string, City[]>(),
    cacheTime: {
        states: 0,
        cities: new Map<string, number>(),
    },
    TTL: 5 * 60 * 1000, // 5 минут в миллисекундах
};

/**
 * Получить список всех штатов
 */
export async function getStates(activeOnly: boolean = false): Promise<State[]> {
    const cacheKey = activeOnly ? 'active' : 'all';
    const now = Date.now();
    
    // Проверяем кэш
    if (cache.states && (now - cache.cacheTime.states) < cache.TTL) {
        return cache.states;
    }

    try {
        const response = await apiClient.get<LocationApiResponse<State[]>>(
            `/locations/states?active_only=${activeOnly}`
        );
        
        if (response.data.success && Array.isArray(response.data.data)) {
            // Сохраняем в кэш
            cache.states = response.data.data;
            cache.cacheTime.states = now;
            return response.data.data;
        }

        throw new Error('Invalid response format');
    } catch (error: any) {
        console.warn('Error fetching states from API:', error);
        console.warn('API URL:', `${API_BASE_URL}/locations/states`);
        console.warn('Error details:', error.response?.data || error.message);
        
        // Fallback на статические данные
        const fallbackStates: State[] = US_STATES.map(s => ({
            id: s.id,
            name: s.name,
        }));
        
        // Сохраняем fallback в кэш
        cache.states = fallbackStates;
        cache.cacheTime.states = now;
        
        console.log('Using fallback states:', fallbackStates.length);
        return fallbackStates;
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
    const { search = '', limit = 200, activeOnly = false } = options;
    
    if (!stateId) {
        return [];
    }

    const cacheKey = `${stateId}:${activeOnly ? 'active' : 'all'}`;
    const now = Date.now();
    
    // Проверяем кэш (только если нет поиска)
    if (!search && cache.cities.has(cacheKey)) {
        const cacheTime = cache.cacheTime.cities.get(cacheKey) || 0;
        if ((now - cacheTime) < cache.TTL) {
            const cachedCities = cache.cities.get(cacheKey)!;
            if (limit > 0) {
                return cachedCities.slice(0, limit);
            }
            return cachedCities;
        }
    }

    try {
        const params: any = {
            state: stateId,
            limit: limit.toString(),
            active_only: activeOnly.toString(),
        };
        
        if (search) {
            params.search = search;
        }

        const response = await apiClient.get<LocationApiResponse<City[]>>('/locations/cities', { params });
        
        if (response.data.success && Array.isArray(response.data.data)) {
            // Сохраняем в кэш (только если нет поиска)
            if (!search) {
                cache.cities.set(cacheKey, response.data.data);
                cache.cacheTime.cities.set(cacheKey, now);
            }
            return response.data.data;
        }

        throw new Error('Invalid response format');
    } catch (error: any) {
        console.warn('Error fetching cities from API:', error);
        console.warn('API URL:', `${API_BASE_URL}/locations/cities`);
        console.warn('Error details:', error.response?.data || error.message);
        
        // Fallback на статические данные
        const fallbackCities: City[] = (US_CITIES_BY_STATE[stateId] || []).map(city => ({
            id: city.toLowerCase().replace(/\s+/g, '-'),
            name: city,
            stateId: stateId,
        }));
        
        // Применяем поиск
        let filteredCities = fallbackCities;
        if (search) {
            filteredCities = fallbackCities.filter(city =>
                city.name.toLowerCase().includes(search.toLowerCase())
            );
        }
        
        // Применяем лимит
        if (limit > 0) {
            filteredCities = filteredCities.slice(0, limit);
        }
        
        // Сохраняем fallback в кэш (только если нет поиска)
        if (!search) {
            cache.cities.set(cacheKey, filteredCities);
            cache.cacheTime.cities.set(cacheKey, now);
        }
        
        console.log('Using fallback cities for state', stateId, ':', filteredCities.length);
        return filteredCities;
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
    const { type = 'all', limit = 20 } = options;

    if (!query || query.length < 2) {
        return { states: [], cities: [] };
    }

    try {
        const params: any = {
            q: query,
            type,
            limit: limit.toString(),
        };

        const response = await apiClient.get<LocationApiResponse<LocationSearchResult>>('/locations/search', { params });
        
        if (response.data.success && response.data.data) {
            return response.data.data;
        }

        throw new Error('Invalid response format');
    } catch (error: any) {
        console.warn('Error searching locations from API:', error);
        return { states: [], cities: [] };
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
        };
    }

    try {
        const params: any = { state: stateId };
        if (cityName) {
            params.city = cityName;
        }

        const response = await apiClient.get<LocationApiResponse<LocationValidationResult['data']>>(
            '/locations/validate',
            { params }
        );
        
        if (response.data.success) {
            return {
                valid: response.data.data !== null,
                data: response.data.data,
            };
        }

        throw new Error('Invalid response format');
    } catch (error: any) {
        console.warn('Error validating location from API:', error);
        return {
            valid: false,
            data: null,
        };
    }
}

/**
 * Получить название штата по ID
 */
export function getStateName(stateId: string | null, states: State[] = []): string {
    if (!stateId) return '';
    
    // Ищем в переданных штатах
    const state = states.find(s => s.id === stateId || s.name === stateId);
    if (state) return state.name;
    
    return stateId;
}

/**
 * Очистить кэш
 */
export function clearLocationCache(): void {
    cache.states = null;
    cache.cities.clear();
    cache.cacheTime.states = 0;
    cache.cacheTime.cities.clear();
}


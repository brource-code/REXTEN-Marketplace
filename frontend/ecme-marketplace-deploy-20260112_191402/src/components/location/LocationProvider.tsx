'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { LocationContext, LocationContextValue } from '@/contexts/LocationContext'
import { State, City } from '@/services/location/types'
import { getStates, getCities, getStateName as getStateNameUtil, validateLocation } from '@/services/location/LocationService'
import { useCurrentUser } from '@/hooks/api/useAuth'
import { useUserStore } from '@/store'
import { getLocation, setLocation as setLocationCookie } from '@/server/actions/location'

interface LocationProviderProps {
    children: React.ReactNode
    initialState?: string | null
    initialCity?: string | null
    userState?: string | null
    userCity?: string | null
}

const STORAGE_KEY = 'location-state'
const COOLDOWN_TIME = 90 * 60 * 1000 // 90 минут в миллисекундах

export default function LocationProvider({
    children,
    initialState = null,
    initialCity = null,
    userState: propUserState = null,
    userCity: propUserCity = null,
}: LocationProviderProps) {
    // Получаем данные пользователя
    const { data: user } = useCurrentUser()
    const { user: userStore } = useUserStore()
    const displayUser = user || userStore
    const userState = propUserState || displayUser?.state || null
    const userCity = propUserCity || displayUser?.city || null
    
    // Основное состояние локации (единый источник истины)
    const [state, setStateInternal] = useState<string | null>(initialState)
    const [city, setCityInternal] = useState<string | null>(initialCity)
    
    // Данные из API
    const [availableStates, setAvailableStates] = useState<State[]>([])
    const [availableCities, setAvailableCities] = useState<City[]>([])
    
    // Метаданные
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    
    // Флаги для предотвращения циклов
    const isInitializing = useRef(true)
    const isUpdatingFromStorage = useRef(false)
    const lastResetTime = useRef<number | null>(null)
    
    // Инициализация: загрузка штатов и восстановление состояния
    useEffect(() => {
        let mounted = true
        
        const initialize = async () => {
            try {
                setIsLoading(true)
                
                // 1. Загружаем штаты из API
                const states = await getStates(false)
                if (mounted) {
                    setAvailableStates(states)
                }
                
                // 2. Восстанавливаем состояние (приоритет: cookies > localStorage > user data)
                let restoredState: string | null = null
                let restoredCity: string | null = null
                
                try {
                    // Сначала пробуем получить из cookies (SSR поддержка)
                    const cookieLocation = await getLocation()
                    if (cookieLocation.state || cookieLocation.city) {
                        restoredState = cookieLocation.state
                        restoredCity = cookieLocation.city
                    }
                } catch (e) {
                    console.warn('Error reading location from cookies:', e)
                }
                
                // Если нет в cookies, пробуем localStorage
                if (!restoredState && !restoredCity && typeof window !== 'undefined') {
                    try {
                        const stored = localStorage.getItem(STORAGE_KEY)
                        const resetTime = localStorage.getItem(`${STORAGE_KEY}-reset-time`)
                        
                        if (stored) {
                            const parsed = JSON.parse(stored)
                            const resetTimestamp = resetTime ? parseInt(resetTime, 10) : null
                            const now = Date.now()
                            
                            // Проверяем кулдаун: если прошло меньше 90 минут с последнего сброса,
                            // и есть данные пользователя - используем данные пользователя
                            if (resetTimestamp && (now - resetTimestamp) < COOLDOWN_TIME && userState) {
                                restoredState = userState
                                restoredCity = userCity || null
                            } else if (parsed.state || parsed.city) {
                                restoredState = parsed.state || null
                                restoredCity = parsed.city || null
                            }
                        }
                    } catch (e) {
                        console.warn('Error reading location from localStorage:', e)
                    }
                }
                
                // Если все еще нет, используем данные пользователя
                if (!restoredState && !restoredCity && userState) {
                    restoredState = userState
                    restoredCity = userCity || null
                }
                
                // Устанавливаем восстановленное состояние
                if (mounted && (restoredState || restoredCity)) {
                    isUpdatingFromStorage.current = true
                    setStateInternal(restoredState)
                    setCityInternal(restoredCity)
                    isUpdatingFromStorage.current = false
                }
            } catch (err) {
                console.error('Error initializing location:', err)
                if (mounted) {
                    setError(err instanceof Error ? err : new Error('Failed to initialize location'))
                }
            } finally {
                if (mounted) {
                    setIsLoading(false)
                    isInitializing.current = false
                }
            }
        }
        
        initialize()
        
        return () => {
            mounted = false
        }
    }, []) // Запускаем только один раз при монтировании
    
    // Обновление при изменении данных пользователя (если не было ручного изменения)
    useEffect(() => {
        if (isInitializing.current || isUpdatingFromStorage.current) {
            return
        }
        
        // Если локация не установлена и есть данные пользователя - используем их
        if (!state && userState) {
            setStateInternal(userState)
            setCityInternal(userCity || null)
        }
    }, [userState, userCity]) // Обновляем только если изменились данные пользователя
    
    // Загрузка городов при изменении штата
    useEffect(() => {
        if (!state || isInitializing.current) {
            setAvailableCities([])
            return
        }
        
        let mounted = true
        
        const loadCities = async () => {
            try {
                const cities = await getCities(state, { limit: 200 })
                if (mounted) {
                    setAvailableCities(cities)
                    
                    // Валидация: если текущий город не входит в список городов нового штата - очищаем его
                    if (city && !cities.some(c => c.name === city || c.id === city)) {
                        setCityInternal(null)
                    }
                }
            } catch (err) {
                console.error('Error loading cities:', err)
                if (mounted) {
                    setAvailableCities([])
                }
            }
        }
        
        loadCities()
        
        return () => {
            mounted = false
        }
    }, [state]) // Загружаем города при изменении штата
    
    // Сохранение состояния в cookies и localStorage при изменении
    useEffect(() => {
        if (isInitializing.current || isUpdatingFromStorage.current) {
            return
        }
        
        // Сохраняем в cookies (для SSR поддержки)
        if (state || city) {
            setLocationCookie(state, city).catch((e) => {
                console.warn('Error saving location to cookies:', e)
            })
        }
        
        // Сохраняем в localStorage (для быстрого доступа на клиенте)
        if (typeof window !== 'undefined') {
            try {
                const data = {
                    state,
                    city,
                    updatedAt: Date.now(),
                }
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
                
                // Очищаем время сброса, если локация установлена
                if (state || city) {
                    localStorage.removeItem(`${STORAGE_KEY}-reset-time`)
                }
            } catch (e) {
                console.warn('Error saving location to localStorage:', e)
            }
        }
    }, [state, city]) // Сохраняем при каждом изменении
    
    // Установка штата
    const setState = useCallback((stateId: string | null) => {
        if (isUpdatingFromStorage.current) {
            return
        }
        
        setStateInternal(stateId)
        
        // При смене штата очищаем город
        if (stateId !== state) {
            setCityInternal(null)
        }
        
        // Сохраняем время сброса, если очистили штат
        if (!stateId && typeof window !== 'undefined') {
            localStorage.setItem(`${STORAGE_KEY}-reset-time`, Date.now().toString())
        }
    }, [state])
    
    // Установка города
    const setCity = useCallback((cityName: string | null) => {
        if (isUpdatingFromStorage.current) {
            return
        }
        
        setCityInternal(cityName)
        
        // Сохраняем время сброса, если очистили город
        if (!cityName && typeof window !== 'undefined') {
            localStorage.setItem(`${STORAGE_KEY}-reset-time`, Date.now().toString())
        }
    }, [])
    
    // Установка локации (штат + город)
    const setLocation = useCallback((stateId: string | null, cityName: string | null) => {
        if (isUpdatingFromStorage.current) {
            return
        }
        
        setStateInternal(stateId)
        setCityInternal(cityName)
        
        // Сохраняем время сброса, если очистили локацию
        if (!stateId && !cityName && typeof window !== 'undefined') {
            localStorage.setItem(`${STORAGE_KEY}-reset-time`, Date.now().toString())
        }
    }, [])
    
    // Сброс локации
    const reset = useCallback(() => {
        if (isUpdatingFromStorage.current) {
            return
        }
        
        setStateInternal(null)
        setCityInternal(null)
        
        if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY)
            localStorage.setItem(`${STORAGE_KEY}-reset-time`, Date.now().toString())
            lastResetTime.current = Date.now()
        }
    }, [])
    
    // Получить название штата
    const getStateName = useCallback((stateId: string | null): string => {
        if (!stateId) return ''
        return getStateNameUtil(stateId, availableStates)
    }, [availableStates])
    
    // Получить название города
    const getCityName = useCallback((cityName: string | null): string => {
        if (!cityName) return ''
        return cityName
    }, [])
    
    // Валидация локации (синхронная проверка)
    const isValidLocation = useCallback((stateId: string, cityName?: string): boolean => {
        // Проверяем локально
        const stateExists = availableStates.some(s => s.id === stateId || s.name === stateId)
        if (!stateExists) return false
        
        if (cityName) {
            const cities = availableCities.filter(c => c.stateId === stateId)
            return cities.some(c => c.name === cityName || c.id === cityName)
        }
        
        return true
    }, [availableStates, availableCities])
    
    // Значение контекста
    const contextValue: LocationContextValue = useMemo(
        () => ({
            state,
            city,
            availableStates,
            availableCities,
            setState,
            setCity,
            setLocation,
            reset,
            getStateName,
            getCityName,
            isValidLocation,
            isLoading,
            error,
        }),
        [
            state,
            city,
            availableStates,
            availableCities,
            setState,
            setCity,
            setLocation,
            reset,
            getStateName,
            getCityName,
            isValidLocation,
            isLoading,
            error,
        ]
    )
    
    return (
        <LocationContext.Provider value={contextValue}>
            {children}
        </LocationContext.Provider>
    )
}

